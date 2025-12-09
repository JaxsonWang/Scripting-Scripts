import { Button, ControlGroup, HStack, Image, Text, VStack, useMemo } from 'scripting'
import type { DirectoryToolbarOptions } from '../types'

/**
 * 构建目录视图顶部工具栏
 * @param options 工具栏配置
 */
export const useDirectoryToolbar = ({
  currentDirName,
  transfer,
  l10n,
  handleCreateFolder,
  handleCreateFile,
  handleImportFolder,
  handleImportFiles,
  handlePaste,
  handlePreferences,
  handleExit,
  handleShowInfo
}: DirectoryToolbarOptions) => {
  const toolbarTrailing = useMemo(
    () => (
      <HStack>
        {transfer ? (
          <Button action={handlePaste}>
            <Image systemName="document.on.clipboard" imageScale="small" />
          </Button>
        ) : null}
        <ControlGroup label={<Image systemName="ellipsis.circle" imageScale="medium" />} controlGroupStyle="palette">
          <Button title={l10n.addFolder} systemImage="folder.badge.plus" action={handleCreateFolder} />
          <Button title={l10n.addFile} systemImage="doc.badge.plus" action={handleCreateFile} />
          <Button title={l10n.importFolder} systemImage="tray.and.arrow.down" action={handleImportFolder} />
          <Button title={l10n.importFile} systemImage="square.and.arrow.down" action={handleImportFiles} />
          <Button title={l10n.info} systemImage="info.circle" action={handleShowInfo} />
        </ControlGroup>
        <Button action={handlePreferences}>
          <Image systemName="gearshape" imageScale="medium" />
        </Button>
        <Button action={handleExit}>
          <Image systemName="xmark.circle" imageScale="medium" />
        </Button>
      </HStack>
    ),
    [l10n, handleCreateFolder, handleCreateFile, handleImportFolder, handleImportFiles, handlePaste, handlePreferences, handleExit, transfer, handleShowInfo]
  )

  return { toolbarTrailing, navigationTitle: currentDirName }
}
