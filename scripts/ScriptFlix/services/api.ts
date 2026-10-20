import { createDiagnosticLogger, describeDiagnosticUrl, redactDiagnosticError } from '../utils/diagnostics'
import type { VideoListResponse } from '../types'

/**
 * 构造请求地址，避免依赖 URL 构造函数（Scripting 运行时缺少 URL 全局）
 * @param baseUrl Vod 接口基础地址
 * @param params 查询参数
 */
const buildUrl = (baseUrl: string, params: Record<string, string>): string => {
  const query = Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== '')
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&')

  if (!query) return baseUrl

  const hasQuery = baseUrl.includes('?')
  return `${baseUrl}${hasQuery ? '&' : '?'}${query}`
}

/** 三个接口共用诊断，保留原请求地址、参数和 JSON 解析契约。 */
const requestVideoData = async (url: string, operation: string): Promise<VideoListResponse> => {
  const log = createDiagnosticLogger('api')
  log('request', { operation, url: describeDiagnosticUrl(url) })
  let response: Awaited<ReturnType<typeof fetch>>
  try {
    response = await fetch(url)
  } catch (error) {
    log('network.error', { operation, error: redactDiagnosticError(error) })
    throw new Error(`视频源网络请求失败：${redactDiagnosticError(error)}`)
  }

  const contentType = response.headers.get('content-type') || '未提供'
  log('response', {
    operation,
    status: response.status,
    contentType,
    finalUrl: describeDiagnosticUrl(response.url),
    redirected: !!response.url && response.url !== url
  })
  if (!response.ok) throw new Error(`视频源请求失败（HTTP ${response.status}），请检查视频源是否可用`)

  let data: VideoListResponse
  try {
    data = (await response.json()) as VideoListResponse
  } catch (error) {
    log('json.error', { operation, error: redactDiagnosticError(error) })
    throw new Error(`视频源返回的不是有效 JSON（HTTP ${response.status}，类型 ${contentType}），请检查接口地址或服务端拦截`)
  }
  log('json.ok', { operation, code: data?.code, count: Array.isArray(data?.list) ? data.list.length : 0 })
  return data
}

/** 请求分类/基础配置，仍直接请求用户配置的 CMS 地址。 */
export const fetchCategories = (baseUrl: string): Promise<VideoListResponse> => requestVideoData(baseUrl, 'categories')

/**
 * 拉取视频列表，支持分页、分类与关键字筛选
 * @param baseUrl CMS 接口地址
 * @param page 页码，默认 1
 * @param typeIds 需要过滤的分类 ID 列表
 * @param keyword 可选的关键字
 */
export const fetchVideoList = async (baseUrl: string, page: number = 1, typeIds?: number[], keyword?: string): Promise<VideoListResponse> => {
  const params: Record<string, string> = {
    ac: 'videolist',
    pg: page.toString()
  }

  if (typeIds && typeIds.length > 0) {
    params['t'] = typeIds.join(',')
  }

  if (keyword) {
    params['wd'] = keyword
  }

  return requestVideoData(buildUrl(baseUrl, params), keyword ? 'search' : 'list')
}

/**
 * 根据视频 ID 拉取详情与播放源
 * @param baseUrl CMS 接口地址
 * @param id 视频 ID
 */
export const fetchVideoDetail = async (baseUrl: string, id: number): Promise<VideoListResponse> => {
  const params: Record<string, string> = {
    ac: 'videolist',
    ids: id.toString()
  }

  return requestVideoData(buildUrl(baseUrl, params), 'detail')
}
