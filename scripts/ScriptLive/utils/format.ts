/**
 * 人气数字：万以上显示「1.2万」，亿以上显示「1.2亿」
 * @param value 人数或热度
 */
export const formatOnline = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return '0'
  if (value >= 1e8) return `${trimZero(value / 1e8)}亿`
  if (value >= 1e4) return `${trimZero(value / 1e4)}万`
  return String(Math.floor(value))
}

const trimZero = (value: number) => value.toFixed(1).replace(/\.0$/, '')

const pad = (value: number, length = 2) => String(value).padStart(length, '0')

/** 格式化本地日期时间，精确到毫秒，用于记录和备份 */
export const formatDateTime = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`

/** 解析记录、备份中的日期时间或 ISO 时间；无法解析时返回 0 */
export const parseDateTime = (text: string): number => {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?/.exec(text ?? '')
  if (!match) {
    const time = Date.parse(text)
    return Number.isNaN(time) ? 0 : time
  }
  const [, y, mo, d, h, mi, s, ms = '0'] = match
  return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s), Number(ms.slice(0, 3).padEnd(3, '0'))).getTime()
}

/** 相对时间：刚刚 / 5 分钟前 / 3 小时前 / 10-21 */
export const formatRelative = (time: number): string => {
  if (!time) return ''
  const diff = Date.now() - time
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  const date = new Date(time)
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 开播时长：秒级时间戳 → 「2 小时 5 分」 */
export const formatLiveDuration = (showTime?: string): string => {
  const start = Number(showTime)
  if (!start) return ''
  const seconds = Math.max(0, Math.floor(Date.now() / 1000 - (start > 1e12 ? start / 1000 : start)))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours > 0 ? `${hours} 小时 ${minutes} 分` : `${minutes} 分钟`
}

/** 换批间隔：30 → 「每 30 分钟」，60 → 「每小时」，1440 → 「每天」 */
export const formatInterval = (minutes: number): string => {
  if (minutes >= 1440) return '每天'
  if (minutes === 60) return '每小时'
  return minutes % 60 === 0 ? `每 ${minutes / 60} 小时` : `每 ${minutes} 分钟`
}

/** 统一的错误文案 */
export const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error))
