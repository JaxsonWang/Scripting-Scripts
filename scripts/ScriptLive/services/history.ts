import type { LiveRoomDetail, SiteId } from '../core/types'
import type { HistoryItem } from '../types'
import { formatDateTime } from '../utils/format'
import { createStore } from './store'

const MAX_HISTORY = 200

/** 按更新时间倒序保存 */
export const historyStore = createStore<HistoryItem[]>('history', [])

export const addHistory = (siteId: SiteId, detail: LiveRoomDetail) => {
  const id = `${siteId}_${detail.roomId}`
  const item: HistoryItem = { id, roomId: detail.roomId, siteId, userName: detail.userName, face: detail.userAvatar, updateTime: formatDateTime(new Date()) }
  historyStore.update(list => [item, ...list.filter(entry => entry.id !== id)].slice(0, MAX_HISTORY))
}

export const removeHistory = (id: string) => historyStore.update(list => list.filter(entry => entry.id !== id))

export const clearHistory = () => historyStore.set([])
