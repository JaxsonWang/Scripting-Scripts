import { Button, HStack, Image, List, Menu, Navigation, NavigationDestination, Path, Script, Section, Text, VStack, useCallback, useMemo } from 'scripting'
import { EntryRow } from '../components/EntryRow'
import { useDirectoryActions } from '../hooks/useDirectoryActions'
import { useDirectoryEntries } from '../hooks/useDirectoryEntries'
import type { DirectoryPageProps } from '../types'

export const DirectoryPage = ({ currentPath, l10n, navigationPath, rootPath, rootTitle, setTransfer, transfer }: DirectoryPageProps) => {
  const dismiss = Navigation.useDismiss()

  const isRoot = useMemo(() => Path.normalize(currentPath) === Path.normalize(rootPath), [currentPath, rootPath])

  const navigationTitle = useMemo(() => {
    if (isRoot) {
      return rootTitle
    }

    const base = Path.basename(currentPath)
    return base || rootTitle
  }, [currentPath, isRoot, rootTitle])

  const { filteredEntries, isLoading, refreshEntries, searchKeyword, setSearchKeyword } = useDirectoryEntries({
    currentPath,
    l10n
  })

  const {
    handleApplyTransfer,
    handleCancelTransfer,
    handleCopy,
    handleCreateFile,
    handleCreateFolder,
    handleDelete,
    handleMove,
    handleOpenDirectory,
    handlePreviewFile,
    handleRename
  } = useDirectoryActions({
    currentPath,
    l10n,
    navigationPath,
    refreshEntries,
    setTransfer,
    transfer
  })

  const handleExitScript = useCallback(async () => {
    try {
      dismiss()
    } catch (error) {
      console.warn('[FileManage] dismiss before exit failed', error)
    }
    Script.exit()
  }, [dismiss])

  return (
    <VStack
      frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}
      navigationTitle={navigationTitle}
      toolbarTitleDisplayMode="inline"
      navigationDestination={
        isRoot ? (
          <NavigationDestination>
            {path => (
              <DirectoryPage
                currentPath={path}
                l10n={l10n}
                navigationPath={navigationPath}
                rootPath={rootPath}
                rootTitle={rootTitle}
                transfer={transfer}
                setTransfer={setTransfer}
              />
            )}
          </NavigationDestination>
        ) : undefined
      }
      toolbar={{
        topBarTrailing: (
          <HStack spacing={8}>
            {transfer ? (
              <Button action={() => void handleApplyTransfer()}>
                <Image systemName={transfer.isMove ? 'arrow.up.right.square' : 'doc.on.doc'} frame={{ width: 18, height: 18 }} />
              </Button>
            ) : null}
            <Menu title={l10n.actions} systemImage="ellipsis.circle">
              {transfer ? <Button title={l10n.cancelCopyMove} role="destructive" action={handleCancelTransfer} /> : null}
              <Button title={l10n.createFolderAction} action={handleCreateFolder} />
              <Button title={l10n.createFileAction} action={handleCreateFile} />
              <Button title={l10n.refreshAction} action={refreshEntries} />
            </Menu>
            <Button role="destructive" action={() => void handleExitScript()}>
              <Image systemName="power" frame={{ width: 18, height: 18 }} />
            </Button>
          </HStack>
        )
      }}
    >
      <List
        listStyle="inset"
        searchable={{
          value: searchKeyword,
          onChanged: setSearchKeyword,
          placement: 'navigationBarDrawerAlwaysDisplay',
          prompt: l10n.searchPrompt
        }}
        refreshable={async () => {
          refreshEntries()
        }}
      >
        <Section title={l10n.currentDirectory}>
          <Text font="caption" foregroundStyle="secondaryLabel">
            {currentPath}
          </Text>
          <Text font="caption" foregroundStyle="secondaryLabel">
            {l10n.itemCount(filteredEntries.length)}
          </Text>
        </Section>

        <Section title={l10n.entries}>
          {isLoading ? (
            <Text>{l10n.loading}</Text>
          ) : filteredEntries.length === 0 ? (
            <Text>{searchKeyword.trim() ? l10n.noMatchingEntries : l10n.directoryEmpty}</Text>
          ) : (
            filteredEntries.map(entry => (
              <EntryRow
                key={entry.path}
                entry={entry}
                l10n={l10n}
                onCopy={handleCopy}
                onDelete={handleDelete}
                onMove={handleMove}
                onOpenDirectory={handleOpenDirectory}
                onPreviewFile={handlePreviewFile}
                onRename={handleRename}
              />
            ))
          )}
        </Section>
      </List>
    </VStack>
  )
}
