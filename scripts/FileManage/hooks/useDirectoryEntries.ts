import { Path, useCallback, useEffect, useMemo, useState } from 'scripting'
import type { L10n } from '../l10n'
import type { FileEntry } from '../types'

const DIRECTORY_CHECK_CONCURRENCY = 12

const compareEntries = (left: FileEntry, right: FileEntry) => {
  if (left.isDirectory && !right.isDirectory) return -1
  if (!left.isDirectory && right.isDirectory) return 1
  return left.name.localeCompare(right.name)
}

type UseDirectoryEntriesOptions = {
  currentPath: string
  l10n: L10n
}

export const useDirectoryEntries = ({ currentPath, l10n }: UseDirectoryEntriesOptions) => {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [reloadVersion, setReloadVersion] = useState(0)
  const [searchKeyword, setSearchKeyword] = useState('')

  useEffect(() => {
    let canceled = false

    const readEntries = async () => {
      setIsLoading(true)
      try {
        const names = await FileManager.readDirectory(currentPath)
        const baseEntries = names.map(name => ({
          name,
          path: Path.join(currentPath, name),
          isDirectory: false
        }))

        const initial = [...baseEntries].sort((left, right) => left.name.localeCompare(right.name))
        if (canceled) {
          return
        }

        // Show names quickly first, then resolve directory flags with bounded concurrency.
        setEntries(initial)

        if (initial.length === 0) {
          return
        }

        const working = [...initial]
        const workerCount = Math.max(1, Math.min(DIRECTORY_CHECK_CONCURRENCY, working.length))
        let nextIndex = 0

        const workers = Array.from({ length: workerCount }, async () => {
          while (true) {
            const currentIndex = nextIndex
            nextIndex += 1

            if (currentIndex >= working.length) {
              return
            }

            const item = working[currentIndex]
            let isDirectory = false
            try {
              isDirectory = await FileManager.isDirectory(item.path)
            } catch (error) {
              console.error('[FileManage] failed to check directory type', item.path, error)
            }

            working[currentIndex] = {
              ...item,
              isDirectory
            }
          }
        })

        await Promise.all(workers)

        if (!canceled) {
          setEntries([...working].sort(compareEntries))
        }
      } catch (error) {
        console.error('[FileManage] failed to read directory', currentPath, error)
        if (!canceled) {
          setEntries([])
          await Dialog.alert({
            title: l10n.readFailedTitle,
            message: String(error)
          })
        }
      } finally {
        if (!canceled) {
          setIsLoading(false)
        }
      }
    }

    void readEntries()

    return () => {
      canceled = true
    }
  }, [currentPath, l10n.readFailedTitle, reloadVersion])

  const filteredEntries = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()
    if (!keyword) {
      return entries
    }

    return entries.filter(entry => entry.name.toLowerCase().includes(keyword))
  }, [entries, searchKeyword])

  const refreshEntries = useCallback(() => {
    setReloadVersion(value => value + 1)
  }, [])

  return {
    filteredEntries,
    isLoading,
    refreshEntries,
    searchKeyword,
    setSearchKeyword
  }
}
