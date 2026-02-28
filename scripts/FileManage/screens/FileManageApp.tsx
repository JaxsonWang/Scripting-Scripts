import { Device, TabView, VStack, useMemo, useState } from 'scripting'
import { getL10n } from '../l10n'
import { RootTab } from './RootTab'
import type { Locale } from '../l10n'
import type { RootConfig, TransferState } from '../types'

const detectLocale = (): Locale => {
  const code = Device.systemLanguageCode ?? 'zh'
  return code.startsWith('zh') ? 'zh' : 'en'
}

export const FileManageApp = () => {
  const [locale] = useState<Locale>(detectLocale())
  const [tabIndex, setTabIndex] = useState(0)
  const [transfer, setTransfer] = useState<TransferState>(null)
  const l10n = useMemo(() => getL10n(locale), [locale])

  const roots = useMemo<RootConfig[]>(() => {
    return [
      {
        id: 'documents',
        title: l10n.tabDocuments,
        icon: 'folder.fill',
        path: FileManager.documentsDirectory
      },
      {
        id: 'appGroup',
        title: l10n.tabAppGroup,
        icon: 'externaldrive.fill',
        path: FileManager.appGroupDocumentsDirectory
      },
      {
        id: 'temporary',
        title: l10n.tabTemporary,
        icon: 'clock.fill',
        path: FileManager.temporaryDirectory
      },
      {
        id: 'iCloud',
        title: l10n.tabICloud,
        icon: 'icloud.fill',
        path: FileManager.isiCloudEnabled ? FileManager.iCloudDocumentsDirectory : null
      }
    ]
  }, [l10n])

  return (
    <VStack frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
      <TabView tabIndex={tabIndex} onTabIndexChanged={setTabIndex}>
        {roots.map((root, index) => (
          <RootTab key={root.id} l10n={l10n} root={root} tabIndex={index} transfer={transfer} setTransfer={setTransfer} />
        ))}
      </TabView>
    </VStack>
  )
}
