/** 抖音直播站点。 */
import { randomString } from '../bytes'
import { buildUrl, getJson, getText } from '../http'
import type {
  LiveAnchorItem,
  LiveCategory,
  LiveDanmaku,
  LivePlayLine,
  LivePlayQuality,
  LivePlayUrl,
  LiveRoomDetail,
  LiveRoomItem,
  LiveSite,
  LiveSubCategory,
  LiveSuperChatMessage,
  PagedResult
} from '../types'
import { DouyinDanmaku } from './douyin-danmaku'
import type { DouyinSocketFactory } from './douyin-danmaku'
import type { DouyinSearchRequest, DouyinSigner } from './douyin-web'
import { DOUYIN_COOKIE, DOUYIN_UA, searchWithOfficialPage } from './douyin-web'

type JsonObject = Record<string, unknown>
type DouyinImage = { url_list?: string[] }
type DouyinUser = { web_rid?: string; nickname?: string; signature?: string; avatar_thumb?: DouyinImage }
type DouyinRoom = {
  id_str?: string
  status?: number
  title?: string
  cover?: DouyinImage
  owner?: DouyinUser
  room_view_stats?: { display_value?: number | string }
  user_count_str?: string
  stats?: { total_user?: number | string }
  stream_url?: JsonObject
  create_time?: number
}
type RoomEntry = { web_rid?: string; room: DouyinRoom }
type Partition = { partition: { id_str: string; type: number; title: string }; sub_partition?: Partition[] }
type QualityData = { lines: LivePlayLine[] }

/** 可注入官方页面请求、签名和带 Cookie 的传输，在 Node 中分别验证协议和风控边界。 */
export type DouyinOptions = {
  searchRequest?: DouyinSearchRequest
  signer?: DouyinSigner
  socketFactory?: DouyinSocketFactory
}

const COMMON_QUERY = {
  aid: '6383',
  app_name: 'douyin_web',
  live_id: '1',
  device_platform: 'web',
  language: 'zh-CN',
  enter_from: 'link_share',
  cookie_enabled: 'true',
  screen_width: '1980',
  screen_height: '1080',
  browser_language: 'zh-CN',
  browser_platform: 'Win32',
  browser_name: 'Edge',
  browser_version: '125.0.0.0',
  browser_online: 'true'
}
const object = (value: unknown): JsonObject => (value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonObject) : {})
const image = (value?: DouyinImage): string => value?.url_list?.[0] ?? ''
const count = (value: unknown): number => {
  const number = parseFloat(String(value ?? '0'))
  return Number.isFinite(number) ? number * (String(value).includes('万') ? 10000 : String(value).includes('亿') ? 100000000 : 1) : 0
}

/** 抽取 Next/React Flight 文本中的一个完整 JSON 数组，不依赖分类数量或嵌套层级。 */
function extractCategoryData(html: string): Partition[] {
  for (const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    if (!script[1].includes('categoryData')) continue
    const match = script[1].match(/self\.__pace_f\.push\((\[[\s\S]*\])\)/)
    if (!match) continue
    const frame = JSON.parse(match[1]) as unknown[]
    const text = frame.filter((part): part is string => typeof part === 'string').join('')
    const marker = '"categoryData":'
    const start = text.indexOf(marker)
    if (start < 0) continue
    const arrayStart = text.indexOf('[', start + marker.length)
    let depth = 0
    let quoted = false
    let escaped = false
    for (let index = arrayStart; index < text.length; index++) {
      const char = text[index]
      if (escaped) {
        escaped = false
        continue
      }
      if (quoted && char === '\\') {
        escaped = true
        continue
      }
      if (char === '"') quoted = !quoted
      if (quoted) continue
      if (char === '[') depth++
      if (char === ']' && --depth === 0) return JSON.parse(text.slice(arrayStart, index + 1)) as Partition[]
    }
  }
  throw new Error('抖音首页未返回分类数据，网页结构可能已更新')
}

function roomItem(room: DouyinRoom, webRid?: string): LiveRoomItem {
  const roomId = webRid || room.owner?.web_rid
  if (!roomId) throw new Error('抖音直播间缺少固定 webRid')
  return {
    roomId,
    title: room.title ?? '',
    cover: image(room.cover),
    userName: room.owner?.nickname ?? '',
    online: count(room.room_view_stats?.display_value ?? room.stats?.total_user ?? room.user_count_str)
  }
}

export class DouyinSite implements LiveSite {
  readonly id = 'douyin' as const
  readonly name = '抖音直播'
  constructor(
    private readonly getCookie: () => string = () => '',
    private readonly options: DouyinOptions = {}
  ) {}

  private cookie(): string {
    return this.getCookie().trim() || DOUYIN_COOKIE
  }
  private headers(webRid = ''): Record<string, string> {
    return { 'User-Agent': DOUYIN_UA, Referer: `https://live.douyin.com/${webRid}`, Cookie: this.cookie() }
  }

  getDanmaku(): LiveDanmaku {
    return new DouyinDanmaku(this.options.signer, this.options.socketFactory)
  }

  async getCategories(): Promise<LiveCategory[]> {
    const html = await getText('https://live.douyin.com/', { headers: this.headers() })
    return extractCategoryData(html).map(item => {
      const id = `${item.partition.id_str},${item.partition.type}`
      const name = item.partition.title
      return {
        id,
        name,
        children: [
          { id, name, parentId: id },
          ...(item.sub_partition ?? []).map(child => ({
            id: `${child.partition.id_str},${child.partition.type}`,
            name: child.partition.title,
            parentId: id
          }))
        ]
      }
    })
  }

  async getCategoryRooms(category: LiveSubCategory, page = 1): Promise<PagedResult<LiveRoomItem>> {
    const [partition, type] = category.id.split(',')
    if (!partition || !type) throw new Error('抖音分类参数无效')
    const result = await getJson<{ status_code?: number; status_msg?: string; data?: { data?: RoomEntry[]; has_more?: boolean } }>(
      'https://live.douyin.com/webcast/web/partition/detail/room/v2/',
      {
        query: { ...COMMON_QUERY, count: 15, offset: (Math.max(1, page) - 1) * 15, partition, partition_type: type, req_from: 2, a_bogus: '' },
        headers: this.headers()
      }
    )
    if (result.status_code) throw new Error(`抖音分类请求失败：${result.status_msg || result.status_code}`)
    if (!Array.isArray(result.data?.data)) throw new Error('抖音分类接口未返回直播间列表')
    const items = result.data.data.map(entry => roomItem(entry.room, entry.web_rid))
    return { items, hasMore: result.data.has_more ?? items.length >= 15 }
  }

  async getRecommendRooms(page = 1): Promise<PagedResult<LiveRoomItem>> {
    return this.getCategoryRooms({ id: '720,1', name: '推荐', parentId: '720,1' }, page)
  }

  async getRoomDetail(input: string): Promise<LiveRoomDetail> {
    const match = input.trim().match(/^(?:https?:\/\/live\.douyin\.com\/)?([\w-]+)(?:[/?#].*)?$/)
    if (!match) throw new Error('请输入抖音房间号或 live.douyin.com 直播间链接')
    let webRid = match[1]
    // 真实 room_id 是单次开播编号；先解析固定 webRid，再查询当前开播状态。
    if (/^\d{17,}$/.test(webRid)) {
      const result = await getJson<{ data?: { room?: DouyinRoom } }>('https://webcast.amemv.com/webcast/room/reflow/info/', {
        query: { type_id: 0, live_id: 1, room_id: webRid, sec_user_id: '', version_code: '99.99.99', app_id: 6383 },
        headers: this.headers()
      })
      const resolved = result.data?.room?.owner?.web_rid
      if (!resolved) throw new Error('无法将抖音开播编号解析为固定房间号，请复制直播间网页链接')
      webRid = resolved
    }
    const result = await getJson<{ status_code?: number; status_msg?: string; data?: { data?: DouyinRoom[]; user?: DouyinUser } }>(
      'https://live.douyin.com/webcast/room/web/enter/',
      {
        query: { ...COMMON_QUERY, browser_name: 'Chrome', web_rid: webRid, msToken: '' },
        headers: this.headers(webRid)
      }
    )
    if (result.status_code) throw new Error(`抖音直播间请求失败：${result.status_msg || result.status_code}`)
    const room = result.data?.data?.[0]
    if (!room?.id_str) throw new Error('抖音直播间不存在或暂时无法访问')
    const owner = room.owner ?? result.data?.user
    const status = room.status === 2
    return {
      ...roomItem({ ...room, owner }, webRid),
      userAvatar: image(owner?.avatar_thumb),
      introduction: owner?.signature ?? '',
      notice: '',
      status,
      url: `https://live.douyin.com/${webRid}`,
      showTime: room.create_time ? String(room.create_time) : undefined,
      data: status ? (room.stream_url ?? {}) : {},
      danmakuData: { webRid, roomId: room.id_str, userId: randomString(12, '0123456789'), cookie: this.cookie() }
    }
  }

  async getPlayQualities(detail: LiveRoomDetail): Promise<LivePlayQuality[]> {
    if (!detail.status) return []
    const stream = object(detail.data)
    const pull = object(object(stream.live_core_sdk_data).pull_data)
    const options = object(pull.options)
    const qualities = Array.isArray(options.qualities) ? options.qualities.map(object) : []
    const text = String(pull.stream_data ?? '')
    const data = text.startsWith('{') ? object(object(JSON.parse(text)).data) : {}
    const hlsMap = object(stream.hls_pull_url_map)
    const flvMap = object(stream.flv_pull_url)
    const mapKeys: Record<string, string> = { origin: 'FULL_HD1', hd: 'HD1', sd: 'SD2', ld: 'SD1', md: 'LD1' }
    const result: LivePlayQuality[] = []
    for (const quality of qualities) {
      const key = String(quality.sdk_key ?? '')
      const variant = object(data[key])
      const lines: LivePlayLine[] = []
      for (const format of ['hls', 'flv'] as const) {
        for (const name of ['main', 'backup']) {
          const url = object(variant[name])[format]
          if (typeof url === 'string' && url) lines.push({ url: url.replace(/^http:/, 'https:'), format, name: name === 'main' ? '主线路' : '备用线路' })
        }
        const url = (format === 'hls' ? hlsMap : flvMap)[mapKeys[key]]
        if (typeof url === 'string' && url && !lines.some(line => line.format === format)) {
          lines.push({ url: url.replace(/^http:/, 'https:'), format, name: '主线路' })
        }
      }
      if (lines.length) result.push({ quality: String(quality.name ?? key), sort: Number(quality.level ?? 0), data: { lines } satisfies QualityData })
    }
    if (!result.length) {
      const lines: LivePlayLine[] = []
      if (typeof stream.hls_pull_url === 'string' && stream.hls_pull_url)
        lines.push({ url: stream.hls_pull_url.replace(/^http:/, 'https:'), format: 'hls', name: '主线路' })
      for (const url of Object.values(flvMap))
        if (typeof url === 'string' && url) lines.push({ url: url.replace(/^http:/, 'https:'), format: 'flv', name: '主线路' })
      if (lines.length) result.push({ quality: '默认画质', sort: 0, data: { lines } satisfies QualityData })
    }
    return result.sort((a, b) => (b.sort ?? 0) - (a.sort ?? 0))
  }

  async getPlayUrls(_detail: LiveRoomDetail, quality: LivePlayQuality): Promise<LivePlayUrl> {
    const data = quality.data as QualityData
    if (!Array.isArray(data?.lines)) throw new Error('抖音播放参数无效，请重新读取清晰度')
    return { lines: data.lines.map(line => ({ ...line })) }
  }

  async searchRooms(keyword: string, page = 1): Promise<PagedResult<LiveRoomItem>> {
    const url = buildUrl('https://www.douyin.com/aweme/v1/web/live/search/', {
      device_platform: 'webapp',
      aid: '6383',
      channel: 'channel_pc_web',
      search_channel: 'aweme_live',
      keyword,
      search_source: 'switch_tab',
      query_correct_type: 1,
      is_filter_search: 0,
      from_group_id: '',
      offset: (Math.max(1, page) - 1) * 10,
      count: 10,
      pc_client_type: 1,
      version_code: '170400',
      version_name: '17.4.0',
      cookie_enabled: true,
      screen_width: 1980,
      screen_height: 1080,
      browser_language: 'zh-CN',
      browser_platform: 'Win32',
      browser_name: 'Edge',
      browser_version: '125.0.0.0',
      browser_online: true,
      engine_name: 'Blink',
      engine_version: '125.0.0.0',
      os_name: 'Windows',
      os_version: '10',
      platform: 'PC'
    })
    const result = object(await (this.options.searchRequest ?? searchWithOfficialPage)(url, this.cookie(), keyword))
    if (result.status_code) throw new Error(`抖音搜索失败：${String(result.status_msg || result.status_code)}`)
    if (!Array.isArray(result.data)) throw new Error('抖音搜索未返回结果，请更新登录 Cookie 或在官方页面完成验证')
    const items = result.data.map(entry => {
      const raw = object(object(entry).lives).rawdata
      if (typeof raw !== 'string') throw new Error('抖音搜索结果格式已变化')
      return roomItem(JSON.parse(raw) as DouyinRoom)
    })
    return { items, hasMore: result.has_more === undefined ? items.length >= 10 : Boolean(result.has_more) }
  }

  async searchAnchors(_keyword: string, _page = 1): Promise<PagedResult<LiveAnchorItem>> {
    throw new Error('抖音暂不支持搜索主播，请搜索直播间')
  }
  async getLiveStatus(roomId: string): Promise<boolean> {
    return (await this.getRoomDetail(roomId)).status
  }
  async getSuperChatMessages(_roomId: string): Promise<LiveSuperChatMessage[]> {
    return []
  }
}
