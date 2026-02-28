import { Path, useCallback, useEffect, useMemo, useState } from 'scripting'
import type { L10n } from '../l10n'
import type { FileEntry } from '../types'

const INITIAL_VISIBLE_COUNT = 200
const LOAD_MORE_STEP = 200
const PUBLISH_STEP = 120
const SCHEDULE_TIME_SLICE_MS = 17

const waitForNextTick = () =>
  new Promise<void>(resolve => {
    setTimeout(() => {
      resolve()
    }, 0)
  })

type UseDirectoryEntriesOptions = {
  currentPath: string
  l10n: L10n
}

export const useDirectoryEntries = ({ currentPath, l10n }: UseDirectoryEntriesOptions) => {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [reloadVersion, setReloadVersion] = useState(0)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT)

  useEffect(() => {
    let canceled = false

    const readEntries = async () => {
      setIsLoading(true)
      setEntries([])
      setTotalCount(0)
      setVisibleCount(INITIAL_VISIBLE_COUNT)

      try {
        const names = await FileManager.readDirectory(currentPath)
        const sortedNames = [...names].sort((left, right) => left.localeCompare(right))
        if (canceled) {
          return
        }

        setTotalCount(sortedNames.length)

        const directories: FileEntry[] = []
        const files: FileEntry[] = []
        let currentIndex = 0
        let lastPublishedCount = 0

        while (currentIndex < sortedNames.length) {
          const sliceStart = Date.now()

          while (currentIndex < sortedNames.length && Date.now() - sliceStart < SCHEDULE_TIME_SLICE_MS) {
            const name = sortedNames[currentIndex]
            currentIndex += 1

            const path = Path.join(currentPath, name)
            let isDirectory = false
            try {
              isDirectory = await FileManager.isDirectory(path)
            } catch (error) {
              console.error('[FileManage] failed to check directory type', path, error)
            }

            const entry: FileEntry = {
              isDirectory,
              name,
              path
            }

            if (isDirectory) {
              directories.push(entry)
            } else {
              files.push(entry)
            }

            if (canceled) {
              return
            }
          }

          const resolvedCount = directories.length + files.length
          const shouldPublish = resolvedCount - lastPublishedCount >= PUBLISH_STEP || resolvedCount === sortedNames.length

          if (shouldPublish && !canceled) {
            setEntries([...directories, ...files])
            lastPublishedCount = resolvedCount
          }

          if (currentIndex < sortedNames.length && !canceled) {
            await waitForNextTick()
          }
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

  const visibleEntries = useMemo(() => {
    return filteredEntries.slice(0, visibleCount)
  }, [filteredEntries, visibleCount])

  const hasMoreEntries = visibleEntries.length < filteredEntries.length
  const hasPendingEntries = entries.length < totalCount

  const refreshEntries = useCallback(() => {
    setReloadVersion(value => value + 1)
  }, [])

  const loadMoreEntries = useCallback(() => {
    setVisibleCount(value => value + LOAD_MORE_STEP)
  }, [])

  return {
    filteredEntries,
    hasMoreEntries,
    hasPendingEntries,
    isLoading,
    loadMoreEntries,
    refreshEntries,
    resolvedCount: entries.length,
    searchKeyword,
    setSearchKeyword,
    totalCount,
    visibleEntries
  }
}
