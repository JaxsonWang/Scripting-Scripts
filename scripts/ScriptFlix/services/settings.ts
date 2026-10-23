import { Widget } from 'scripting'
import type { ApiSource } from '../types'

// Cast to any to avoid conflict with DOM Storage interface
const AppStorage = Storage

const STORAGE_KEY_SOURCES = 'script_flix_sources'
const STORAGE_KEY_INDEX = 'script_flix_currentSourceIndex'
const STORAGE_KEY_WIDGET_REFRESH = 'script_flix_widget_refresh_minutes'

/** 小组件换批间隔（分钟），与 ScriptLive 保持一致 */
export const WIDGET_REFRESH_OPTIONS = [30, 60, 120, 180, 360, 720, 1440]
export const DEFAULT_WIDGET_REFRESH_MINUTES = 60

const getWidgetRefreshMinutes = (): number => {
  const stored = AppStorage.get<number>(STORAGE_KEY_WIDGET_REFRESH)
  return stored !== null && WIDGET_REFRESH_OPTIONS.includes(stored) ? stored : DEFAULT_WIDGET_REFRESH_MINUTES
}

/** 保存刷新频率，并请求系统重新生成小组件时间线 */
const setWidgetRefreshMinutes = (minutes: number) => {
  if (!WIDGET_REFRESH_OPTIONS.includes(minutes)) throw new Error('请选择有效的小组件刷新频率')
  if (!AppStorage.set(STORAGE_KEY_WIDGET_REFRESH, minutes)) throw new Error('刷新频率保存失败，请重试')
  Widget.reloadAll()
}

const defaultSources: ApiSource[] = []

/**
 * 从本地存储读取所有视频源配置
 */
const getSources = (): ApiSource[] => {
  return AppStorage.get(STORAGE_KEY_SOURCES) || defaultSources
}

/**
 * 持久化视频源数组；小组件按当前源推荐，源变化后一并刷新
 * @param sources 新的视频源数组
 * @returns 是否写入成功
 */
const saveSources = (sources: ApiSource[]): boolean => {
  const saved = AppStorage.set(STORAGE_KEY_SOURCES, sources)
  Widget.reloadAll()
  return saved
}

/**
 * 获取当前选中的视频源下标
 */
const getCurrentSourceIndex = (): number => {
  return AppStorage.get<number>(STORAGE_KEY_INDEX) ?? 0
}

/**
 * 保存当前视频源下标，并刷新按当前源推荐的小组件
 * @param index 需要保存的下标
 * @returns 是否写入成功
 */
const saveCurrentSourceIndex = (index: number): boolean => {
  const saved = AppStorage.set(STORAGE_KEY_INDEX, index)
  Widget.reloadAll()
  return saved
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
 * 计算导入后的当前源下标：文件指定的下标在新列表范围内时使用它，否则按地址保留原当前源，都没有时为 0
 * @param sources 导入的视频源数组
 * @param fileIndex 文件指定的下标，未指定为 null
 */
const resolveImportedIndex = (sources: ApiSource[], fileIndex: number | null): number => {
  if (fileIndex !== null && fileIndex < sources.length) return fileIndex
  const currentUrl = getCurrentSource()?.url
  return Math.max(
    sources.findIndex(source => source.url === currentUrl),
    0
  )
}

/**
 * 导入时整体替换视频源并写入当前源下标，任一写入失败即抛错
 * @param sources 导入的视频源数组
 * @param currentIndex 导入后的当前源下标
 */
const replaceSources = (sources: ApiSource[], currentIndex: number) => {
  if (!saveSources(sources)) throw new Error('视频源保存失败，请重试')
  if (!saveCurrentSourceIndex(currentIndex)) throw new Error('视频源已替换，但当前视频源未能保存，请重新导入')
}

/**
 * 对外暴露的设置工具，负责视频源与小组件刷新频率
 */
export const SettingsService = {
  getWidgetRefreshMinutes,
  setWidgetRefreshMinutes,
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
  removeSource,
  resolveImportedIndex,
  replaceSources
}
