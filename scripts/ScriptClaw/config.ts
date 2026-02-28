const CONFIG_STORAGE_KEY = 'SCRIPTCLAW_OPENCLAW_CONFIG'

export type OpenClawConfig = {
  baseUrl: string
  authToken: string
  toolsInvokePath: string
  openaiChatPath: string
  defaultAgentId: string
  defaultSessionKey: string
}

export const DEFAULT_OPENCLAW_CONFIG: OpenClawConfig = {
  baseUrl: 'http://192.168.50.75:18789',
  authToken: 'd7a3f75f04bf00fd06261f43f7afad49a329125e754de398',
  toolsInvokePath: '/tools/invoke',
  openaiChatPath: '/v1/chat/completions',
  defaultAgentId: 'main',
  defaultSessionKey: 'main'
}

const normalizePath = (value: string, fallback: string) => {
  const normalized = String(value || '')
    .trim()
    .replace(/\s+/g, '')
  if (!normalized) return fallback
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

const normalizeBaseUrl = (value: string, fallback: string) => {
  const normalized = String(value || '')
    .trim()
    .replace(/\/+$/, '')
  return normalized || fallback
}

const normalizeConfig = (candidate?: Partial<OpenClawConfig> | null): OpenClawConfig => {
  const raw = candidate || {}

  return {
    baseUrl: normalizeBaseUrl(raw.baseUrl || '', DEFAULT_OPENCLAW_CONFIG.baseUrl),
    authToken: String(raw.authToken || '').trim() || DEFAULT_OPENCLAW_CONFIG.authToken,
    toolsInvokePath: normalizePath(raw.toolsInvokePath || '', DEFAULT_OPENCLAW_CONFIG.toolsInvokePath),
    openaiChatPath: normalizePath(raw.openaiChatPath || '', DEFAULT_OPENCLAW_CONFIG.openaiChatPath),
    defaultAgentId: String(raw.defaultAgentId || '').trim() || DEFAULT_OPENCLAW_CONFIG.defaultAgentId,
    defaultSessionKey: String(raw.defaultSessionKey || '').trim() || DEFAULT_OPENCLAW_CONFIG.defaultSessionKey
  }
}

export const getOpenClawConfig = (): OpenClawConfig => {
  const cached = Storage.get<Partial<OpenClawConfig> | null>(CONFIG_STORAGE_KEY)
  return normalizeConfig(cached)
}

export const saveOpenClawConfig = (partial: Partial<OpenClawConfig>): OpenClawConfig => {
  const merged = normalizeConfig({
    ...getOpenClawConfig(),
    ...partial
  })
  Storage.set(CONFIG_STORAGE_KEY, merged)
  return merged
}

export const resetOpenClawConfig = (): OpenClawConfig => {
  Storage.set(CONFIG_STORAGE_KEY, DEFAULT_OPENCLAW_CONFIG)
  return { ...DEFAULT_OPENCLAW_CONFIG }
}

export const maskToken = (token: string): string => {
  const value = String(token || '').trim()
  if (!value) return '(empty)'
  if (value.length <= 10) return `${value.slice(0, 2)}***${value.slice(-2)}`
  return `${value.slice(0, 6)}***${value.slice(-4)}`
}
