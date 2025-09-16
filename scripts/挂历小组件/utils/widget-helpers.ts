import { getEventsForDate, getWorkStatusForDate } from './calendar-service'
import { getLunarInfoForDate } from './lunar-calendar'

import type { Color, FontWeight, ShapeStyle } from 'scripting'
import type { CalendarData, WorkStatus } from './calendar-service'

/**
 * 日历单元格显示信息
 */
export interface CellDisplayInfo {
  displayText: string
  displayColor: ShapeStyle
  fontWeight: FontWeight
  workStatus: WorkStatus // 工作状态
}

/**
 * 计算实际需要显示的周数
 * 动态计算，避免显示空白周
 * @param grid 日历网格数据
 * @returns 需要显示的周数
 */
export const calculateWeeksToShow = (grid: any[]): number => {
  let weeksToShow = 6 // 默认6周

  // 检查最后一周是否有当前月份的日期
  for (let week = 5; week >= 4; week--) {
    const weekStart = week * 7
    const weekEnd = weekStart + 7
    const weekCells = grid.slice(weekStart, weekEnd)
    const hasCurrentMonthDays = weekCells.some(cell => cell.isCurrentMonth)

    if (!hasCurrentMonthDays && week === 5) {
      weeksToShow = 5 // 如果第6周没有当前月份日期，只显示5周
      break
    }
  }

  return weeksToShow
}

/**
 * 计算日历单元格的显示内容
 * 根据优先级确定显示内容：事件 > 节气 > 农历日期
 * @param calendar 日历数据
 * @param cell 单元格数据
 * @returns 显示信息
 */
export const calculateCellDisplayInfo = (calendar: CalendarData, cell: { day: number; isCurrentMonth: boolean }): CellDisplayInfo => {
  // 获取当前日期的农历信息和事件信息
  const cellDate = new Date(calendar.currentYear, calendar.currentMonth - 1, cell.day)
  const lunarInfo = getLunarInfoForDate(cellDate)

  // 获取当天的事件
  const dayEvents = getEventsForDate(calendar.currentMonthEvents, cellDate)
  const primaryEvent = dayEvents.length > 0 ? dayEvents[0] : null // 取第一个事件作为主要事件

  // 获取工作状态
  const workStatus = getWorkStatusForDate(calendar.currentMonthEvents, cellDate)

  // 根据优先级确定显示内容：事件 > 节气 > 农历日期
  let displayText = lunarInfo.dayName // 默认显示农历日期
  let displayColor = 'tertiaryLabel' as ShapeStyle
  let fontWeight = 'regular' as FontWeight

  if (primaryEvent && !primaryEvent.workStatus) {
    // 最高优先级：事件（但排除有工作状态标识的事件，这些只显示点点）
    displayText = primaryEvent.title.replace(/节/g, '')
    // 事件颜色使用固定的系统颜色，因为目前不支持自定义颜色
    displayColor = primaryEvent.calendar.color
    fontWeight = 'regular' as FontWeight
  } else if (lunarInfo.jieqi) {
    // 其次：节气
    displayText = lunarInfo.jieqi
    displayColor = 'systemOrange' as Color
    fontWeight = 'regular' as FontWeight
  }

  return {
    displayText,
    displayColor,
    fontWeight,
    workStatus
  }
}

/**
 * 渲染星期标题的通用函数
 * @param weekdays 星期名称数组
 * @param fontSize 字体大小
 * @param cellWidth 单元格宽度（可选）
 * @returns 星期标题的渲染函数
 */
export const renderWeekdayHeaders = (weekdays: string[], fontSize: number | string, cellWidth?: number | 'infinity') => {
  return weekdays.map(day => ({
    key: day,
    day,
    fontSize,
    cellWidth: cellWidth || 'infinity'
  }))
}

/**
 * 生成日历网格行的通用函数
 * @param grid 日历网格数据
 * @param weeksToShow 要显示的周数
 * @param calendar 日历数据
 * @param includeDisplayInfo 是否包含显示信息（事件、节气等）
 * @returns 日历网格行数据
 */
export const generateCalendarRows = (grid: any[], weeksToShow: number, calendar: CalendarData, includeDisplayInfo: boolean = false) => {
  return Array.from({ length: weeksToShow }, (_, weekIndex) => {
    const weekCells = grid.slice(weekIndex * 7, (weekIndex + 1) * 7).map((cell, dayIndex) => {
      const cellData = {
        ...cell,
        weekIndex,
        dayIndex,
        key: `${weekIndex}-${dayIndex}`
      }

      if (includeDisplayInfo && cell.isCurrentMonth) {
        const displayInfo = calculateCellDisplayInfo(calendar, cell)
        return {
          ...cellData,
          ...displayInfo
        }
      }

      return cellData
    })

    return {
      weekIndex,
      cells: weekCells
    }
  })
}

/**
 * 格式化月份显示文本
 * @param year 年份
 * @param month 月份
 * @param day 日期（可选）
 * @returns 格式化的月份文本
 */
export const formatMonthDisplay = (year: number, month: number, day?: number): string => {
  if (day) {
    return `${year}年${month}月${day}日`
  }
  return `${year}年${month}月`
}

/**
 * 获取日历单元格的样式配置
 * @param cell 单元格数据
 * @param settings 设置数据
 * @param getActualColor 获取实际颜色的函数
 * @returns 样式配置
 */
export const getCellStyle = (cell: { isToday: boolean; isCurrentMonth: boolean }, settings: any, getActualColor: (settings: any) => any) => {
  return {
    foregroundStyle: cell.isToday ? ('white' as Color) : cell.isCurrentMonth ? ('label' as ShapeStyle) : ('tertiaryLabel' as ShapeStyle),
    fontWeight: cell.isToday ? ('bold' as FontWeight) : ('regular' as FontWeight),
    backgroundColor: cell.isToday ? getActualColor(settings) : undefined
  }
}

/**
 * 生成事件列表的显示数据
 * @param events 事件数组
 * @param maxCount 最大显示数量
 * @param formatEventTime 格式化事件时间的函数
 * @returns 格式化的事件显示数据
 */
export const formatEventsForDisplay = (events: any[], maxCount: number = 2, formatEventTime?: (event: any) => string) => {
  return events.slice(0, maxCount).map(event => ({
    id: event.id,
    title: event.title,
    color: event.calendar.color ?? 'systemOrange',
    time: formatEventTime ? formatEventTime(event) : event.startDate ? new Date(event.startDate).toLocaleDateString() : '',
    location: event.location
  }))
}

/**
 * 计算年份剩余天数的显示文本
 * @param daysLeft 剩余天数
 * @returns 显示文本
 */
export const formatDaysLeftText = (daysLeft: number): string => {
  return `今年还剩 ${daysLeft} 天`
}

/**
 * 生成农历信息的显示文本
 * @param lunar 农历数据
 * @returns 农历显示文本
 */
export const formatLunarDisplay = (lunar: any): string => {
  return lunar.monthName + lunar.dayName
}

/**
 * 生成宜忌信息的显示数据
 * @param yi 宜的事项数组
 * @param ji 忌的事项数组
 * @returns 宜忌显示数据
 */
export const formatYiJiDisplay = (yi: string[], ji: string[]) => {
  return {
    yi: {
      label: '宜',
      content: yi.join(','),
      color: 'systemGreen' as Color
    },
    ji: {
      label: '忌',
      content: ji.join(','),
      color: 'systemRed' as Color
    }
  }
}
