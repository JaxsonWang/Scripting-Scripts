import { md5Hex } from '../bytes'
import { encodeQuery, getJson } from '../http'
import { decodeEntities } from '../text'
import type { Query } from '../http'
import type {
  LiveAnchorItem,
  LiveCategory,
  LiveDanmaku,
  LivePlayQuality,
  LivePlayUrl,
  LiveRoomDetail,
  LiveRoomItem,
  LiveSite,
  LiveSubCategory,
  LiveSuperChatMessage,
  PagedResult
} from '../types'
import { BilibiliDanmaku, bilibiliSuperChat } from './bilibili-danmaku'
import type { BilibiliEvent } from './bilibili-danmaku'

const API = 'https://api.live.bilibili.com'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
const MIXIN = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61, 26,
  17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52
]
const clean = (text: unknown): string => decodeEntities(String(text ?? '').replace(/<[^>]+>/g, ''))
const image = (text: unknown): string => String(text ?? '').replace(/^\/\//, 'https://')
const room = (item: BilibiliEvent): LiveRoomItem => ({
  roomId: String(item.roomid),
  title: clean(item.title),
  cover: image(item.cover),
  userName: clean(item.uname),
  online: Number(item.online) || 0
})

export class BilibiliSite implements LiveSite {
  readonly id = 'bilibili' as const
  readonly name = '哔哩哔哩'
  private buvid3 = ''
  private buvid4 = ''
  private mixinKey = ''
  constructor(private getCookie: () => string = () => '') {}
  getDanmaku(): LiveDanmaku {
    return new BilibiliDanmaku()
  }
  private async headers(): Promise<Record<string, string>> {
    const cookie = this.getCookie()
    const cookieBuvid = /(?:^|;\s*)buvid3=([^;]+)/.exec(cookie)?.[1]
    if (cookieBuvid) {
      this.buvid3 = cookieBuvid
      this.buvid4 = /(?:^|;\s*)buvid4=([^;]+)/.exec(cookie)?.[1] ?? ''
    }
    if (!this.buvid3) {
      const result = await getJson('https://api.bilibili.com/x/frontend/finger/spi', { headers: { 'user-agent': UA, referer: 'https://live.bilibili.com/' } })
      if (result.code !== 0) throw new Error(`获取 B站设备标识失败：${result.message}`)
      this.buvid3 = result.data.b_3
      this.buvid4 = result.data.b_4
    }
    return {
      'user-agent': UA,
      referer: 'https://live.bilibili.com/',
      cookie: cookie.includes('buvid3=') ? cookie : `${cookie}; buvid3=${this.buvid3}; buvid4=${this.buvid4};`
    }
  }
  private async signed(query: Query): Promise<Query> {
    if (!this.mixinKey) {
      const nav = await getJson('https://api.bilibili.com/x/web-interface/nav', { headers: await this.headers() })
      const keys = [nav.data.wbi_img.img_url, nav.data.wbi_img.sub_url].map((url: string) => url.split('/').pop()!.split('.')[0]).join('')
      this.mixinKey = MIXIN.map(index => keys[index])
        .join('')
        .slice(0, 32)
    }
    const sorted: Query = {}
    const params = { ...query, wts: Math.floor(Date.now() / 1000) }
    for (const key of Object.keys(params).sort()) sorted[key] = String((params as Query)[key] ?? '').replace(/[!'()*]/g, '')
    return { ...sorted, w_rid: md5Hex(encodeQuery(sorted) + this.mixinKey) }
  }
  private async api(path: string, query: Query = {}, signed = false): Promise<BilibiliEvent> {
    const result = await getJson(`${API}${path}`, { query: signed ? await this.signed(query) : query, headers: await this.headers() })
    if (result.code !== 0) throw new Error(`B站接口失败：${result.message ?? result.msg} (${result.code})`)
    return result.data
  }
  async getCategories(): Promise<LiveCategory[]> {
    const data = await this.api('/room/v1/Area/getList', { need_entrance: 1, parent_id: 0 })
    return (data as unknown as BilibiliEvent[]).map(item => ({
      id: String(item.id),
      name: String(item.name),
      children: item.list.map((sub: BilibiliEvent) => ({ id: String(sub.id), parentId: String(sub.parent_id), name: String(sub.name), pic: image(sub.pic) }))
    }))
  }
  async getCategoryRooms(category: LiveSubCategory, page: number): Promise<PagedResult<LiveRoomItem>> {
    // second/getList 对匿名访问触发 -352，改用无需网页风控 token 的官方分区接口。
    const data = await this.api('/room/v3/area/getRoomList', {
      platform: 'web',
      parent_area_id: category.parentId,
      area_id: category.id,
      sort_type: 'online',
      page,
      page_size: 30
    })
    return { hasMore: page * 30 < Number(data.count), items: data.list.map(room) }
  }

  async getRecommendRooms(page: number): Promise<PagedResult<LiveRoomItem>> {
    const data = await this.api('/xlive/web-interface/v1/second/getListByArea', { platform: 'web', sort: 'online', page_size: 30, page }, true)
    return { hasMore: data.list.length > 0, items: data.list.map(room) }
  }
  private async search(keyword: string, page: number, type: string): Promise<BilibiliEvent> {
    const result = await getJson('https://api.bilibili.com/x/web-interface/search/type', {
      query: { search_type: type, cover_type: 'user_cover', keyword, page, highlight: 0 },
      headers: await this.headers()
    })
    if (result.code !== 0) throw new Error(`B站搜索失败：${result.message} (${result.code})`)
    return result.data
  }
  async searchRooms(keyword: string, page: number): Promise<PagedResult<LiveRoomItem>> {
    const data = await this.search(keyword, page, 'live')
    const items = (data.result.live_room ?? []).map(room)
    return { hasMore: items.length >= 40, items }
  }
  async searchAnchors(keyword: string, page: number): Promise<PagedResult<LiveAnchorItem>> {
    const data = await this.search(keyword, page, 'live_user')
    const items = (data.result ?? []).map((item: BilibiliEvent) => ({
      roomId: String(item.roomid),
      avatar: image(item.uface),
      userName: clean(item.uname),
      liveStatus: item.is_live === true || Number(item.is_live) === 1
    }))
    return { hasMore: items.length >= 40, items }
  }
  async getRoomDetail(roomId: string): Promise<LiveRoomDetail> {
    const data = await this.api('/xlive/web-room/v1/index/getInfoByRoom', { room_id: roomId }, true)
    const info = data.room_info,
      anchor = data.anchor_info.base_info
    const danmaku = await this.api('/xlive/web-room/v1/index/getDanmuInfo', { id: info.room_id }, true)
    return {
      roomId: String(info.room_id),
      title: String(info.title),
      cover: image(info.cover),
      userName: String(anchor.uname),
      userAvatar: image(anchor.face),
      online: Number(info.online),
      introduction: clean(info.description),
      status: info.live_status === 1,
      isRecord: info.live_status === 2,
      url: `https://live.bilibili.com/${info.room_id}`,
      showTime: String(info.live_start_time ?? ''),
      danmakuData: {
        roomId: Number(info.room_id),
        uid: Number(/(?:^|;\s*)DedeUserID=(\d+)/.exec(this.getCookie())?.[1] ?? 0),
        token: danmaku.token,
        serverHost: danmaku.host_list[0].host,
        buvid: this.buvid3
      }
    }
  }
  private async play(roomId: string, qn?: number): Promise<BilibiliEvent> {
    const result = await this.api('/xlive/web-room/v2/index/getRoomPlayInfo', {
      room_id: roomId,
      protocol: '0,1',
      format: '0,1,2',
      codec: '0',
      platform: 'web',
      qn
    })
    if (!result.playurl_info?.playurl) throw new Error('直播间暂无可播放地址')
    return result.playurl_info.playurl
  }
  async getPlayQualities(detail: LiveRoomDetail): Promise<LivePlayQuality[]> {
    const play = await this.play(detail.roomId)
    const accepted = new Set<number>()
    for (const stream of play.stream)
      for (const format of stream.format) for (const codec of format.codec) for (const qn of codec.accept_qn) accepted.add(Number(qn))
    return play.g_qn_desc
      .filter((item: BilibiliEvent) => accepted.has(Number(item.qn)))
      .map((item: BilibiliEvent) => ({ quality: String(item.desc), data: Number(item.qn), sort: Number(item.qn) }))
  }
  async getPlayUrls(detail: LiveRoomDetail, quality: LivePlayQuality): Promise<LivePlayUrl> {
    const play = await this.play(detail.roomId, Number(quality.data))
    const lines: LivePlayUrl['lines'] = []
    for (const stream of play.stream)
      for (const format of stream.format)
        for (const codec of format.codec)
          for (const info of codec.url_info)
            lines.push({
              url: `${info.host}${codec.base_url}${info.extra}`,
              format: stream.protocol_name === 'http_hls' ? 'hls' : 'flv',
              name: `${format.format_name} · 线路 ${lines.length + 1}`
            })
    lines.sort((a, b) => Number(a.format === 'flv') - Number(b.format === 'flv') || Number(a.url.includes('mcdn')) - Number(b.url.includes('mcdn')))
    return { lines, headers: { referer: 'https://live.bilibili.com/', 'user-agent': UA } }
  }
  async getLiveStatus(roomId: string): Promise<boolean> {
    return (await this.api('/room/v1/Room/get_info', { room_id: roomId })).live_status === 1
  }
  async getSuperChatMessages(roomId: string): Promise<LiveSuperChatMessage[]> {
    return ((await this.api('/av/v1/SuperChat/getMessageList', { room_id: roomId })).list ?? []).map(bilibiliSuperChat)
  }
}
