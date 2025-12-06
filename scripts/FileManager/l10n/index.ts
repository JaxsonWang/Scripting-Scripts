import { l10nEN } from './en'
import { l10nZH } from './zh'
import type { L10n, Locale } from '../types'

const L10N_MAP: Record<Locale, L10n> = {
  en: l10nEN,
  zh: l10nZH
}

export function getL10n(locale: Locale): L10n {
  return L10N_MAP[locale] ?? l10nEN
}

export const supportedLanguages: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' }
]
