import { Navigation, useCallback } from 'scripting'
import type { FileEntry, PreviewHandlersOptions } from '../types'
import { useFilePreview } from './useFilePreview'
import { canEditWithEditor, getEditorExtension, isImageFile, isMarkdownFile } from '../utils/text_file'
import { MarkdownPreviewView } from '../components/MarkdownPreviewView'

/**
 * 统一管理文件预览/编辑逻辑，供文件行复用
 * @param options 预览参数
 */
export const usePreviewHandlers = ({ currentPath, l10n, triggerReload }: PreviewHandlersOptions) => {
  const quickLookFile = useFilePreview(currentPath, l10n)

  /**
   * 打开可编辑文本文件并保存最新内容
   * @param entry 文件条目
   */
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

  /**
   * 以只读编辑器方式展示文本文件
   * @param name 文件名
   */
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

  /**
   * 呈现 Markdown 文件的滚动预览
   * @param name 文件名
   */
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

  /**
   * 根据扩展名选择合适的预览方式
   * @param name 文件名
   */
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
