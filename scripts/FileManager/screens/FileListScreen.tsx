import { Device, Label, NavigationStack, TabView, VStack, useMemo, useObservable, useState } from 'scripting'
import { DirectoryView } from '../components/DirectoryView'
import type { LanguageOption, Locale, TransferState } from '../types'
import { getL10n, supportedLanguages } from '../l10n'

type TabId = 'documents' | 'appGroup' | 'tmp' | 'iCloud'

type FileTab = {
  id: TabId
  title: string
  icon: string
  path: string
  navigationPath: ReturnType<typeof useObservable<string[]>>
}

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
  const documentsNavigationPath = useObservable<string[]>([])
  const appGroupNavigationPath = useObservable<string[]>([])
  const iCloudNavigationPath = useObservable<string[]>([])
  const tmpNavigationPath = useObservable<string[]>([])
  const [tabIndex, setTabIndex] = useState(0)
  const [transfer, setTransfer] = useState<TransferState | null>(null)
  const [externalReloadPath, setExternalReloadPath] = useState<string | null>(null)
  const languageOptions = useMemo<LanguageOption[]>(() => {
    return supportedLanguages.map(lang => ({
      value: lang.value,
      label: lang.value === 'en' ? l10n.languageEnglish : lang.value === 'zh' ? l10n.languageChinese : lang.label
    }))
  }, [l10n])

  const tabs = useMemo<FileTab[]>(() => {
    const baseTabs: FileTab[] = [
      {
        id: 'documents',
        title: l10n.documents,
        icon: 'folder.fill',
        path: FileManager.documentsDirectory,
        navigationPath: documentsNavigationPath
      },
      {
        id: 'appGroup',
        title: l10n.appGroup,
        icon: 'externaldrive.fill',
        path: FileManager.appGroupDocumentsDirectory,
        navigationPath: appGroupNavigationPath
      },
      {
        id: 'tmp',
        title: l10n.tmp,
        icon: 'trash.fill',
        path: FileManager.temporaryDirectory,
        navigationPath: tmpNavigationPath
      }
    ]

    if (FileManager.isiCloudEnabled) {
      baseTabs.push({
        id: 'iCloud',
        title: l10n.iCloud,
        icon: 'cloud.fill',
        path: FileManager.iCloudDocumentsDirectory,
        navigationPath: iCloudNavigationPath
      })
    }

    return baseTabs
  }, [l10n])

  return (
    <VStack frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
      <TabView tabIndex={tabIndex} onTabIndexChanged={setTabIndex}>
        {tabs.map((tab, index) => {
          return (
            <NavigationStack key={tab.id} path={tab.navigationPath} tag={index} tabItem={<Label title={tab.title} systemImage={tab.icon} />}>
              <DirectoryView
                rootPath={tab.path}
                path={tab.path}
                rootDisplayName={tab.title}
                navigationPath={tab.navigationPath}
                disableInternalToolbar={false}
                transfer={transfer}
                setTransfer={setTransfer}
                externalReloadPath={externalReloadPath}
                requestExternalReload={setExternalReloadPath}
                l10n={l10n}
                locale={locale}
                onLocaleChange={setLocale}
                languageOptions={languageOptions}
              />
            </NavigationStack>
          )
        })}
      </TabView>
    </VStack>
  )
}
