type DiagnosticFields = Record<string, string | number | boolean | null | undefined>
let nextSession = 0

/** 保留资源路径和普通查询参数，仅隐藏账号、鉴权参数和片段。 */
export const describeDiagnosticUrl = (url: string): string => {
  const match = /^([a-z][a-z\d+.-]*):\/\/([^/?#\s]+)([^?#]*)(\?[^#]*)?/i.exec(url)
  if (!match) return '[非标准 URL]'
  const host = match[2].split('@').pop()
  const query = (match[4] || '').replace(/([?&][^=&]*(?:token|sign|key|auth|password|secret|credential|session|jwt|policy)[^=&]*=)[^&]*/gi, '$1[已隐藏]')
  return `${match[1]}://${host}${match[3]}${query}`
}

export const redactDiagnosticError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error)
  return message
    .replace(/(?:https?|file):\/\/[^\s"'<>]+/gi, url => describeDiagnosticUrl(url))
    .replace(/https?%3a%2f%2f[^\s"'<>]+/gi, '[已隐藏编码 URL]')
    .replace(/Bearer\s+[^\s,;]+/gi, 'Bearer [已隐藏]')
}

/** 日志只写入现有控制台；会话编号和耗时用于关联并发请求。 */
export const createDiagnosticLogger = (scope: string) => {
  const session = ++nextSession
  const startedAt = Date.now()
  return (event: string, fields: DiagnosticFields = {}) => {
    const safeFields = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, typeof value === 'string' ? redactDiagnosticError(value) : value]))
    console.log(`[ScriptFlixDiag] ${JSON.stringify({ scope, session, event, elapsedMs: Date.now() - startedAt, ...safeFields })}`)
  }
}
