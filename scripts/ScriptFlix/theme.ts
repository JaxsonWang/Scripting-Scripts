import type { Color, LinearGradient } from 'scripting'

/**
 * 设计令牌：暗色电影质感 + 紫粉品牌渐变。
 * 全部使用显式颜色，避免系统 label 色在自定义深色背景下反相。
 */
export const palette = {
  bg: '#07060C' as Color,
  card: '#1A1726' as Color,
  cardHi: '#241F33' as Color,
  textPrimary: '#F6F5FB' as Color,
  textSecondary: 'rgba(246,245,251,0.64)' as Color,
  textTertiary: 'rgba(246,245,251,0.40)' as Color,
  accent: '#A855F7' as Color,
  gold: '#F5C451' as Color
}

/** 品牌主渐变（紫 → 粉），用于标题、主按钮、角标 */
export const brandGradient: LinearGradient = {
  colors: ['#A855F7', '#EC4899'],
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
