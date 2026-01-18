import { useCallback, useEffect, useObservable, useState } from 'scripting'
import type { FileEntry, UseDirectoryEntriesOptions } from '../types'
import { createFileEntry, joinFilePath, normalizeFilePath } from '../utils/common'

type CachedDirectoryData = {
  entries: FileEntry[]
  loadedAt: number
}

const directoryCache = new Map<string, CachedDirectoryData>()

/**
 * Clear cache for a specific directory path
 */
const clearCacheForPath = (path: string) => {
  const normalized = normalizeFilePath(path)
  directoryCache.delete(normalized)
}

/**
 * Get cached directory data if available
 */
const getCachedData = (path: string): FileEntry[] | null => {
  const normalized = normalizeFilePath(path)
  const cached = directoryCache.get(normalized)
  return cached ? cached.entries : null
}

/**
 * Store directory data in cache
 */
const setCachedData = (path: string, entries: FileEntry[]) => {
  const normalized = normalizeFilePath(path)
  directoryCache.set(normalized, {
    entries,
    loadedAt: Date.now()
  })
}

/**
 * 目录项排序规则，确保目录优先 + 名称升序
 * @param a 左侧条目
 * @param b 右侧条目
 */
const compareEntries = (a: FileEntry, b: FileEntry) => {
  if (a.isDir && !b.isDir) return -1
  if (!a.isDir && b.isDir) return 1
  return a.name.localeCompare(b.name)
}

const DIRECTORY_DETECTION_CONCURRENCY = 12
const PROGRESS_UPDATE_EVERY = 150

/**
 * 将条目按 compareEntries 插入并去重
 * @param entries 当前渲染数组
 * @param entry 新增条目
 */
const insertEntrySorted = (entries: FileEntry[], entry: FileEntry) => {
  const next = entries.filter(item => item.path !== entry.path)
  let inserted = false
  for (let i = 0; i < next.length; i += 1) {
    if (compareEntries(entry, next[i]) < 0) {
      next.splice(i, 0, entry)
      inserted = true
      break
    }
  }
  if (!inserted) {
    next.push(entry)
  }
  return next
}

/**
 * 管理当前目录的文件列表及隐藏项状态
 * @param options 目录参数
 */
export const useDirectoryEntries = ({ path, l10n, externalReloadPath, requestExternalReload, showHiddenDefault = true }: UseDirectoryEntriesOptions) => {
  const entries = useObservable<FileEntry[]>([])
  const dataEntries = useObservable<FileEntry[]>([])
  const [showHidden, setShowHidden] = useState(showHiddenDefault)
  const [version, bumpVersion] = useState(0)
  const [loadRef] = useState(() => ({ id: 0 }))

  useEffect(() => {
    return () => {
      loadRef.id += 1
    }
  }, [loadRef])

  /**
   * 读取目录并缓存排序结果
   */
  const loadFiles = useCallback(
    async (forceReload = false) => {
      const loadId = (loadRef.id += 1)
      const normalizedPath = normalizeFilePath(path)

      if (!forceReload) {
        const cached = getCachedData(normalizedPath)
        if (cached) {
          const filtered = cached.filter(entry => showHidden || !entry.name.startsWith('.'))
          dataEntries.setValue(filtered)
          entries.setValue(filtered)
          return
        }
      }

      try {
        const names = await FileManager.readDirectory(normalizedPath)
        const filtered = names.filter(name => showHidden || !name.startsWith('.'))

        const baseEntries: FileEntry[] = filtered.map(name => {
          const fullPath = joinFilePath(normalizedPath, name)
          return createFileEntry({ name, path: fullPath, isDir: false })
        })

        const initial = [...baseEntries].sort((a, b) => a.name.localeCompare(b.name))
        dataEntries.setValue(initial)
        entries.setValue(initial)

        const working: FileEntry[] = [...initial]
        const workerCount = Math.max(1, Math.min(DIRECTORY_DETECTION_CONCURRENCY, working.length))
        let nextIndex = 0
        let completed = 0

        const workers = Array.from({ length: workerCount }, async () => {
          while (true) {
            const index = nextIndex
            nextIndex += 1
            if (index >= working.length) {
              return
            }

            const entry = working[index]
            let isDir = false
            try {
              isDir = await FileManager.isDirectory(entry.path)
            } catch {
              isDir = false
            }

            const updated: FileEntry = createFileEntry({ ...entry, isDir })
            working[index] = updated
            completed += 1

            if (completed % PROGRESS_UPDATE_EVERY === 0 && loadRef.id === loadId) {
              entries.setValue([...working])
            }
          }
        })

        await Promise.all(workers)

        if (loadRef.id !== loadId) {
          return
        }

        const sorted = [...working].sort(compareEntries)
        setCachedData(normalizedPath, sorted)
        dataEntries.setValue(sorted)
        entries.setValue(sorted)
      } catch (error) {
        console.error(error)
        await Dialog.alert({ message: l10n.failedRead })
      }
    },
    [loadRef, path, showHidden, l10n]
  )

  useEffect(() => {
    loadFiles()
  }, [loadFiles, version])

  useEffect(() => {
    if (externalReloadPath && externalReloadPath === path) {
      clearCacheForPath(path)
      loadFiles(true)
      requestExternalReload(null)
    }
  }, [externalReloadPath, path, loadFiles, requestExternalReload])

  /**
   * 手动触发一次刷新
   */
  const triggerReload = useCallback(() => {
    clearCacheForPath(path)
    bumpVersion(v => v + 1)
  }, [path])

  /**
   * 将指定路径的条目从渲染列表中移除，不影响真实数据
   * @param targetPath 需要隐藏的条目路径
   */
  const softRemoveEntry = useCallback(
    (targetPath: string) => {
      entries.setValue(entries.value.filter(entry => entry.path !== targetPath))
    },
    [entries]
  )

  /**
   * 插入占位条目，便于乐观更新
   * @param entry 需要插入的条目
   */
  const softInsertEntry = useCallback(
    (entry: FileEntry) => {
      entries.setValue(insertEntrySorted(entries.value, entry))
    },
    [entries]
  )

  /**
   * 恢复渲染列表与真实数据一致
   */
  const restoreRenderEntries = useCallback(() => {
    entries.setValue([...dataEntries.value])
  }, [dataEntries, entries])

  return { entries, showHidden, setShowHidden, triggerReload, softRemoveEntry, softInsertEntry, restoreRenderEntries }
}
