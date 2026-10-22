import type { SiteId } from '../core/types'
import { createStore } from './store'

export type ThemeMode = 'auto' | 'light' | 'dark'

/** 清晰度偏好：0 最低 1 中等 2 最高，与上游一致 */
export type QualityLevel = 0 | 1 | 2

export type AppSettings = {
  themeMode: ThemeMode
  /** 首页、分类、搜索里的平台顺序 */
  siteOrder: SiteId[]
  qualityLevel: QualityLevel
  /** 使用蜂窝网络时的清晰度 */
  qualityLevelCellular: QualityLevel
  /** 把 http 播放地址替换为 https */
  forceHttps: boolean
  showSuperChat: boolean
  chatTextSize: number
  danmakuEnable: boolean
  danmakuSize: number
  /** 弹幕横穿屏幕的秒数，越小越快 */
  danmakuSpeed: number
  /** 弹幕占播放器高度的比例 */
  danmakuArea: number
  danmakuOpacity: number
  /** 屏蔽词；以 / 包裹时按正则匹配 */
  shieldWords: string[]
  autoExitEnable: boolean
  autoExitMinutes: number
  followAutoRefresh: boolean
  followRefreshMinutes: number
  followConcurrency: number
}

export const ALL_SITES: SiteId[] = ['bilibili', 'douyu', 'huya', 'douyin']

export const DEFAULT_SETTINGS: AppSettings = {
  themeMode: 'auto',
  siteOrder: ALL_SITES,
  qualityLevel: 2,
  qualityLevelCellular: 1,
  forceHttps: false,
  showSuperChat: true,
  chatTextSize: 14,
  danmakuEnable: true,
  danmakuSize: 16,
  danmakuSpeed: 10,
  danmakuArea: 0.8,
  danmakuOpacity: 1,
  shieldWords: [],
  autoExitEnable: false,
  autoExitMinutes: 60,
  followAutoRefresh: false,
  followRefreshMinutes: 10,
  followConcurrency: 4
}

/** 合并新增字段，并保证平台顺序包含且只包含全部平台 */
const normalize = (stored: AppSettings): AppSettings => {
  const merged = { ...DEFAULT_SETTINGS, ...stored }
  const order = merged.siteOrder.filter(id => ALL_SITES.includes(id))
  ALL_SITES.forEach(id => !order.includes(id) && order.push(id))
  return { ...merged, siteOrder: order }
}

export const settingsStore = createStore<AppSettings>('settings', DEFAULT_SETTINGS, normalize)

export const updateSettings = (patch: Partial<AppSettings>) => settingsStore.update(current => ({ ...current, ...patch }))

/**
 * 按屏蔽词过滤弹幕。
 * @param message 弹幕内容
 * @param words 屏蔽词列表
 */
export const isShielded = (message: string, words: string[]): boolean =>
  words.some(word => {
    if (word.length > 2 && word.startsWith('/') && word.endsWith('/')) {
      try {
        return new RegExp(word.slice(1, -1)).test(message)
      } catch {
        return false
      }
    }
    return message.includes(word)
  })
