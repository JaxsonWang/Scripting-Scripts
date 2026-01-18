/**
 * 简单的 sleep 实现
 * @param ms 等待时间（毫秒）
 */
export const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(() => resolve(), ms))

export const normalizeFilePath = (path: string) => {
  const collapsed = path.replace(/\/{2,}/g, '/')
  if (collapsed === '/') return '/'
  return collapsed.replace(/\/+$/, '')
}

export const joinFilePath = (base: string, part: string) => {
  const normalizedBase = normalizeFilePath(base)
  if (normalizedBase === '/') {
    return normalizeFilePath(`/${part}`)
  }
  return normalizeFilePath(`${normalizedBase}/${part}`)
}

export const decodeNavigationPathId = (id: string) => {
  try {
    return normalizeFilePath(decodeURIComponent(id))
  } catch {
    return normalizeFilePath(id)
  }
}

export const encodeNavigationPathId = (path: string) => {
  return encodeURIComponent(normalizeFilePath(path))
}

export const normalizeNavigationPathId = (id: string) => {
  return encodeNavigationPathId(decodeNavigationPathId(id))
}

export const createFileEntry = (params: { name: string; path: string; isDir: boolean; stat?: FileStat }): import('../types').FileEntry => {
  const normalizedPath = normalizeFilePath(params.path)
  return {
    id: normalizedPath,
    name: params.name,
    path: normalizedPath,
    isDir: params.isDir,
    stat: params.stat
  }
}
