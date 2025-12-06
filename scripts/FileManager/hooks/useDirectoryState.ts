import { useEffect, useState } from 'scripting'
import type { DirectoryState, DirectoryStateOptions } from '../types'
import { useDirectoryEntries } from './useDirectoryEntries'

/**
 * 汇总目录级别状态（entries/stat/toast）供 DirectoryView 使用
 * @param options hook 依赖项
 */
export const useDirectoryState = ({ path, l10n, externalReloadPath, requestExternalReload }: DirectoryStateOptions): DirectoryState => {
  const [toastMessage, setToastMessage] = useState(l10n.copiedToast)
  const [toastShown, setToastShown] = useState(false)

  /**
   * 路径变化时刷新当前目录信息
   */
  useEffect(() => {
    setToastMessage(l10n.copiedToast)
  }, [l10n])

  const { entries, showHidden, setShowHidden, triggerReload } = useDirectoryEntries({
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
    toastMessage,
    setToastMessage,
    toastShown,
    setToastShown,
    currentStat,
    triggerReload
  }
}
