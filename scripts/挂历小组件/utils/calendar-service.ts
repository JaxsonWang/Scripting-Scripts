import type { Color } from 'scripting'
import scriptConfig from '../script.json'

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
  LAST_VERSION: 'calendar_lastVersion',
  UPDATE_DISMISSED: 'calendar_updateDismissed'
}

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
  upcomingEvents: CalendarEventData[]
  currentMonthEvents: CalendarEventData[]
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
 * 获取即将到来的日历事件
 */
export async function getUpcomingEvents(daysAhead: number = 7): Promise<CalendarEventData[]> {
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
      .map(event => ({
        id: event.identifier,
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        isAllDay: event.isAllDay,
        location: event.location,
        calendar: {
          title: event.calendar?.title || '未知日历',
          color: event.calendar?.color || '#007AFF'
        }
      }))
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
export async function getCurrentMonthEvents(): Promise<CalendarEventData[]> {
  try {
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1) // 月初
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0) // 月末

    // 获取所有支持事件的日历
    const calendars = await Calendar.forEvents()

    // 获取当前月份的所有事件
    const events = await CalendarEvent.getAll(startDate, endDate, calendars)

    // 转换为数据格式
    return events.map(event => ({
      id: event.identifier,
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
      isAllDay: event.isAllDay,
      location: event.location,
      calendar: {
        title: event.calendar?.title || '未知日历',
        color: event.calendar?.color || '#007AFF'
      }
    }))
  } catch (error) {
    console.error('获取当前月份事件失败:', error)
    return []
  }
}

/**
 * 获取指定日期的事件
 */
export function getEventsForDate(events: CalendarEventData[], date: Date): CalendarEventData[] {
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  return events.filter(event => {
    const eventStartDate = new Date(event.startDate.getFullYear(), event.startDate.getMonth(), event.startDate.getDate())
    const eventEndDate = new Date(event.endDate.getFullYear(), event.endDate.getMonth(), event.endDate.getDate())

    // 检查事件是否在当天或跨越当天
    return eventStartDate.getTime() <= targetDate.getTime() && eventEndDate.getTime() >= targetDate.getTime()
  })
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
    const calendarInfo = data.WallCalendar

    if (calendarInfo) {
      return {
        name: calendarInfo.name,
        desc: calendarInfo.desc,
        version: calendarInfo.version,
        changelog: calendarInfo.changelog || [],
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
