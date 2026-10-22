/**
 * 直播核心模型与站点接口。
 * core 目录只依赖运行时全局（fetch、Data、Crypto、WebSocket、定时器），不引用 'scripting'，
 * 便于在 Node 中用同一份代码验证真实接口。
 */

export type SiteId = 'bilibili' | 'douyu' | 'huya' | 'douyin'

export type LiveRoomItem = {
  roomId: string
  title: string
  cover: string
  userName: string
  /** 人气 / 在线人数 */
  online: number
}

export type LiveAnchorItem = {
  roomId: string
  avatar: string
  userName: string
  liveStatus: boolean
}

export type LiveSubCategory = {
  id: string
  name: string
  parentId: string
  pic?: string
}

export type LiveCategory = {
  id: string
  name: string
  children: LiveSubCategory[]
}

export type PagedResult<T> = {
  hasMore: boolean
  items: T[]
}

export type LiveRoomDetail = {
  roomId: string
  title: string
  cover: string
  userName: string
  userAvatar: string
  online: number
  introduction?: string
  notice?: string
  /** 是否直播中 */
  status: boolean
  /** 是否在轮播录像 */
  isRecord?: boolean
  /** 网页地址，用于分享与在浏览器打开 */
  url: string
  /** 开播时间（秒级时间戳字符串） */
  showTime?: string
  /** 站点私有的播放数据，只由对应站点读取；需可 JSON 序列化 */
  data?: unknown
  /** 站点私有的弹幕连接参数，只由对应站点的弹幕实现读取；需可 JSON 序列化 */
  danmakuData?: unknown
}

export type LivePlayQuality = {
  /** 清晰度名称，如「原画」「蓝光」 */
  quality: string
  /** 站点私有数据，交回 getPlayUrls 使用；需可 JSON 序列化 */
  data: unknown
  sort?: number
}

/**
 * 单条播放地址。
 * hls：AVPlayer 与 WebView 的 <video> 都能直接播放；
 * flv：只能在 WebView 中借助 mpegts.js 播放，原生播放器会跳过。
 */
export type LivePlayLine = {
  url: string
  format: 'hls' | 'flv'
  /** 线路名，如 CDN 名称 */
  name?: string
}

export type LivePlayUrl = {
  lines: LivePlayLine[]
  /** 播放时需要附带的请求头；只有原生播放器能携带 */
  headers?: Record<string, string>
}

export type LiveMessageColor = { r: number; g: number; b: number }

export type LiveMessage =
  | { type: 'chat'; userName: string; message: string; color: LiveMessageColor }
  | { type: 'online'; online: number }
  | { type: 'superChat'; superChat: LiveSuperChatMessage }
  | { type: 'gift'; userName: string; message: string }

export type LiveSuperChatMessage = {
  id: string
  userName: string
  face: string
  message: string
  price: number
  /** 毫秒时间戳 */
  startTime: number
  /** 毫秒时间戳 */
  endTime: number
  backgroundColor: string
  backgroundBottomColor: string
}

/**
 * 弹幕连接。start 建立连接并开始心跳，stop 关闭连接并清理定时器。
 * 连接异常或被服务端关闭时调用 onClose，由界面决定是否重连。
 */
export interface LiveDanmaku {
  onMessage?: (message: LiveMessage) => void
  onReady?: () => void
  onClose?: (reason: string) => void
  start(args: unknown): Promise<void>
  stop(): Promise<void>
}

export interface LiveSite {
  readonly id: SiteId
  readonly name: string
  getDanmaku(): LiveDanmaku
  getCategories(): Promise<LiveCategory[]>
  getCategoryRooms(category: LiveSubCategory, page: number): Promise<PagedResult<LiveRoomItem>>
  getRecommendRooms(page: number): Promise<PagedResult<LiveRoomItem>>
  searchRooms(keyword: string, page: number): Promise<PagedResult<LiveRoomItem>>
  searchAnchors(keyword: string, page: number): Promise<PagedResult<LiveAnchorItem>>
  getRoomDetail(roomId: string): Promise<LiveRoomDetail>
  getPlayQualities(detail: LiveRoomDetail): Promise<LivePlayQuality[]>
  getPlayUrls(detail: LiveRoomDetail, quality: LivePlayQuality): Promise<LivePlayUrl>
  getLiveStatus(roomId: string): Promise<boolean>
  getSuperChatMessages(roomId: string): Promise<LiveSuperChatMessage[]>
}

/** 站点需要的账号凭据，由 App 层从存储读取后注入 */
export type SiteCredentials = {
  bilibiliCookie?: string
  douyinCookie?: string
}

export const WHITE: LiveMessageColor = { r: 255, g: 255, b: 255 }

/**
 * 把整数颜色转换为 RGB；兼容 6 位与带透明度的 8 位十六进制。
 * @param value 站点下发的颜色整数
 */
export const numberToColor = (value: number): LiveMessageColor => {
  let hex = Math.max(0, Math.floor(value)).toString(16)
  if (hex.length === 4) hex = `00${hex}`
  if (hex.length === 8) hex = hex.slice(2)
  if (hex.length !== 6) return WHITE
  return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) }
}

export const colorToHex = ({ r, g, b }: LiveMessageColor): string => `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`
