import { List, Navigation, NavigationLink, Script, VStack, useCallback, useEffect, useState } from 'scripting'
import type { L10n, LanguageOption, Locale, TransferState } from '../types'
import { DirectoryEmptyState } from './DirectoryEmptyState'
import { useFileOperations } from '../hooks/useFileOperations'
import { useDirectoryEntries } from '../hooks/useDirectoryEntries'
import { useFilePreview } from '../hooks/useFilePreview'
import { useDirectoryToolbar } from '../hooks/useDirectoryToolbar'
import { usePreferencesSheet } from '../hooks/usePreferencesSheet'
import { useFileRowRenderer } from '../hooks/useFileRowRenderer'

export type DirectoryViewProps = {
  rootPath: string
  path: string
  rootDisplayName: string
  tag?: number
  tabItem?: JSX.Element
  onToolbarChange?: (index: number, leading: JSX.Element, trailing: JSX.Element) => void
  disableInternalToolbar?: boolean
  transfer: TransferState | null
  setTransfer: (value: TransferState | null) => void
  externalReloadPath: string | null
  requestExternalReload: (path: string | null) => void
  l10n: L10n
  locale: Locale
  onLocaleChange: (value: Locale) => void
  languageOptions: LanguageOption[]
}

const formatRelativePath = (path: string, rootPath: string): string => {
  const relative = path === rootPath ? '/' : path.replace(rootPath, '') || '/'
  if (relative === '/') {
    return relative
  }
  const segments = relative.split('/').filter(Boolean)
  if (segments.length <= 3) {
    return `/${segments.join('/')}`
  }
  const tail = segments.slice(-3).join('/')
  return `…/${tail}`
}

export function DirectoryView({
  rootPath,
  path,
  rootDisplayName,
  tag,
  tabItem,
  onToolbarChange,
  disableInternalToolbar,
  transfer,
  setTransfer,
  externalReloadPath,
  requestExternalReload,
  l10n,
  locale,
  onLocaleChange,
  languageOptions
}: DirectoryViewProps) {
  const currentPath = path
  const [toastShown, setToastShown] = useState(false)
  const [toastMessage, setToastMessage] = useState(l10n.copiedToast)

  useEffect(() => {
    setToastMessage(l10n.copiedToast)
  }, [l10n])

  const dismiss = Navigation.useDismiss()

  const { entries, showHidden, setShowHidden, triggerReload } = useDirectoryEntries({
    path: currentPath,
    l10n,
    externalReloadPath,
    requestExternalReload
  })

  const { handleCopy, handleMove, handleDelete, handleCreateFolder, handleCreateFile, handleRename, handleDuplicate, handlePaste, handleInfo } =
    useFileOperations({
      currentPath,
      transfer,
      setTransfer,
      requestExternalReload,
      setToastMessage,
      setToastShown,
      l10n,
      triggerReload
    })
  const handleOpenFile = useFilePreview(currentPath, l10n)

  const handlePreferences = usePreferencesSheet({
    showHidden,
    setShowHidden,
    l10n,
    locale,
    onLocaleChange,
    languageOptions
  })

  const handleExit = useCallback(() => {
    dismiss()
    Script.exit()
  }, [dismiss])

  const isRoot = currentPath === rootPath
  const currentDirName = isRoot ? rootDisplayName : currentPath.split('/').pop() || rootDisplayName
  const relativePath = formatRelativePath(currentPath, rootPath)

  const renderFileRow = useFileRowRenderer({
    l10n,
    handleOpenFile,
    handleCopy,
    handleMove,
    handleInfo,
    handleRename,
    handleDuplicate,
    handleDelete
  })

  const { toolbarLeading, toolbarTrailing } = useDirectoryToolbar({
    currentDirName,
    relativePath,
    currentPath,
    entriesCount: entries.length,
    transfer,
    l10n,
    handleCreateFolder,
    handleCreateFile,
    handlePaste,
    handlePreferences,
    handleExit
  })

  useEffect(() => {
    if (disableInternalToolbar && onToolbarChange) {
      onToolbarChange(tag ?? 0, toolbarLeading, toolbarTrailing)
    }
  }, [disableInternalToolbar, onToolbarChange, tag, toolbarLeading, toolbarTrailing])

  return (
    <VStack
      tag={tag}
      tabItem={tabItem}
      frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}
      toolbar={disableInternalToolbar ? undefined : { topBarLeading: toolbarLeading, topBarTrailing: toolbarTrailing }}
    >
      {entries.length === 0 ? (
        <DirectoryEmptyState message={l10n.emptyFolder} />
      ) : (
        <List
          listStyle="inset"
          toast={{
            isPresented: toastShown,
            onChanged: setToastShown,
            message: toastMessage,
            duration: 2,
            position: 'bottom'
          }}
        >
          {entries.map(entry => {
            const { name, path: childPath, isDir } = entry
            if (isDir) {
              return (
                <NavigationLink
                  key={name}
                  destination={
                    <DirectoryView
                      rootPath={rootPath}
                      path={childPath}
                      rootDisplayName={rootDisplayName}
                      tag={tag}
                      onToolbarChange={onToolbarChange}
                      disableInternalToolbar={false}
                      transfer={transfer}
                      setTransfer={setTransfer}
                      externalReloadPath={externalReloadPath}
                      requestExternalReload={requestExternalReload}
                      l10n={l10n}
                      locale={locale}
                      onLocaleChange={onLocaleChange}
                      languageOptions={languageOptions}
                    />
                  }
                >
                  {renderFileRow(entry)}
                </NavigationLink>
              )
            }

            return renderFileRow(entry)
          })}
        </List>
      )}
    </VStack>
  )
}
