import { fetch } from 'scripting'
import scriptConfig from '../script.json'
import { createStorageManager } from './storage'

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

// 储存键名 - 统一管理所有持久化数据
const STORAGE_NAME = 'ScriptPie.HitokotoSettings'

// 存储键 - 用于访问统一存储对象中的具体字段
const STORAGE_KEYS = {
  SETTINGS: 'settings',
  LAST_UPDATE: 'lastUpdate',
  LAST_VERSION: 'lastVersion',
  UPDATE_DISMISSED: 'updateDismissed'
}

// 创建存储管理器实例
const storageManager = createStorageManager(STORAGE_NAME)

/**
 * 默认设置
 */
const DEFAULT_SETTINGS = {
  bgPath: '', // 透明背景图片路径
  apiConfigIndex: 1, // 默认使用国际接口
  categories: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'], // 默认全选所有类型
  autoRefresh: true, // 自动刷新开关
  refreshInterval: 30, // 刷新间隔（分钟）
  lightModeColor: '#000000', // 浅色模式字体颜色
  darkModeColor: '#FFFFFF', // 深色模式字体颜色
  enableColorBackground: false, // 开启颜色背景
  backgroundColors: [] // 背景颜色列表
}

/**
 * 获取当前设置
 */
export const getCurrentSettings = () => {
  try {
    const savedSettings = storageManager.storage.get<any>(STORAGE_KEYS.SETTINGS)
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
    storageManager.storage.set(STORAGE_KEYS.SETTINGS, settings)
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
    storageManager.storage.set(STORAGE_KEYS.LAST_UPDATE, Date.now())

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

// 版本管理相关类型定义
export interface VersionInfo {
  name: string
  desc: string
  version: string
  changelog: string[]
}

/**
 * 版本信息管理工具
 */
export const VersionManager = {
  /** 获取当前版本号 */
  getCurrentVersion: (): string => scriptConfig.version,

  /** 获取本地版本信息 */
  getLocalVersionInfo: (): VersionInfo => ({
    name: scriptConfig.name,
    desc: scriptConfig.description,
    version: scriptConfig.version,
    changelog: scriptConfig.changelog || []
  }),

  /** 获取更新日志 */
  getChangelog: (): string[] => scriptConfig.changelog || []
}

/**
 * 设置管理工具
 */
export const SettingsManager = {
  /** 获取动态字体颜色 */
  getDynamicTextColor: () => {
    const settings = getCurrentSettings()
    return {
      light: settings.lightModeColor,
      dark: settings.darkModeColor
    }
  }
}

// 保持向后兼容的导出
export const getCurrentVersion = VersionManager.getCurrentVersion
export const getLocalVersionInfo = VersionManager.getLocalVersionInfo
export const getChangelog = VersionManager.getChangelog
export const getDynamicTextColor = SettingsManager.getDynamicTextColor

/**
 * 获取远程横幅图片URL
 * @returns 横幅图片URL Promise
 */
export const fetchBannerImage = async (): Promise<string | null> => {
  try {
    const response = await fetch('https://joiner.i95.me/scripting/joiner.json')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = (await response.json()) as any
    return data.bannerImage || null
  } catch (error) {
    console.error('获取横幅图片失败:', error)
    return null
  }
}

/**
 * 更新日志管理工具
 */
export const UpdateLogManager = {
  /** 检查是否需要显示更新日志 */
  shouldShowUpdateLog: async (): Promise<boolean> => {
    try {
      const currentLocalVersion = scriptConfig.version
      const cachedVersion = storageManager.storage.get<string>(STORAGE_KEYS.LAST_VERSION)

      console.log('当前本地版本:', currentLocalVersion)
      console.log('缓存的版本:', cachedVersion)

      return cachedVersion !== currentLocalVersion
    } catch (error) {
      console.error('检查更新日志失败:', error)
      return false
    }
  },

  /** 标记更新日志已确认 */
  markUpdateLogDismissed: (): void => {
    storageManager.storage.set(STORAGE_KEYS.LAST_VERSION, scriptConfig.version)
    console.log('已缓存版本号:', scriptConfig.version)
  }
}

// 保持向后兼容的导出
export const shouldShowUpdateLog = UpdateLogManager.shouldShowUpdateLog
export const markUpdateLogDismissed = UpdateLogManager.markUpdateLogDismissed
