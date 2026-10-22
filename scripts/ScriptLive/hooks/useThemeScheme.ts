import type { ColorScheme } from 'scripting'
import { settingsStore } from '../services/settings'
import { colorSchemeOf } from '../theme'
import { useStore } from './useStore'

/** 当前外观设置对应的配色方案；「自动」时为 undefined，跟随系统 */
export const useThemeScheme = (): ColorScheme | undefined => colorSchemeOf(useStore(settingsStore).themeMode)
