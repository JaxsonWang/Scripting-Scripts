import { Navigation, useCallback } from 'scripting'
import { PreferencesScreen } from '../screens/PreferencesScreen'
import type { L10n, LanguageOption, Locale } from '../types'

type Options = {
  showHidden: boolean
  setShowHidden: (value: boolean) => void
  l10n: L10n
  locale: Locale
  onLocaleChange: (value: Locale) => void
  languageOptions: LanguageOption[]
  onLanguageChanged?: () => void
}

export const usePreferencesSheet = ({ showHidden, setShowHidden, l10n, locale, onLocaleChange, languageOptions, onLanguageChanged }: Options) => {
  return useCallback(() => {
    Navigation.present({
      element: (
        <PreferencesScreen
          showHidden={showHidden}
          onToggleHidden={setShowHidden}
          title={l10n.preferences}
          doneLabel={l10n.done}
          sectionTitle={l10n.listDisplay}
          toggleLabel={l10n.showHidden}
          languageSectionTitle={l10n.languageSection}
          languagePickerTitle={l10n.languagePickerTitle}
          locale={locale}
          onLocaleChange={value => onLocaleChange(value as Locale)}
          languageOptions={languageOptions}
          onLanguageChanged={onLanguageChanged}
        />
      )
    })
  }, [showHidden, setShowHidden, l10n, locale, onLocaleChange, languageOptions, onLanguageChanged])
}
