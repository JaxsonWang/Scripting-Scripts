import { useCallback, useMemo } from 'scripting'
import type { FileEntry, L10n } from '../types'
import { FileRow } from '../components/FileRow'

type FileRowRendererConfig = {
  l10n: L10n
  handleOpenFile: (name: string) => void | Promise<void>
  handleCopy: (name: string) => void | Promise<void>
  handleMove: (name: string) => void | Promise<void>
  handleInfo: (name: string) => void | Promise<void>
  handleRename: (name: string) => void | Promise<void>
  handleDuplicate: (name: string) => void | Promise<void>
  handleDelete: (name: string) => void | Promise<void>
}

export const useFileRowRenderer = ({
  l10n,
  handleOpenFile,
  handleCopy,
  handleMove,
  handleInfo,
  handleRename,
  handleDuplicate,
  handleDelete
}: FileRowRendererConfig) => {
  const labels = useMemo(
    () => ({
      copy: l10n.copy,
      move: l10n.move,
      info: l10n.info,
      rename: l10n.rename,
      duplicate: l10n.duplicate,
      delete: l10n.delete,
      items: l10n.itemsLabel
    }),
    [l10n]
  )

  const renderRow = useCallback(
    (entry: FileEntry) => {
      const { name, path, isDir, stat } = entry
      return (
        <FileRow
          key={name}
          name={name}
          path={path}
          isDirectory={isDir}
          stat={stat}
          onPress={!isDir ? () => handleOpenFile(name) : undefined}
          labels={labels}
          onCopy={() => handleCopy(name)}
          onMove={() => handleMove(name)}
          onInfo={() => handleInfo(name)}
          onRename={() => handleRename(name)}
          onDuplicate={() => handleDuplicate(name)}
          onDelete={() => handleDelete(name)}
        />
      )
    },
    [labels, handleOpenFile, handleCopy, handleMove, handleInfo, handleRename, handleDuplicate, handleDelete]
  )

  return renderRow
}
