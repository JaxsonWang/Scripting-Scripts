import type { ApiSource } from '../types'

// Cast to any to avoid conflict with DOM Storage interface
const AppStorage = Storage

const STORAGE_KEY_SOURCES = 'script_flix_sources'
const STORAGE_KEY_INDEX = 'script_flix_currentSourceIndex'

const defaultSources: ApiSource[] = []

/**
 * 从本地存储读取所有视频源配置
 */
const getSources = (): ApiSource[] => {
  return AppStorage.get(STORAGE_KEY_SOURCES) || defaultSources
}

/**
 * 持久化视频源数组
 * @param sources 新的视频源数组
 */
const saveSources = (sources: ApiSource[]) => {
  AppStorage.set(STORAGE_KEY_SOURCES, sources)
}

/**
 * 获取当前选中的视频源下标
 */
const getCurrentSourceIndex = (): number => {
  const index = AppStorage.get(STORAGE_KEY_INDEX)
  return index !== undefined ? (index as number) : 0
}

/**
 * 保存当前视频源下标
 * @param index 需要保存的下标
 */
const saveCurrentSourceIndex = (index: number) => {
  AppStorage.set(STORAGE_KEY_INDEX, index)
}

/**
 * 读取当前启用的视频源，在缺省时退回到首个可用项
 */
const getCurrentSource = (): ApiSource | null => {
  const sources = getSources()
  const index = getCurrentSourceIndex()
  return sources.length > 0 ? sources[index] || sources[0] : null
}

/**
 * 在现有集合后追加新的视频源
 * @param source 需要添加的源
 */
const addSource = (source: ApiSource) => {
  const sources = [...getSources(), source]
  saveSources(sources)
}

/**
 * 移除指定位置的视频源，并重新调整当前下标
 * @param index 待删除的下标
 */
const removeSource = (index: number) => {
  const sources = getSources()
  const newSources = sources.filter((_, i) => i !== index)
  saveSources(newSources)

  const currentIndex = getCurrentSourceIndex()
  if (newSources.length === 0) {
    saveCurrentSourceIndex(0)
  } else if (currentIndex >= index && currentIndex > 0) {
    saveCurrentSourceIndex(currentIndex - 1)
  }
}

/**
 * 对外暴露的设置工具，负责管理所有视频源相关操作
 */
export const SettingsService = {
  getSources,
  saveSources,
  getCurrentSourceIndex,
  saveCurrentSourceIndex,
  getCurrentSource,
  addSource,
  removeSource
}
