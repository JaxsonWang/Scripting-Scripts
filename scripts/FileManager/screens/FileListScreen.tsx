import { Device, Label, NavigationStack, TabView, VStack, useCallback, useMemo, useState } from 'scripting'
import { DirectoryView } from '../components/DirectoryView'
import type { DirectoryToolbarPayload, LanguageOption, Locale, TransferState } from '../types'
import { getL10n, supportedLanguages } from '../l10n'

/**
 * 根据系统语言推测默认 locale
 * @returns 首选语言
 */
const detectLocale = (): Locale => {
  const code = Device.systemLanguageCode ?? 'zh'
  return code.startsWith('zh') ? 'zh' : 'en'
}

/**
 * File Manager 主页面，包含 Documents 与 App Group 两个 Tab
 */
export const FileListScreen = () => {
  const [locale, setLocale] = useState<Locale>(detectLocale())
  const l10n = useMemo(() => getL10n(locale), [locale])
  const [tabIndex, setTabIndex] = useState(0)
  const [toolbarByTab, setToolbarByTab] = useState<Record<number, DirectoryToolbarPayload>>({})
  const [transfer, setTransfer] = useState<TransferState | null>(null)
  const [externalReloadPath, setExternalReloadPath] = useState<string | null>(null)
  const languageOptions = useMemo<LanguageOption[]>(() => {
    return supportedLanguages.map(lang => ({
      value: lang.value,
      label: lang.value === 'en' ? l10n.languageEnglish : lang.value === 'zh' ? l10n.languageChinese : lang.label
    }))
  }, [l10n])

  const handleToolbarChange = useCallback((index: number, payload: DirectoryToolbarPayload) => {
    setToolbarByTab(prev => {
      const prevEntry = prev[index]
      if (prevEntry === payload) {
        return prev
      }
      return { ...prev, [index]: payload }
    })
  }, [])

  const currentToolbar = toolbarByTab[tabIndex]

  const tabs = useMemo(
    () => [
      { title: l10n.documents, icon: 'folder.fill', path: FileManager.documentsDirectory },
      { title: l10n.appGroup, icon: 'externaldrive.fill', path: FileManager.appGroupDocumentsDirectory }
    ],
    [l10n]
  )

  return (
    <NavigationStack>
      <VStack
        frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}
        navigationTitle={currentToolbar?.navigationTitle}
        toolbarTitleDisplayMode={currentToolbar ? 'inline' : undefined}
        toolbar={currentToolbar?.trailing ? { topBarTrailing: currentToolbar.trailing } : undefined}
      >
        <TabView tabIndex={tabIndex} onTabIndexChanged={setTabIndex}>
          {tabs.map((tab, index) => (
            <DirectoryView
              key={tab.path}
              rootPath={tab.path}
              path={tab.path}
              rootDisplayName={tab.title}
              tag={index}
              tabItem={<Label title={tab.title} systemImage={tab.icon} />}
              onToolbarChange={handleToolbarChange}
              disableInternalToolbar
              transfer={transfer}
              setTransfer={setTransfer}
              externalReloadPath={externalReloadPath}
              requestExternalReload={setExternalReloadPath}
              l10n={l10n}
              locale={locale}
              onLocaleChange={setLocale}
              languageOptions={languageOptions}
            />
          ))}
        </TabView>
      </VStack>
    </NavigationStack>
  )
}
