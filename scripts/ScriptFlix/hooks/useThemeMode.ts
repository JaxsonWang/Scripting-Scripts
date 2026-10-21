import { useEffect, useState } from 'scripting'
import { AppearanceService } from '../services/appearance'
import type { ThemeMode } from '../services/appearance'

/**
 * 当前外观模式，设置页切换后所有已打开页面同步更新
 */
export const useThemeMode = (): ThemeMode => {
  const [mode, setMode] = useState<ThemeMode>(AppearanceService.getThemeMode)
  useEffect(() => AppearanceService.subscribe(setMode), [])
  return mode
}

/**
 * 页面 preferredColorScheme / toolbarColorScheme 使用的配色方案；自动模式为 undefined（跟随系统）
 */
export const usePreferredColorScheme = () => AppearanceService.colorSchemeOf(useThemeMode())
