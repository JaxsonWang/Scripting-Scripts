import type { Color } from 'scripting'
import scriptConfig from '../script.json'
import { createStorageManager } from './storage'

// 版本管理相关类型定义
export interface VersionInfo {
  name: string
  desc: string
  version: string
  changelog: string[]
  bannerImage?: string
}

// 储存键名 - 统一管理所有持久化数据
const STORAGE_NAME = 'ScriptPie.LunarCalendarSettings'

// 存储键 - 用于访问统一存储对象中的具体字段
const STORAGE_KEYS = {
  LAST_VERSION: 'lastVersion',
  UPDATE_DISMISSED: 'updateDismissed',
  SETTINGS: 'settings'
}

/**
 * 字段替换规则类型
 */
export type FieldReplaceRule = {
  id: string
  searchText: string // 要搜索的文本（不能为空）
  replaceText: string // 替换为的文本（可以为空）
}

/**
 * 工作状态类型
 */
export type WorkStatus = 'work' | 'rest' | null

/**
 * 日历事件扩展数据类型（包含工作状态）
 */
export type CalendarEventWithStatus = CalendarEventData & {
  workStatus: WorkStatus
}

/**
 * 默认设置
 */
const DEFAULT_SETTINGS = {
  bgPath: '', // 透明背景图片路径
  lightModeColor: '#000000', // 浅色模式字体颜色
  darkModeColor: '#FFFFFF', // 深色模式字体颜色
  workColor: '#999999', // 工作状态颜色
  haltColor: '#00CC00', // 休息状态颜色
  fieldReplaceRules: [] as FieldReplaceRule[], // 字段替换规则
  enableColorBackground: false, // 开启颜色背景
  backgroundColors: [] // 背景颜色列表
}

// 创建存储管理器实例
const storageManager = createStorageManager(STORAGE_NAME)

/**
 * 日历事件数据类型
 */
export type CalendarEventData = {
  id: string
  title: string
  startDate: Date
  endDate: Date
  isAllDay: boolean
  location?: string
  calendar: {
    title: string
    color: Color
  }
}

/**
 * 日历数据类型
 */
export type CalendarData = {
  currentDate: Date
  currentDateDay: number
  currentMonth: number
  currentYear: number
  daysInMonth: number
  firstDayOfWeek: number
  upcomingEvents: CalendarEventWithStatus[]
  currentMonthEvents: CalendarEventWithStatus[]
}

/**
 * 获取月份中的天数
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/**
 * 获取月份第一天是星期几 (0=周日, 1=周一, ...)
 */
export function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay()
}

/**
 * 检测事件标题中的工作状态
 */
export function detectWorkStatus(title: string): WorkStatus {
  // 检测班：支持全角和半角括号
  if (title.includes('（班）') || title.includes('(班)')) {
    return 'work'
  }
  // 检测休：支持全角和半角括号
  if (title.includes('（休）') || title.includes('(休)')) {
    return 'rest'
  }
  return null
}

/**
 * 应用字段替换规则到文本
 */
export function applyFieldReplaceRules(text: string): string {
  const settings = SettingsManager.getCurrentSettings()
  const rules = settings.fieldReplaceRules || []

  let result = text
  for (const rule of rules) {
    if (rule.searchText && rule.searchText.trim()) {
      // 使用全局替换，替换所有匹配的文本
      const regex = new RegExp(rule.searchText, 'g')
      result = result.replace(regex, rule.replaceText || '')
    }
  }

  return result
}

/**
 * 获取即将到来的日历事件
 */
export async function getUpcomingEvents(daysAhead: number = 7): Promise<CalendarEventWithStatus[]> {
  try {
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + daysAhead)

    // 获取所有支持事件的日历
    const calendars = await Calendar.forEvents()

    // 获取指定时间范围内的事件
    const events = await CalendarEvent.getAll(startDate, endDate, calendars)

    // 转换为数据格式
    // 只取前5个事件
    return events
      .map(event => {
        const originalTitle = event.title
        const processedTitle = applyFieldReplaceRules(originalTitle) // 应用字段替换规则
        const workStatus = detectWorkStatus(originalTitle) // 检测工作状态（基于原始标题）

        return {
          id: event.identifier,
          title: processedTitle,
          startDate: event.startDate,
          endDate: event.endDate,
          isAllDay: event.isAllDay,
          location: event.location,
          calendar: {
            title: event.calendar?.title || '未知日历',
            color: event.calendar?.color || '#007AFF'
          },
          workStatus
        } as CalendarEventWithStatus
      })
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, 5)
  } catch (error) {
    console.error('获取日历事件失败:', error)
    return []
  }
}

/**
 * 获取当前月份的所有事件
 */
export async function getCurrentMonthEvents(): Promise<CalendarEventWithStatus[]> {
  try {
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1) // 月初
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0) // 月末

    // 获取所有支持事件的日历
    const calendars = await Calendar.forEvents()

    // 获取当前月份的所有事件
    const events = await CalendarEvent.getAll(startDate, endDate, calendars)

    // 转换为数据格式
    return events.map(event => {
      const originalTitle = event.title
      const processedTitle = applyFieldReplaceRules(originalTitle) // 应用字段替换规则
      const workStatus = detectWorkStatus(originalTitle) // 检测工作状态（基于原始标题）

      return {
        id: event.identifier,
        title: processedTitle,
        startDate: event.startDate,
        endDate: event.endDate,
        isAllDay: event.isAllDay,
        location: event.location,
        calendar: {
          title: event.calendar?.title || '未知日历',
          color: event.calendar?.color || '#007AFF'
        },
        workStatus
      } as CalendarEventWithStatus
    })
  } catch (error) {
    console.error('获取当前月份事件失败:', error)
    return []
  }
}

/**
 * 获取指定日期的事件
 */
export function getEventsForDate(events: CalendarEventWithStatus[], date: Date): CalendarEventWithStatus[] {
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  return events.filter(event => {
    const eventStartDate = new Date(event.startDate.getFullYear(), event.startDate.getMonth(), event.startDate.getDate())
    const eventEndDate = new Date(event.endDate.getFullYear(), event.endDate.getMonth(), event.endDate.getDate())

    // 检查事件是否在当天或跨越当天
    return eventStartDate.getTime() <= targetDate.getTime() && eventEndDate.getTime() >= targetDate.getTime()
  })
}

/**
 * 获取指定日期的工作状态
 */
export function getWorkStatusForDate(events: CalendarEventWithStatus[], date: Date): WorkStatus {
  const dayEvents = getEventsForDate(events, date)

  // 优先级：班 > 休
  for (const event of dayEvents) {
    if (event.workStatus === 'work') {
      return 'work'
    }
  }

  for (const event of dayEvents) {
    if (event.workStatus === 'rest') {
      return 'rest'
    }
  }

  return null
}

/**
 * 格式化事件时间显示
 */
export function formatEventTime(event: CalendarEventData): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const eventDate = new Date(event.startDate.getFullYear(), event.startDate.getMonth(), event.startDate.getDate())

  if (event.isAllDay) {
    if (eventDate.getTime() === today.getTime()) {
      return '今天 全天'
    } else if (eventDate.getTime() === tomorrow.getTime()) {
      return '明天 全天'
    } else {
      return `${event.startDate.getMonth() + 1}/${event.startDate.getDate()} 全天`
    }
  } else {
    const timeStr = event.startDate.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })

    if (eventDate.getTime() === today.getTime()) {
      return `今天 ${timeStr}`
    } else if (eventDate.getTime() === tomorrow.getTime()) {
      return `明天 ${timeStr}`
    } else {
      return `${event.startDate.getMonth() + 1}/${event.startDate.getDate()} ${timeStr}`
    }
  }
}

/**
 * 获取完整的日历数据
 */
export async function getCalendarData(): Promise<CalendarData> {
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1
  const currentDateDay = currentDate.getDate()

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDayOfWeek = getFirstDayOfWeek(currentYear, currentMonth)

  // 同时获取即将到来的事件和当前月份事件
  const [upcomingEvents, currentMonthEvents] = await Promise.all([getUpcomingEvents(), getCurrentMonthEvents()])

  return {
    currentDate,
    currentDateDay,
    currentMonth,
    currentYear,
    daysInMonth,
    firstDayOfWeek,
    upcomingEvents,
    currentMonthEvents
  }
}

/**
 * 日历网格单元格类型
 */
export type CalendarGridCell = {
  day: number
  isCurrentMonth: boolean
  isToday: boolean
}

/**
 * 生成日历网格数据
 */
export function generateCalendarGrid(year: number, month: number): CalendarGridCell[] {
  const daysInMonth = getDaysInMonth(year, month)
  const firstDayOfWeek = getFirstDayOfWeek(year, month)
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month - 1
  const todayDate = today.getDate()

  const grid: CalendarGridCell[] = []

  // 转换为星期一开头的格式 (0=周一, 1=周二, ..., 6=周日)
  const mondayBasedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

  // 添加上个月的日期（填充空白）
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth)

  for (let i = mondayBasedFirstDay - 1; i >= 0; i--) {
    grid.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      isToday: false
    })
  }

  // 添加当前月的日期
  for (let day = 1; day <= daysInMonth; day++) {
    grid.push({
      day,
      isCurrentMonth: true,
      isToday: isCurrentMonth && day === todayDate
    })
  }

  // 添加下个月的日期（填充到42个格子）
  const remainingCells = 42 - grid.length
  for (let day = 1; day <= remainingCells; day++) {
    grid.push({
      day,
      isCurrentMonth: false,
      isToday: false
    })
  }

  return grid
}

/**
 * 获取月份名称 - 中文
 */
export function getMonthName(month: number): string {
  const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  return months[month - 1] || ''
}

/**
 * 获取月份名称 - 数字
 */
export function getMonthNameToNumber(month: number): string {
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  return months[month - 1] || ''
}

/**
 * 获取星期名称
 */
export function getWeekdayNames(): string[] {
  return ['一', '二', '三', '四', '五', '六', '日']
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
  getChangelog: (): string[] => scriptConfig.changelog || [],

  /** 获取远程横幅图片URL */
  fetchBannerImage: async (): Promise<string | null> => {
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
}

// 保持向后兼容的导出
export const getCurrentVersion = VersionManager.getCurrentVersion
export const getLocalVersionInfo = VersionManager.getLocalVersionInfo
export const fetchBannerImage = VersionManager.fetchBannerImage

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
  },

  /** 获取字段替换规则 */
  getFieldReplaceRules: (): FieldReplaceRule[] => {
    const settings = SettingsManager.getCurrentSettings()
    return settings.fieldReplaceRules || []
  },

  /** 添加字段替换规则 */
  addFieldReplaceRule: (searchText: string, replaceText: string): void => {
    if (!searchText.trim()) return

    const settings = SettingsManager.getCurrentSettings()
    const rules = settings.fieldReplaceRules || []
    const newRule: FieldReplaceRule = {
      id: Date.now().toString(),
      searchText: searchText.trim(),
      replaceText: replaceText
    }

    const updatedSettings = {
      ...settings,
      fieldReplaceRules: [...rules, newRule]
    }
    SettingsManager.saveSettings(updatedSettings)
  },

  /** 删除字段替换规则 */
  removeFieldReplaceRule: (ruleId: string): void => {
    const settings = SettingsManager.getCurrentSettings()
    const rules: FieldReplaceRule[] = settings.fieldReplaceRules || []
    const updatedRules = rules.filter((rule: FieldReplaceRule) => rule.id !== ruleId)

    const updatedSettings = {
      ...settings,
      fieldReplaceRules: updatedRules
    }
    SettingsManager.saveSettings(updatedSettings)
  },

  /** 更新字段替换规则 */
  updateFieldReplaceRule: (ruleId: string, searchText: string, replaceText: string): void => {
    if (!searchText.trim()) return

    const settings = SettingsManager.getCurrentSettings()
    const rules: FieldReplaceRule[] = settings.fieldReplaceRules || []
    const updatedRules = rules.map((rule: FieldReplaceRule) => (rule.id === ruleId ? { ...rule, searchText: searchText.trim(), replaceText } : rule))

    const updatedSettings = {
      ...settings,
      fieldReplaceRules: updatedRules
    }
    SettingsManager.saveSettings(updatedSettings)
  }
}

// 保持向后兼容的导出
export const getCurrentSettings = SettingsManager.getCurrentSettings
export const saveSettings = SettingsManager.saveSettings
export const getDynamicTextColor = SettingsManager.getDynamicTextColor
export const getChangelog = VersionManager.getChangelog
