import { Device, Label, NavigationStack, TabView, VStack, useCallback, useMemo, useState } from 'scripting'
import { DirectoryView } from '../components/DirectoryView'
import type { L10n, LanguageOption, Locale, TransferState } from '../types'

const translations: Record<Locale, L10n> = {
  en: {
    documents: 'Documents',
    appGroup: 'App Group',
    failedRead: 'Failed to read directory',
    fileNotFound: 'File not found',
    previewFailed: 'Preview failed',
    copiedToast: 'Copied, go to target directory to paste',
    moveToast: 'Ready to move, go to target directory to paste',
    noPasteTitle: 'Nothing to paste',
    noPasteMessage: 'Long-press a file and choose Copy/Move first.',
    deleteTitle: 'Delete',
    deleteConfirm: (name: string) => `Are you sure you want to delete "${name}"?`,
    deleteConfirmLabel: 'Delete',
    fileInfoTitle: 'File Info',
    renameTitle: 'Rename',
    renameConfirm: 'Rename',
    newFolderTitle: 'New Folder',
    newFileTitle: 'New File Name',
    introTitle: 'Info',
    introMessage: (path: string, count: number) => `Path: ${path}\nItems: ${count}`,
    emptyFolder: 'Folder is empty',
    pasteLabel: 'Paste',
    addFolder: 'New Folder',
    addFile: 'New File',
    settings: 'Settings',
    exit: 'Close',
    copy: 'Copy',
    move: 'Move',
    info: 'Info',
    edit: 'Edit',
    rename: 'Rename',
    duplicate: 'Duplicate',
    delete: 'Delete',
    itemsLabel: (n: number) => `${n} items`,
    preferences: 'Preferences',
    done: 'Done',
    listDisplay: 'List Display',
    showHidden: 'Show Hidden Files',
    languageSection: 'Language',
    languagePickerTitle: 'Choose Language',
    languageEnglish: 'English',
    languageChinese: 'Chinese',
    infoSectionTitle: 'Info',
    fileTypeLabel: 'Type',
    fileSizeLabel: 'Size',
    fileCreatedLabel: 'Created',
    fileModifiedLabel: 'Modified',
    fileLocationLabel: 'Location',
    calculatingSize: 'Calculating…'
  },
  zh: {
    documents: 'Documents',
    appGroup: 'App Group',
    failedRead: '读取目录失败',
    fileNotFound: '文件不存在',
    previewFailed: '预览失败',
    copiedToast: '已拷贝，前往目标目录粘贴',
    moveToast: '已准备移动，前往目标目录粘贴',
    noPasteTitle: '没有待粘贴的项目',
    noPasteMessage: '请先在文件上长按选择“拷贝/移动”。',
    deleteTitle: '删除',
    deleteConfirm: (name: string) => `确定删除“${name}”吗？`,
    deleteConfirmLabel: '删除',
    fileInfoTitle: '文件信息',
    renameTitle: '重命名',
    renameConfirm: '重命名',
    newFolderTitle: '新建文件夹',
    newFileTitle: '新建文件名',
    introTitle: '简介',
    introMessage: (path: string, count: number) => `当前位置: ${path}\n包含 ${count} 项`,
    emptyFolder: '文件夹空',
    pasteLabel: '粘贴',
    addFolder: '新增文件夹',
    addFile: '新增文件',
    settings: '设置',
    exit: '关闭',
    copy: '拷贝',
    move: '移动',
    info: '显示简介',
    edit: '编辑',
    rename: '重新命名',
    duplicate: '复制',
    delete: '删除',
    itemsLabel: (n: number) => `${n} 项`,
    preferences: '偏好设置',
    done: '完成',
    listDisplay: '列表显示',
    showHidden: '显示隐藏文件',
    languageSection: '界面语言',
    languagePickerTitle: '请选择语言',
    languageEnglish: '英语',
    languageChinese: '中文',
    infoSectionTitle: '信息',
    fileTypeLabel: '种类',
    fileSizeLabel: '大小',
    fileCreatedLabel: '创建时间',
    fileModifiedLabel: '修改时间',
    fileLocationLabel: '位置',
    calculatingSize: '正在计算…'
  }
}

const detectLocale = (): Locale => {
  const code = Device.preferredLanguages?.[0] ?? 'zh'
  return code.startsWith('zh') ? 'zh' : 'en'
}

export function FileListScreen() {
  const [locale, setLocale] = useState<Locale>(detectLocale())
  const l10n = useMemo(() => translations[locale], [locale])
  const [tabIndex, setTabIndex] = useState(0)
  const [toolbarByTab, setToolbarByTab] = useState<Record<number, { leading: JSX.Element; trailing: JSX.Element }>>({})
  const [transfer, setTransfer] = useState<TransferState | null>(null)
  const [externalReloadPath, setExternalReloadPath] = useState<string | null>(null)
  const languageOptions = useMemo<LanguageOption[]>(
    () => [
      { value: 'en' as Locale, label: l10n.languageEnglish },
      { value: 'zh' as Locale, label: l10n.languageChinese }
    ],
    [l10n]
  )

  const handleToolbarChange = useCallback((index: number, leading: JSX.Element, trailing: JSX.Element) => {
    setToolbarByTab(prev => {
      const prevEntry = prev[index]
      if (prevEntry && prevEntry.leading === leading && prevEntry.trailing === trailing) {
        return prev
      }
      return { ...prev, [index]: { leading, trailing } }
    })
  }, [])

  const currentToolbar = toolbarByTab[tabIndex]

  const tabs = useMemo(
    () => [
      { title: l10n.documents, icon: 'folder.fill', path: FileManager.documentsDirectory },
      { title: l10n.appGroup, icon: 'externaldrive.fill', path: FileManager.appGroupDocumentsDirectory }
    ],
    [l10n]
  )

  return (
    <NavigationStack>
      <VStack
        frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}
        toolbar={currentToolbar ? { topBarLeading: currentToolbar.leading, topBarTrailing: currentToolbar.trailing } : undefined}
      >
        <TabView tabIndex={tabIndex} onTabIndexChanged={setTabIndex}>
          {tabs.map((tab, index) => (
            <DirectoryView
              key={tab.path}
              rootPath={tab.path}
              path={tab.path}
              rootDisplayName={tab.title}
              tag={index}
              tabItem={<Label title={tab.title} systemImage={tab.icon} />}
              onToolbarChange={handleToolbarChange}
              disableInternalToolbar
              transfer={transfer}
              setTransfer={setTransfer}
              externalReloadPath={externalReloadPath}
              requestExternalReload={setExternalReloadPath}
              l10n={l10n}
              locale={locale}
              onLocaleChange={setLocale}
              languageOptions={languageOptions}
            />
          ))}
        </TabView>
      </VStack>
    </NavigationStack>
  )
}
