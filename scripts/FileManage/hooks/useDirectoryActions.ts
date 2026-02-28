import { Path, useCallback } from 'scripting'
import type { L10n } from '../l10n'
import type { FileEntry, NavigationPathState, TransferState } from '../types'

const normalizeInputName = (value: string | null) => value?.trim() ?? ''

const buildFileUrl = (filePath: string) => `file://${encodeURI(filePath)}`

type UseDirectoryActionsOptions = {
  currentPath: string
  l10n: L10n
  navigationPath: NavigationPathState
  refreshEntries: () => void
  setTransfer: (value: TransferState) => void
  transfer: TransferState
}

export const useDirectoryActions = ({ currentPath, l10n, navigationPath, refreshEntries, setTransfer, transfer }: UseDirectoryActionsOptions) => {
  const ensureValidName = useCallback(
    async (name: string) => {
      if (!name) {
        return false
      }

      if (name.includes('/')) {
        await Dialog.alert({
          title: l10n.invalidNameTitle,
          message: l10n.invalidNameMessage
        })
        return false
      }

      return true
    },
    [l10n]
  )

  const ensurePathAvailable = useCallback(
    async (targetPath: string) => {
      const exists = await FileManager.exists(targetPath)
      if (!exists) {
        return true
      }

      await Dialog.alert({
        title: l10n.alreadyExistsTitle,
        message: Path.basename(targetPath)
      })
      return false
    },
    [l10n.alreadyExistsTitle]
  )

  const buildAvailableName = useCallback(
    (preferredName: string) => {
      const fallbackName = preferredName || l10n.untitledName
      const parsed = Path.parse(fallbackName)
      const stem = parsed.name || fallbackName
      const ext = parsed.ext || ''

      let candidate = fallbackName
      let index = 1

      while (FileManager.existsSync(Path.join(currentPath, candidate))) {
        candidate = ext ? `${stem} (${index})${ext}` : `${stem} (${index})`
        index += 1
      }

      return candidate
    },
    [currentPath, l10n.untitledName]
  )

  const runWithErrorAlert = useCallback(
    async (actionName: string, operation: () => Promise<void>) => {
      try {
        await operation()
        refreshEntries()
      } catch (error) {
        console.error(`[FileManage] ${actionName} failed`, error)
        await Dialog.alert({
          title: l10n.operationFailedTitle,
          message: String(error)
        })
      }
    },
    [l10n.operationFailedTitle, refreshEntries]
  )

  const handleCreateFolder = useCallback(async () => {
    const input = await Dialog.prompt({
      title: l10n.createFolderTitle,
      placeholder: l10n.createFolderPlaceholder
    })

    const name = normalizeInputName(input)
    if (!(await ensureValidName(name))) {
      return
    }

    const targetPath = Path.join(currentPath, name)
    if (!(await ensurePathAvailable(targetPath))) {
      return
    }

    await runWithErrorAlert('create folder', async () => {
      await FileManager.createDirectory(targetPath)
    })
  }, [currentPath, ensurePathAvailable, ensureValidName, l10n.createFolderPlaceholder, l10n.createFolderTitle, runWithErrorAlert])

  const handleCreateFile = useCallback(async () => {
    const input = await Dialog.prompt({
      title: l10n.createFileTitle,
      defaultValue: l10n.createFileDefaultName
    })

    const name = normalizeInputName(input)
    if (!(await ensureValidName(name))) {
      return
    }

    const targetPath = Path.join(currentPath, name)
    if (!(await ensurePathAvailable(targetPath))) {
      return
    }

    await runWithErrorAlert('create file', async () => {
      await FileManager.writeAsString(targetPath, '')
    })
  }, [currentPath, ensurePathAvailable, ensureValidName, l10n.createFileDefaultName, l10n.createFileTitle, runWithErrorAlert])

  const handleRename = useCallback(
    async (entry: FileEntry) => {
      const input = await Dialog.prompt({
        title: l10n.renameTitle,
        defaultValue: entry.name,
        confirmLabel: l10n.renameConfirm
      })

      const newName = normalizeInputName(input)
      if (!newName || newName === entry.name) {
        return
      }

      if (!(await ensureValidName(newName))) {
        return
      }

      const targetPath = Path.join(currentPath, newName)
      if (!(await ensurePathAvailable(targetPath))) {
        return
      }

      await runWithErrorAlert('rename', async () => {
        await FileManager.rename(entry.path, targetPath)
      })
    },
    [currentPath, ensurePathAvailable, ensureValidName, l10n.renameConfirm, l10n.renameTitle, runWithErrorAlert]
  )

  const handleDelete = useCallback(
    async (entry: FileEntry) => {
      const confirmed = await Dialog.confirm({
        title: l10n.deleteTitle,
        message: l10n.deleteConfirm(entry.name),
        confirmLabel: l10n.deleteConfirmLabel,
        cancelLabel: l10n.cancelLabel
      })

      if (!confirmed) {
        return
      }

      await runWithErrorAlert('delete', async () => {
        await FileManager.remove(entry.path)
      })
    },
    [l10n.cancelLabel, l10n.deleteConfirm, l10n.deleteConfirmLabel, l10n.deleteTitle, runWithErrorAlert]
  )

  const handleCopy = useCallback(
    async (entry: FileEntry) => {
      setTransfer({
        isMove: false,
        sourcePath: entry.path
      })

      try {
        await Pasteboard.setString(entry.path)
      } catch (error) {
        console.warn('[FileManage] failed to write clipboard text', error)
      }
    },
    [setTransfer]
  )

  const handleMove = useCallback(
    (entry: FileEntry) => {
      setTransfer({
        isMove: true,
        sourcePath: entry.path
      })
    },
    [setTransfer]
  )

  const handleCancelTransfer = useCallback(() => {
    setTransfer(null)
  }, [setTransfer])

  const handleApplyTransfer = useCallback(async () => {
    if (!transfer) {
      await Dialog.alert({
        title: l10n.noActiveTaskTitle,
        message: l10n.noActiveTaskMessage
      })
      return
    }

    const sourcePath = transfer.sourcePath
    const sourceExists = await FileManager.exists(sourcePath)
    if (!sourceExists) {
      setTransfer(null)
      await Dialog.alert({
        title: l10n.sourceMissingTitle,
        message: sourcePath
      })
      return
    }

    const preferredName = Path.basename(sourcePath) || l10n.untitledName
    const targetName = buildAvailableName(preferredName)
    const targetPath = Path.join(currentPath, targetName)

    await runWithErrorAlert('apply transfer', async () => {
      if (transfer.isMove) {
        await FileManager.rename(sourcePath, targetPath)
        setTransfer(null)
        return
      }

      await FileManager.copyFile(sourcePath, targetPath)
      // Keep transfer as one-shot to prevent accidental duplicate operations.
      setTransfer(null)
    })
  }, [buildAvailableName, currentPath, l10n, runWithErrorAlert, setTransfer, transfer])

  const handlePreviewFile = useCallback(
    async (filePath: string) => {
      try {
        const exists = await FileManager.exists(filePath)
        if (!exists) {
          await Dialog.alert({
            title: l10n.fileNotFoundTitle,
            message: filePath
          })
          return
        }

        if (FileManager.isFileStoredIniCloud(filePath) && !FileManager.isiCloudFileDownloaded(filePath)) {
          const downloaded = await FileManager.downloadFileFromiCloud(filePath)
          if (!downloaded) {
            await Dialog.alert({
              title: l10n.previewFailedTitle,
              message: l10n.iCloudDownloadFailed
            })
            return
          }
        }

        await QuickLook.previewURLs([buildFileUrl(filePath)])
      } catch (error) {
        console.error('[FileManage] preview failed', filePath, error)
        await Dialog.alert({
          title: l10n.previewFailedTitle,
          message: String(error)
        })
      }
    },
    [l10n]
  )

  const handleOpenEntry = useCallback(
    async (entry: FileEntry) => {
      if (entry.isDirectory) {
        navigationPath.setValue([...navigationPath.value, entry.path])
        return
      }

      await handlePreviewFile(entry.path)
    },
    [handlePreviewFile, navigationPath]
  )

  return {
    handleApplyTransfer,
    handleCancelTransfer,
    handleCopy,
    handleCreateFile,
    handleCreateFolder,
    handleDelete,
    handleMove,
    handleOpenEntry,
    handleRename
  }
}
