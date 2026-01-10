import { useCallback, useEffect, useState } from 'scripting'
import type { FileEntry, UseDirectoryEntriesOptions } from '../types'
import { joinFilePath, normalizeFilePath } from '../utils/common'

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
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [dataEntries, setDataEntries] = useState<FileEntry[]>([])
  const [showHidden, setShowHidden] = useState(showHiddenDefault)
  const [version, bumpVersion] = useState(0)

  /**
   * 读取目录并缓存排序结果
   */
  const loadFiles = useCallback(async () => {
    try {
      const normalizedPath = normalizeFilePath(path)
      const names = await FileManager.readDirectory(normalizedPath)
      const filtered = names.filter(name => showHidden || !name.startsWith('.'))
      const withMeta: FileEntry[] = filtered.map(name => {
        const fullPath = joinFilePath(normalizedPath, name)
        let isDir = false
        let stat: FileStat | undefined
        try {
          isDir = FileManager.isDirectorySync(fullPath)
        } catch (err) {
          console.error('[DirectoryView] isDirectorySync failed', fullPath, err)
        }
        try {
          stat = FileManager.statSync(fullPath)
        } catch (err) {
          console.error('[DirectoryView] statSync failed', fullPath, err)
        }
        return { name, path: fullPath, isDir, stat }
      })
      const sorted = withMeta.sort(compareEntries)
      setDataEntries(sorted)
      setEntries(sorted)
    } catch (error) {
      console.error(error)
      await Dialog.alert({ message: l10n.failedRead })
    }
  }, [path, showHidden, l10n])

  useEffect(() => {
    loadFiles()
  }, [loadFiles, version])

  useEffect(() => {
    if (externalReloadPath && externalReloadPath === path) {
      loadFiles()
      requestExternalReload(null)
    }
  }, [externalReloadPath, path, loadFiles, requestExternalReload])

  /**
   * 手动触发一次刷新
   */
  const triggerReload = useCallback(() => bumpVersion(v => v + 1), [])

  /**
   * 将指定路径的条目从渲染列表中移除，不影响真实数据
   * @param targetPath 需要隐藏的条目路径
   */
  const softRemoveEntry = useCallback((targetPath: string) => {
    setEntries(prev => prev.filter(entry => entry.path !== targetPath))
  }, [])

  /**
   * 插入占位条目，便于乐观更新
   * @param entry 需要插入的条目
   */
  const softInsertEntry = useCallback((entry: FileEntry) => {
    setEntries(prev => insertEntrySorted(prev, entry))
  }, [])

  /**
   * 恢复渲染列表与真实数据一致
   */
  const restoreRenderEntries = useCallback(() => {
    setEntries([...dataEntries])
  }, [dataEntries])

  return { entries, showHidden, setShowHidden, triggerReload, softRemoveEntry, softInsertEntry, restoreRenderEntries }
}
