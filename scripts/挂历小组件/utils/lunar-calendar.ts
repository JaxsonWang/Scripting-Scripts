/**
 * 农历计算工具 - 使用 lunar.js 库
 */

// 引入 lunar.js 库
import { Solar } from './lunar.js'

/**
 * 农历数据类型
 */
export type LunarData = {
  year: number
  month: number
  day: number
  isLeap: boolean
  monthName: string
  dayName: string
  ganzhi: string
  animal: string
  formatted: string
  jieqi?: string // 节气名称（如果当天有节气）
  yi: string[] // 当日宜
  ji: string[] // 当日忌
}

/**
 * 公历转农历 - 使用 lunar.js 库
 */
export function solarToLunar(date: Date): LunarData {
  try {
    // 使用 lunar.js 库进行转换
    const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate())
    const lunar = solar.getLunar()

    // 获取农历信息
    const year = lunar.getYear()
    const month = lunar.getMonth()
    const day = lunar.getDay()
    const isLeap = month < 0 // 负数表示闰月

    // 获取干支信息
    const yearGanzhi = lunar.getYearInGanZhi()
    const monthGanzhi = lunar.getMonthInGanZhi()
    const dayGanzhi = lunar.getDayInGanZhi()

    // 获取生肖
    const animal = lunar.getYearShengXiao()

    // 获取星期
    const weekdays = ['日', '一', '二', '三', '四', '五', '六']
    const weekday = weekdays[date.getDay()]

    // 使用 lunar.js 库的内置方法获取中文格式
    const monthName = lunar.getMonthInChinese() + '月'
    const dayName = lunar.getDayInChinese()

    // 获取节气信息
    const jieqi = lunar.getJieQi() // 获取当天的节气（如果有）

    // 获取宜忌信息
    const yi = lunar.getDayYi() || ['无'] // 获取当日宜
    const ji = lunar.getDayJi() || ['无'] // 获取当日忌

    return {
      year,
      month: Math.abs(month), // 取绝对值，因为闰月是负数
      day,
      isLeap,
      monthName,
      dayName,
      ganzhi: yearGanzhi,
      animal,
      formatted: `${yearGanzhi}年 ${animal}年 ${monthGanzhi}月 ${dayGanzhi}日 星期${weekday}`,
      jieqi: jieqi || undefined, // 只有当天有节气时才设置
      yi, // 当日宜
      ji // 当日忌
    }
  } catch (error) {
    console.error('农历转换失败:', error)

    // 降级处理，返回基本信息
    const year = date.getFullYear()
    return {
      year,
      month: 1,
      day: 1,
      isLeap: false,
      monthName: '正月',
      dayName: '初一',
      ganzhi: '甲子',
      animal: '鼠',
      formatted: '甲子年 鼠年 甲寅月 甲子日 星期一',
      yi: ['无'],
      ji: ['无']
    }
  }
}

/**
 * 获取指定日期的农历和节气信息（用于日历网格）
 */
export function getLunarInfoForDate(date: Date): { dayName: string; jieqi?: string } {
  try {
    const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate())
    const lunar = solar.getLunar()

    const dayName = lunar.getDayInChinese()
    const jieqi = lunar.getJieQi() // 获取当天的节气（如果有）

    return {
      dayName,
      jieqi: jieqi || undefined
    }
  } catch (error) {
    console.error('获取农历信息失败:', error)
    return {
      dayName: '初一'
    }
  }
}

/**
 * 获取指定日期的宜忌信息
 */
export function getYiJiForDate(date: Date): { yi: string[]; ji: string[] } {
  try {
    const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate())
    const lunar = solar.getLunar()

    const yi = lunar.getDayYi() || ['无'] // 获取当日宜
    const ji = lunar.getDayJi() || ['无'] // 获取当日忌

    return {
      yi,
      ji
    }
  } catch (error) {
    console.error('获取宜忌信息失败:', error)
    return {
      yi: ['无'],
      ji: ['无']
    }
  }
}

/**
 * 获取今年剩余天数
 */
export function getDaysLeftInYear(date: Date = new Date()): number {
  const year = date.getFullYear()
  const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999)
  const now = new Date()
  const diffTime = endOfYear.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}
