const extensionIconMap: Record<string, string> = {
  apk: 'apk',
  css: 'css',
  csv: 'file',
  doc: 'doc',
  docx: 'doc',
  exe: 'exe',
  gif: 'image-gif',
  heic: 'image',
  heif: 'image',
  html: 'code',
  ipa: 'ipa',
  jpeg: 'image-jpeg',
  jpg: 'image-jpeg',
  js: 'js',
  json: 'code',
  jsx: 'code',
  key: 'ppt',
  m4a: 'music',
  md: 'txt',
  mkv: 'video',
  mov: 'video',
  mp3: 'mp3',
  mp4: 'mp4',
  numbers: 'numbers',
  pdf: 'pdf',
  png: 'image-png',
  ppt: 'ppt',
  pptx: 'ppt',
  rar: 'rar',
  svg: 'image',
  ts: 'code',
  tsx: 'code',
  txt: 'txt',
  wav: 'music',
  webp: 'image',
  xls: 'els',
  xlsx: 'els',
  xt: 'xt',
  zip: 'zip'
}

/**
 * 根据文件扩展名或目录类型选择 SVG 名称
 * @param fileName 文件名
 * @param isDirectory 是否为目录
 */
export const resolveIconName = (fileName: string, isDirectory: boolean): string => {
  if (isDirectory) return 'folder'
  const extension = fileName.split('.').pop()?.toLowerCase()
  if (!extension || extension === fileName.toLowerCase()) return 'untitled'
  return extensionIconMap[extension] ?? 'untitled'
}
