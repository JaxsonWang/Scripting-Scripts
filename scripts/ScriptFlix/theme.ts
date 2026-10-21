import type { Color, ColorScheme, LinearGradient } from 'scripting'

/** 一对日间 / 夜间取值；结构与 DynamicShapeStyle 一致，系统按当前外观自动取用 */
export type Tone<T = Color> = { light: T; dark: T }

const tone = (light: Color, dark: Color): Tone => ({ light, dark })

/**
 * 按指定外观取一侧；undefined 表示跟随系统，原样保留动态值。
 * 用函数声明而非泛型箭头函数：Scripting 运行时把 .ts 也按 TSX 转译，`<T>(...) =>` 会被当成 JSX 标签。
 * @param value 日间 / 夜间取值
 * @param scheme 指定的外观
 */
export function pickTone<T>(value: Tone<T>, scheme: ColorScheme | undefined): T | Tone<T> {
  return scheme ? value[scheme] : value
}

/**
 * 随外观切换的设计令牌：夜间为暗色影院质感，日间为浅薰衣草底 + 白色卡片。
 * 页面通过 preferredColorScheme 决定取哪一侧，「自动」时跟随系统。
 */
const tones = {
  bg: tone('#F4F2F9', '#07060C'),
  card: tone('#FFFFFF', '#1A1726'),
  cardHi: tone('#ECE8F4', '#241F33'),
  textPrimary: tone('#17131F', '#F6F5FB'),
  textSecondary: tone('rgba(23,19,31,0.66)', 'rgba(246,245,251,0.64)'),
  textTertiary: tone('rgba(23,19,31,0.44)', 'rgba(246,245,251,0.40)'),
  /** 停用态图标等弱化填充 */
  fillMuted: tone('rgba(23,19,31,0.06)', 'rgba(255,255,255,0.06)'),
  accent: tone('#9333EA', '#A855F7'),
  /** 页面底色上的提醒文字（错误、部分失败） */
  warning: tone('#B45309', '#F5C451'),
  /** 品牌色浅底上的文字，如「启用」胶囊 */
  accentInk: tone('#7E22CE', '#D8B4FE')
}

/** 叠在海报、头图上的固定色，不随外观变化 */
const onImage = {
  gold: '#F5C451' as Color,
  ink: '#07060C' as Color
}

export type ThemePalette = { [K in keyof typeof tones]: Tone | Color } & typeof onImage

/** App 页面使用的动态色板 */
export const palette: ThemePalette = { ...tones, ...onImage }

/**
 * 小组件按 ScriptFlix 的外观设置取色：日间 / 夜间固定一侧，自动时保留动态色交给系统。
 * @param scheme 指定的外观；undefined 表示跟随系统
 */
export const paletteFor = (scheme: ColorScheme | undefined): ThemePalette => {
  const resolved = Object.fromEntries(Object.entries(tones).map(([key, value]) => [key, pickTone(value, scheme)])) as Record<keyof typeof tones, Tone | Color>
  return { ...resolved, ...onImage }
}

/** 品牌主渐变（紫 → 粉），用于标题、主按钮、角标 */
export const brandGradient: LinearGradient = {
  colors: ['#A855F7', '#EC4899'],
  startPoint: 'topLeading',
  endPoint: 'bottomTrailing'
}

/** 品牌色低透明度光晕，叠在卡片上标记「当前」等高亮状态 */
export const accentGlow: LinearGradient = {
  colors: ['rgba(168,85,247,0.30)', 'rgba(236,72,153,0.10)'],
  startPoint: 'topLeading',
  endPoint: 'bottomTrailing'
}

/** 海报/头图底部压暗渐变，保证文字可读 */
export const posterScrim: LinearGradient = {
  colors: ['rgba(7,6,12,0)', 'rgba(7,6,12,0.85)'],
  startPoint: 'top',
  endPoint: 'bottom'
}

/** Hero 大图横向压暗渐变，突出左下角信息 */
export const heroScrim: LinearGradient = {
  colors: ['rgba(7,6,12,0.1)', 'rgba(7,6,12,0.55)', 'rgba(7,6,12,0.95)'],
  startPoint: 'top',
  endPoint: 'bottom'
}

export const radius = {
  sm: 8,
  md: 14,
  lg: 20
} as const

/** 页面根容器：铺满可用区域并让内容贴顶，避免内容较少时被垂直居中 */
export const FULL_SCREEN_FRAME = { maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' } as const
