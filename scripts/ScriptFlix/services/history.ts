import type { HistoryEntry, VideoItem } from '../types'

const AppStorage = Storage
const STORAGE_KEY = 'script_flix_history'
const MAX_HISTORY = 80

const getHistory = (): HistoryEntry[] => {
  return AppStorage.get(STORAGE_KEY) || []
}

const saveHistory = (entries: HistoryEntry[]) => {
  AppStorage.set(STORAGE_KEY, entries)
}

const addHistory = (video: VideoItem, sourceUrl: string, sourceName?: string) => {
  const entry: HistoryEntry = {
    video,
    sourceUrl,
    sourceName,
    watchedAt: Date.now()
  }

  const history = getHistory()
  const filtered = history.filter(item => !(item.video.vod_id === video.vod_id && item.sourceUrl === sourceUrl))
  const next = [entry, ...filtered].slice(0, MAX_HISTORY)
  saveHistory(next)
  return next
}

const clearHistory = () => {
  saveHistory([])
}

const setHistory = (entries: HistoryEntry[]) => {
  saveHistory(entries.slice(0, MAX_HISTORY))
}

export const HistoryService = {
  getHistory,
  addHistory,
  clearHistory,
  setHistory
}
