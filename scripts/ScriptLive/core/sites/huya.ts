/** 虎牙直播站点与 TUP 签名流程。 */
import { base64DecodeText, md5Hex } from '../bytes'
import { buildUrl, getJson, getText, parseQuery, request } from '../http'
import { decodeEntities } from '../text'
import type {
  LiveAnchorItem,
  LiveCategory,
  LivePlayQuality,
  LivePlayUrl,
  LiveRoomDetail,
  LiveRoomItem,
  LiveSite,
  LiveSubCategory,
  LiveSuperChatMessage,
  PagedResult
} from '../types'
import { HuyaDanmaku } from './huya-danmaku'
import { decodeTupResponse, encodeTupRequest } from './huya-tars'

type JsonObject = Record<string, unknown>
type HuyaLine = {
  flvUrl: string
  hlsUrl: string
  streamName: string
  cdnType: string
  presenterUid: string
}
type HuyaPlayback = { lines: HuyaLine[]; bitRates: { name: string; bitRate: number }[] }
type HuyaQuality = { bitRate: number }

const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36'
const CDN_PRIORITY: Record<string, number> = { HS: 0, TX: 1, AL: 2 }
const SDK_UA = 'HYSDK(Windows, 30000002)_APP(pc_exe&7060000&official)_SDK(trans&2.32.3.5646)'
const object = (value: unknown): JsonObject => (value && typeof value === 'object' ? (value as JsonObject) : {})
const list = (value: unknown): JsonObject[] => (Array.isArray(value) ? value.map(object) : [])
const text = (value: unknown): string => (value == null ? '' : String(value))
const number = (value: unknown): number => Number(value) || 0
const https = (url: string): string => url.replace(/^http:/, 'https:').replace(/^\/\//, 'https://')
const cover = (value: unknown): string => {
  const url = https(text(value))
  return url && !url.includes('?') ? `${url}?x-oss-process=style/w338_h190` : url
}

export class HuyaSite implements LiveSite {
  readonly id = 'huya' as const
  readonly name = '虎牙直播'

  getDanmaku(): HuyaDanmaku {
    return new HuyaDanmaku()
  }

  async getCategories(): Promise<LiveCategory[]> {
    const categories: LiveCategory[] = [
      { id: '1', name: '网游', children: [] },
      { id: '2', name: '单机', children: [] },
      { id: '8', name: '娱乐', children: [] },
      { id: '3', name: '手游', children: [] }
    ]
    await Promise.all(
      categories.map(async category => {
        const result = await getJson<JsonObject>('https://live.cdn.huya.com/liveconfig/game/bussLive', { query: { bussType: category.id } })
        category.children = list(result.data).map(item => {
          const id = text(typeof item.gid === 'object' ? object(item.gid).value : item.gid).split(',')[0]
          return { id, name: text(item.gameFullName), parentId: category.id, pic: `https://huyaimg.msstatic.com/cdnimage/game/${id}-MS.jpg` }
        })
      })
    )
    return categories
  }

  private async getRooms(page: number, gameId?: string): Promise<PagedResult<LiveRoomItem>> {
    const result = await getJson<JsonObject>('https://www.huya.com/cache.php', {
      query: { m: 'LiveList', do: 'getLiveListByPage', tagAll: 0, page, gameId }
    })
    const data = object(result.data)
    return {
      hasMore: number(data.page) < number(data.totalPage),
      items: list(data.datas).map(item => ({
        roomId: text(item.profileRoom),
        title: decodeEntities(text(item.introduction) || text(item.roomName)),
        cover: cover(item.screenshot),
        userName: text(item.nick),
        online: number(item.totalCount)
      }))
    }
  }

  getCategoryRooms(category: LiveSubCategory, page: number): Promise<PagedResult<LiveRoomItem>> {
    return this.getRooms(page, category.id)
  }

  getRecommendRooms(page: number): Promise<PagedResult<LiveRoomItem>> {
    return this.getRooms(page)
  }

  private async search(keyword: string, page: number, version: number): Promise<JsonObject> {
    const result = await getJson<JsonObject>('https://search.cdn.huya.com/', {
      query: { m: 'Search', do: 'getSearchContent', q: keyword, uid: 0, v: version, typ: -5, livestate: 0, rows: 20, start: (page - 1) * 20 }
    })
    return object(object(result.response)[version === 4 ? '3' : '1'])
  }

  async searchRooms(keyword: string, page: number): Promise<PagedResult<LiveRoomItem>> {
    const data = await this.search(keyword, page, 4)
    return {
      hasMore: number(data.numFound) > page * 20,
      items: list(data.docs).map(item => ({
        roomId: text(item.room_id),
        title: decodeEntities(text(item.game_introduction) || text(item.game_roomName)),
        cover: cover(item.game_screenshot),
        userName: text(item.game_nick),
        online: number(item.game_total_count)
      }))
    }
  }

  async searchAnchors(keyword: string, page: number): Promise<PagedResult<LiveAnchorItem>> {
    const data = await this.search(keyword, page, 1)
    return {
      hasMore: number(data.numFound) > page * 20,
      items: list(data.docs).map(item => ({
        roomId: text(item.room_id),
        avatar: https(text(item.game_avatarUrl180)),
        userName: text(item.game_nick),
        liveStatus: item.gameLiveOn === true || number(item.gameLiveOn) === 1
      }))
    }
  }

  private async getRoomInfo(roomId: string): Promise<JsonObject> {
    const html = await getText(`https://m.huya.com/${encodeURIComponent(roomId)}`, { headers: { 'User-Agent': MOBILE_UA } })
    const match = /window\.HNF_GLOBAL_INIT\s*=\s*([\s\S]*?)<\/script>/.exec(html)
    if (!match) throw new Error('未找到虎牙房间信息，请检查房间号')
    // 页面对象中的回调不是 JSON；仅去掉上游固定的函数值，不执行页面代码。
    const json = match[1]
      .trim()
      .replace(/;\s*$/, '')
      .replace(/function\s*\([^)]*\)\s*\{[\s\S]*?\}/g, '""')
      // 在 JSON.parse 前保留 int64 的十进制原值，避免弹幕 uid 丢精度。
      .replace(/("(?:lYyid|lChannelId|lSubChannelId|lPresenterUid|lUid|lChannel|lLiveChannel)"\s*:\s*)(\d+)/g, '$1"$2"')
    const info = object(JSON.parse(json))
    if (!info.roomInfo) throw new Error('虎牙房间不存在，请检查房间号或主播主页地址')
    return info
  }

  async getRoomDetail(roomId: string): Promise<LiveRoomDetail> {
    const info = await this.getRoomInfo(roomId)
    const room = object(info.roomInfo)
    const live = object(room.tLiveInfo)
    const profile = object(room.tProfileInfo)
    const stream = object(live.tLiveStreamInfo)
    const streamInfo = list(object(stream.vStreamInfo).value)
    const first = streamInfo[0] ?? {}
    const lines: HuyaLine[] = streamInfo
      .filter(item => item.sFlvUrl || item.sHlsUrl)
      .map(item => ({
        flvUrl: https(text(item.sFlvUrl)),
        hlsUrl: https(text(item.sHlsUrl)),
        streamName: text(item.sStreamName),
        cdnType: text(item.sCdnType),
        presenterUid: text(item.lPresenterUid || item.lChannelId || live.lChannel || 0)
      }))
      // HS 的 HTTPS HLS 在实测中可直接播放；其余 CDN 保留为备选线路。
      .sort((a, b) => (CDN_PRIORITY[a.cdnType] ?? 3) - (CDN_PRIORITY[b.cdnType] ?? 3))
    const data: HuyaPlayback = {
      lines,
      bitRates: list(object(stream.vBitRateInfo).value)
        .filter(item => !text(item.sDisplayName).includes('HDR'))
        .map(item => ({ name: text(item.sDisplayName), bitRate: number(item.iBitRate) }))
    }
    return {
      roomId: text(live.lProfileRoom || roomId),
      title: decodeEntities(text(live.sIntroduction) || text(live.sRoomName)),
      cover: cover(live.sScreenshot),
      userName: text(profile.sNick),
      userAvatar: https(text(profile.sAvatar180)),
      online: number(live.lTotalCount),
      introduction: text(live.sIntroduction),
      notice: text(info.welcomeText),
      status: number(room.eLiveStatus) === 2,
      showTime: text(live.iStartTime),
      url: `https://www.huya.com/${encodeURIComponent(roomId)}`,
      data,
      danmakuData: {
        ayyuid: text(live.lYyid || 0),
        topSid: text(first.lChannelId || live.lChannel || 0),
        subSid: text(first.lSubChannelId || live.lLiveChannel || 0)
      }
    }
  }

  async getPlayQualities(detail: LiveRoomDetail): Promise<LivePlayQuality[]> {
    const data = detail.data as HuyaPlayback
    const bitRates = data.bitRates.length
      ? data.bitRates
      : [
          { name: '原画', bitRate: 0 },
          { name: '高清', bitRate: 2000 }
        ]
    return bitRates.map(item => ({ quality: item.name, data: { bitRate: item.bitRate }, sort: item.bitRate }))
  }

  async getPlayUrls(detail: LiveRoomDetail, quality: LivePlayQuality): Promise<LivePlayUrl> {
    const data = detail.data as HuyaPlayback
    const { bitRate } = quality.data as HuyaQuality
    if (!data.lines.length) throw new Error('该虎牙房间没有可播放的线路')
    // 多条 CDN 常共用一个 streamName，单次获取新 token 即可，避免重复签名请求。
    const tokens = new Map<string, string>()
    for (const line of data.lines) {
      if (!tokens.has(line.streamName)) tokens.set(line.streamName, await this.getCdnToken(line.streamName))
    }
    const signed = data.lines.map(line => ({ line, antiCode: buildAntiCode(line.streamName, line.presenterUid, tokens.get(line.streamName)!) }))
    const lines: LivePlayUrl['lines'] = []
    for (const format of ['hls', 'flv'] as const) {
      for (const { line, antiCode } of signed) {
        const base = format === 'hls' ? line.hlsUrl : line.flvUrl
        if (!base) continue
        const url = buildUrl(`${base}/${line.streamName}.${format === 'hls' ? 'm3u8' : 'flv'}?${antiCode}`, {
          codec: 264,
          ratio: bitRate > 0 ? bitRate : undefined
        })
        lines.push({ url, format, name: `${line.cdnType} ${format.toUpperCase()}` })
      }
    }
    // TX / HS HLS 无需自定义请求头，原生与 WebView 使用同一地址。
    return { lines }
  }

  private async getCdnToken(streamName: string): Promise<string> {
    const body = encodeTupRequest('liveui', 'getCdnTokenInfoEx', writer => {
      writer.writeString('', 0).writeString(streamName, 1).writeInt(0, 2)
      writer.writeStruct(3, user => {
        user
          .writeInt(0, 0)
          .writeString('', 1)
          .writeString('', 2)
          .writeString('pc_exe&7060000&official', 3)
          .writeString('', 4)
          .writeInt(0, 5)
          .writeString('', 6)
          .writeString('', 7)
      })
      writer.writeInt(66, 4)
    })
    const response = await request(
      'https://wup.huya.com',
      { method: 'POST', body },
      { headers: { 'Content-Type': 'application/x-wup', 'User-Agent': SDK_UA, Origin: 'https://m.huya.com/', Referer: 'https://m.huya.com/' } }
    )
    return decodeTupResponse(new Uint8Array(await response.arrayBuffer()), reader => reader.readString(0, true))
  }

  async getLiveStatus(roomId: string): Promise<boolean> {
    return number(object((await this.getRoomInfo(roomId)).roomInfo).eLiveStatus) === 2
  }

  async getSuperChatMessages(_roomId: string): Promise<LiveSuperChatMessage[]> {
    return []
  }
}

/** 与上游相同：非移动端签名仅轮转 uid 低 32 位，所有 uid 运算使用 BigInt。 */
function buildAntiCode(stream: string, presenterUid: string, antiCode: string): string {
  const query = parseQuery(antiCode)
  if (!query.fm) return antiCode
  const uid = BigInt(presenterUid)
  const low = uid & 0xffffffffn
  const rotated = (uid & ~0xffffffffn) | (((low << 8n) | (low >> 24n)) & 0xffffffffn)
  const ctype = query.ctype || 'huya_pc_exe'
  const platform = number(query.t)
  const seqId = uid + BigInt(Date.now())
  const secretHash = md5Hex(`${seqId}|${ctype}|${platform}`)
  const prefix = base64DecodeText(query.fm).split('_')[0]
  const secret = md5Hex(`${prefix}_${platform === 103 ? uid : rotated}_${stream}_${secretHash}_${query.wsTime}`)
  const params: Record<string, string> = {
    wsSecret: secret,
    wsTime: query.wsTime,
    seqid: String(seqId),
    ctype,
    ver: '1',
    fs: query.fs,
    fm: query.fm,
    t: String(platform)
  }
  if (platform === 103) {
    params.uid = String(uid)
    const ct = Math.floor((parseInt(query.wsTime, 16) + Math.random()) * 1000)
    params.uuid = String(Math.floor((((ct % 1e10) + Math.random()) * 1e3) % 0xffffffff))
  } else params.u = String(rotated)
  return buildUrl('', params).slice(1)
}
