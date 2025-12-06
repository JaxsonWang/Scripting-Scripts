import { Button, ControlGroup, HStack, Image, Navigation, Text, VStack, useMemo } from 'scripting'
import type { L10n, TransferState } from '../types'
import { FileInfoView } from '../components/FileInfoView'
import { computeDirectorySize } from '../utils/file_size'

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
  currentDirStat?: FileStat
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
  handleExit,
  currentDirStat
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
            title={l10n.info}
            systemImage="info.circle"
            action={async () => {
              if (!currentDirStat) {
                console.warn('[DirectoryToolbar] summary pressed without currentDirStat')
                return
              }
              console.log('[DirectoryToolbar] summary start', { currentPath })
              const size = await computeDirectorySize(currentPath)
              console.log('[DirectoryToolbar] summary size computed', { currentPath, size })
              await Navigation.present({
                element: <FileInfoView name={currentDirName} path={currentPath} stat={currentDirStat} isDirectory sizeOverride={size} l10n={l10n} />
              })
              console.log('[DirectoryToolbar] summary view presented')
            }}
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
