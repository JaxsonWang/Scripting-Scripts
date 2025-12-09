import { fetch } from 'scripting'
import scriptConfig from '../script.json'
import { createStorageManager } from './storage'

// 地区选项配置
export const areaOptions = [
  { label: '北京', value: '11', name: 'beijing' },
  { label: '天津', value: '12', name: 'tianjin' },
  { label: '河北', value: '13', name: 'hebei' },
  { label: '山西', value: '14', name: 'shanxi' },
  { label: '河南', value: '41', name: 'henan' },
  { label: '山东', value: '37', name: 'shandong' },
  { label: '上海', value: '31', name: 'shanghai' },
  { label: '江苏', value: '32', name: 'jiangsu' },
  { label: '浙江', value: '33', name: 'zhejiang' },
  { label: '安徽', value: '34', name: 'anhui' },
  { label: '福建', value: '35', name: 'fujian' },
  { label: '江西', value: '36', name: 'jiangxi' },
  { label: '湖北', value: '42', name: 'hubei' },
  { label: '湖南', value: '43', name: 'hunan' },
  { label: '广东', value: '44', name: 'guangdong' },
  { label: '广西', value: '45', name: 'guangxi' },
  { label: '云南', value: '53', name: 'yunnan' },
  { label: '贵州', value: '52', name: 'guizhou' },
  { label: '海南', value: '46', name: 'hainan' },
  { label: '重庆', value: '50', name: 'chongqing' },
  { label: '四川', value: '51', name: 'sichuan' },
  { label: '新疆', value: '65', name: 'xinjiang' },
  { label: '内蒙古', value: '15', name: 'neimenggu' },
  { label: '辽宁', value: '21', name: 'liaoning' },
  { label: '吉林', value: '22', name: 'jilin' },
  { label: '宁夏', value: '64', name: 'ningxia' },
  { label: '陕西', value: '61', name: 'shanxi-3' },
  { label: '黑龙江', value: '23', name: 'heilongjiang' },
  { label: '西藏', value: '54', name: 'xizang' },
  { label: '青海', value: '63', name: 'qinghai' },
  { label: '甘肃', value: '62', name: 'gansu' }
]

// 油号选项配置
export const oilTypeOptions = [
  { label: '92#汽油', value: '92', key: 'oil92' },
  { label: '95#汽油', value: '95', key: 'oil95' },
  { label: '98#汽油', value: '98', key: 'oil98' },
  { label: '0#柴油', value: '0', key: 'oil0' }
]

// 油价数据类型定义
export interface OilPriceData {
  startDate: string
  oil92: string
  oil95: string
  oil98: string
  oil0: string
  region: string
  lastUpdated: string
}

export interface ForecastData {
  priceDirection: 'rising' | 'falling' | 'stranded'
  forecastDate: string
  forecastPrice: string
}

export interface CompleteOilData extends OilPriceData, ForecastData {}

export interface AreaSettings {
  areaType: string
  areaZoneType: number
  areaZoneOptions: any[]
}

// 储存键名 - 统一管理所有持久化数据
const STORAGE_NAME = 'ScriptPie.OilPriceSettings'

// 存储键 - 用于访问统一存储对象中的具体字段
const STORAGE_KEYS = {
  AREA_TYPE: 'areaType',
  AREA_ZONE_TYPE: 'areaZoneType',
  OIL_DATA: 'oilData',
  FORECAST_STR: 'forecastStr',
  AREA_ZONE_OPTIONS: 'areaZoneOptions',
  SELECTED_OIL_TYPE: 'selectedOilType',
  LAST_VERSION: 'lastVersion',
  UPDATE_DISMISSED: 'updateDismissed',
  SETTINGS: 'settings'
}

/**
 * 默认设置
 */
const DEFAULT_SETTINGS = {
  bgPath: '', // 透明背景图片路径
  lightModeColor: '#000000', // 浅色模式字体颜色
  darkModeColor: '#FFFFFF', // 深色模式字体颜色
  enableColorBackground: false, // 开启颜色背景
  backgroundColors: [] // 背景颜色列表
}

// 创建存储管理器实例
const storageManager = createStorageManager(STORAGE_NAME)

/**
 * 格式化日期
 * @param date 日期对象
 * @param format 格式字符串
 * @returns 格式化后的日期字符串
 */
const formatDate = (date: Date, format: string): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return format.replace('yyyy', String(year)).replace('MM', month).replace('dd', day)
}

/**
 * 获取当前油价数据
 * @returns 油价数据Promise
 */
export const fetchOilPriceData = async (): Promise<OilPriceData> => {
  const areaType = storageManager.storage.get<string>(STORAGE_KEYS.AREA_TYPE) || '32' // 默认江苏
  const areaZoneType = storageManager.storage.get<number>(STORAGE_KEYS.AREA_ZONE_TYPE) || 0

  try {
    const response = await fetch('https://cx.sinopecsales.com/yjkqiantai/data/switchProvince', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        Accept: 'application/json, text/plain, */*',
        Origin: 'https://cx.sinopecsales.com',
        Referer: 'https://cx.sinopecsales.com/yjkqiantai/core/initCpb'
      },
      body: JSON.stringify({
        provinceId: areaType
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    // 缓存数据
    storageManager.storage.set(STORAGE_KEYS.OIL_DATA, data)

    return await handleOilPriceData(data, areaType, areaZoneType)
  } catch (error) {
    console.error('获取油价数据失败:', error)
    // 使用缓存数据
    const cachedData = storageManager.storage.get<any>(STORAGE_KEYS.OIL_DATA)
    if (cachedData) {
      return await handleOilPriceData(cachedData, areaType, areaZoneType)
    }

    // 返回默认数据
    return getDefaultOilData(areaType as string)
  }
}

/**
 * 处理油价数据
 * @param response API响应数据
 * @param areaType 地区类型
 * @param areaZoneType 价区类型
 * @returns 处理后的油价数据Promise
 */
const handleOilPriceData = async (response: any, areaType: string, areaZoneType: number): Promise<OilPriceData> => {
  const data = response.data
  const areaData = data.area
  let provinceData: any = {}
  let provinceCheck: any = {}

  if (areaData && areaData.length !== 0) {
    // 保存地区选项
    const areaZoneOptions = areaData.map((item: any, index: number) => ({
      label: item.areaCheck.AREA_NAME + ' - ' + (item.areaCheck.AREA_DESC || item.areaCheck.PROVINCE_NAME),
      value: index,
      name: item.areaCheck.AREA_DESC
    }))
    storageManager.storage.set(STORAGE_KEYS.AREA_ZONE_OPTIONS, areaZoneOptions)

    provinceData = areaData[areaZoneType]?.areaData || {}
    provinceCheck = areaData[areaZoneType]?.areaCheck || {}
  } else {
    storageManager.storage.set(STORAGE_KEYS.AREA_ZONE_OPTIONS, [])
    provinceData = data.provinceData || {}
    provinceCheck = data.provinceCheck || {}
  }

  if (provinceData && Object.keys(provinceData).length !== 0) {
    const startDateData = provinceData.START_DATE?.slice(0, 10)
    const day = 1000 * 60 * 60 * 24
    const startDate = new Date(new Date(startDateData).valueOf() + day)

    /**
     * 确定字段名称
     * @param type 油品类型
     * @returns 字段名称
     */
    const handleConfirmField = (type: string): string => {
      if (type === '92') {
        if (provinceCheck.AIPAOE92 === 'Y') return 'AIPAO_GAS_E92'
        if (provinceCheck.E92 === 'Y') return 'E92'
        if (provinceCheck.GAS_92 === 'Y') return 'GAS_92'
      }
      if (type === '95') {
        if (provinceCheck.AIPAO95 === 'Y') return 'AIPAO_GAS_95'
        if (provinceCheck.AIPAOE95 === 'Y') return 'AIPAO_GAS_E95'
        if (provinceCheck.E95 === 'Y') return 'E95'
        if (provinceCheck.GAS_95 === 'Y') return 'GAS_95'
      }
      if (type === '98') {
        if (provinceCheck.AIPAO98 === 'Y') return 'AIPAO_GAS_98'
        if (provinceCheck.AIPAOE98 === 'Y') return 'AIPAO_GAS_E98'
        if (provinceCheck.E98 === 'Y') return 'E98'
        if (provinceCheck.GAS_98 === 'Y') return 'GAS_98'
      }
      if (type === '0') {
        if (provinceCheck.CHAI_0 === 'Y') return 'CHECHAI_0'
      }
      return ''
    }

    /**
     * 格式化价格
     * @param price 价格数值
     * @returns 格式化后的价格字符串
     */
    const formatPrice = (price: number): string => {
      return price
        ? price.toLocaleString('zh-CN', {
            style: 'currency',
            currency: 'CNY'
          })
        : '未开放'
    }

    const region = areaOptions.find(i => i.value === areaType)?.label || '未知地区'

    return {
      startDate: formatDate(startDate, 'yyyy年MM月dd日'),
      oil92: formatPrice(provinceData[handleConfirmField('92')]),
      oil95: formatPrice(provinceData[handleConfirmField('95')]),
      oil98: formatPrice(provinceData[handleConfirmField('98')]),
      oil0: formatPrice(provinceData[handleConfirmField('0')]),
      region,
      lastUpdated: formatDate(new Date(), 'yyyy年MM月dd日')
    }
  } else {
    return getDefaultOilData(areaType)
  }
}

/**
 * 获取默认油价数据
 * @param areaType 地区类型
 * @returns 默认油价数据
 */
const getDefaultOilData = (areaType: string): OilPriceData => {
  const region = areaOptions.find(i => i.value === areaType)?.label || '未知地区'
  return {
    startDate: '数据获取失败',
    oil92: formatForecastPrice('0'),
    oil95: formatForecastPrice('0'),
    oil98: formatForecastPrice('0'),
    oil0: formatForecastPrice('0'),
    region,
    lastUpdated: formatDate(new Date(), 'yyyy年MM月dd日')
  }
}

/**
 * 获取预测油价数据
 * @returns 预测数据Promise
 */
export const fetchForecastData = async (): Promise<ForecastData> => {
  const areaType = storageManager.storage.get<string>(STORAGE_KEYS.AREA_TYPE) || '32'
  const areaName = areaOptions.find(i => i.value === areaType)?.name || 'jiangsu'
  const url = `http://m.qiyoujiage.com/${areaName}.shtml`

  try {
    const webView = new WebViewController()
    await webView.loadURL(url)
    const js = `return document.querySelector('.tishi').textContent`
    const str = await webView.evaluateJavaScript(js)

    // 缓存预测字符串
    storageManager.storage.set(STORAGE_KEYS.FORECAST_STR, str)

    return parseForecastString(str)
  } catch (error) {
    console.error('获取预测数据失败:', error)
    // 使用缓存数据
    const cachedStr = storageManager.storage.get<string>(STORAGE_KEYS.FORECAST_STR)
    if (cachedStr) {
      return parseForecastString(cachedStr as string)
    }

    // 返回默认预测数据
    return {
      priceDirection: 'stranded',
      forecastDate: formatDate(new Date(), 'yyyy年MM月dd日'),
      forecastPrice: '0.00'
    }
  }
}

/**
 * 解析预测字符串
 * @param str 预测字符串
 * @returns 预测数据
 */
const parseForecastString = (str: string): ForecastData => {
  const regex = /\d+\.\d+元\/升-\d+\.\d+元\/升/gm
  const match = str.match(regex)

  let forecastPrice = '0.00'
  let forecastDate = formatDate(new Date(), 'yyyy年MM月dd日')
  let priceDirection: 'rising' | 'falling' | 'stranded' = 'stranded'

  // 判断价格趋势
  if (/上涨|大涨|上调/gm.test(str)) priceDirection = 'rising'
  if (/下跌|大跌|下调/gm.test(str)) priceDirection = 'falling'
  if (/搁浅/gm.test(str)) priceDirection = 'stranded'

  // 解析价格范围
  if (match) {
    let data: string | string[] = match[0]
    data = data.replaceAll('元/升', '')
    data = data.split('-')

    const minPrice = Number(data[0])
    const maxPrice = Number(data[1])
    forecastPrice = (Math.floor((minPrice + (maxPrice - minPrice) / 2) * 100) / 100).toFixed(2)
  }

  // 解析日期
  const dateRegex = /(\d{1,2}月\d{1,2}日)/
  const dateRegexYear = /(\d{4}年\d{1,2}月\d{1,2}日)/
  const hasYearMatch = dateRegexYear.test(str)
  const dateMatch = hasYearMatch ? str.match(dateRegexYear) : str.match(dateRegex)

  if (dateMatch) {
    let datetime = hasYearMatch ? dateMatch[1] + '00:00:00' : new Date().getFullYear() + '年' + dateMatch[1] + '00:00:00'
    datetime = datetime.replaceAll('年', '/').replaceAll('月', '/').replaceAll('日', ' ')
    forecastDate = formatDate(new Date(datetime), 'yyyy年MM月dd日')
  }

  return {
    priceDirection,
    forecastDate,
    forecastPrice
  }
}

/**
 * 获取完整油价数据
 * @returns 完整油价数据Promise
 */
export const getCompleteOilData = async (): Promise<CompleteOilData> => {
  try {
    const [oilData, forecastData] = await Promise.all([fetchOilPriceData(), fetchForecastData()])

    return {
      ...oilData,
      ...forecastData
    }
  } catch (error) {
    console.error('获取完整油价数据失败:', error)
    // 返回默认数据
    const areaType = storageManager.storage.get<string>(STORAGE_KEYS.AREA_TYPE) || '32'
    return {
      ...getDefaultOilData(areaType as string),
      priceDirection: 'stranded' as const,
      forecastDate: formatDate(new Date(), 'yyyy年MM月dd日'),
      forecastPrice: '0.00'
    }
  }
}

/**
 * 设置地区
 * @param areaType 地区类型
 * @param areaZoneType 价区类型，默认为0
 */
export const setArea = (areaType: string, areaZoneType: number = 0): void => {
  storageManager.storage.batchSet({
    [STORAGE_KEYS.AREA_TYPE]: areaType,
    [STORAGE_KEYS.AREA_ZONE_TYPE]: areaZoneType
  })
}

/**
 * 获取当前地区设置
 * @returns 当前地区设置对象
 */
export const getCurrentAreaSettings = (): AreaSettings => {
  return {
    areaType: storageManager.storage.get<string>(STORAGE_KEYS.AREA_TYPE) || '32',
    areaZoneType: storageManager.storage.get<number>(STORAGE_KEYS.AREA_ZONE_TYPE) || 0,
    areaZoneOptions: storageManager.storage.get<any[]>(STORAGE_KEYS.AREA_ZONE_OPTIONS) || []
  }
}

/**
 * 获取指定地区的价区选项
 * @param areaType 地区类型
 * @returns 价区选项数组Promise
 */
export const getAreaZoneOptions = async (areaType: string): Promise<any[]> => {
  try {
    const response = await fetch('https://cx.sinopecsales.com/yjkqiantai/data/switchProvince', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        Accept: 'application/json, text/plain, */*',
        Origin: 'https://cx.sinopecsales.com',
        Referer: 'https://cx.sinopecsales.com/yjkqiantai/core/initCpb'
      },
      body: JSON.stringify({
        provinceId: areaType
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    const areaData = data.data?.area || []

    if (areaData && areaData.length > 0) {
      const options = areaData.map((item: any, index: number) => {
        const areaName = item.areaCheck.AREA_NAME || ''
        const areaDesc = item.areaCheck.AREA_DESC || item.areaCheck.PROVINCE_NAME || ''

        // 优化标签显示，避免重复信息
        let label = areaName
        if (areaDesc && areaDesc !== areaName) {
          label = `${areaName} - ${areaDesc}`
        }

        return {
          label: label,
          value: index,
          name: areaDesc || areaName
        }
      })

      // 缓存价区选项
      storageManager.storage.set(STORAGE_KEYS.AREA_ZONE_OPTIONS, options)
      return options
    } else {
      // 没有价区选项的省份
      storageManager.storage.set(STORAGE_KEYS.AREA_ZONE_OPTIONS, [])
      return []
    }
  } catch (error) {
    console.error('获取价区选项失败:', error)
    // 返回缓存的选项
    return storageManager.storage.get<any[]>(STORAGE_KEYS.AREA_ZONE_OPTIONS) || []
  }
}

/**
 * 设置选中的油号
 * @param oilType 油号类型
 */
export const setSelectedOilType = (oilType: string): void => {
  storageManager.storage.set(STORAGE_KEYS.SELECTED_OIL_TYPE, oilType)
}

/**
 * 获取选中的油号
 * @returns 选中的油号类型
 */
export const getSelectedOilType = (): string => {
  return storageManager.storage.get<string>(STORAGE_KEYS.SELECTED_OIL_TYPE) || '92'
}

/**
 * 根据油号获取价格
 * @param data 完整油价数据
 * @param oilType 油号类型
 * @returns 对应油号的价格
 */
export const getPriceByOilType = (data: CompleteOilData, oilType: string): string => {
  switch (oilType) {
    case '92':
      return data.oil92
    case '95':
      return data.oil95
    case '98':
      return data.oil98
    case '0':
      return data.oil0
    default:
      return data.oil92
  }
}

/**
 * 格式化预测价格显示
 * @param forecastPrice 预测价格
 * @returns 格式化后的价格字符串
 */
export const formatForecastPrice = (forecastPrice: string): string => {
  const price = parseFloat(forecastPrice)
  return price > 0 ? `¥${price.toFixed(2)}` : '¥0.00'
}

/**
 * 获取价格趋势颜色
 * @param priceDirection 价格趋势
 * @returns 对应的颜色名称
 */
export const getTrendColor = (priceDirection: string) => {
  switch (priceDirection) {
    case 'rising':
      return 'systemRed'
    case 'falling':
      return 'systemGreen'
    case 'stranded':
      return 'systemGray'
    default:
      return 'systemGray'
  }
}

/**
 * 获取价格趋势符号
 * @param priceDirection 价格趋势
 * @returns 对应的趋势符号
 */
export const getTrendSymbol = (priceDirection: string) => {
  switch (priceDirection) {
    case 'rising':
      return '↗'
    case 'falling':
      return '↘'
    case 'stranded':
      return '→'
    default:
      return '→'
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

    const data = await response.json()
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

/**
 * 设置管理工具
 */
export const SettingsManager = {
  /** 获取当前设置 */
  getCurrentSettings: () => {
    const savedSettings = storageManager.storage.get<any>(STORAGE_KEYS.SETTINGS) || {}
    return { ...DEFAULT_SETTINGS, ...savedSettings }
  },

  /** 保存设置 */
  saveSettings: (settings: any) => {
    storageManager.storage.set(STORAGE_KEYS.SETTINGS, settings)
  },

  /** 获取动态字体颜色 */
  getDynamicTextColor: () => {
    const settings = SettingsManager.getCurrentSettings()
    return {
      light: settings.lightModeColor || '#000000',
      dark: settings.darkModeColor || '#FFFFFF'
    }
  }
}

// 保持向后兼容的导出
export const getCurrentSettings = SettingsManager.getCurrentSettings
export const saveSettings = SettingsManager.saveSettings
export const getDynamicTextColor = SettingsManager.getDynamicTextColor

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

// 保持向后兼容的导出
export const getCurrentVersion = VersionManager.getCurrentVersion
export const getLocalVersionInfo = VersionManager.getLocalVersionInfo
export const getChangelog = VersionManager.getChangelog
