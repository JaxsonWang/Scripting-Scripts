import { List, Navigation, NavigationLink, NavigationStack, Path, Script, VStack, useCallback, useEffect, useMemo, useState } from 'scripting'
import type { BreadcrumbSegment, DirectoryViewProps, FileEntry } from '../types'
import { DirectoryEmptyState } from './DirectoryEmptyState'
import { useFileOperations } from '../hooks/useFileOperations'
import { useDirectoryToolbar } from '../hooks/useDirectoryToolbar'
import { usePreferencesSheet } from '../hooks/usePreferencesSheet'
import { useFileRowRenderer } from '../hooks/useFileRowRenderer'
import { useDirectoryState } from '../hooks/useDirectoryState'
import { usePreviewHandlers } from '../hooks/usePreviewHandlers'
import { useFileInfoPresenter } from '../hooks/useFileInfoPresenter'
import { useReopenableSheet } from '../hooks/useReopenableSheet'
import { BreadcrumbBar } from './BreadcrumbBar'
import { sleep } from '../utils/common'
import { parseSearchRegex, searchFilesRecursively } from '../utils/search_files'

const MAX_SEARCH_RESULTS = 2000

const trimTrailingSlash = (path: string) => {
  if (path === '/') return '/'
  return path.replace(/\/+$/, '')
}

const joinPath = (base: string, part: string) => {
  const normalizedBase = trimTrailingSlash(base)
  if (normalizedBase === '/') {
    return `/${part}`
  }
  return `${normalizedBase}/${part}`
}

const buildBreadcrumbSegments = (rootDisplayName: string, rootPath: string, currentPath: string): BreadcrumbSegment[] => {
  const normalizedRoot = trimTrailingSlash(rootPath)
  const segments: BreadcrumbSegment[] = [
    {
      label: rootDisplayName,
      targetPath: currentPath === normalizedRoot ? null : normalizedRoot,
      key: normalizedRoot || '/'
    }
  ]

  if (currentPath === normalizedRoot) {
    return segments
  }

  const relative = currentPath.slice(normalizedRoot.length).replace(/^\/+/, '')
  const parts = relative.split('/').filter(Boolean)
  const headCount = Math.max(0, parts.length - 3)
  if (headCount > 0) {
    segments.push({ label: '…', targetPath: null, key: `${normalizedRoot}-ellipsis`, isEllipsis: true })
  }

  let accumulated = normalizedRoot
  parts.forEach((part, index) => {
    accumulated = joinPath(accumulated, part)
    if (index < headCount) {
      return
    }
    segments.push({ label: part, targetPath: accumulated, key: `${accumulated}-${index}` })
  })

  const lastIndex = segments.length - 1
  if (lastIndex >= 0) {
    segments[lastIndex] = { ...segments[lastIndex], targetPath: null }
  }

  return segments
}

/**
 * 目录浏览入口组件，负责聚合状态与渲染逻辑
 * @param props DirectoryView 输入参数
 */
export const DirectoryView = ({
  rootPath,
  path,
  rootDisplayName,
  dismissStack,
  tag,
  tabItem,
  onToolbarChange,
  disableInternalToolbar,
  transfer,
  setTransfer,
  externalReloadPath,
  requestExternalReload,
  l10n,
  locale,
  onLocaleChange,
  languageOptions
}: DirectoryViewProps) => {
  const currentPath = path
  const dismiss = Navigation.useDismiss()
  const fullDismissStack = useMemo(() => [...(dismissStack || []), dismiss], [dismissStack, dismiss])

  const [searchInput, setSearchInput] = useState('')
  const [searchResults, setSearchResults] = useState<FileEntry[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const searchControl = useMemo(() => ({ id: 0 }), [])

  const { entries, showHidden, setShowHidden, currentStat, triggerReload, softRemoveEntry, softInsertEntry, restoreRenderEntries } = useDirectoryState({
    path: currentPath,
    l10n,
    externalReloadPath,
    requestExternalReload
  })

  const {
    handleCopy,
    handleMove,
    handleDelete,
    handleCreateFolder,
    handleCreateFile,
    handleRename,
    handleDuplicate,
    handlePaste,
    handleImportFolder,
    handleImportFiles
  } = useFileOperations({
    currentPath,
    transfer,
    setTransfer,
    requestExternalReload,
    l10n,
    triggerReload,
    softRemoveEntry,
    softInsertEntry,
    restoreRenderEntries
  })

  const { handleOpenFile, handleEdit } = usePreviewHandlers({ currentPath, l10n, triggerReload })
  const { showInfo } = useFileInfoPresenter({ l10n })

  const isRoot = currentPath === rootPath
  const currentDirName = isRoot ? rootDisplayName : currentPath.split('/').pop() || rootDisplayName
  const breadcrumbSegments = buildBreadcrumbSegments(rootDisplayName, rootPath, currentPath)

  const handleSearchSubmit = useCallback(async () => {
    const raw = searchInput.trim()
    if (!raw) {
      setSearchResults(null)
      setIsSearching(false)
      return
    }

    let regex: RegExp
    try {
      regex = parseSearchRegex(raw)
    } catch (error) {
      console.error('[DirectoryView] invalid search regex', raw, error)
      await Dialog.alert({ title: l10n.searchInvalidRegexTitle, message: l10n.searchInvalidRegexMessage(String(error)) })
      return
    }

    searchControl.id += 1
    const currentId = searchControl.id

    setIsSearching(true)
    setSearchResults([])
    try {
      const results = await searchFilesRecursively({
        basePath: currentPath,
        regex,
        showHidden,
        maxResults: MAX_SEARCH_RESULTS,
        shouldCancel: () => searchControl.id !== currentId
      })
      if (searchControl.id !== currentId) {
        return
      }
      setSearchResults(results)
    } catch (error) {
      console.error('[DirectoryView] search failed', currentPath, error)
      if (searchControl.id !== currentId) {
        return
      }
      setSearchResults([])
      await Dialog.alert({ title: l10n.previewFailed, message: String(error) })
    } finally {
      if (searchControl.id === currentId) {
        setIsSearching(false)
      }
    }
  }, [currentPath, l10n, searchControl, searchInput, showHidden])

  const handleOpenContainingDirectory = useCallback(
    async (entry: FileEntry) => {
      if (!searchResults) {
        return
      }
      const targetDir = Path.dirname(entry.path)
      if (!targetDir || targetDir === currentPath) {
        return
      }
      await Navigation.present({
        element: (
          <NavigationStack>
            <DirectoryView
              rootPath={targetDir}
              path={targetDir}
              rootDisplayName={Path.basename(targetDir) || targetDir}
              disableInternalToolbar={false}
              transfer={transfer}
              setTransfer={setTransfer}
              externalReloadPath={externalReloadPath}
              requestExternalReload={requestExternalReload}
              l10n={l10n}
              locale={locale}
              onLocaleChange={onLocaleChange}
              languageOptions={languageOptions}
            />
          </NavigationStack>
        )
      })
    },
    [currentPath, externalReloadPath, languageOptions, l10n, locale, onLocaleChange, requestExternalReload, searchResults, setTransfer, transfer]
  )

  const displayEntries = useMemo(() => {
    if (searchResults) {
      return searchResults
    }
    return entries
  }, [entries, searchResults])

  useEffect(() => {
    if (searchInput.trim()) {
      return
    }
    searchControl.id += 1
    setIsSearching(false)
    setSearchResults(null)
  }, [searchControl, searchInput])

  /**
   * 行级“简介”点击事件，复用已有 stat 并开启体积计算
   * @param entry 文件或目录条目
   */
  const handleInfo = useCallback(
    (entry: FileEntry) =>
      showInfo({
        name: entry.name,
        path: entry.path,
        stat: entry.stat,
        autoComputeSize: true
      }),
    [showInfo]
  )

  /**
   * 顶栏“简介”按钮，优先使用缓存 stat，必要时自动计算大小
   */
  const handleCurrentDirInfo = useCallback(() => {
    if (!currentStat) {
      console.warn('[DirectoryView] summary pressed without current stat', currentPath)
      return
    }
    return showInfo({ name: currentDirName, path: currentPath, stat: currentStat, autoComputeSize: true })
  }, [currentDirName, currentPath, currentStat, showInfo])

  const { register: registerPreferencesOpener, open: handlePreferences, reopen } = useReopenableSheet()
  const preferencesSheetOpener = usePreferencesSheet({
    showHidden,
    setShowHidden,
    l10n,
    locale,
    onLocaleChange,
    languageOptions,
    onLanguageChanged: reopen
  })

  useEffect(() => {
    registerPreferencesOpener(preferencesSheetOpener)
  }, [preferencesSheetOpener, registerPreferencesOpener])

  /**
   * 关闭按钮回调，确保 dismiss 后退出脚本
   */
  const handleExit = useCallback(async () => {
    const count = fullDismissStack.length
    console.log(`[DirectoryView] Exit requested. Stack length: ${count}`)

    // 顺序执行 dismiss
    for (let i = 0; i < count; i++) {
      const stackIndex = count - 1 - i
      const fn = fullDismissStack[stackIndex]
      console.log(`[DirectoryView] Scheduling dismiss for index ${stackIndex}`)
      if (fn) {
        fn()
        // 等待动画完成
        await sleep(50)
      }
    }
    // Script.exit()
  }, [fullDismissStack])

  const renderFileRow = useFileRowRenderer({
    l10n,
    currentPath,
    isSearchMode: Boolean(searchResults),
    handleOpenContainingDirectory,
    handleOpenFile,
    handleCopy,
    handleMove,
    handleEdit,
    handleInfo,
    handleRename,
    handleDuplicate,
    handleDelete
  })

  const { toolbarTrailing, navigationTitle: derivedNavigationTitle } = useDirectoryToolbar({
    currentDirName,
    transfer,
    l10n,
    handleCreateFolder,
    handleCreateFile,
    handleImportFolder,
    handleImportFiles,
    handlePaste,
    handlePreferences,
    handleExit,
    handleShowInfo: handleCurrentDirInfo
  })

  useEffect(() => {
    if (disableInternalToolbar && onToolbarChange && tag != null) {
      onToolbarChange(tag, {
        trailing: toolbarTrailing,
        navigationTitle: derivedNavigationTitle
      })
    }
  }, [disableInternalToolbar, onToolbarChange, tag, toolbarTrailing, derivedNavigationTitle])

  return (
    <VStack
      tag={tag}
      tabItem={tabItem}
      frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}
      navigationTitle={disableInternalToolbar ? undefined : derivedNavigationTitle}
      toolbarTitleDisplayMode={disableInternalToolbar ? undefined : 'inline'}
      toolbar={disableInternalToolbar ? undefined : { topBarTrailing: toolbarTrailing }}
      alignment="leading"
      onAppear={() => {
        searchControl.id += 1
        setIsSearching(false)
        setSearchInput('')
        setSearchResults(null)
      }}
    >
      {!isRoot ? <BreadcrumbBar segments={breadcrumbSegments} dismissStack={fullDismissStack} rootPath={rootPath} /> : null}
      <List
        listStyle="inset"
        searchable={
          disableInternalToolbar
            ? undefined
            : {
                value: searchInput,
                onChanged: setSearchInput,
                placement: 'navigationBarDrawerAlwaysDisplay',
                prompt: l10n.searchPrompt
              }
        }
        onSubmit={disableInternalToolbar ? undefined : { triggers: 'search', action: handleSearchSubmit }}
      >
        {isSearching ? (
          <DirectoryEmptyState message={l10n.searchInProgress} />
        ) : displayEntries.length === 0 ? (
          <DirectoryEmptyState message={searchResults ? l10n.searchEmpty : l10n.emptyFolder} />
        ) : (
          displayEntries.map(entry => {
            const { name, path: childPath, isDir } = entry
            if (isDir) {
              return (
                <NavigationLink
                  key={name}
                  destination={
                    <DirectoryView
                      rootPath={rootPath}
                      path={childPath}
                      rootDisplayName={rootDisplayName}
                      tag={tag}
                      onToolbarChange={onToolbarChange}
                      disableInternalToolbar={false}
                      transfer={transfer}
                      setTransfer={setTransfer}
                      externalReloadPath={externalReloadPath}
                      requestExternalReload={requestExternalReload}
                      l10n={l10n}
                      locale={locale}
                      onLocaleChange={onLocaleChange}
                      languageOptions={languageOptions}
                      dismissStack={fullDismissStack}
                    />
                  }
                >
                  {renderFileRow(entry)}
                </NavigationLink>
              )
            }

            return renderFileRow(entry)
          })
        )}
      </List>
    </VStack>
  )
}
