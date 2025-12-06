import { Navigation, useCallback } from 'scripting'
import type { L10n, TransferState } from '../types'
import { FileInfoView } from '../components/FileInfoView'

type FileOperationsConfig = {
  currentPath: string
  transfer: TransferState | null
  setTransfer: (value: TransferState | null) => void
  requestExternalReload: (path: string | null) => void
  setToastMessage: (value: string) => void
  setToastShown: (value: boolean) => void
  l10n: L10n
  triggerReload: () => void
}

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
  const handleCopy = useCallback(
    async (name: string) => {
      const filePath = currentPath + '/' + name
      await Pasteboard.setString(filePath)
      setTransfer({ sourcePath: filePath, isMove: false })
      setToastMessage(l10n.copiedToast)
      setToastShown(true)
    },
    [currentPath, setTransfer, setToastMessage, setToastShown, l10n]
  )

  const handleMove = useCallback(
    (name: string) => {
      const filePath = currentPath + '/' + name
      setTransfer({ sourcePath: filePath, isMove: true })
      setToastMessage(l10n.moveToast)
      setToastShown(true)
    },
    [currentPath, setTransfer, setToastMessage, setToastShown, l10n]
  )

  const handleDelete = useCallback(
    async (name: string) => {
      const filePath = currentPath + '/' + name
      const confirm = await Dialog.confirm({
        title: l10n.deleteTitle,
        message: l10n.deleteConfirm(name),
        confirmLabel: l10n.deleteConfirmLabel
      })
      if (confirm) {
        await FileManager.remove(filePath)
        triggerReload()
      }
    },
    [currentPath, triggerReload, l10n]
  )

  const handleCreateFolder = useCallback(async () => {
    const name = await Dialog.prompt({ title: l10n.newFolderTitle })
    if (name) {
      await FileManager.createDirectory(currentPath + '/' + name)
      triggerReload()
    }
  }, [currentPath, triggerReload, l10n])

  const handleCreateFile = useCallback(async () => {
    const name = await Dialog.prompt({ title: l10n.newFileTitle, defaultValue: 'untitled.txt' })
    if (name) {
      await FileManager.writeAsString(currentPath + '/' + name, '')
      triggerReload()
    }
  }, [currentPath, triggerReload, l10n])

  const handleRename = useCallback(
    async (name: string) => {
      const filePath = currentPath + '/' + name
      const newName = await Dialog.prompt({
        title: l10n.renameTitle,
        defaultValue: name,
        confirmLabel: l10n.renameConfirm
      })
      if (newName && newName !== name) {
        await FileManager.rename(filePath, currentPath + '/' + newName)
        triggerReload()
      }
    },
    [currentPath, triggerReload, l10n]
  )

  const handleDuplicate = useCallback(
    async (name: string) => {
      const filePath = currentPath + '/' + name
      let newName = name
      if (name.includes('.')) {
        const parts = name.split('.')
        const ext = parts.pop()
        newName = parts.join('.') + ' copy.' + ext
      } else {
        newName = name + ' copy'
      }
      await FileManager.copyFile(filePath, currentPath + '/' + newName)
      triggerReload()
    },
    [currentPath, triggerReload]
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
      while (FileManager.existsSync(currentPath + '/' + candidate)) {
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
    const target = currentPath + '/' + targetName
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
      console.error(error)
      await Dialog.alert({ title: l10n.previewFailed, message: String(error) })
    }
  }, [currentPath, transfer, setTransfer, requestExternalReload, triggerReload, l10n])

  const handleInfo = useCallback(
    async (name: string) => {
      const filePath = currentPath + '/' + name
      const stat = await FileManager.stat(filePath)
      let isDirectory = stat.type === 'directory'
      if (!isDirectory) {
        try {
          isDirectory = FileManager.isDirectorySync(filePath)
        } catch (error) {
          console.error('[FileInfo] isDirectorySync failed', filePath, error)
        }
      }
      await Navigation.present({
        element: <FileInfoView name={name} path={filePath} stat={stat} isDirectory={isDirectory} l10n={l10n} />
      })
    },
    [currentPath, l10n]
  )

  return {
    handleCopy,
    handleMove,
    handleDelete,
    handleCreateFolder,
    handleCreateFile,
    handleRename,
    handleDuplicate,
    handlePaste,
    handleInfo
  }
}
