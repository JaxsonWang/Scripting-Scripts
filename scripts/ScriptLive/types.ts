import type { SiteId } from './core/types'

/**
 * 关注、标签、观看记录的数据模型，字段与导出 JSON 及 WebDAV 备份格式一致。
 */
export type FollowUser = {
  /** `${siteId}_${roomId}` */
  id: string
  roomId: string
  siteId: SiteId
  userName: string
  face: string
  /** 本地日期时间字符串，如 `2026-10-22 20:30:00.000` */
  addTime: string
  /** 所属标签，默认「全部」 */
  tag: string
}

export type FollowTag = {
  id: string
  tag: string
  /** 标签下的关注 id */
  userId: string[]
}

export type HistoryItem = {
  id: string
  roomId: string
  siteId: SiteId
  userName: string
  face: string
  updateTime: string
}

/** 关注的直播状态：0 未知（加载中或失败） 1 未开播 2 直播中 */
export type LiveState = 0 | 1 | 2

export type RoomTarget = { siteId: SiteId; roomId: string }
