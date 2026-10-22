import type { Color, ColorScheme, LinearGradient } from 'scripting'
import type { SiteId } from './core/types'

/** 一对日间 / 夜间取值；结构与 DynamicShapeStyle 一致，系统按当前外观取用 */
export type Tone<T = Color> = { light: T; dark: T }

const tone = (light: Color, dark: Color): Tone => ({ light, dark })

/**
 * 按指定外观取一侧；undefined 表示跟随系统，原样保留动态值。
 * 用函数声明而非泛型箭头函数：Scripting 把 .ts 也按 TSX 转译，`<T>(...) =>` 会被当成 JSX。
 */
export function pickTone<T>(value: Tone<T>, scheme: ColorScheme | undefined): T | Tone<T> {
  return scheme ? value[scheme] : value
}

/**
 * 随外观切换的设计令牌：夜间是近黑的影院底色，日间是暖白底 + 白色卡片；
 * 强调色取直播常用的「正在直播」红，与 ScriptFlix 的版式保持一致。
 */
const tones = {
  bg: tone('#F6F3F2', '#08070A'),
  card: tone('#FFFFFF', '#18161C'),
  cardHi: tone('#EEE9E7', '#242128'),
  textPrimary: tone('#1A1615', '#F6F4F3'),
  textSecondary: tone('rgba(26,22,21,0.64)', 'rgba(246,244,243,0.64)'),
  textTertiary: tone('rgba(26,22,21,0.42)', 'rgba(246,244,243,0.40)'),
  separator: tone('rgba(26,22,21,0.08)', 'rgba(255,255,255,0.08)'),
  /** 停用态、未选中图标的弱化填充 */
  fillMuted: tone('rgba(26,22,21,0.06)', 'rgba(255,255,255,0.07)'),
  accent: tone('#EF2D56', '#FF5A76'),
  /** 品牌色浅底上的文字 */
  accentInk: tone('#C81E45', '#FFB3C1'),
  success: tone('#15803D', '#4ADE80'),
  warning: tone('#B45309', '#F5C451')
}

/** 叠在封面、播放器上的固定色，不随外观变化 */
const onImage = {
  live: '#FF3B5C' as Color,
  gold: '#F5C451' as Color,
  ink: '#08070A' as Color
}

export type ThemePalette = { [K in keyof typeof tones]: Tone } & typeof onImage

export const palette: ThemePalette = { ...tones, ...onImage }

/**
 * 外观预览按指定外观取色；undefined 时保留动态色交给系统。
 * @param scheme 指定的外观
 */
export const paletteFor = (scheme: ColorScheme | undefined): Record<keyof typeof tones, Tone | Color> =>
  Object.fromEntries(Object.entries(tones).map(([key, value]) => [key, pickTone(value, scheme)])) as Record<keyof typeof tones, Tone | Color>

/** 品牌主渐变（直播红 → 暖橙），用于品牌标题、选中态、主按钮与「直播中」角标 */
export const brandGradient: LinearGradient = {
  colors: ['#FF2D55', '#FF8A3D'],
  startPoint: 'topLeading',
  endPoint: 'bottomTrailing'
}

/** 品牌色低透明度光晕，叠在卡片上做高亮底 */
export const accentGlow: LinearGradient = {
  colors: ['rgba(255,45,85,0.22)', 'rgba(255,138,61,0.08)'],
  startPoint: 'topLeading',
  endPoint: 'bottomTrailing'
}

/** 封面底部压暗，保证叠加文字可读 */
export const coverScrim: LinearGradient = {
  colors: ['rgba(8,7,10,0)', 'rgba(8,7,10,0.78)'],
  startPoint: 'top',
  endPoint: 'bottom'
}

/** 头图大卡的压暗，突出左下角信息 */
export const heroScrim: LinearGradient = {
  colors: ['rgba(8,7,10,0.05)', 'rgba(8,7,10,0.45)', 'rgba(8,7,10,0.92)'],
  startPoint: 'top',
  endPoint: 'bottom'
}

export const radius = { sm: 8, md: 14, lg: 20 } as const

/** 页面根容器：铺满可用区域并让内容贴顶 */
export const FULL_FRAME = { maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' } as const

type SiteStyle = { color: Color; short: string; name: string }

/** 平台识别色与名称；图标统一使用 assets/platforms 下的 Logo。 */
export const SITE_STYLE: Record<SiteId, SiteStyle> = {
  bilibili: { color: '#FB7299', short: 'B站', name: '哔哩哔哩' },
  douyu: { color: '#FF7A1A', short: '斗鱼', name: '斗鱼直播' },
  huya: { color: '#F5A623', short: '虎牙', name: '虎牙直播' },
  douyin: { color: '#16B5C2', short: '抖音', name: '抖音直播' }
}

/** 设置项图标底色，取系统色板，彼此区分又不刺眼 */
export const TILE = {
  red: '#FF375F' as Color,
  orange: '#FF9F0A' as Color,
  yellow: '#FFB800' as Color,
  green: '#30C759' as Color,
  teal: '#30B0C7' as Color,
  blue: '#0A84FF' as Color,
  indigo: '#5E5CE6' as Color,
  purple: '#BF5AF2' as Color,
  pink: '#FF2D92' as Color,
  gray: '#8E8E93' as Color
}

export const colorSchemeOf = (mode: 'auto' | 'light' | 'dark'): ColorScheme | undefined => (mode === 'auto' ? undefined : mode)
