const OPENCLAW_BASE_URL = 'http://192.168.50.75:18789'
const OPENCLAW_AUTH_TOKEN = 'd7a3f75f04bf00fd06261f43f7afad49a329125e754de398'
const TOOLS_INVOKE_PATH = '/tools/invoke'
const OPENAI_CHAT_PATH = '/v1/chat/completions'
const TOOL_PROBES = ['sessions_list', 'session_status'] as const

type OpenClawApiParams = Record<string, never>

type HookResponse = {
  ok: boolean
  status: number
  text: string
  url: string
}

type ToolProbeResult = {
  tool: (typeof TOOL_PROBES)[number]
  result: HookResponse
}

const postJson = async (path: string, body: unknown, extraHeaders: Record<string, string> = {}): Promise<HookResponse> => {
  const url = `${OPENCLAW_BASE_URL}${path}`

  AssistantTool.report(`POST ${url}`)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENCLAW_AUTH_TOKEN}`,
      ...extraHeaders
    },
    body: JSON.stringify(body)
  })

  const text = await response.text()

  AssistantTool.report(`Response ${response.status} from ${path}`)

  return {
    ok: response.ok,
    status: response.status,
    text,
    url
  }
}

const runOpenClawHookPing: AssistantToolExecuteFn<OpenClawApiParams> = async () => {
  try {
    let invokeSuccess: ToolProbeResult | null = null
    const probeFailures: string[] = []

    for (const tool of TOOL_PROBES) {
      const invokeResult = await postJson(TOOLS_INVOKE_PATH, {
        tool,
        action: 'json',
        args: {},
        sessionKey: 'main'
      })

      if (invokeResult.ok) {
        invokeSuccess = { tool, result: invokeResult }
        break
      }

      probeFailures.push(`${tool}:${invokeResult.status}`)
    }

    if (!invokeSuccess) {
      return {
        success: false,
        message: [
          'OpenClaw tools invoke failed.',
          `<probeFailures>${probeFailures.join(', ')}</probeFailures>`,
          'Hint: use Gateway auth token/password. Endpoint is POST /tools/invoke.',
          'Hint: if status is 404, your tool policy may deny that tool for this session.'
        ].join('\n')
      }
    }

    const chatResult = await postJson(
      OPENAI_CHAT_PATH,
      {
        model: 'openclaw:main',
        user: 'scriptclaw-assistant-tool',
        messages: [{ role: 'user', content: 'Reply exactly with OPENCLAW_CHAT_OK' }]
      },
      {
        'x-openclaw-agent-id': 'main'
      }
    )

    if (chatResult.status !== 404 && !chatResult.ok) {
      return {
        success: false,
        message: [
          'OpenClaw chat completions call failed.',
          `<url>${chatResult.url}</url>`,
          `<status>${chatResult.status}</status>`,
          `<response>${chatResult.text || 'empty response body'}</response>`,
          'Hint: /v1/chat/completions is disabled by default unless explicitly enabled.'
        ].join('\n')
      }
    }

    const chatNote = chatResult.status === 404 ? 'chatCompletions endpoint is disabled (expected default)' : `chatCompletions returned ${chatResult.status}`

    return {
      success: true,
      message: [
        'OpenClaw API demo succeeded.',
        `<invokeTool>${invokeSuccess.tool}</invokeTool>`,
        `<invokeStatus>${invokeSuccess.result.status}</invokeStatus>`,
        `<chatStatus>${chatResult.status}</chatStatus>`,
        `<chatNote>${chatNote}</chatNote>`,
        `<baseUrl>${OPENCLAW_BASE_URL}</baseUrl>`,
        `<invokePath>${TOOLS_INVOKE_PATH}</invokePath>`,
        `<openaiPath>${OPENAI_CHAT_PATH}</openaiPath>`
      ].join('\n')
    }
  } catch (error) {
    return {
      success: false,
      message: [
        'OpenClaw API demo threw an exception.',
        `<error>${String(error)}</error>`,
        'Hint: check network reachability, gateway bind mode, and auth token/password.'
      ].join('\n')
    }
  }
}

AssistantTool.registerExecuteTool(runOpenClawHookPing)
