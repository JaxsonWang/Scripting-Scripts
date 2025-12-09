// 方向和位置信息类型
interface WidgetDirection {
  left: number // 左边距
  right: number // 右边距
  top: number // 顶部位置
  middle: number // 中间位置
  bottom: number // 底部位置
}

// 单个组件尺寸类型
interface WidgetDimensions {
  width: number // 宽度
  height: number // 高度
}

// 系统组件尺寸集合类型
interface SystemWidgetSizes {
  systemSmall: WidgetDimensions // 小号组件尺寸
  systemMedium: WidgetDimensions // 中号组件尺寸
  systemLarge: WidgetDimensions // 大号组件尺寸
}

// 完整的组件尺寸数据类型
export interface WidgetSize {
  dir: WidgetDirection // 方向和位置信息
  size: SystemWidgetSizes // 系统组件尺寸信息
}

export interface Config {
  photo?: string
  path?: string
  cropButton: number
}

// 定义所有需要生成的图片配置
export const WIDGET_CONFIGS = {
  small: [
    { type: 'systemSmall' as const, position: 'top-right' as const, filename: 'small-top-right.png' },
    { type: 'systemSmall' as const, position: 'top-left' as const, filename: 'small-top-left.png' },
    { type: 'systemSmall' as const, position: 'middle-left' as const, filename: 'small-middle-left.png' },
    { type: 'systemSmall' as const, position: 'middle-right' as const, filename: 'small-middle-right.png' },
    { type: 'systemSmall' as const, position: 'bottom-right' as const, filename: 'small-bottom-right.png' },
    { type: 'systemSmall' as const, position: 'bottom-left' as const, filename: 'small-bottom-left.png' }
  ],
  medium: [
    { type: 'systemMedium' as const, position: 'top' as const, filename: 'medium-top.png' },
    { type: 'systemMedium' as const, position: 'middle' as const, filename: 'medium-middle.png' },
    { type: 'systemMedium' as const, position: 'bottom' as const, filename: 'medium-bottom.png' }
  ],
  large: [
    { type: 'systemLarge' as const, position: 'top' as const, filename: 'large-top.png' },
    { type: 'systemLarge' as const, position: 'middle' as const, filename: 'large-bottom.png' }
  ]
}

export type WidgetPosition = 'top' | 'middle' | 'bottom' | 'top-right' | 'middle-right' | 'bottom-right' | 'top-left' | 'middle-left' | 'bottom-left'
