import { useCallback } from 'scripting'
import type { FileEntry, FileOperationsConfig } from '../types'
import { importEntries } from '../utils/import_entries'

/**
 * 集中管理剪贴板、重命名、删除等文件操作
 * @param config 操作依赖项
 */
export const useFileOperations = ({
  currentPath,
  transfer,
  setTransfer,
  requestExternalReload,
  l10n,
  triggerReload,
  softRemoveEntry,
  softInsertEntry,
  restoreRenderEntries
}: FileOperationsConfig) => {
  /**
   * 构造当前目录下的绝对路径
   * @param name 子项名称
   */
  const buildPath = useCallback((name: string) => currentPath + '/' + name, [currentPath])

  /**
   * 统一捕获错误并提示用户
   * @param context 操作名
   * @param error 报错对象
   */
  const alertFailure = useCallback(
    async (context: string, error: unknown) => {
      console.error(`[useFileOperations][${context}]`, error)
      await Dialog.alert({ title: l10n.previewFailed, message: String(error) })
    },
    [l10n]
  )

  /**
   * 构建一个轻量的目录项占位符，用于乐观渲染
   * @param name 显示名称
   * @param targetPath 目标完整路径
   * @param sourcePath 源路径，用于判断是否为目录
   */
  const buildPlaceholderEntry = useCallback((name: string, targetPath: string, sourcePath: string): FileEntry => {
    let isDir = false
    try {
      isDir = FileManager.isDirectorySync(sourcePath)
    } catch (error) {
      console.error('[useFileOperations] isDirectorySync failed', sourcePath, error)
    }
    return { name, path: targetPath, isDir }
  }, [])

  /**
   * 生成一个当前目录下可用且不冲突的名称
   * @param baseName 期望名称
   */
  const ensureUniqueName = useCallback(
    (baseName: string) => {
      let candidate = baseName
      let idx = 1
      while (FileManager.existsSync(buildPath(candidate))) {
        const parts = candidate.split('.')
        if (parts.length > 1) {
          const ext = parts.pop()
          candidate = `${parts.join('.')} (${idx}).${ext}`
        } else {
          candidate = `${baseName} (${idx})`
        }
        idx += 1
      }
      return candidate
    },
    [buildPath]
  )

  /**
   * 执行异步写操作并在完成后刷新列表
   * @param context 操作名
   * @param task 具体操作
   */
  const executeAndReload = useCallback(
    async (context: string, task: () => Promise<void>) => {
      try {
        await task()
        triggerReload()
      } catch (error) {
        await alertFailure(context, error)
      }
    },
    [alertFailure, triggerReload]
  )

  /**
   * 复制文件路径到剪贴板，进入临时传输状态
   * @param name 目标文件名
   */
  const handleCopy = useCallback(
    async (name: string) => {
      const filePath = buildPath(name)
      await Pasteboard.setString(filePath)
      setTransfer({ sourcePath: filePath, isMove: false })
    },
    [buildPath, setTransfer]
  )

  /**
   * 进入移动模式，并从渲染列表中提前移除该条目
   * @param name 目标文件名
   */
  const handleMove = useCallback(
    (name: string) => {
      const filePath = buildPath(name)
      setTransfer({ sourcePath: filePath, isMove: true })
    },
    [buildPath, setTransfer]
  )

  /**
   * 删除文件：先乐观移除，确认后执行真实删除
   * @param name 目标文件名
   */
  const handleDelete = useCallback(
    async (name: string) => {
      const filePath = buildPath(name)
      softRemoveEntry(filePath)
      const confirm = await Dialog.confirm({
        title: l10n.deleteTitle,
        message: l10n.deleteConfirm(name),
        confirmLabel: l10n.deleteConfirmLabel
      })
      if (!confirm) {
        restoreRenderEntries()
        return
      }
      try {
        await FileManager.remove(filePath)
        triggerReload()
      } catch (error) {
        restoreRenderEntries()
        await alertFailure('delete', error)
      }
    },
    [buildPath, l10n, softRemoveEntry, restoreRenderEntries, triggerReload, alertFailure]
  )

  /**
   * 新建文件夹并刷新列表
   */
  const handleCreateFolder = useCallback(async () => {
    const name = await Dialog.prompt({ title: l10n.newFolderTitle })
    if (name) {
      await executeAndReload('createDirectory', () => FileManager.createDirectory(buildPath(name)))
    }
  }, [buildPath, executeAndReload, l10n])

  /**
   * 新建空文本文件并刷新
   */
  const handleCreateFile = useCallback(async () => {
    const name = await Dialog.prompt({ title: l10n.newFileTitle, defaultValue: 'untitled.txt' })
    if (name) {
      await executeAndReload('createFile', () => FileManager.writeAsString(buildPath(name), ''))
    }
  }, [buildPath, executeAndReload, l10n])

  /**
   * 重命名文件或文件夹
   * @param name 原始名称
   */
  const handleRename = useCallback(
    async (name: string) => {
      const filePath = buildPath(name)
      const newName = await Dialog.prompt({
        title: l10n.renameTitle,
        defaultValue: name,
        confirmLabel: l10n.renameConfirm
      })
      if (newName && newName !== name) {
        await executeAndReload('rename', () => FileManager.rename(filePath, buildPath(newName)))
      }
    },
    [buildPath, executeAndReload, l10n]
  )

  /**
   * 复制文件并自动生成后缀
   * @param name 原始名称
   */
  const handleDuplicate = useCallback(
    async (name: string) => {
      const filePath = buildPath(name)
      let newName = name
      if (name.includes('.')) {
        const parts = name.split('.')
        const ext = parts.pop()
        newName = parts.join('.') + ' copy.' + ext
      } else {
        newName = name + ' copy'
      }
      await executeAndReload('duplicate', () => FileManager.copyFile(filePath, buildPath(newName)))
    },
    [buildPath, executeAndReload]
  )

  /**
   * 粘贴复制/移动内容，支持乐观插入与失败回滚
   */
  const handlePaste = useCallback(async () => {
    if (!transfer) {
      await Dialog.alert({ title: l10n.noPasteTitle, message: l10n.noPasteMessage })
      return
    }
    const source = transfer.sourcePath
    const sourceDir = source.split('/').slice(0, -1).join('/') || '/'
    const base = source.split('/').pop() || 'pasted'
    const targetName = ensureUniqueName(base)
    const target = buildPath(targetName)
    const placeholder = buildPlaceholderEntry(targetName, target, source)
    softInsertEntry(placeholder)
    try {
      if (transfer.isMove) {
        await FileManager.rename(source, target)
        requestExternalReload(sourceDir)
      } else {
        await FileManager.copyFile(source, target)
      }
      setTransfer(null)
      triggerReload()
    } catch (error) {
      restoreRenderEntries()
      requestExternalReload(sourceDir)
      await alertFailure('paste', error)
    }
  }, [buildPath, transfer, setTransfer, requestExternalReload, triggerReload, l10n, alertFailure, softInsertEntry, buildPlaceholderEntry, restoreRenderEntries])

  /**
   * 统一执行多条导入任务
   * @param sources 待导入的文件或文件夹路径
   * @param context 日志上下文
   */
  const importPaths = useCallback(
    async (sources: string[] | null | undefined, context: string) => {
      if (!sources || sources.length === 0) {
        return
      }
      try {
        const count = await importEntries({
          sources,
          ensureUniqueName,
          buildTargetPath: buildPath,
          buildPlaceholderEntry,
          softInsertEntry
        })
        if (count > 0) {
          triggerReload()
        }
      } catch (error) {
        restoreRenderEntries()
        await alertFailure(context, error)
      }
    },
    [alertFailure, ensureUniqueName, buildPath, buildPlaceholderEntry, softInsertEntry, triggerReload, restoreRenderEntries, l10n]
  )

  /**
   * 通过文档选择器导入单个文件夹
   */
  const handleImportFolder = useCallback(async () => {
    try {
      const folderPath = await DocumentPicker.pickDirectory()
      if (!folderPath) {
        return
      }
      await importPaths([folderPath], 'importFolder')
    } catch (error) {
      await alertFailure('importFolder', error)
    } finally {
      DocumentPicker.stopAcessingSecurityScopedResources()
    }
  }, [alertFailure, importPaths])

  /**
   * 通过文档选择器批量导入文件
   */
  const handleImportFiles = useCallback(async () => {
    try {
      const picked = await DocumentPicker.pickFiles({ allowsMultipleSelection: true, shouldShowFileExtensions: true })
      if (!picked || picked.length === 0) {
        return
      }
      await importPaths(picked, 'importFiles')
    } catch (error) {
      await alertFailure('importFiles', error)
    } finally {
      DocumentPicker.stopAcessingSecurityScopedResources()
    }
  }, [alertFailure, importPaths])

  return {
    handleCopy,
    handleMove,
    handleDelete,
    handleCreateFolder,
    handleCreateFile,
    handleRename,
    handleDuplicate,
    handlePaste,
    handleImportFolder,
    handleImportFiles
  }
}
