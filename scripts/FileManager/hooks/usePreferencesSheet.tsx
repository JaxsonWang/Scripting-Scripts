import { Navigation, useCallback } from 'scripting'
import { PreferencesScreen } from '../screens/PreferencesScreen'
import type { Locale, PreferencesSheetOptions } from '../types'

/**
 * 提供打开偏好设置面板的方法
 * @param options 偏好面板依赖
 */
export const usePreferencesSheet = ({
  showHidden,
  setShowHidden,
  l10n,
  locale,
  onLocaleChange,
  languageOptions,
  onLanguageChanged
}: PreferencesSheetOptions) => {
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
          changelogSectionTitle={l10n.changelogSectionTitle}
          changelogButtonLabel={l10n.changelogButtonLabel}
          changelogTitle={l10n.changelogTitle}
          changelogEmpty={l10n.changelogEmpty}
          versionLabel={l10n.versionLabel}
          locale={locale}
          onLocaleChange={value => onLocaleChange(value as Locale)}
          languageOptions={languageOptions}
          onLanguageChanged={onLanguageChanged}
        />
      )
    })
  }, [showHidden, setShowHidden, l10n, locale, onLocaleChange, languageOptions, onLanguageChanged])
}
