import { fetch } from 'scripting'
import { getOpenClawConfig } from './config'
import type { OpenClawConfig } from './config'

const TOOL_PROBES = ['sessions_list', 'session_status'] as const

type OpenClawGatewayParams = {
  mode?: string
  message?: string
  tool?: string
  argsJson?: string
  sessionKey?: string
  agentId?: string
  model?: string
  user?: string
  action?: string
}

type HttpResult = {
  ok: boolean
  status: number
  text: string
  url: string
}

type ToolProbeResult = {
  tool: (typeof TOOL_PROBES)[number]
  result: HttpResult
}

const postJson = async (config: OpenClawConfig, path: string, body: unknown, extraHeaders: Record<string, string> = {}): Promise<HttpResult> => {
  const url = `${config.baseUrl}${path}`
  AssistantTool.report(`POST ${url}`)

  const response = await fetch(url, {
    method: 'POST',
    allowInsecureRequest: url.startsWith('http://'),
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.authToken}`,
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

const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const getChatReply = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') return null

  const choices = (payload as { choices?: unknown }).choices
  if (!Array.isArray(choices) || choices.length === 0) return null

  const firstChoice = choices[0]
  if (!firstChoice || typeof firstChoice !== 'object') return null

  const message = (firstChoice as { message?: unknown }).message
  if (!message || typeof message !== 'object') return null

  const content = (message as { content?: unknown }).content
  if (typeof content === 'string') return content

  if (Array.isArray(content)) {
    const joined = content
      .map(item => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') {
          const text = (item as { text?: unknown }).text
          if (typeof text === 'string') return text
        }
        return ''
      })
      .join('')
      .trim()

    return joined.length > 0 ? joined : null
  }

  return null
}

const normalizeMode = (params: OpenClawGatewayParams): 'chat' | 'invoke' | 'diagnose' | null => {
  const rawMode = String(params.mode || '')
    .trim()
    .toLowerCase()

  if (!rawMode || rawMode === 'auto') {
    if (String(params.message || '').trim()) return 'chat'
    if (String(params.tool || '').trim()) return 'invoke'
    return 'diagnose'
  }

  const chatModes = new Set(['chat', 'message', 'conversation', 'completions', 'send'])
  const invokeModes = new Set(['invoke', 'tool', 'tools', 'call_tool'])
  const diagnoseModes = new Set(['diagnose', 'diag', 'health', 'check', 'ping'])

  if (chatModes.has(rawMode)) return 'chat'
  if (invokeModes.has(rawMode)) return 'invoke'
  if (diagnoseModes.has(rawMode)) return 'diagnose'

  if (String(params.message || '').trim()) return 'chat'
  if (String(params.tool || '').trim()) return 'invoke'
  return null
}

const runChat = async (params: OpenClawGatewayParams) => {
  const config = getOpenClawConfig()
  const message = String(params.message || '').trim()
  if (!message) {
    return {
      success: false,
      message: 'mode=chat 时，参数 "message" 不能为空。'
    }
  }

  const agentId = String(params.agentId || config.defaultAgentId).trim() || config.defaultAgentId
  const model = String(params.model || `openclaw:${agentId}`).trim() || `openclaw:${agentId}`
  const user = String(params.user || 'scriptclaw-assistant-tool').trim() || 'scriptclaw-assistant-tool'

  const extraHeaders: Record<string, string> = {
    'x-openclaw-agent-id': agentId
  }

  const sessionKey = String(params.sessionKey || '').trim()
  if (sessionKey) {
    extraHeaders['x-openclaw-session-key'] = sessionKey
  }

  const chatResult = await postJson(
    config,
    config.openaiChatPath,
    {
      model,
      user,
      messages: [{ role: 'user', content: message }]
    },
    extraHeaders
  )

  if (!chatResult.ok) {
    return {
      success: false,
      message: [
        'OpenClaw 对话请求失败。',
        `<url>${chatResult.url}</url>`,
        `<status>${chatResult.status}</status>`,
        `<response>${chatResult.text || 'empty response body'}</response>`,
        '提示：/v1/chat/completions 必须使用 POST，且可能未在网关中启用。'
      ].join('\n')
    }
  }

  const payload = parseJson(chatResult.text)
  const reply = getChatReply(payload)

  if (reply) {
    return {
      success: true,
      message: reply
    }
  }

  return {
    success: true,
    message: ['OpenClaw 对话请求成功，但未提取到可直接展示的 assistant 文本。', `<status>${chatResult.status}</status>`, `<raw>${chatResult.text}</raw>`].join(
      '\n'
    )
  }
}

const runInvoke = async (params: OpenClawGatewayParams) => {
  const config = getOpenClawConfig()
  const tool = String(params.tool || '').trim()
  if (!tool) {
    return {
      success: false,
      message: 'mode=invoke 时，参数 "tool" 不能为空。'
    }
  }

  let args: Record<string, unknown> = {}
  const argsJson = String(params.argsJson || '').trim()
  if (argsJson) {
    const parsed = parseJson(argsJson)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        success: false,
        message: '"argsJson" 必须是合法的 JSON 对象字符串。'
      }
    }
    args = parsed as Record<string, unknown>
  }

  const action = String(params.action || 'json').trim() || 'json'
  const sessionKey = String(params.sessionKey || config.defaultSessionKey).trim() || config.defaultSessionKey

  const invokeResult = await postJson(config, config.toolsInvokePath, {
    tool,
    action,
    args,
    sessionKey
  })

  if (!invokeResult.ok) {
    return {
      success: false,
      message: [
        'OpenClaw 工具调用失败。',
        `<url>${invokeResult.url}</url>`,
        `<status>${invokeResult.status}</status>`,
        `<response>${invokeResult.text || 'empty response body'}</response>`,
        '提示：404 通常表示工具名不存在，或被策略拒绝调用。'
      ].join('\n')
    }
  }

  return {
    success: true,
    message: invokeResult.text || '{"ok":true}'
  }
}

const runDiagnose = async () => {
  const config = getOpenClawConfig()
  let invokeSuccess: ToolProbeResult | null = null
  const probeFailures: string[] = []

  for (const tool of TOOL_PROBES) {
    const invokeResult = await postJson(config, config.toolsInvokePath, {
      tool,
      action: 'json',
      args: {},
      sessionKey: config.defaultSessionKey
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
        'OpenClaw 诊断失败：/tools/invoke 不可用。',
        `<probeFailures>${probeFailures.join(', ')}</probeFailures>`,
        '提示：请检查网关认证、工具 allow 策略和目标会话权限。'
      ].join('\n')
    }
  }

  const chatResult = await postJson(
    config,
    config.openaiChatPath,
    {
      model: `openclaw:${config.defaultAgentId}`,
      user: 'scriptclaw-diagnose',
      messages: [{ role: 'user', content: 'Reply exactly with OPENCLAW_CHAT_OK' }]
    },
    {
      'x-openclaw-agent-id': config.defaultAgentId
    }
  )

  const chatNote = chatResult.status === 404 ? 'chatCompletions 端点未启用（默认可能如此）' : `chatCompletions 返回状态 ${chatResult.status}`

  return {
    success: true,
    message: [
      'OpenClaw 网关诊断完成。',
      `<invokeTool>${invokeSuccess.tool}</invokeTool>`,
      `<invokeStatus>${invokeSuccess.result.status}</invokeStatus>`,
      `<chatStatus>${chatResult.status}</chatStatus>`,
      `<chatNote>${chatNote}</chatNote>`,
      `<baseUrl>${config.baseUrl}</baseUrl>`
    ].join('\n')
  }
}

const openClawGatewayTool: AssistantToolExecuteFn<OpenClawGatewayParams> = async params => {
  try {
    const mode = normalizeMode(params)

    if (mode === 'chat') {
      return await runChat(params)
    }

    if (mode === 'invoke') {
      return await runInvoke(params)
    }

    if (mode === 'diagnose') {
      return await runDiagnose()
    }

    return {
      success: false,
      message: [
        'mode 参数无效，可用值：chat、invoke、diagnose。',
        `<receivedMode>${String(params.mode || '')}</receivedMode>`,
        '提示：若省略 mode，工具会根据其他参数自动选择 chat/invoke/diagnose。'
      ].join('\n')
    }
  } catch (error) {
    return {
      success: false,
      message: ['OpenClaw 网关工具执行异常。', `<error>${String(error)}</error>`, '提示：请检查 base URL、认证 token、网关端点配置和网络可达性。'].join('\n')
    }
  }
}

AssistantTool.registerExecuteTool(openClawGatewayTool)
