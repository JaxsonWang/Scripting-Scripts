import { useEffect, useState } from 'scripting'
import type { DirectoryState, DirectoryStateOptions } from '../types'
import { useDirectoryEntries } from './useDirectoryEntries'

export const useDirectoryState = ({ path, l10n, externalReloadPath, requestExternalReload }: DirectoryStateOptions): DirectoryState => {
  const [toastMessage, setToastMessage] = useState(l10n.copiedToast)
  const [toastShown, setToastShown] = useState(false)

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
