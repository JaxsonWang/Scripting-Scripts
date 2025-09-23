import { fetch } from 'scripting'
import scriptConfig from '../script.json'
import { createStorageManager } from './storage'

/**
 * 新闻数据接口
 */
export interface NewsItem {
  title: string
  url: string
  time?: string
  summary?: string
}

/**
 * 新闻数据响应接口
 */
export interface NewsData {
  items: NewsItem[]
  lastUpdated: string
  source: string
}

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
const STORAGE_NAME = 'ScriptPie.CNRNewsSettings'

// 存储键 - 用于访问统一存储对象中的具体字段
const STORAGE_KEYS = {
  SETTINGS: 'settings',
  NEWS_DATA: 'newsData',
  LAST_UPDATE: 'lastUpdate',
  LAST_VERSION: 'lastVersion'
}

// 创建存储管理器实例
const storageManager = createStorageManager(STORAGE_NAME)

/**
 * 默认设置
 */
const DEFAULT_SETTINGS = {
  bgPath: '', // 透明背景图片路径
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
 * 获取动态字体颜色
 */
export const getDynamicTextColor = () => {
  const settings = getCurrentSettings()
  return {
    light: settings.lightModeColor,
    dark: settings.darkModeColor
  }
}

/**
 * 解析URL参数的简单函数
 * @param url URL字符串
 * @returns 参数对象
 */
const parseUrlParams = (url: string): Record<string, string> => {
  const params: Record<string, string> = {}
  const queryString = url.split('?')[1]
  if (queryString) {
    const pairs = queryString.split('&')
    for (const pair of pairs) {
      const [key, value] = pair.split('=')
      if (key && value) {
        params[decodeURIComponent(key)] = decodeURIComponent(value)
      }
    }
  }
  return params
}

/**
 * 解析HTML内容提取新闻数据并格式化为JSON结构
 * @param htmlContent HTML内容
 * @returns 新闻项数组
 */
const parseNewsFromHTML = (htmlContent: string): NewsItem[] => {
  try {
    const newsItems: NewsItem[] = []

    // 使用正则表达式匹配p标签中的a标签
    const pTagRegex = /<p[^>]*>(.*?)<\/p>/gi
    const aTagRegex = /<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi

    let pMatch
    while ((pMatch = pTagRegex.exec(htmlContent)) !== null && newsItems.length < 10) {
      const pContent = pMatch[1]

      let aMatch
      while ((aMatch = aTagRegex.exec(pContent)) !== null) {
        const href = aMatch[1]
        const title = aMatch[2].replace(/<[^>]*>/g, '').trim() // 移除HTML标签

        if (title && href && title.length > 5) {
          // 处理&amp;转义
          let url = href.replace(/&amp;/g, '&')

          // 提取newsid和parentId参数
          const params = parseUrlParams(url)
          const newsId = params.lastNewsId
          const parentId = params.id || '64'

          // 构建新的移动端链接格式
          if (newsId) {
            url = `https://m.cnr.cn/#/subpages/pages/details/soundDetails?fromtype=app&newsid=${newsId}&parentId=${parentId}`
          } else {
            // 如果无法提取newsId，使用原始链接
            if (!url.startsWith('http')) {
              if (url.startsWith('/')) {
                url = 'https://www.cnr.cn' + url
              } else {
                url = 'https://www.cnr.cn/' + url
              }
            }
          }

          newsItems.push({
            title: title,
            url: url,
            time: new Date().toLocaleString()
          })

          break // 每个p标签只取第一个链接
        }
      }

      // 重置正则表达式的lastIndex
      aTagRegex.lastIndex = 0
    }

    console.log(`解析出 ${newsItems.length} 条新闻`)
    return newsItems
  } catch (error) {
    console.error('解析HTML失败:', error)
    return []
  }
}

/**
 * 处理新闻数据，转换链接格式
 * @param newsData 原始新闻数据
 * @returns 处理后的新闻数据
 */
const processNewsData = (newsData: NewsData): NewsData => {
  const processedItems = newsData.items.map(item => {
    // 处理&amp;转义
    let url = item.url.replace(/&amp;/g, '&')

    // 提取newsid和parentId参数
    const params = parseUrlParams(url)
    const newsId = params.lastNewsId
    const parentId = params.id || '64'

    // 构建新的移动端链接格式
    if (newsId) {
      url = `https://m.cnr.cn/#/subpages/pages/details/soundDetails?fromtype=app&newsid=${newsId}&parentId=${parentId}`
    }

    return {
      ...item,
      url: url
    }
  })

  return {
    ...newsData,
    items: processedItems
  }
}

/**
 * 抓取央广网新闻数据
 */
export const fetchCNRNews = async (): Promise<NewsData> => {
  const url = 'https://www.cnr.cn/erwen/'

  try {
    console.log('开始抓取央广网新闻...')

    const webView = new WebViewController()
    await webView.loadURL(url)
    await webView.waitForLoad()

    // 等待页面加载完成
    await new Promise<void>(resolve => setTimeout(() => resolve(), 1000))

    // 执行JavaScript获取HTML内容
    const js = `
    try {
      const erwenElement = document.querySelector('.erwen');
      if (erwenElement) {
        return erwenElement.innerHTML;
      }

      // 备用选择器
      const contentElement = document.querySelector('.content .swiper-slide');
      if (contentElement) {
        return contentElement.innerHTML;
      }

      // 再次备用选择器
      const newsListElement = document.querySelector('.news-list');
      if (newsListElement) {
        return newsListElement.innerHTML;
      }

      return null;
    } catch (e) {
      return null;
    }
    `

    const htmlContent = await webView.evaluateJavaScript<string>(js)
    webView.dispose()

    console.log('获取到HTML内容长度:', htmlContent?.length || 0)

    if (!htmlContent) {
      throw new Error('未获取到HTML内容')
    }

    // 解析HTML并格式化为JSON结构
    const newsItems = parseNewsFromHTML(htmlContent)

    if (newsItems.length === 0) {
      throw new Error('未解析到新闻数据')
    }

    const newsData: NewsData = {
      items: newsItems,
      lastUpdated: new Date().toLocaleString(),
      source: '央广网'
    }

    // 缓存新闻数据
    storageManager.storage.set(STORAGE_KEYS.NEWS_DATA, newsData)
    storageManager.storage.set(STORAGE_KEYS.LAST_UPDATE, Date.now())

    console.log(`成功获取 ${newsData.items.length} 条新闻`)
    return newsData
  } catch (error) {
    console.error('获取央广网新闻失败:', error)

    // 尝试使用缓存数据
    const cachedData = storageManager.storage.get<NewsData>(STORAGE_KEYS.NEWS_DATA)
    if (cachedData) {
      console.log('使用缓存的新闻数据')
      return processNewsData(cachedData)
    }

    // 返回默认数据
    return {
      items: [
        {
          title: '网络连接失败，请稍后重试',
          url: 'https://m.cnr.cn/#/subpages/pages/details/soundDetails?fromtype=app&newsid=30258991&parentId=64',
          time: new Date().toLocaleString()
        }
      ],
      lastUpdated: new Date().toLocaleString(),
      source: '央广网'
    }
  }
}

/**
 * 版本管理相关类型定义
 */
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
 * 更新日志管理工具
 */
export const UpdateLogManager = {
  /** 检查是否需要显示更新日志 */
  shouldShowUpdateLog: async (): Promise<boolean> => {
    try {
      const currentLocalVersion = scriptConfig.version
      const cachedVersion = storageManager.storage.get<string>(STORAGE_KEYS.LAST_VERSION)

      return cachedVersion !== currentLocalVersion
    } catch (error) {
      console.error('检查更新日志失败:', error)
      return false
    }
  },

  /** 标记更新日志已确认 */
  markUpdateLogDismissed: (): void => {
    storageManager.storage.set(STORAGE_KEYS.LAST_VERSION, scriptConfig.version)
  }
}

/**
 * 手动设置新闻数据（用于测试或从外部数据源更新）
 * @param rawNewsData 原始新闻数据
 */
export const setNewsData = (rawNewsData: NewsData): void => {
  try {
    // 处理链接格式
    const processedData = processNewsData(rawNewsData)

    // 保存到存储
    storageManager.storage.set(STORAGE_KEYS.NEWS_DATA, processedData)
    storageManager.storage.set(STORAGE_KEYS.LAST_UPDATE, Date.now())

    console.log(`已设置 ${processedData.items.length} 条新闻数据`)
  } catch (error) {
    console.error('设置新闻数据失败:', error)
  }
}

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

// 保持向后兼容的导出
export const getCurrentVersion = VersionManager.getCurrentVersion
export const getLocalVersionInfo = VersionManager.getLocalVersionInfo
export const getChangelog = VersionManager.getChangelog
export const shouldShowUpdateLog = UpdateLogManager.shouldShowUpdateLog
export const markUpdateLogDismissed = UpdateLogManager.markUpdateLogDismissed
