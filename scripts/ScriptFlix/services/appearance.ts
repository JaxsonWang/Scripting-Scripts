import { Widget } from 'scripting'
import type { ColorScheme } from 'scripting'

/** 外观模式：auto 跟随系统日夜切换，light / dark 固定日间或夜间 */
export type ThemeMode = 'auto' | 'light' | 'dark'

const AppStorage = Storage
const STORAGE_KEY_THEME = 'script_flix_theme_mode'
const THEME_MODES: ThemeMode[] = ['auto', 'light', 'dark']

const listeners = new Set<(mode: ThemeMode) => void>()

/**
 * 读取外观模式；未设置时为自动
 */
const getThemeMode = (): ThemeMode => {
  const stored = AppStorage.get<ThemeMode>(STORAGE_KEY_THEME)
  return stored && THEME_MODES.includes(stored) ? stored : 'auto'
}

/**
 * 保存外观模式，通知已打开的页面立即换肤，并刷新桌面小组件
 * @param mode 新的外观模式
 */
const setThemeMode = (mode: ThemeMode) => {
  AppStorage.set(STORAGE_KEY_THEME, mode)
  listeners.forEach(listener => listener(mode))
  Widget.reloadAll()
}

/**
 * 订阅外观模式变化
 * @param listener 变化回调
 * @returns 取消订阅函数
 */
const subscribe = (listener: (mode: ThemeMode) => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * 外观模式对应的配色方案；自动模式返回 undefined，交给系统决定
 * @param mode 外观模式
 */
const colorSchemeOf = (mode: ThemeMode): ColorScheme | undefined => (mode === 'auto' ? undefined : mode)

export const AppearanceService = {
  getThemeMode,
  setThemeMode,
  subscribe,
  colorSchemeOf
}
