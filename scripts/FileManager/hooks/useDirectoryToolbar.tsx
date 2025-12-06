import { Button, ControlGroup, HStack, Image, Text, VStack, useMemo } from 'scripting'
import type { L10n, TransferState } from '../types'

type ToolbarOptions = {
  currentDirName: string
  relativePath: string
  currentPath: string
  entriesCount: number
  transfer: TransferState | null
  l10n: L10n
  handleCreateFolder: () => Promise<void>
  handleCreateFile: () => Promise<void>
  handlePaste: () => Promise<void>
  handlePreferences: () => void
  handleExit: () => void
}

export const useDirectoryToolbar = ({
  currentDirName,
  relativePath,
  currentPath,
  entriesCount,
  transfer,
  l10n,
  handleCreateFolder,
  handleCreateFile,
  handlePaste,
  handlePreferences,
  handleExit
}: ToolbarOptions) => {
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
                message: l10n.introMessage(currentPath, entriesCount)
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
    [l10n, handleCreateFolder, handleCreateFile, handlePaste, currentPath, entriesCount, handlePreferences, handleExit, transfer]
  )

  return { toolbarLeading, toolbarTrailing }
}
