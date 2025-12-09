import { useCallback } from 'scripting'
import type { L10n } from '../types'

/**
 * 提供 QuickLook 预览文件的回调
 * @param currentPath 当前目录
 * @param l10n 文案
 */
export const useFilePreview = (currentPath: string, l10n: L10n) => {
  const handleOpenFile = useCallback(
    async (name: string) => {
      const newPath = `${currentPath}/${name}`
      const encodedURL = `file://${encodeURI(newPath)}`
      console.log('[handleOpenFile] tap', { newPath, encodedURL })
      try {
        if (!FileManager.existsSync(newPath)) {
          console.error('[QuickLook] file not found', newPath)
          await Dialog.alert({ title: l10n.fileNotFound, message: newPath })
          return
        }
        console.log('[QuickLook] preview', { path: newPath, encodedURL })
        await QuickLook.previewURLs([encodedURL])
      } catch (error) {
        console.error(error)
        await Dialog.alert({ title: l10n.previewFailed, message: String(error) })
      }
    },
    [currentPath, l10n]
  )

  return handleOpenFile
}
