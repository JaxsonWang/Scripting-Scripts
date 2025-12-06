const EDITABLE_EXTENSIONS = ['tsx', 'ts', 'js', 'jsx', 'txt', 'md', 'css', 'html', 'json'] as const

type EditorExt = (typeof EDITABLE_EXTENSIONS)[number]

export const canEditWithEditor = (fileName: string): fileName is string => {
  const ext = extractExtension(fileName)
  if (!ext) return false
  return EDITABLE_EXTENSIONS.includes(ext as EditorExt)
}

export const getEditorExtension = (fileName: string): EditorExt => {
  const ext = extractExtension(fileName)
  if (ext && EDITABLE_EXTENSIONS.includes(ext as EditorExt)) {
    return ext as EditorExt
  }
  return 'txt'
}

const extractExtension = (fileName: string) => fileName.split('.').pop()?.toLowerCase()
