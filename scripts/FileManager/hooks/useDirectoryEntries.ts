import { useCallback, useEffect, useState } from 'scripting'
import type { FileEntry, UseDirectoryEntriesOptions } from '../types'

/**
 * 管理当前目录的文件列表及隐藏项状态
 * @param options 目录参数
 */
export const useDirectoryEntries = ({ path, l10n, externalReloadPath, requestExternalReload, showHiddenDefault = true }: UseDirectoryEntriesOptions) => {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [showHidden, setShowHidden] = useState(showHiddenDefault)
  const [version, bumpVersion] = useState(0)

  /**
   * 读取目录并缓存排序结果
   */
  const loadFiles = useCallback(async () => {
    try {
      const names = await FileManager.readDirectory(path)
      const filtered = names.filter(name => showHidden || !name.startsWith('.'))
      const withMeta: FileEntry[] = filtered.map(name => {
        const fullPath = `${path}/${name}`
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
      const sorted = withMeta.sort((a, b) => {
        if (a.isDir && !b.isDir) return -1
        if (!a.isDir && b.isDir) return 1
        return a.name.localeCompare(b.name)
      })
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

  return { entries, showHidden, setShowHidden, triggerReload }
}
