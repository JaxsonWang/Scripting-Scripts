import { Path, useCallback, useMemo } from 'scripting'
import type { FileEntry, FileRowRendererConfig } from '../types'
import { FileRow } from '../components/FileRow'
import { canEditWithEditor } from '../utils/text_file'

/**
 * 构建渲染文件行的回调，封装所有操作事件
 * @param config 依赖事件处理器
 */
export const useFileRowRenderer = ({
  l10n,
  currentPath,
  isSearchMode,
  handleOpenContainingDirectory,
  handleOpenFile,
  handleCopy,
  handleMove,
  handleEdit,
  handleInfo,
  handleRename,
  handleDuplicate,
  handleDelete
}: FileRowRendererConfig) => {
  const labels = useMemo(
    () => ({
      openContainingDirectory: l10n.openContainingDirectory,
      copy: l10n.copy,
      move: l10n.move,
      info: l10n.info,
      edit: l10n.edit,
      rename: l10n.rename,
      duplicate: l10n.duplicate,
      delete: l10n.delete,
      items: l10n.itemsLabel
    }),
    [l10n]
  )

  /**
   * 渲染单个文件/文件夹行
   */
  const renderRow = useCallback(
    (entry: FileEntry) => {
      const { name, path, isDir, stat } = entry
      const maybeEditHandler = !isDir && handleEdit && canEditWithEditor(name) ? () => handleEdit(entry) : undefined
      const maybeOpenContainingDirectory =
        !isDir && isSearchMode && handleOpenContainingDirectory && Path.dirname(path) !== currentPath ? () => handleOpenContainingDirectory(entry) : undefined
      return (
        <FileRow
          key={name}
          name={name}
          path={path}
          isDirectory={isDir}
          stat={stat}
          onPress={!isDir ? () => handleOpenFile(name) : undefined}
          onOpenContainingDirectory={maybeOpenContainingDirectory}
          labels={labels}
          onCopy={() => handleCopy(name)}
          onMove={() => handleMove(name)}
          onEdit={maybeEditHandler}
          onInfo={() => handleInfo(entry)}
          onRename={() => handleRename(name)}
          onDuplicate={() => handleDuplicate(name)}
          onDelete={() => handleDelete(name)}
        />
      )
    },
    [
      currentPath,
      handleCopy,
      handleDelete,
      handleDuplicate,
      handleEdit,
      handleInfo,
      handleMove,
      handleOpenContainingDirectory,
      handleOpenFile,
      handleRename,
      isSearchMode,
      labels
    ]
  )

  return renderRow
}
