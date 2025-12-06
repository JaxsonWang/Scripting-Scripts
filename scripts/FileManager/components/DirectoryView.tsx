import { List, Navigation, NavigationLink, Script, Text, VStack, useCallback, useEffect } from 'scripting'
import type { DirectoryViewProps } from '../types'
import { DirectoryEmptyState } from './DirectoryEmptyState'
import { useFileOperations } from '../hooks/useFileOperations'
import { useDirectoryToolbar } from '../hooks/useDirectoryToolbar'
import { usePreferencesSheet } from '../hooks/usePreferencesSheet'
import { useFileRowRenderer } from '../hooks/useFileRowRenderer'
import { useDirectoryState } from '../hooks/useDirectoryState'
import { usePreviewHandlers } from '../hooks/usePreviewHandlers'
import { useFileInfoPresenter } from '../hooks/useFileInfoPresenter'
import { useReopenableSheet } from '../hooks/useReopenableSheet'

/**
 * 将绝对路径压缩为 3 层以内的相对路径，便于顶栏展示
 * @param path 当前路径
 * @param rootPath 根目录
 */
const formatRelativePath = (path: string, rootPath: string): string => {
  const relative = path === rootPath ? '/' : path.replace(rootPath, '') || '/'
  if (relative === '/') {
    return relative
  }
  const segments = relative.split('/').filter(Boolean)
  if (segments.length <= 3) {
    return `/${segments.join('/')}`
  }
  const tail = segments.slice(-3).join('/')
  return `…/${tail}`
}

/**
 * 目录浏览入口组件，负责聚合状态与渲染逻辑
 * @param props DirectoryView 输入参数
 */
export const DirectoryView = ({
  rootPath,
  path,
  rootDisplayName,
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

  const { entries, showHidden, setShowHidden, toastMessage, setToastMessage, toastShown, setToastShown, currentStat, triggerReload } = useDirectoryState({
    path: currentPath,
    l10n,
    externalReloadPath,
    requestExternalReload
  })

  const { handleCopy, handleMove, handleDelete, handleCreateFolder, handleCreateFile, handleRename, handleDuplicate, handlePaste } = useFileOperations({
    currentPath,
    transfer,
    setTransfer,
    requestExternalReload,
    setToastMessage,
    setToastShown,
    l10n,
    triggerReload
  })

  const { handleOpenFile, handleEdit } = usePreviewHandlers({ currentPath, l10n, triggerReload })
  const { showInfo } = useFileInfoPresenter({ l10n })

  const isRoot = currentPath === rootPath
  const currentDirName = isRoot ? rootDisplayName : currentPath.split('/').pop() || rootDisplayName
  const relativePath = formatRelativePath(currentPath, rootPath)

  /**
   * 行级“简介”点击事件，拼接路径后交给信息面板
   * @param name 文件或目录名称
   */
  const handleInfo = useCallback((name: string) => showInfo({ name, path: `${currentPath}/${name}` }), [showInfo, currentPath])

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
  const handleExit = useCallback(() => {
    dismiss()
    Script.exit()
  }, [dismiss])

  const renderFileRow = useFileRowRenderer({
    l10n,
    handleOpenFile,
    handleCopy,
    handleMove,
    handleEdit,
    handleInfo,
    handleRename,
    handleDuplicate,
    handleDelete
  })

  const { toolbarLeading, toolbarTrailing } = useDirectoryToolbar({
    currentDirName,
    relativePath,
    transfer,
    l10n,
    handleCreateFolder,
    handleCreateFile,
    handlePaste,
    handlePreferences,
    handleExit,
    handleShowInfo: handleCurrentDirInfo
  })

  useEffect(() => {
    if (disableInternalToolbar && onToolbarChange && tag != null) {
      onToolbarChange(tag, toolbarLeading, toolbarTrailing)
    }
  }, [disableInternalToolbar, onToolbarChange, tag, toolbarLeading, toolbarTrailing])

  return (
    <VStack
      tag={tag}
      tabItem={tabItem}
      frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}
      toolbar={disableInternalToolbar ? undefined : { topBarLeading: toolbarLeading, topBarTrailing: toolbarTrailing }}
    >
      {entries.length === 0 ? (
        <DirectoryEmptyState message={l10n.emptyFolder} />
      ) : (
        <List
          listStyle="inset"
          toast={{
            isPresented: toastShown,
            onChanged: setToastShown,
            message: toastMessage,
            duration: 2,
            position: 'bottom'
          }}
        >
          {entries.map(entry => {
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
                    />
                  }
                >
                  {renderFileRow(entry)}
                </NavigationLink>
              )
            }

            return renderFileRow(entry)
          })}
        </List>
      )}
    </VStack>
  )
}
