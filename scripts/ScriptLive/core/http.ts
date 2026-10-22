/**
 * 站点请求封装：统一拼接查询参数、附带请求头，并把非 2xx 响应转成可读错误。
 */

export type QueryValue = string | number | boolean | null | undefined
export type Query = Record<string, QueryValue>

export type RequestOptions = {
  query?: Query
  headers?: Record<string, string>
  /** 超时秒数，默认 15 */
  timeout?: number
}

const STATUS_TEXT: Record<number, string> = {
  400: '错误的请求(400)',
  401: '无权限访问资源(401)',
  403: '无权限访问资源(403)',
  404: '服务器找不到请求的资源(404)',
  412: '请求被服务器拦截(412)',
  500: '服务器出现错误(500)',
  502: '服务器出现错误(502)',
  503: '服务器出现错误(503)'
}

export class HttpError extends Error {
  readonly status: number
  readonly url: string
  constructor(status: number, url: string) {
    super(STATUS_TEXT[status] ?? `连接服务器失败，请稍后再试(${status})`)
    this.name = 'HttpError'
    this.status = status
    this.url = url
  }
}

/** 按 application/x-www-form-urlencoded 规则编码查询串 */
export const encodeQuery = (query: Query): string =>
  Object.keys(query)
    .filter(key => query[key] !== undefined && query[key] !== null)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(String(query[key]))}`)
    .join('&')

export const buildUrl = (url: string, query?: Query): string => {
  const encoded = query ? encodeQuery(query) : ''
  if (!encoded) return url
  return `${url}${url.includes('?') ? '&' : '?'}${encoded}`
}

/** 解析查询串为键值对，重复键保留最后一个值 */
export const parseQuery = (query: string): Record<string, string> => {
  const result: Record<string, string> = {}
  const text = query.startsWith('?') ? query.slice(1) : query
  for (const part of text.split('&')) {
    if (!part) continue
    const index = part.indexOf('=')
    const key = index < 0 ? part : part.slice(0, index)
    const value = index < 0 ? '' : part.slice(index + 1)
    result[safeDecode(key)] = safeDecode(value)
  }
  return result
}

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '))
  } catch {
    return value
  }
}

/**
 * 发送请求并校验状态码。
 * @param url 请求地址
 * @param init fetch 参数
 * @param options 查询参数、请求头和超时
 */
export async function request(url: string, init: RequestInit, options: RequestOptions = {}): Promise<Response> {
  const fullUrl = buildUrl(url, options.query)
  const response = await fetch(fullUrl, {
    ...init,
    headers: { ...(options.headers ?? {}), ...((init.headers as Record<string, string> | undefined) ?? {}) },
    timeout: options.timeout ?? 15
  })
  if (!response.ok) throw new HttpError(response.status, fullUrl)
  return response
}

export async function getText(url: string, options: RequestOptions = {}): Promise<string> {
  const response = await request(url, { method: 'GET' }, options)
  return response.text()
}

/**
 * GET 并解析 JSON。部分站点以 text/html 返回 JSON，这里统一按文本解析。
 */
export async function getJson<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
  const text = await getText(url, options)
  return parseJson<T>(text, url)
}

/** POST JSON 请求体并解析 JSON 响应 */
export async function postJson<T = any>(url: string, body: unknown, options: RequestOptions = {}): Promise<T> {
  const response = await request(
    url,
    { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', ...(options.headers ?? {}) } },
    options
  )
  return parseJson<T>(await response.text(), url)
}

/** POST 表单请求体并解析 JSON 响应 */
export async function postForm<T = any>(url: string, form: Query, options: RequestOptions = {}): Promise<T> {
  const response = await request(
    url,
    { method: 'POST', body: encodeQuery(form), headers: { 'content-type': 'application/x-www-form-urlencoded', ...(options.headers ?? {}) } },
    options
  )
  return parseJson<T>(await response.text(), url)
}

function parseJson<T>(text: string, url: string): T {
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`接口返回的不是有效 JSON：${url.split('?')[0]}`)
  }
}
