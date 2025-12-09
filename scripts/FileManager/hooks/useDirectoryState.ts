import { useCallback, useEffect, useState } from 'scripting'
import type { DirectoryState, DirectoryStateOptions } from '../types'
import { useDirectoryEntries } from './useDirectoryEntries'

/**
 * 汇总目录级别状态（entries/stat）供 DirectoryView 使用
 * @param options hook 依赖项
 */
export const useDirectoryState = ({ path, l10n, externalReloadPath, requestExternalReload }: DirectoryStateOptions): DirectoryState => {
  const { entries, showHidden, setShowHidden, triggerReload, softRemoveEntry, softInsertEntry, restoreRenderEntries } = useDirectoryEntries({
    path,
    l10n,
    externalReloadPath,
    requestExternalReload
  })

  const [currentStat, setCurrentStat] = useState<FileStat | null>(null)

  useEffect(() => {
    let cancelled = false
    FileManager.stat(path)
      .then(stat => {
        if (!cancelled) {
          setCurrentStat(stat)
        }
      })
      .catch(error => {
        console.error('[useDirectoryState] failed to stat path', path, error)
        if (!cancelled) {
          setCurrentStat(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [path])

  return {
    entries,
    showHidden,
    setShowHidden,
    currentStat,
    triggerReload,
    softRemoveEntry,
    softInsertEntry,
    restoreRenderEntries
  }
}
