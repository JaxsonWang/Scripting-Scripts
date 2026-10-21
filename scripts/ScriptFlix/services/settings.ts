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

const isSourceEnabled = (source: ApiSource): boolean => !source.disabled

/**
 * 解析实际生效的当前源下标：存储下标指向已停用或不存在的源时取首个启用源，没有启用源时返回 -1
 * @param sources 视频源数组
 * @param index 存储的当前下标
 */
const resolveCurrentIndex = (sources: ApiSource[], index: number): number => {
  const current = sources[index]
  return current && isSourceEnabled(current) ? index : sources.findIndex(isSourceEnabled)
}

/**
 * 读取当前生效的视频源；全部停用或为空时返回 null
 */
const getCurrentSource = (): ApiSource | null => {
  const sources = getSources()
  const index = resolveCurrentIndex(sources, getCurrentSourceIndex())
  return index >= 0 ? sources[index] : null
}

/**
 * 读取已启用的视频源，供首页切换与全源搜索使用
 */
const getEnabledSources = (): ApiSource[] => getSources().filter(isSourceEnabled)

/**
 * 按 URL 切换当前视频源
 * @param url 目标源地址
 */
const selectSourceByUrl = (url: string) => {
  const index = getSources().findIndex(source => source.url === url)
  if (index >= 0) {
    saveCurrentSourceIndex(index)
  }
}

/**
 * 启用或停用指定视频源；停用当前源时，当前源移交给首个仍启用的源
 * @param index 目标下标
 * @param enabled 是否启用
 */
const setSourceEnabled = (index: number, enabled: boolean) => {
  const sources = getSources().map((source, i) => {
    if (i !== index) {
      return source
    }
    const { disabled: _disabled, ...rest } = source
    return enabled ? rest : { ...rest, disabled: true }
  })
  saveSources(sources)

  if (!enabled && getCurrentSourceIndex() === index) {
    saveCurrentSourceIndex(Math.max(resolveCurrentIndex(sources, index), 0))
  }
}

/**
 * 更新指定视频源的名称与地址，保留启用状态
 * @param index 目标下标
 * @param patch 新的名称与地址
 */
const updateSource = (index: number, patch: Pick<ApiSource, 'name' | 'url'>) => {
  saveSources(getSources().map((source, i) => (i === index ? { ...source, ...patch } : source)))
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
  getEnabledSources,
  isSourceEnabled,
  resolveCurrentIndex,
  selectSourceByUrl,
  setSourceEnabled,
  updateSource,
  addSource,
  removeSource
}
