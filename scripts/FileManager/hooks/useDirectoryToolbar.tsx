import { Button, ControlGroup, HStack, Image, Text, VStack, useMemo } from 'scripting'
import type { DirectoryToolbarOptions } from '../types'

/**
 * 构建目录视图顶部工具栏
 * @param options 工具栏配置
 */
export const useDirectoryToolbar = ({
  currentDirName,
  relativePath,
  transfer,
  l10n,
  handleCreateFolder,
  handleCreateFile,
  handlePaste,
  handlePreferences,
  handleExit,
  handleShowInfo
}: DirectoryToolbarOptions) => {
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
          <Button title={l10n.info} systemImage="info.circle" action={handleShowInfo} />
        </ControlGroup>
        <Button action={handlePreferences}>
          <Image systemName="gearshape" frame={{ width: 20, height: 20 }} />
        </Button>
        <Button action={handleExit}>
          <Image systemName="xmark.circle" frame={{ width: 20, height: 20 }} />
        </Button>
      </HStack>
    ),
    [l10n, handleCreateFolder, handleCreateFile, handlePaste, handlePreferences, handleExit, transfer, handleShowInfo]
  )

  return { toolbarLeading, toolbarTrailing }
}
