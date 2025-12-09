import { type WidgetSize } from './typeof'
import { createStorageManager } from './utils/storage'

/**
 * 透明背景小组件的存储管理
 * 参考油价小组件的存储方案
 */
const STORAGE_NAME = 'ScriptPie.TransparentBgSettings'

// 存储键名常量
const STORAGE_KEYS = {
  WIDGET_POSITION_DATA: 'widgetPositionData',
  SAVE_PATH: 'savePath'
} as const

// 创建存储管理器实例
const storageManager = createStorageManager(STORAGE_NAME)

/**
 * 获取小组件位置缓存数据
 * @returns 小组件位置数据或 null
 */
export const getCache = (): WidgetSize | null => {
  return storageManager.storage.get<WidgetSize>(STORAGE_KEYS.WIDGET_POSITION_DATA) || null
}

/**
 * 设置小组件位置缓存数据
 * @param widgetData - 小组件位置和尺寸数据
 */
export const setCache = (widgetData: WidgetSize): void => {
  storageManager.storage.set(STORAGE_KEYS.WIDGET_POSITION_DATA, widgetData)
}

/**
 * 获取用户保存路径
 * @returns 保存路径或 null
 */
export const getSavePath = (): string | null => {
  return storageManager.storage.get<string>(STORAGE_KEYS.SAVE_PATH) || null
}

/**
 * 设置用户保存路径
 * @param path - 保存路径
 */
export const setSavePath = (path: string): void => {
  storageManager.storage.set(STORAGE_KEYS.SAVE_PATH, path)
}
