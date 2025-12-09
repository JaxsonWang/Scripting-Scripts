import { l10nEN } from './en'
import { l10nEN as l10nEnglish } from './en'
import { l10nZH } from './zh'
import type { L10n, Locale } from '../types'

const L10N_MAP: Record<Locale, L10n> = {
  en: l10nEnglish,
  zh: l10nZH
}

/**
 * 按 locale 返回多语言文案，默认回退英文
 * @param locale 当前语言代码
 */
export const getL10n = (locale: Locale): L10n => L10N_MAP[locale] ?? l10nEnglish

/**
 * 支持的语言列表，供偏好设置显示
 */
export const supportedLanguages: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' }
]
