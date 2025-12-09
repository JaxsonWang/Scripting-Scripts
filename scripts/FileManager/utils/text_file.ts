const EDITABLE_EXTENSIONS = ['tsx', 'ts', 'js', 'jsx', 'txt', 'md', 'css', 'html', 'json'] as const
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'heic', 'heif', 'gif', 'webp', 'bmp', 'tiff'] as const

type EditorExt = (typeof EDITABLE_EXTENSIONS)[number]

/**
 * 判断文件是否可在内置编辑器中编辑
 * @param fileName 文件名
 */
export const canEditWithEditor = (fileName: string): boolean => {
  const ext = extractExtension(fileName)
  if (!ext) return false
  return EDITABLE_EXTENSIONS.includes(ext as EditorExt)
}

/**
 * 获取编辑器期望的扩展名
 * @param fileName 文件名
 */
export const getEditorExtension = (fileName: string): EditorExt => {
  const ext = extractExtension(fileName)
  if (ext && EDITABLE_EXTENSIONS.includes(ext as EditorExt)) {
    return ext as EditorExt
  }
  return 'txt'
}

/**
 * 提取文件扩展名
 * @param fileName 文件名
 */
const extractExtension = (fileName: string) => fileName.split('.').pop()?.toLowerCase()

/**
 * 判断是否为常见图片格式
 * @param fileName 文件名
 */
export const isImageFile = (fileName: string): boolean => {
  const ext = extractExtension(fileName)
  if (!ext) return false
  return IMAGE_EXTENSIONS.includes(ext as (typeof IMAGE_EXTENSIONS)[number])
}

/**
 * 判断是否为 markdown 文件
 * @param fileName 文件名
 */
export const isMarkdownFile = (fileName: string): boolean => extractExtension(fileName) === 'md'
