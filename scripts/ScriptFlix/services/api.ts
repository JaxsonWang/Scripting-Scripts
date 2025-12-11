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

/**
 * 请求分类/基础配置
 * @param baseUrl 用户配置的 CMS 接口地址
 */
export const fetchCategories = async (baseUrl: string): Promise<VideoListResponse> => {
  // Typically 'ac=list' or similar to get categories, or just fetching the base might return list depending on API.
  // In original code: fetch(`${API_BASE_URL}/api/proxy/vod?${params}`) where params had baseUrl.
  // The original used axios proxy.
  // Usually these CMS APIs return categories in the main list response or have a specific action.
  // Assuming 'ac=videolist' returns 'class' (categories) as seen in the mock/types.
  // Let's try fetchVideoList(baseUrl, 1) which usually returns categories too.
  // But maybe there is a specific 'ac=list'
  // Original code: fetchVideoList sends `ac: 'videolist'`. fetchCategories sends NO `ac`.
  // So fetches default action.

  try {
    const res = await fetch(baseUrl)
    if (!res.ok) throw new Error('Network response was not ok')
    // 强制将返回结果断言为后端约定的列表响应结构
    return (await res.json()) as VideoListResponse
  } catch (e) {
    console.error('fetchCategories error:', e)
    throw e
  }
}

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

  const url = buildUrl(baseUrl, params)

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Network response was not ok')
    return (await res.json()) as VideoListResponse
  } catch (e) {
    console.error('fetchVideoList error:', e)
    throw e
  }
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

  const url = buildUrl(baseUrl, params)

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Network response was not ok')
    return (await res.json()) as VideoListResponse
  } catch (e) {
    console.error('fetchVideoDetail error:', e)
    throw e
  }
}
