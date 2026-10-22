import { randomString } from '../bytes'
import { getJson, parseQuery, postForm } from '../http'
import { decodeEntities } from '../text'
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
import { DouyuDanmaku } from './douyu-danmaku'
import { signDouyu } from './douyu-sign'

// 斗鱼多个接口使用不同字段结构，在各方法内映射到统一模型。
type ApiItem = Record<string, any>
type DouyuPlayData = { rate: number }
type DouyuStream = {
  settings: { name: string; rate: number; high_bit: number }[]
  url: string
  pass: number
}
const BASE = 'https://www.douyu.com'
const MOBILE = 'https://m.douyu.com'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const hot = (value: unknown): number => {
  const text = String(value)
  return Math.round(parseFloat(text) * (text.includes('万') ? 10000 : 1)) || 0
}
const roomItem = (item: ApiItem): LiveRoomItem => ({
  roomId: String(item.rid),
  title: decodeEntities(item.rn),
  cover: String(item.rs16),
  userName: decodeEntities(item.nn),
  online: Number(item.ol) || 0
})

export class DouyuSite implements LiveSite {
  readonly id = 'douyu' as const
  readonly name = '斗鱼直播'
  private did = randomString(32, '0123456789abcdef')
  private headers(roomId = ''): Record<string, string> {
    return { 'user-agent': UA, referer: `${BASE}/${roomId}`, cookie: `dy_did=${this.did}; acf_did=${this.did}` }
  }
  getDanmaku(): LiveDanmaku {
    return new DouyuDanmaku()
  }
  async getCategories(): Promise<LiveCategory[]> {
    const result = await getJson('https://m.douyu.com/api/cate/list')
    return result.data.cate1Info
      .map((item: ApiItem) => ({
        id: String(item.cate1Id),
        name: String(item.cate1Name),
        children: result.data.cate2Info
          .filter((sub: ApiItem) => sub.cate1Id === item.cate1Id)
          .map((sub: ApiItem) => ({ id: String(sub.cate2Id), parentId: String(item.cate1Id), name: String(sub.cate2Name), pic: String(sub.icon) }))
      }))
      .sort((a: LiveCategory, b: LiveCategory) => Number(a.id) - Number(b.id))
  }
  private async rooms(path: string, page: number): Promise<PagedResult<LiveRoomItem>> {
    const result = await getJson(`${BASE}${path}`, { headers: this.headers() })
    const code = Number(result.error ?? result.code)
    if (code !== 0) throw new Error(`斗鱼列表失败：${result.msg} (${code})`)
    return { hasMore: page < Number(result.data.pgcnt), items: result.data.rl.filter((item: ApiItem) => item.type === 1).map(roomItem) }
  }
  getCategoryRooms(category: LiveSubCategory, page: number): Promise<PagedResult<LiveRoomItem>> {
    return this.rooms(`/gapi/rkc/directory/mixList/2_${category.id}/${page}`, page)
  }
  getRecommendRooms(page: number): Promise<PagedResult<LiveRoomItem>> {
    return this.rooms(`/japi/weblist/apinc/allpage/6/${page}`, page)
  }
  private async search(keyword: string, page: number, type: string): Promise<ApiItem> {
    const result = await getJson(`${BASE}/japi/search/api/${type}`, {
      query: { kw: keyword, page, pageSize: 20, ...(type === 'searchUser' ? { filterType: 1 } : {}) },
      headers: this.headers('search/')
    })
    if (Number(result.error) !== 0) throw new Error(`斗鱼搜索失败：${result.msg}`)
    return result.data
  }
  async searchRooms(keyword: string, page: number): Promise<PagedResult<LiveRoomItem>> {
    const result = await this.search(keyword, page, 'searchShow')
    const items = result.relateShow.map((item: ApiItem) => ({
      roomId: String(item.rid),
      title: decodeEntities(item.roomName),
      cover: String(item.roomSrc),
      userName: decodeEntities(item.nickName),
      online: hot(item.hot)
    }))
    return { items, hasMore: items.length > 0 }
  }
  async searchAnchors(keyword: string, page: number): Promise<PagedResult<LiveAnchorItem>> {
    const result = await this.search(keyword, page, 'searchUser')
    const items = result.relateUser.map((item: ApiItem) => ({
      roomId: String(item.anchorInfo.rid),
      avatar: String(item.anchorInfo.avatar),
      userName: String(item.anchorInfo.nickName),
      liveStatus: Number(item.anchorInfo.isLive) === 1 && Number(item.anchorInfo.roomType) === 0
    }))
    return { items, hasMore: items.length > 0 }
  }
  private async roomInfo(roomId: string): Promise<ApiItem> {
    const result = await getJson(`${BASE}/betard/${encodeURIComponent(roomId)}`, { headers: this.headers(roomId) })
    if (!result.room) throw new Error('斗鱼直播间不存在或无法访问')
    return result.room
  }
  async getRoomDetail(roomId: string): Promise<LiveRoomDetail> {
    const info = await this.roomInfo(roomId)
    return {
      roomId: String(info.room_id),
      title: decodeEntities(info.room_name),
      cover: String(info.room_pic),
      userName: decodeEntities(info.owner_name),
      userAvatar: String(info.owner_avatar),
      online: hot(info.room_biz_all?.hot),
      introduction: String(info.show_details ?? ''),
      status: Number(info.show_status) === 1 && Number(info.videoLoop) !== 1,
      isRecord: Number(info.videoLoop) === 1,
      url: `${BASE}/${info.room_id}`,
      showTime: String(info.show_time ?? ''),
      data: { roomId: String(info.room_id) },
      danmakuData: String(info.room_id)
    }
  }
  /** 移动端返回可直连的 HLS，清单及分片均由斗鱼携带签名。 */
  private async play(roomId: string, rate: number): Promise<DouyuStream> {
    const encryption = await getJson<{ error: number; msg: string; data: Record<string, string> }>(`${BASE}/swf_api/homeH5Enc`, {
      query: { rids: roomId },
      headers: this.headers(roomId)
    })
    if (Number(encryption.error) !== 0) throw new Error(`斗鱼签名密钥获取失败：${encryption.msg}`)
    const signature = await signDouyu(encryption.data[`room${roomId}`], roomId, this.did)
    const result = await postForm<{ error: number; msg: string; data: DouyuStream }>(
      `${MOBILE}/hgapi/livenc/room/getStreamUrl`,
      { ...parseQuery(signature), ver: '22011191', rid: roomId, rate },
      { headers: { 'user-agent': MOBILE_UA, referer: `${MOBILE}/${roomId}` } }
    )
    if (Number(result.error) !== 0) throw new Error(`斗鱼播放接口失败：${result.msg} (${result.error})`)
    if (result.data.pass) throw new Error('该斗鱼直播间需要密码，请在斗鱼官方客户端观看')
    if (!result.data.url) throw new Error('斗鱼未返回移动端播放地址')
    return result.data
  }
  async getPlayQualities(detail: LiveRoomDetail): Promise<LivePlayQuality[]> {
    const data = await this.play(detail.roomId, -1)
    return data.settings
      .filter(item => item.high_bit === 0)
      .map(item => ({
        // 移动端 rate=0 也可能沿用桌面端的「原画2K」名称，实际流不一定达到该分辨率。
        quality: item.rate === 0 ? '移动端默认' : `${item.name}（移动端）`,
        data: { rate: item.rate }
      }))
  }
  async getPlayUrls(detail: LiveRoomDetail, quality: LivePlayQuality): Promise<LivePlayUrl> {
    const data = quality.data as DouyuPlayData
    const play = await this.play(detail.roomId, data.rate)
    return { lines: [{ url: play.url, format: 'hls', name: '移动端 HLS' }] }
  }
  async getLiveStatus(roomId: string): Promise<boolean> {
    const info = await this.roomInfo(roomId)
    return Number(info.show_status) === 1 && Number(info.videoLoop) !== 1
  }
  async getSuperChatMessages(_roomId: string): Promise<LiveSuperChatMessage[]> {
    return []
  }
}
