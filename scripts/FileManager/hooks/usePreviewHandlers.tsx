import { Navigation, useCallback } from 'scripting'
import type { FileEntry, PreviewHandlersOptions } from '../types'
import { useFilePreview } from './useFilePreview'
import { canEditWithEditor, getEditorExtension, isImageFile, isMarkdownFile } from '../utils/text_file'
import { MarkdownPreviewView } from '../components/MarkdownPreviewView'

export const usePreviewHandlers = ({ currentPath, l10n, triggerReload }: PreviewHandlersOptions) => {
  const quickLookFile = useFilePreview(currentPath, l10n)

  const handleEdit = useCallback(
    async (entry: FileEntry) => {
      if (!canEditWithEditor(entry.name)) {
        return
      }
      const filePath = entry.path
      let content: string
      try {
        content = await FileManager.readAsString(filePath)
      } catch (error) {
        console.error('[usePreviewHandlers][edit] read failed', filePath, error)
        await Dialog.alert({ title: l10n.previewFailed, message: String(error) })
        return
      }
      const controller = new EditorController({ content, ext: getEditorExtension(entry.name) })
      try {
        await controller.present({ navigationTitle: entry.name })
        await FileManager.writeAsString(filePath, controller.content)
        triggerReload()
      } catch (error) {
        console.error('[usePreviewHandlers][edit] editor failed', filePath, error)
        await Dialog.alert({ title: l10n.previewFailed, message: String(error) })
      } finally {
        controller.dispose()
      }
    },
    [triggerReload, l10n]
  )

  const previewTextFile = useCallback(
    async (name: string) => {
      const filePath = currentPath + '/' + name
      let content: string
      try {
        content = await FileManager.readAsString(filePath)
      } catch (error) {
        console.error('[usePreviewHandlers][text] read failed', filePath, error)
        await Dialog.alert({ title: l10n.previewFailed, message: String(error) })
        return
      }
      const controller = new EditorController({ content, ext: getEditorExtension(name), readOnly: true })
      try {
        await controller.present({ navigationTitle: name })
      } catch (error) {
        console.error('[usePreviewHandlers][text] present failed', filePath, error)
        await Dialog.alert({ title: l10n.previewFailed, message: String(error) })
      } finally {
        controller.dispose()
      }
    },
    [currentPath, l10n]
  )

  const previewMarkdownFile = useCallback(
    async (name: string) => {
      const filePath = currentPath + '/' + name
      let content: string
      try {
        content = await FileManager.readAsString(filePath)
      } catch (error) {
        console.error('[usePreviewHandlers][markdown] read failed', filePath, error)
        await Dialog.alert({ title: l10n.previewFailed, message: String(error) })
        return
      }
      await Navigation.present({
        element: <MarkdownPreviewView name={name} content={content} l10n={l10n} />
      })
    },
    [currentPath, l10n]
  )

  const handleOpenFile = useCallback(
    async (name: string) => {
      if (isMarkdownFile(name)) {
        await previewMarkdownFile(name)
        return
      }
      if (canEditWithEditor(name)) {
        await previewTextFile(name)
        return
      }
      if (isImageFile(name)) {
        const imagePath = currentPath + '/' + name
        try {
          if (!FileManager.existsSync(imagePath)) {
            await Dialog.alert({ title: l10n.fileNotFound, message: imagePath })
            return
          }
          const image = UIImage.fromFile(imagePath)
          if (!image) {
            await Dialog.alert({ title: l10n.previewFailed, message: l10n.fileNotFound })
            return
          }
          await QuickLook.previewImage(image)
        } catch (error) {
          console.error('[usePreviewHandlers][image] preview failed', imagePath, error)
          await Dialog.alert({ title: l10n.previewFailed, message: String(error) })
        }
        return
      }
      await quickLookFile(name)
    },
    [previewMarkdownFile, previewTextFile, quickLookFile, currentPath, l10n]
  )

  return { handleOpenFile, handleEdit }
}
