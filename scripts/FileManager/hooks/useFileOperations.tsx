import { useCallback } from 'scripting'
import type { FileOperationsConfig } from '../types'

export const useFileOperations = ({
  currentPath,
  transfer,
  setTransfer,
  requestExternalReload,
  setToastMessage,
  setToastShown,
  l10n,
  triggerReload
}: FileOperationsConfig) => {
  const buildPath = useCallback((name: string) => currentPath + '/' + name, [currentPath])

  const alertFailure = useCallback(
    async (context: string, error: unknown) => {
      console.error(`[useFileOperations][${context}]`, error)
      await Dialog.alert({ title: l10n.previewFailed, message: String(error) })
    },
    [l10n]
  )

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

  const handleCopy = useCallback(
    async (name: string) => {
      const filePath = buildPath(name)
      await Pasteboard.setString(filePath)
      setTransfer({ sourcePath: filePath, isMove: false })
      setToastMessage(l10n.copiedToast)
      setToastShown(true)
    },
    [buildPath, setTransfer, setToastMessage, setToastShown, l10n]
  )

  const handleMove = useCallback(
    (name: string) => {
      const filePath = buildPath(name)
      setTransfer({ sourcePath: filePath, isMove: true })
      setToastMessage(l10n.moveToast)
      setToastShown(true)
    },
    [buildPath, setTransfer, setToastMessage, setToastShown, l10n]
  )

  const handleDelete = useCallback(
    async (name: string) => {
      const filePath = buildPath(name)
      const confirm = await Dialog.confirm({
        title: l10n.deleteTitle,
        message: l10n.deleteConfirm(name),
        confirmLabel: l10n.deleteConfirmLabel
      })
      if (confirm) {
        await executeAndReload('delete', () => FileManager.remove(filePath))
      }
    },
    [buildPath, executeAndReload, l10n]
  )

  const handleCreateFolder = useCallback(async () => {
    const name = await Dialog.prompt({ title: l10n.newFolderTitle })
    if (name) {
      await executeAndReload('createDirectory', () => FileManager.createDirectory(buildPath(name)))
    }
  }, [buildPath, executeAndReload, l10n])

  const handleCreateFile = useCallback(async () => {
    const name = await Dialog.prompt({ title: l10n.newFileTitle, defaultValue: 'untitled.txt' })
    if (name) {
      await executeAndReload('createFile', () => FileManager.writeAsString(buildPath(name), ''))
    }
  }, [buildPath, executeAndReload, l10n])

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

  const handlePaste = useCallback(async () => {
    if (!transfer) {
      await Dialog.alert({ title: l10n.noPasteTitle, message: l10n.noPasteMessage })
      return
    }
    const source = transfer.sourcePath
    const base = source.split('/').pop() || 'pasted'
    const ensureUnique = (name: string) => {
      let candidate = name
      let idx = 1
      while (FileManager.existsSync(buildPath(candidate))) {
        const parts = candidate.split('.')
        if (parts.length > 1) {
          const ext = parts.pop()
          candidate = `${parts.join('.')} (${idx}).${ext}`
        } else {
          candidate = `${name} (${idx})`
        }
        idx += 1
      }
      return candidate
    }
    const targetName = ensureUnique(base)
    const target = buildPath(targetName)
    try {
      if (transfer?.isMove) {
        await FileManager.rename(source, target)
        const sourceDir = source.split('/').slice(0, -1).join('/') || '/'
        requestExternalReload(sourceDir)
      } else {
        await FileManager.copyFile(source, target)
      }
      setTransfer(null)
      triggerReload()
    } catch (error) {
      await alertFailure('paste', error)
    }
  }, [buildPath, transfer, setTransfer, requestExternalReload, triggerReload, l10n, alertFailure])

  return {
    handleCopy,
    handleMove,
    handleDelete,
    handleCreateFolder,
    handleCreateFile,
    handleRename,
    handleDuplicate,
    handlePaste
  }
}
