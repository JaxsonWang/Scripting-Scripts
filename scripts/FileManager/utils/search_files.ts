import type { FileEntry, SearchFilesOptions } from '../types'

const trimTrailingSlash = (path: string) => {
  if (path === '/') return '/'
  return path.replace(/\/+$/, '')
}

const makeNonGlobalRegex = (regex: RegExp) => {
  const flags = regex.flags.replace(/[gy]/g, '')
  return new RegExp(regex.source, flags)
}

/**
 * 解析用户输入的正则字符串：
 * - 支持 `/pattern/flags` 形式
 * - 否则按普通模式处理，并默认使用 `i`（忽略大小写）
 * - 自动移除 `g/y` 避免 `RegExp#test` 状态污染
 */
export const parseSearchRegex = (input: string) => {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new Error('Empty pattern')
  }

  if (trimmed.startsWith('/') && trimmed.length > 2) {
    const lastSlashIndex = trimmed.lastIndexOf('/')
    if (lastSlashIndex > 0) {
      const pattern = trimmed.slice(1, lastSlashIndex)
      const flags = trimmed.slice(lastSlashIndex + 1)
      return makeNonGlobalRegex(new RegExp(pattern, flags))
    }
  }

  return makeNonGlobalRegex(new RegExp(trimmed, 'i'))
}

const resolveRelativeName = (basePath: string, fullPath: string) => {
  const normalizedBase = trimTrailingSlash(basePath)
  const normalizedFull = trimTrailingSlash(fullPath)
  if (normalizedFull === normalizedBase) return ''
  return normalizedFull.slice(normalizedBase.length).replace(/^\/+/, '')
}

/**
 * 递归搜索指定目录下的文件（按文件名正则匹配）
 * - 返回结果的 `name` 为相对 basePath 的路径，便于复用现有打开/复制/移动逻辑（`currentPath + '/' + name`）
 */
export const searchFilesRecursively = async ({
  basePath,
  regex,
  showHidden,
  maxResults,
  shouldCancel,
  yieldEvery = 100
}: SearchFilesOptions): Promise<FileEntry[]> => {
  const normalizedBase = trimTrailingSlash(basePath)
  const testRegex = makeNonGlobalRegex(regex)
  const results: FileEntry[] = []
  const stack: string[] = [normalizedBase]
  let visited = 0

  while (stack.length > 0) {
    if (shouldCancel?.()) {
      return []
    }

    const dirPath = stack.pop()
    if (!dirPath) {
      continue
    }

    let names: string[]
    try {
      names = await FileManager.readDirectory(dirPath)
    } catch (error) {
      console.error('[searchFilesRecursively] readDirectory failed', dirPath, error)
      continue
    }

    for (const name of names) {
      if (shouldCancel?.()) {
        return []
      }

      if (!showHidden && name.startsWith('.')) {
        continue
      }

      const fullPath = dirPath === '/' ? `/${name}` : `${dirPath}/${name}`

      let isDir = false
      try {
        isDir = FileManager.isDirectorySync(fullPath)
      } catch (error) {
        console.error('[searchFilesRecursively] isDirectorySync failed', fullPath, error)
      }

      if (isDir) {
        stack.push(fullPath)
        continue
      }

      try {
        testRegex.lastIndex = 0
        if (!testRegex.test(name)) {
          continue
        }
      } catch (error) {
        console.error('[searchFilesRecursively] regex test failed', name, error)
        continue
      }

      let stat: FileStat | undefined
      try {
        stat = FileManager.statSync(fullPath)
      } catch (error) {
        console.error('[searchFilesRecursively] statSync failed', fullPath, error)
      }

      const relativeName = resolveRelativeName(normalizedBase, fullPath)
      results.push({ name: relativeName || name, path: fullPath, isDir: false, stat })

      if (results.length >= maxResults) {
        return results
      }

      visited += 1
      if (visited % yieldEvery === 0) {
        await Promise.resolve()
      }
    }
  }

  return results
}
