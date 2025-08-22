import scriptConfig from '../script.json'

/**
 * 一言数据接口
 */
export interface HitokotoData {
  id: number
  uuid: string
  hitokoto: string
  type: string
  from: string
  from_who: string | null
  creator: string
  creator_uid: number
  reviewer: number
  commit_from: string
  created_at: string
  length: number
}

/**
 * API配置选项
 */
export interface ApiConfig {
  name: string
  url: string
  description: string
}

/**
 * 支持的API配置
 */
export const apiConfigs: ApiConfig[] = [
  {
    name: '国内接口',
    url: 'https://v1.hitokoto.cn',
    description: '国内主接口，速度较快但可能有访问限制'
  },
  {
    name: '国际接口',
    url: 'https://international.v1.hitokoto.cn',
    description: '国际接口，稳定性更好'
  }
]

/**
 * 一言类型选项
 */
export const categoryOptions = [
  { label: '动画', value: 'a' },
  { label: '漫画', value: 'b' },
  { label: '游戏', value: 'c' },
  { label: '文学', value: 'd' },
  { label: '原创', value: 'e' },
  { label: '网络', value: 'f' },
  { label: '其他', value: 'g' },
  { label: '影视', value: 'h' },
  { label: '诗词', value: 'i' },
  { label: '网易云', value: 'j' },
  { label: '哲学', value: 'k' },
  { label: '抖机灵', value: 'l' }
]

/**
 * 刷新间隔选项（分钟）
 */
export const refreshIntervalOptions = [
  { label: '15分钟', value: 15 },
  { label: '30分钟', value: 30 },
  { label: '1小时', value: 60 },
  { label: '2小时', value: 120 },
  { label: '6小时', value: 360 }
]

/**
 * 设置文件路径和存储管理
 */
const SETTINGS_KEY = 'hitokoto_settings'

/**
 * 默认设置
 */
const DEFAULT_SETTINGS = {
  apiConfigIndex: 1, // 默认使用国际接口
  categories: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'], // 默认全选所有类型
  autoRefresh: true, // 自动刷新开关
  refreshInterval: 30 // 刷新间隔（分钟）
}

/**
 * 获取当前设置
 */
export const getCurrentSettings = () => {
  try {
    const savedSettings = Storage.get<any>(SETTINGS_KEY)
    if (savedSettings) {
      return { ...DEFAULT_SETTINGS, ...savedSettings }
    }
  } catch (error) {
    console.error('读取设置失败:', error)
  }
  return DEFAULT_SETTINGS
}

/**
 * 保存设置
 */
export const saveSettings = (settings: any) => {
  try {
    Storage.set(SETTINGS_KEY, settings)
    return true
  } catch (error) {
    console.error('保存设置失败:', error)
    return false
  }
}

/**
 * 获取当前API配置
 */
export const getCurrentApiConfig = (): ApiConfig => {
  const settings = getCurrentSettings()
  return apiConfigs[settings.apiConfigIndex] || apiConfigs[1]
}

/**
 * 获取类型中文名称
 */
export const getTypeName = (type: string): string => {
  const option = categoryOptions.find(opt => opt.value === type)
  return option ? option.label : '其他'
}

/**
 * 获取一言数据
 */
export const fetchHitokoto = async (): Promise<HitokotoData> => {
  const settings = getCurrentSettings()
  const apiConfig = getCurrentApiConfig()

  try {
    // 构建多分类参数，格式: ?c=a&c=d
    const categoryParams = settings.categories.map((cat: string) => `c=${cat}`).join('&')
    const url = `${apiConfig.url}/?${categoryParams}`
    console.log(`使用API: ${apiConfig.name} - ${url}`)

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = (await response.json()) as HitokotoData
    
    // 保存最后更新时间
    Storage.set('hitokoto_last_update', Date.now())
    
    return data
  } catch (error) {
    console.error('获取一言失败:', error)
    // 返回默认数据
    return {
      id: 0,
      uuid: '',
      hitokoto: '网络连接失败，请稍后重试',
      type: settings.categories[0] || 'a',
      from: '系统提示',
      from_who: null,
      creator: '',
      creator_uid: 0,
      reviewer: 0,
      commit_from: '',
      created_at: '',
      length: 0
    }
  }
}

/**
 * 检查是否需要刷新
 */
export const shouldRefresh = (): boolean => {
  const settings = getCurrentSettings()
  if (!settings.autoRefresh) return false
  
  const lastUpdate = Storage.get<number>('hitokoto_last_update') || 0
  const now = Date.now()
  const intervalMs = settings.refreshInterval * 60 * 1000 // 转换为毫秒
  
  return (now - lastUpdate) >= intervalMs
}

/**
 * 获取刷新间隔显示文本
 */
export const getRefreshIntervalText = (minutes: number): string => {
  const option = refreshIntervalOptions.find(opt => opt.value === minutes)
  return option ? option.label : `${minutes}分钟`
}

// 版本管理相关类型定义
export interface VersionInfo {
  name: string
  desc: string
  version: string
  changelog: string[]
  bannerImage?: string
}

// 存储键
const STORAGE_KEYS = {
  LAST_VERSION: 'hitokoto_lastVersion',
  UPDATE_DISMISSED: 'hitokoto_updateDismissed'
}

/**
 * 获取远程版本信息和横幅图片
 * @returns 远程版本信息Promise
 */
export const fetchRemoteVersionInfo = async (): Promise<VersionInfo | null> => {
  try {
    const response = await fetch('https://joiner.i95.me/scripting/joiner.json')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = (await response.json()) as any
    const hitokotoInfo = data.Hitokoto

    if (hitokotoInfo) {
      return {
        name: hitokotoInfo.name,
        desc: hitokotoInfo.desc,
        version: hitokotoInfo.version,
        changelog: hitokotoInfo.changelog || [],
        bannerImage: data.bannerImage || undefined
      }
    }

    return null
  } catch (error) {
    console.error('获取远程版本信息失败:', error)
    return null
  }
}

/**
 * 获取当前本地版本号
 * @returns 当前本地版本号
 */
export const getCurrentVersion = (): string => {
    return scriptConfig.version
}

/**
 * 检查是否需要显示更新日志
 * @returns 是否需要显示更新日志
 */
export const shouldShowUpdateLog = async (): Promise<boolean> => {
  try {
    const currentLocalVersion = getCurrentVersion()
    const cachedVersion = Storage.get<string>(STORAGE_KEYS.LAST_VERSION)

    console.log('当前本地版本:', currentLocalVersion)
    console.log('缓存的版本:', cachedVersion)

    // 如果缓存的版本与当前本地版本不同，说明有更新
    return cachedVersion !== currentLocalVersion
  } catch (error) {
    console.error('检查更新日志失败:', error)
    return false
  }
}

/**
 * 标记更新日志已确认（缓存当前版本号）
 */
export const markUpdateLogDismissed = (): void => {
  const currentVersion = getCurrentVersion()
  Storage.set(STORAGE_KEYS.LAST_VERSION, currentVersion)
  console.log('已缓存版本号:', currentVersion)
}
