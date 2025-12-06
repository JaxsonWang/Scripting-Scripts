import {
  Button,
  ControlGroup,
  HStack,
  Image,
  List,
  Navigation,
  NavigationLink,
  SVG,
  Script,
  Spacer,
  Text,
  VStack,
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'scripting'
import type { L10n, LanguageOption, Locale, TransferState } from '../types'
import { FileRow } from './FileRow'
import { PreferencesScreen } from '../screens/PreferencesScreen'
import { useFileOperations } from '../hooks/useFileOperations'

type FileEntry = { name: string; path: string; isDir: boolean; stat?: FileStat }

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
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [showHidden, setShowHidden] = useState(true)
  const [version, bumpVersion] = useState(0)
  const [toastShown, setToastShown] = useState(false)
  const [toastMessage, setToastMessage] = useState(l10n.copiedToast)

  useEffect(() => {
    setToastMessage(l10n.copiedToast)
  }, [l10n])

  const dismiss = Navigation.useDismiss()

  const loadFiles = useCallback(async () => {
    try {
      const names = await FileManager.readDirectory(currentPath)
      const filtered = names.filter(name => showHidden || !name.startsWith('.'))
      const withMeta: FileEntry[] = filtered.map(name => {
        const fullPath = currentPath + '/' + name
        let isDir = false
        let stat: FileStat | undefined = undefined
        try {
          isDir = FileManager.isDirectorySync(fullPath)
        } catch (err) {
          console.error('[DirectoryView] isDirectorySync failed', fullPath, err)
        }
        try {
          stat = FileManager.statSync(fullPath)
        } catch (err) {
          console.error('[DirectoryView] statSync failed', fullPath, err)
        }
        return { name, path: fullPath, isDir, stat }
      })
      const sorted = withMeta.sort((a, b) => {
        if (a.isDir && !b.isDir) return -1
        if (!a.isDir && b.isDir) return 1
        return a.name.localeCompare(b.name)
      })
      setEntries(sorted)
    } catch (error) {
      console.error(error)
      await Dialog.alert({ message: l10n.failedRead })
    }
  }, [currentPath, showHidden, version, l10n])

  useEffect(() => {
    loadFiles()
  }, [loadFiles, version])

  useEffect(() => {
    if (externalReloadPath && externalReloadPath === currentPath) {
      loadFiles()
      requestExternalReload(null)
    }
  }, [externalReloadPath, currentPath, loadFiles, requestExternalReload])

  const triggerReload = useCallback(() => bumpVersion(v => v + 1), [])

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

  const handleOpenFile = useCallback(
    async (name: string) => {
      const newPath = currentPath + '/' + name
      const encodedURL = `file://${encodeURI(newPath)}`
      console.log('[handleOpenFile] tap', { newPath, encodedURL })
      try {
        if (!FileManager.existsSync(newPath)) {
          console.error('[QuickLook] file not found', newPath)
          await Dialog.alert({ title: l10n.fileNotFound, message: newPath })
          return
        }
        console.log('[QuickLook] preview', { path: newPath, encodedURL })
        await QuickLook.previewURLs([encodedURL])
      } catch (error) {
        console.error(error)
        await Dialog.alert({ title: l10n.previewFailed, message: String(error) })
      }
    },
    [currentPath, l10n]
  )

  const handlePreferences = useCallback(() => {
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
          onLocaleChange={(value: string) => onLocaleChange(value as Locale)}
          languageOptions={languageOptions}
        />
      )
    })
  }, [showHidden, l10n, locale, languageOptions, onLocaleChange])

  const handleExit = useCallback(() => {
    dismiss()
    Script.exit()
  }, [dismiss])

  const isRoot = currentPath === rootPath
  const currentDirName = isRoot ? rootDisplayName : currentPath.split('/').pop() || rootDisplayName
  const relativePath = formatRelativePath(currentPath, rootPath)

  const renderRow = (name: string, childPath: string, isDirectoryEntry: boolean, stat?: FileStat) => {
    const labels = {
      copy: l10n.copy,
      move: l10n.move,
      info: l10n.info,
      rename: l10n.rename,
      duplicate: l10n.duplicate,
      delete: l10n.delete,
      items: l10n.itemsLabel
    }
    return (
      <FileRow
        key={name}
        name={name}
        path={childPath}
        isDirectory={isDirectoryEntry}
        stat={stat}
        onPress={!isDirectoryEntry ? () => handleOpenFile(name) : undefined}
        labels={labels}
        onCopy={() => handleCopy(name)}
        onMove={() => handleMove(name)}
        onInfo={() => handleInfo(name)}
        onRename={() => handleRename(name)}
        onDuplicate={() => handleDuplicate(name)}
        onDelete={() => handleDelete(name)}
      />
    )
  }

  const toolbarLeading = useMemo(
    () => (
      <VStack alignment="leading">
        <Text styledText={{ content: currentDirName, font: 16, fontWeight: 'bold' }} />
        <Text styledText={{ content: relativePath, font: 11, foregroundColor: '#8e8e93' }} />
      </VStack>
    ),
    [currentDirName, relativePath]
  )

  const toolbarTrailing = useMemo(
    () => (
      <HStack>
        <ControlGroup label={<Image systemName="ellipsis.circle" frame={{ width: 20, height: 20 }} />} controlGroupStyle="palette">
          <Button title={l10n.addFolder} systemImage="folder.badge.plus" action={handleCreateFolder} />
          <Button title={l10n.addFile} systemImage="doc.badge.plus" action={handleCreateFile} />
          {transfer ? <Button title={l10n.pasteLabel} systemImage="doc.on.clipboard" action={handlePaste} /> : null}
          <Button
            title={l10n.summary}
            systemImage="info.circle"
            action={() =>
              Dialog.alert({
                title: l10n.summary,
                message: l10n.introMessage(currentPath, entries.length)
              })
            }
          />
        </ControlGroup>
        <Button action={handlePreferences}>
          <Image systemName="gearshape" frame={{ width: 20, height: 20 }} />
        </Button>
        <Button action={handleExit}>
          <Image systemName="xmark.circle" frame={{ width: 20, height: 20 }} />
        </Button>
      </HStack>
    ),
    [handleCreateFolder, handleCreateFile, handlePaste, currentPath, entries.length, handlePreferences, handleExit, transfer, l10n]
  )

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
        <VStack frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} alignment="center">
          <Spacer />
          <SVG filePath={`${Script.directory}/assets/icon/folder.svg`} resizable frame={{ width: 128, height: 128 }} />
          <Text styledText={{ content: l10n.emptyFolder, font: 16, fontWeight: 'bold', foregroundColor: '#8e8e93' }} />
          <Spacer />
        </VStack>
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
            const { name, path: childPath, isDir, stat } = entry
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
                  {renderRow(name, childPath, true, stat)}
                </NavigationLink>
              )
            }

            return renderRow(name, childPath, false, stat)
          })}
        </List>
      )}
    </VStack>
  )
}
