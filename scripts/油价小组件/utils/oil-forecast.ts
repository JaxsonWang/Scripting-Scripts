export type PriceDirection = 'rising' | 'falling' | 'stranded' | 'unknown'
export type ResolvedPriceDirection = Exclude<PriceDirection, 'unknown'>

export interface ForecastData {
  priceDirection: PriceDirection
  forecastDate: string | null
  forecastPrice: string | null
}

export interface ParsedForecast {
  priceDirection: ResolvedPriceDirection
  forecastDate: string
  targetDate: string
  forecastPrice: string | null
}

export interface CachedForecast extends ParsedForecast {
  fetchedAt: number
}

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000

const FULLWIDTH_MAP: Record<string, string> = {
  '０': '0',
  '１': '1',
  '２': '2',
  '３': '3',
  '４': '4',
  '５': '5',
  '６': '6',
  '７': '7',
  '８': '8',
  '９': '9',
  '．': '.',
  '／': '/',
  '－': '-',
  '：': ':',
  '，': ',',
  '（': '(',
  '）': ')'
}

const pad2 = (value: number): string => String(value).padStart(2, '0')

const getBeijingCalendarDate = (date: Date): { year: number; month: number; day: number } => {
  const shifted = new Date(date.getTime() + BEIJING_OFFSET_MS)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate()
  }
}

export const formatBeijingDate = (date: Date): string => {
  const { year, month, day } = getBeijingCalendarDate(date)
  return `${year}年${pad2(month)}月${pad2(day)}日`
}

const isValidYmd = (year: number, month: number, day: number): boolean => {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

const formatYmd = (year: number, month: number, day: number): string => `${year}-${pad2(month)}-${pad2(day)}`

const formatDisplayYmd = (year: number, month: number, day: number): string => `${year}年${pad2(month)}月${pad2(day)}日`

const parseYmd = (ymd: string): { year: number; month: number; day: number } | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  return isValidYmd(year, month, day) ? { year, month, day } : null
}

const decodeHtmlEntities = (input: string): string => {
  return input
    .replace(/&nbsp;|&#160;|&#x0*a0;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
}

const normalizeForecastText = (input: string): string => {
  return input
    .replace(/[\u00a0\u3000]/g, ' ')
    .replace(/[０-９．／－：，（）]/g, ch => FULLWIDTH_MAP[ch] || ch)
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

const hasClassToken = (attrs: string, token: string): boolean => {
  const classMatch = /\bclass\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i.exec(attrs)
  if (!classMatch) return false
  const classValue = classMatch[1] ?? classMatch[2] ?? classMatch[3] ?? ''
  return classValue
    .trim()
    .split(/\s+/)
    .some(item => item.toLowerCase() === token.toLowerCase())
}

/**
 * 从油价预报页面 HTML 中定向提取 `.tishi` 正文，先剥离脚本/样式/注释，并按 div 嵌套配对截断检查。
 * shortcut: 仅针对 m.qiyoujiage.com 简单 `.tishi` 块，页面改用动态渲染或更换容器结构时需升级提取规则。
 */
export const extractForecastText = (html: string): string | null => {
  if (!html) return null

  const cleaned = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')

  const openDivRegex = /<div\b([^>]*)>/gi
  let openMatch: RegExpExecArray | null

  while ((openMatch = openDivRegex.exec(cleaned)) !== null) {
    if (!hasClassToken(openMatch[1], 'tishi')) continue

    const contentStart = openMatch.index + openMatch[0].length
    const tagRegex = /<\/?div\b[^>]*>/gi
    tagRegex.lastIndex = contentStart

    let depth = 1
    let tagMatch: RegExpExecArray | null
    let contentEnd = -1

    while ((tagMatch = tagRegex.exec(cleaned)) !== null) {
      const tag = tagMatch[0]
      if (/^<\/div/i.test(tag)) {
        depth -= 1
        if (depth === 0) {
          contentEnd = tagMatch.index
          break
        }
      } else if (!/\/>\s*$/.test(tag)) {
        depth += 1
      }
    }

    if (contentEnd === -1) return null

    const innerHtml = cleaned.slice(contentStart, contentEnd)
    const plainText = normalizeForecastText(decodeHtmlEntities(innerHtml.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')))
    return plainText || null
  }

  return null
}

const resolveForecastDate = (text: string, now: Date): { forecastDate: string; targetDate: string } | null => {
  const patterns = [
    /(?:油价|下[一]?轮|本次|本轮)[^\n。；;]{0,16}?(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日(?:\s*24[时点])?\s*(?:调整|调价|开启)/,
    /(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日(?:\s*24[时点])?\s*(?:调整|调价|开启)/,
    /(?:调整|调价)(?:时间|日期|窗口)?[:\s]*(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日/
  ]

  let match: RegExpExecArray | null = null
  for (const pattern of patterns) {
    match = pattern.exec(text)
    if (match) break
  }

  if (!match) return null

  const explicitYear = match[1] ? Number(match[1]) : null
  const month = Number(match[2])
  const day = Number(match[3])

  if (explicitYear !== null) {
    if (!isValidYmd(explicitYear, month, day)) return null
    return {
      forecastDate: formatDisplayYmd(explicitYear, month, day),
      targetDate: formatYmd(explicitYear, month, day)
    }
  }

  const today = getBeijingCalendarDate(now)
  const todayUtcMs = Date.UTC(today.year, today.month - 1, today.day)
  let best: { year: number; diff: number; absDiff: number } | null = null

  for (const candidateYear of [today.year - 1, today.year, today.year + 1]) {
    if (!isValidYmd(candidateYear, month, day)) continue
    const diff = Date.UTC(candidateYear, month - 1, day) - todayUtcMs
    const absDiff = Math.abs(diff)
    if (!best || absDiff < best.absDiff || (absDiff === best.absDiff && diff > best.diff)) {
      best = { year: candidateYear, diff, absDiff }
    }
  }

  if (!best) return null

  return {
    forecastDate: formatDisplayYmd(best.year, month, day),
    targetDate: formatYmd(best.year, month, day)
  }
}

const extractCurrentRoundClause = (text: string): string => {
  const clauses = text
    .split(/[\n。；;,]+/)
    .map(clause => clause.trim())
    .filter(Boolean)

  const hasHistory = clauses.some(clause => /(?:上[一]?轮|上次|此前|前期)/.test(clause))
  const hasCurrent = clauses.some(clause => /(?:本轮|本次|下[一]?轮|预计|有望)/.test(clause))

  if (!hasHistory || !hasCurrent) return text

  const filtered = clauses.filter(clause => !(/(?:上[一]?轮|上次|此前|前期)/.test(clause) && !/(?:本轮|本次|下[一]?轮|预计|有望)/.test(clause)))
  return filtered.length > 0 ? filtered.join('，') : text
}

const resolveDirection = (clause: string): ResolvedPriceDirection | null => {
  const sanitized = clause.replace(/(?:突破|远离|告别|超过|超出|高于|越过)[^\n,。；;]{0,8}搁浅(?:线|红线|标准)?/g, '')

  const isStranded =
    /(?:预计|本轮|本次|有望)?\s*(?:搁浅|不作调整|不做调整|暂不调整|不调整)|处于搁浅(?:范围|区间)|搁浅(?:范围|区间)|低于搁浅(?:线|红线|标准)/.test(sanitized)
  if (isStranded) return 'stranded'

  const strongRising = /(?:预计|本轮|本次|有望|将)[^\n,。；;]{0,10}(?:上调|上涨|大涨|小涨)|(?:上调|上涨|大涨|小涨)\s*\d+(?:\.\d+)?\s*元\s*\/\s*(?:吨|升)/.test(
    sanitized
  )
  const strongFalling = /(?:预计|本轮|本次|有望|将)[^\n,。；;]{0,10}(?:下调|下跌|大跌|小跌)|(?:下调|下跌|大跌|小跌)\s*\d+(?:\.\d+)?\s*元\s*\/\s*(?:吨|升)/.test(
    sanitized
  )

  if (strongRising && strongFalling) return null
  if (strongRising) return 'rising'
  if (strongFalling) return 'falling'

  const weakRising = /(?:上调|上涨|大涨|小涨)/.test(sanitized)
  const weakFalling = /(?:下调|下跌|大跌|小跌)/.test(sanitized)

  if (weakRising && weakFalling) return null
  if (weakRising) return 'rising'
  if (weakFalling) return 'falling'

  return null
}

const resolvePricePerLiter = (clause: string): string | null => {
  const rangeMatch = /(\d+(?:\.\d+)?)\s*(?:元\s*\/\s*升)?\s*(?:[-~～—–]|至)\s*(\d+(?:\.\d+)?)\s*元\s*\/\s*升/.exec(clause)
  if (rangeMatch) {
    const first = Number(rangeMatch[1])
    const second = Number(rangeMatch[2])
    if (Number.isFinite(first) && Number.isFinite(second) && first > 0 && second > 0) {
      const mid = (first + second) / 2
      return mid > 0 ? mid.toFixed(2) : null
    }
  }

  const singleMatch = /(\d+(?:\.\d+)?)\s*元\s*\/\s*升/.exec(clause)
  if (singleMatch) {
    const value = Number(singleMatch[1])
    if (Number.isFinite(value) && value > 0) {
      return value.toFixed(2)
    }
  }

  return null
}

/**
 * 解析油价预测正文。只有调价日期合法且本轮方向可明确识别时返回结果，否则返回 null。
 */
export const parseForecastString = (rawText: string, now: Date = new Date()): ParsedForecast | null => {
  if (!rawText) return null

  const normalized = normalizeForecastText(rawText)
  if (!normalized) return null

  const dateInfo = resolveForecastDate(normalized, now)
  if (!dateInfo) return null

  const currentClause = extractCurrentRoundClause(normalized)
  const priceDirection = resolveDirection(currentClause)
  if (!priceDirection) return null

  const forecastPrice = priceDirection === 'stranded' ? null : resolvePricePerLiter(currentClause)

  return {
    priceDirection,
    forecastDate: dateInfo.forecastDate,
    targetDate: dateInfo.targetDate,
    forecastPrice
  }
}

/**
 * 按北京时间判断调价窗口是否尚未过期：24时调价在当日 23:59:59 仍有效，次日 00:00:00 起过期。
 */
export const isForecastValid = (forecast: Pick<ParsedForecast, 'targetDate'>, now: Date = new Date()): boolean => {
  const parsed = parseYmd(forecast.targetDate)
  if (!parsed) return false
  const expiryUtcMs = Date.UTC(parsed.year, parsed.month - 1, parsed.day + 1) - BEIJING_OFFSET_MS
  return now.getTime() < expiryUtcMs
}

export const createUnknownForecast = (): ForecastData => ({
  priceDirection: 'unknown',
  forecastDate: null,
  forecastPrice: null
})

export const resolveForecastFromCache = (cached: CachedForecast | undefined, now: Date = new Date()): ForecastData => {
  if (!cached || !cached.forecastDate || !cached.targetDate) return createUnknownForecast()
  if (cached.priceDirection !== 'rising' && cached.priceDirection !== 'falling' && cached.priceDirection !== 'stranded') {
    return createUnknownForecast()
  }
  if (!isForecastValid(cached, now)) return createUnknownForecast()

  return {
    priceDirection: cached.priceDirection,
    forecastDate: cached.forecastDate,
    forecastPrice: cached.priceDirection === 'stranded' ? null : cached.forecastPrice
  }
}

export const formatForecastPrice = (forecastPrice: string | null | undefined): string | null => {
  if (!forecastPrice) return null
  const price = Number.parseFloat(forecastPrice)
  return Number.isFinite(price) && price > 0 ? `¥${price.toFixed(2)}` : null
}

export const getTrendColor = (priceDirection: PriceDirection) => {
  switch (priceDirection) {
    case 'rising':
      return 'systemRed'
    case 'falling':
      return 'systemGreen'
    default:
      return 'systemGray'
  }
}

export const getTrendSymbol = (priceDirection: PriceDirection): string => {
  switch (priceDirection) {
    case 'rising':
      return '↗'
    case 'falling':
      return '↘'
    case 'stranded':
      return '→'
    default:
      return ''
  }
}

export const getTrendText = (priceDirection: PriceDirection): string => {
  switch (priceDirection) {
    case 'rising':
      return '预计上调'
    case 'falling':
      return '预计下调'
    case 'stranded':
      return '预计不调整'
    default:
      return '预测暂不可用'
  }
}

export const formatForecastBadge = (forecast: ForecastData): string | null => {
  if (forecast.priceDirection === 'unknown') return null
  if (forecast.priceDirection === 'stranded') return `${getTrendSymbol('stranded')} 预计不调整`

  const formattedPrice = formatForecastPrice(forecast.forecastPrice)
  const symbol = getTrendSymbol(forecast.priceDirection)
  return formattedPrice ? `${symbol} 约${formattedPrice}/L` : `${symbol} ${getTrendText(forecast.priceDirection)}`
}

export const formatForecastFooter = (forecast: ForecastData): string => {
  if (forecast.priceDirection === 'unknown' || !forecast.forecastDate) {
    return '预测暂不可用'
  }
  return `${forecast.forecastDate} ${getTrendText(forecast.priceDirection)}`
}
