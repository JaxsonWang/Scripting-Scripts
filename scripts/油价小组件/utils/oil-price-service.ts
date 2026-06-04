import { Script, fetch } from 'scripting'
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
export const MAX_DISPLAY_OIL_TYPES = 4
export const DEFAULT_DISPLAY_OIL_TYPES = ['92', '95', '98', '0'] as const
export const DEFAULT_SMALL_WIDGET_OIL_TYPE = '92'

export type OilTypeValue = '89' | '92' | '95' | '98' | '0' | '-10' | '-20' | '-35'

export interface OilTypeOption {
  label: string
  shortLabel: string
  value: OilTypeValue
}

export const oilTypeOptions: OilTypeOption[] = [
  { label: '89#汽油', shortLabel: '89#', value: '89' },
  { label: '92#汽油', shortLabel: '92#', value: '92' },
  { label: '95#汽油', shortLabel: '95#', value: '95' },
  { label: '98#汽油', shortLabel: '98#', value: '98' },
  { label: '0#柴油', shortLabel: '0#', value: '0' },
  { label: '-10#柴油', shortLabel: '-10#', value: '-10' },
  { label: '-20#柴油', shortLabel: '-20#', value: '-20' },
  { label: '-35#柴油', shortLabel: '-35#', value: '-35' }
]

export interface AreaZoneOption {
  label: string
  value: number
  name: string
  description: string
}

export interface OilPriceItem {
  type: OilTypeValue
  label: string
  shortLabel: string
  price: string
}

interface SinopecAreaCheck {
  AIPAO95?: string
  AIPAO98?: string
  AIPAOE92?: string
  AIPAOE95?: string
  AIPAOE98?: string
  AREA_DESC?: string
  AREA_NAME?: string
  CHAI_0?: string
  CHAI_10?: string
  CHAI_20?: string
  CHAI_35?: string
  E92?: string
  E95?: string
  E98?: string
  GAS_89?: string
  GAS_92?: string
  GAS_95?: string
  GAS_98?: string
  PROVINCE_NAME?: string
}

interface SinopecPriceData {
  [key: string]: number | string | undefined
  START_DATE?: string
}

interface SinopecAreaEntry {
  areaCheck?: SinopecAreaCheck
  areaData?: SinopecPriceData
}

interface SinopecProvinceData {
  provinceCheck?: SinopecAreaCheck
  provinceData?: SinopecPriceData
  area?: SinopecAreaEntry[]
}

interface SinopecResponse {
  data?: SinopecProvinceData
}

export interface AreaMetadata {
  areaZoneOptions: AreaZoneOption[]
  availableOilTypes: OilTypeValue[]
}

// 油价数据类型定义
export interface OilPriceData {
  startDate: string
  region: string
  areaZoneName: string
  lastUpdated: string
  prices: OilPriceItem[]
  availableOilTypes: OilTypeValue[]
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
  areaZoneOptions: AreaZoneOption[]
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
  AVAILABLE_OIL_TYPES: 'availableOilTypes',
  SELECTED_OIL_TYPES: 'selectedOilTypes',
  SMALL_WIDGET_OIL_TYPE: 'smallWidgetOilType',
  LAST_VERSION: 'lastVersion',
  UPDATE_DISMISSED: 'updateDismissed',
  SETTINGS: 'settings'
}

/**
 * 默认设置
 */
const DEFAULT_SETTINGS = {
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

const formatPrice = (price: number | string | undefined): string => {
  return typeof price === 'number' && price > 0
    ? price.toLocaleString('zh-CN', {
        style: 'currency',
        currency: 'CNY'
      })
    : '未开放'
}

const requestProvinceData = async (areaType: string): Promise<SinopecResponse> => {
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

  return (await response.json()) as SinopecResponse
}

const buildAreaZoneOptions = (areaEntries: SinopecAreaEntry[] = []): AreaZoneOption[] => {
  return areaEntries.map((item, index) => {
    const areaCheck = item.areaCheck || {}
    const areaName = areaCheck.AREA_NAME || areaCheck.AREA_DESC || areaCheck.PROVINCE_NAME || `价区${index + 1}`
    const areaDesc = areaCheck.AREA_DESC || ''

    return {
      label: areaName,
      value: index,
      name: areaName,
      description: areaDesc
    }
  })
}

const pickProvinceSource = (
  data: SinopecProvinceData | undefined,
  areaZoneType: number
): {
  areaCheck: SinopecAreaCheck
  priceData: SinopecPriceData
  areaZoneName: string
} => {
  const areaEntries = data?.area || []

  if (areaEntries.length > 0) {
    const selectedAreaIndex = Math.min(Math.max(areaZoneType, 0), areaEntries.length - 1)
    const selectedArea = areaEntries[selectedAreaIndex] || {}
    const selectedAreaCheck = selectedArea.areaCheck || {}

    return {
      areaCheck: selectedAreaCheck,
      priceData: selectedArea.areaData || {},
      areaZoneName: selectedAreaCheck.AREA_NAME || ''
    }
  }

  return {
    areaCheck: data?.provinceCheck || {},
    priceData: data?.provinceData || {},
    areaZoneName: ''
  }
}

const resolveOilField = (type: OilTypeValue, areaCheck: SinopecAreaCheck, priceData: SinopecPriceData): string => {
  const candidates: Record<OilTypeValue, Array<[keyof SinopecAreaCheck, string]>> = {
    '89': [['GAS_89', 'GAS_89']],
    '92': [
      ['AIPAOE92', 'AIPAO_GAS_E92'],
      ['E92', 'E92'],
      ['GAS_92', 'GAS_92']
    ],
    '95': [
      ['AIPAO95', 'AIPAO_GAS_95'],
      ['AIPAOE95', 'AIPAO_GAS_E95'],
      ['E95', 'E95'],
      ['GAS_95', 'GAS_95']
    ],
    '98': [
      ['AIPAO98', 'AIPAO_GAS_98'],
      ['AIPAOE98', 'AIPAO_GAS_E98'],
      ['E98', 'E98'],
      ['GAS_98', 'GAS_98']
    ],
    '0': [['CHAI_0', 'CHECHAI_0']],
    '-10': [['CHAI_10', 'CHECHAI_10']],
    '-20': [['CHAI_20', 'CHAI_20']],
    '-35': [['CHAI_35', 'CHAI_35']]
  }

  return candidates[type].find(([checkKey, fieldName]) => areaCheck[checkKey] === 'Y' && typeof priceData[fieldName] === 'number')?.[1] || ''
}

const buildOilPriceItems = (areaCheck: SinopecAreaCheck, priceData: SinopecPriceData): OilPriceItem[] => {
  return oilTypeOptions
    .map(option => {
      const fieldName = resolveOilField(option.value, areaCheck, priceData)

      return {
        type: option.value,
        label: option.label,
        shortLabel: option.shortLabel,
        price: formatPrice(priceData[fieldName])
      }
    })
    .filter(item => item.price !== '未开放')
}

const normalizeOilTypes = (oilTypes: readonly string[], availableOilTypes?: OilTypeValue[]): OilTypeValue[] => {
  const availableSet = availableOilTypes && availableOilTypes.length > 0 ? new Set(availableOilTypes) : undefined
  const validSet = new Set(oilTypeOptions.map(option => option.value))
  const normalized: OilTypeValue[] = []

  oilTypes.forEach(oilType => {
    if (!validSet.has(oilType as OilTypeValue)) return
    if (availableSet && !availableSet.has(oilType as OilTypeValue)) return
    if (normalized.includes(oilType as OilTypeValue)) return
    normalized.push(oilType as OilTypeValue)
  })

  return normalized.slice(0, MAX_DISPLAY_OIL_TYPES)
}

const normalizeOilType = (oilType: string | undefined, availableOilTypes?: OilTypeValue[]): OilTypeValue | undefined => {
  return normalizeOilTypes(oilType ? [oilType] : [], availableOilTypes)[0]
}

const getDefaultDisplayOilTypes = (availableOilTypes?: OilTypeValue[]): OilTypeValue[] => {
  const defaultOilTypes = normalizeOilTypes(DEFAULT_DISPLAY_OIL_TYPES, availableOilTypes)
  if (defaultOilTypes.length > 0) return defaultOilTypes
  return normalizeOilTypes(
    oilTypeOptions.map(option => option.value),
    availableOilTypes
  )
}

const cacheAreaMetadata = (areaZoneOptions: AreaZoneOption[], availableOilTypes: OilTypeValue[]): void => {
  storageManager.storage.batchSet({
    [STORAGE_KEYS.AREA_ZONE_OPTIONS]: areaZoneOptions,
    [STORAGE_KEYS.AVAILABLE_OIL_TYPES]: availableOilTypes
  })
}

const buildAreaMetadata = (response: SinopecResponse, areaZoneType: number): AreaMetadata => {
  const areaZoneOptions = buildAreaZoneOptions(response.data?.area)
  const { areaCheck, priceData } = pickProvinceSource(response.data, areaZoneType)
  const availableOilTypes = buildOilPriceItems(areaCheck, priceData).map(item => item.type)

  cacheAreaMetadata(areaZoneOptions, availableOilTypes)

  return {
    areaZoneOptions,
    availableOilTypes
  }
}

/**
 * 获取当前油价数据
 * @returns 油价数据Promise
 */
export const fetchOilPriceData = async (): Promise<OilPriceData> => {
  const areaType = storageManager.storage.get<string>(STORAGE_KEYS.AREA_TYPE) || '32' // 默认江苏
  const areaZoneType = storageManager.storage.get<number>(STORAGE_KEYS.AREA_ZONE_TYPE) || 0

  try {
    const data = await requestProvinceData(areaType)
    storageManager.storage.set(STORAGE_KEYS.OIL_DATA, data)

    return handleOilPriceData(data, areaType, areaZoneType)
  } catch (error) {
    console.error('获取油价数据失败:', error)

    const cachedData = storageManager.storage.get<SinopecResponse>(STORAGE_KEYS.OIL_DATA)
    if (cachedData) {
      return handleOilPriceData(cachedData, areaType, areaZoneType)
    }

    return getDefaultOilData(areaType)
  }
}

/**
 * 处理油价数据
 * @param response API响应数据
 * @param areaType 地区类型
 * @param areaZoneType 价区类型
 * @returns 处理后的油价数据
 */
const handleOilPriceData = (response: SinopecResponse, areaType: string, areaZoneType: number): OilPriceData => {
  const data = response.data
  const areaZoneOptions = buildAreaZoneOptions(data?.area)
  const { areaCheck, priceData, areaZoneName } = pickProvinceSource(data, areaZoneType)
  const prices = buildOilPriceItems(areaCheck, priceData)
  const availableOilTypes = prices.map(item => item.type)

  cacheAreaMetadata(areaZoneOptions, availableOilTypes)

  if (prices.length === 0 || Object.keys(priceData).length === 0) {
    return getDefaultOilData(areaType)
  }

  const startDateData = priceData.START_DATE?.slice(0, 10)
  const day = 1000 * 60 * 60 * 24
  const startDate = startDateData ? new Date(new Date(startDateData).valueOf() + day) : new Date()
  const region = areaOptions.find(i => i.value === areaType)?.label || areaCheck.PROVINCE_NAME || '未知地区'

  return {
    startDate: formatDate(startDate, 'yyyy年MM月dd日'),
    region,
    areaZoneName,
    lastUpdated: formatDate(new Date(), 'yyyy年MM月dd日'),
    prices,
    availableOilTypes
  }
}

/**
 * 获取默认油价数据
 * @param areaType 地区类型
 * @returns 默认油价数据
 */
const getDefaultOilData = (areaType: string): OilPriceData => {
  const region = areaOptions.find(i => i.value === areaType)?.label || '未知地区'
  const availableOilTypes = getDefaultDisplayOilTypes()
  const prices = oilTypeOptions
    .filter(option => availableOilTypes.includes(option.value))
    .map(option => ({
      type: option.value,
      label: option.label,
      shortLabel: option.shortLabel,
      price: formatForecastPrice('0')
    }))

  return {
    startDate: '数据获取失败',
    region,
    areaZoneName: '',
    lastUpdated: formatDate(new Date(), 'yyyy年MM月dd日'),
    prices,
    availableOilTypes
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
    areaZoneOptions: storageManager.storage.get<AreaZoneOption[]>(STORAGE_KEYS.AREA_ZONE_OPTIONS) || []
  }
}

/**
 * 获取指定地区和价区的价区/油标元数据
 * @param areaType 地区类型
 * @param areaZoneType 价区类型
 * @returns 价区和油标元数据
 */
export const getAreaMetadata = async (areaType: string, areaZoneType: number = 0): Promise<AreaMetadata> => {
  try {
    const data = await requestProvinceData(areaType)
    storageManager.storage.set(STORAGE_KEYS.OIL_DATA, data)

    return buildAreaMetadata(data, areaZoneType)
  } catch (error) {
    console.error('获取地区元数据失败:', error)
    cacheAreaMetadata([], [])

    return {
      areaZoneOptions: [],
      availableOilTypes: []
    }
  }
}

/**
 * 获取当前价区可用油标
 */
export const getAvailableOilTypes = (): OilTypeValue[] => {
  return storageManager.storage.get<OilTypeValue[]>(STORAGE_KEYS.AVAILABLE_OIL_TYPES) || []
}

/**
 * 设置最多四个展示油标
 * @param oilTypes 油标数组
 */
export const setSelectedOilTypes = (oilTypes: readonly OilTypeValue[]): void => {
  const selectedOilTypes = normalizeOilTypes(oilTypes, getAvailableOilTypes())
  storageManager.storage.set(STORAGE_KEYS.SELECTED_OIL_TYPES, selectedOilTypes)
}

/**
 * 获取最多四个展示油标
 * @param availableOilTypes 当前价区可用油标
 * @returns 展示油标数组
 */
export const getSelectedOilTypes = (availableOilTypes: OilTypeValue[] = getAvailableOilTypes()): OilTypeValue[] => {
  const selectedOilTypes = storageManager.storage.get<OilTypeValue[]>(STORAGE_KEYS.SELECTED_OIL_TYPES) || []
  const normalizedOilTypes = normalizeOilTypes(selectedOilTypes, availableOilTypes)

  if (normalizedOilTypes.length > 0) return normalizedOilTypes

  return getDefaultDisplayOilTypes(availableOilTypes)
}

/**
 * 设置小号组件展示油标
 * @param oilType 油标
 */
export const setSmallWidgetOilType = (oilType: OilTypeValue): void => {
  storageManager.storage.set(STORAGE_KEYS.SMALL_WIDGET_OIL_TYPE, normalizeOilType(oilType, getAvailableOilTypes()) || oilType)
}

/**
 * 获取小号组件展示油标
 * @param availableOilTypes 当前价区可用油标
 * @returns 小号组件展示油标
 */
export const getSmallWidgetOilType = (availableOilTypes: OilTypeValue[] = getAvailableOilTypes()): OilTypeValue => {
  const savedOilType = storageManager.storage.get<string>(STORAGE_KEYS.SMALL_WIDGET_OIL_TYPE)
  const normalizedOilType = normalizeOilType(savedOilType, availableOilTypes)

  if (normalizedOilType) return normalizedOilType

  return normalizeOilType(DEFAULT_SMALL_WIDGET_OIL_TYPE, availableOilTypes) || getDefaultDisplayOilTypes(availableOilTypes)[0] || DEFAULT_SMALL_WIDGET_OIL_TYPE
}

/**
 * 获取小号组件展示油价项
 * @param data 完整油价数据
 * @returns 小号组件展示油价项
 */
export const getSmallWidgetOilPriceItem = (data: CompleteOilData): OilPriceItem | undefined => {
  const oilType = getSmallWidgetOilType(data.availableOilTypes)
  return data.prices.find(item => item.type === oilType)
}

/**
 * 获取中号组件展示油价项
 * @param data 完整油价数据
 * @returns 中号组件展示油价项
 */
export const getMediumWidgetOilPriceItems = (data: CompleteOilData): OilPriceItem[] => {
  const selectedOilTypes = getSelectedOilTypes(data.availableOilTypes)
  return selectedOilTypes.map(oilType => data.prices.find(item => item.type === oilType)).filter((item): item is OilPriceItem => Boolean(item))
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
  changelog: string
}

const getChangelogPath = (): string => {
  return `${Script.directory}/changelog.md`
}

const readChangelog = (): string => {
  try {
    return FileManager.readAsStringSync(getChangelogPath()).trim()
  } catch (error) {
    console.error('读取更新日志失败:', error)
    return ''
  }
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
    changelog: readChangelog()
  }),

  /** 获取更新日志 */
  getChangelog: (): string => readChangelog()
}

// 保持向后兼容的导出
export const getCurrentVersion = VersionManager.getCurrentVersion
export const getLocalVersionInfo = VersionManager.getLocalVersionInfo
export const getChangelog = VersionManager.getChangelog
