import type { SiteId } from '../core/types'
import type { FollowTag, FollowUser, LiveState } from '../types'
import { formatDateTime } from '../utils/format'
import { settingsStore } from './settings'
import { getSite } from './sites'
import { createSignal, createStore } from './store'

export const DEFAULT_TAG = '全部'

/** 旧版本批量导入时用毫秒时间戳作标签 ID，同一批可能重复；读取时给重复项换新 ID，按 ID 删除、重命名才不会误伤其他标签 */
const uniqueTagIds = (tags: FollowTag[]): FollowTag[] => {
  const seen = new Set<string>()
  return tags.map(tag => {
    if (!seen.has(tag.id)) {
      seen.add(tag.id)
      return tag
    }
    return { ...tag, id: UUID.string() }
  })
}

export const followStore = createStore<FollowUser[]>('follows', [])
export const tagStore = createStore<FollowTag[]>('follow_tags', [], uniqueTagIds)

/** 每个关注的直播状态只在内存中保存，打开脚本后重新查询 */
export const liveStateStore = createSignal<Record<string, LiveState>>({})
export const refreshingStore = createSignal(false)

export const followId = (siteId: SiteId, roomId: string) => `${siteId}_${roomId}`

export const isFollowed = (siteId: SiteId, roomId: string) => followStore.get().some(item => item.id === followId(siteId, roomId))

export const addFollow = (input: { siteId: SiteId; roomId: string; userName: string; face: string }) => {
  const id = followId(input.siteId, input.roomId)
  const existing = followStore.get().find(item => item.id === id)
  const user: FollowUser = existing
    ? { ...existing, userName: input.userName, face: input.face }
    : { id, roomId: input.roomId, siteId: input.siteId, userName: input.userName, face: input.face, addTime: formatDateTime(new Date()), tag: DEFAULT_TAG }
  followStore.update(list => (existing ? list.map(item => (item.id === id ? user : item)) : [user, ...list]))
}

export const removeFollow = (id: string) => {
  followStore.update(list => list.filter(item => item.id !== id))
  tagStore.update(tags => tags.map(tag => ({ ...tag, userId: tag.userId.filter(userId => userId !== id) })))
}

export const addTag = (name: string): boolean => {
  const tag = name.trim()
  if (!tag || tag === DEFAULT_TAG || tagStore.get().some(item => item.tag === tag)) return false
  tagStore.update(tags => [...tags, { id: UUID.string(), tag, userId: [] }])
  return true
}

export const renameTag = (id: string, name: string): boolean => {
  const next = name.trim()
  const current = tagStore.get().find(item => item.id === id)
  if (!current || !next || next === DEFAULT_TAG || tagStore.get().some(item => item.tag === next && item.id !== id)) return false
  tagStore.update(tags => tags.map(tag => (tag.id === id ? { ...tag, tag: next } : tag)))
  followStore.update(list => list.map(user => (user.tag === current.tag ? { ...user, tag: next } : user)))
  return true
}

export const removeTag = (id: string) => {
  const current = tagStore.get().find(item => item.id === id)
  if (!current) return
  tagStore.update(tags => tags.filter(tag => tag.id !== id))
  followStore.update(list => list.map(user => (user.tag === current.tag ? { ...user, tag: DEFAULT_TAG } : user)))
}

/** 把关注移入某个标签；「全部」表示移出所有自定义标签 */
export const setFollowTag = (userId: string, tagName: string) => {
  followStore.update(list => list.map(user => (user.id === userId ? { ...user, tag: tagName } : user)))
  tagStore.update(tags =>
    tags.map(tag => ({
      ...tag,
      userId: tag.tag === tagName ? Array.from(new Set([...tag.userId, userId])) : tag.userId.filter(id => id !== userId)
    }))
  )
}

const setLiveState = (id: string, state: LiveState) => liveStateStore.update(map => ({ ...map, [id]: state }))

/** 查询单个关注的直播状态；失败时记为未知并保留错误日志 */
const refreshOne = async (user: FollowUser) => {
  try {
    const living = await getSite(user.siteId).getLiveStatus(user.roomId)
    setLiveState(user.id, living ? 2 : 1)
  } catch (error) {
    console.warn(`[ScriptLive] 查询 ${user.siteId}/${user.roomId} 直播状态失败`, error)
    setLiveState(user.id, 0)
  }
}

/** 用固定数量的并发任务刷新全部关注 */
export const refreshLiveStates = async () => {
  if (refreshingStore.get()) return
  refreshingStore.set(true)
  try {
    const queue = [...followStore.get()]
    const workerCount = Math.max(1, Math.min(20, settingsStore.get().followConcurrency))
    const worker = async () => {
      for (let user = queue.shift(); user; user = queue.shift()) await refreshOne(user)
    }
    await Promise.all(Array.from({ length: workerCount }, worker))
  } finally {
    refreshingStore.set(false)
  }
}

let autoRefreshTimer: number | null = null

/** 按设置开启或关闭定时刷新；设置变化时重新调度 */
export const scheduleAutoRefresh = () => {
  if (autoRefreshTimer !== null) clearInterval(autoRefreshTimer)
  autoRefreshTimer = null
  const { followAutoRefresh, followRefreshMinutes } = settingsStore.get()
  if (followAutoRefresh) autoRefreshTimer = setInterval(refreshLiveStates, Math.max(1, followRefreshMinutes) * 60_000)
}

/** 导入关注时合并：已存在的条目更新昵称头像与标签，新条目追加，并补齐标签表 */
export const mergeFollows = (users: FollowUser[], tags: FollowTag[] = []) => {
  const incoming = new Map(users.map(user => [user.id, user]))
  followStore.update(list => {
    const merged = list.map(user => incoming.get(user.id) ?? user)
    const known = new Set(list.map(user => user.id))
    return [...merged, ...users.filter(user => !known.has(user.id))]
  })
  const names = new Set([...tags.map(tag => tag.tag), ...users.map(user => user.tag)].filter(tag => tag && tag !== DEFAULT_TAG))
  names.forEach(name => addTag(name))
  const all = followStore.get()
  tagStore.update(current => current.map(tag => ({ ...tag, userId: all.filter(user => user.tag === tag.tag).map(user => user.id) })))
}
