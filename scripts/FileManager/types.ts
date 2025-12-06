export type Locale = 'en' | 'zh'

export type TransferState = {
  sourcePath: string
  isMove: boolean
}

export type LanguageOption = {
  value: Locale
  label: string
}

export type L10n = {
  documents: string
  appGroup: string
  failedRead: string
  fileNotFound: string
  previewFailed: string
  copiedToast: string
  moveToast: string
  noPasteTitle: string
  noPasteMessage: string
  deleteTitle: string
  deleteConfirm: (name: string) => string
  deleteConfirmLabel: string
  fileInfoTitle: string
  renameTitle: string
  renameConfirm: string
  newFolderTitle: string
  newFileTitle: string
  introTitle: string
  introMessage: (path: string, count: number) => string
  emptyFolder: string
  pasteLabel: string
  addFolder: string
  addFile: string
  settings: string
  exit: string
  copy: string
  move: string
  info: string
  edit: string
  rename: string
  duplicate: string
  delete: string
  itemsLabel: (count: number) => string
  preferences: string
  done: string
  listDisplay: string
  showHidden: string
  languageSection: string
  languagePickerTitle: string
  languageEnglish: string
  languageChinese: string
  infoSectionTitle: string
  fileTypeLabel: string
  fileSizeLabel: string
  fileCreatedLabel: string
  fileModifiedLabel: string
  fileLocationLabel: string
  calculatingSize: string
}

export type FileEntry = {
  name: string
  path: string
  isDir: boolean
  stat?: FileStat
}

export type DirectoryStateOptions = {
  path: string
  l10n: L10n
  externalReloadPath: string | null
  requestExternalReload: (path: string | null) => void
}

export type DirectoryState = {
  entries: FileEntry[]
  showHidden: boolean
  setShowHidden: (value: boolean) => void
  toastMessage: string
  setToastMessage: (value: string) => void
  toastShown: boolean
  setToastShown: (value: boolean) => void
  currentStat: FileStat | null
  triggerReload: () => void
}

export type DirectoryViewProps = {
  rootPath: string
  path: string
  rootDisplayName: string
  tag?: number
  tabItem?: JSX.Element
  onToolbarChange?: (index: number, leading: JSX.Element, trailing: JSX.Element) => void
  disableInternalToolbar?: boolean
  transfer: TransferState | null
  setTransfer: (value: TransferState | null) => void
  externalReloadPath: string | null
  requestExternalReload: (path: string | null) => void
  l10n: L10n
  locale: Locale
  onLocaleChange: (value: Locale) => void
  languageOptions: LanguageOption[]
}

export type PreferencesScreenProps = {
  showHidden: boolean
  onToggleHidden: (value: boolean) => void
  title: string
  doneLabel: string
  sectionTitle: string
  toggleLabel: string
  languageSectionTitle: string
  languagePickerTitle: string
  locale: Locale
  onLocaleChange: (value: Locale) => void
  languageOptions: LanguageOption[]
  onLanguageChanged?: () => void
}

export type DirectoryEmptyStateProps = {
  message: string
}

export type FileInfoViewProps = {
  name: string
  path: string
  stat: FileStat
  isDirectory: boolean
  sizeOverride?: number
  autoComputeSize?: boolean
  l10n: L10n
}

export type FileInfoPresenterOptions = {
  l10n: L10n
}

export type FileInfoRequest = {
  name: string
  path: string
  stat?: FileStat
  autoComputeSize?: boolean
}

export type MarkdownPreviewProps = {
  name: string
  content: string
  l10n: L10n
}

export type UseDirectoryEntriesOptions = {
  path: string
  l10n: L10n
  externalReloadPath: string | null
  requestExternalReload: (path: string | null) => void
  showHiddenDefault?: boolean
}

export type FileRowRendererConfig = {
  l10n: L10n
  handleOpenFile: (name: string) => void | Promise<void>
  handleCopy: (name: string) => void | Promise<void>
  handleMove: (name: string) => void | Promise<void>
  handleEdit?: (entry: FileEntry) => void | Promise<void>
  handleInfo: (name: string) => void | Promise<void>
  handleRename: (name: string) => void | Promise<void>
  handleDuplicate: (name: string) => void | Promise<void>
  handleDelete: (name: string) => void | Promise<void>
}

export type PreviewHandlersOptions = {
  currentPath: string
  l10n: L10n
  triggerReload: () => void
}

export type FileOperationsConfig = {
  currentPath: string
  transfer: TransferState | null
  setTransfer: (value: TransferState | null) => void
  requestExternalReload: (path: string | null) => void
  setToastMessage: (value: string) => void
  setToastShown: (value: boolean) => void
  l10n: L10n
  triggerReload: () => void
}

export type PreferencesSheetOptions = {
  showHidden: boolean
  setShowHidden: (value: boolean) => void
  l10n: L10n
  locale: Locale
  onLocaleChange: (value: Locale) => void
  languageOptions: LanguageOption[]
  onLanguageChanged?: () => void
}

export type DirectoryToolbarOptions = {
  currentDirName: string
  relativePath: string
  transfer: TransferState | null
  l10n: L10n
  handleCreateFolder: () => Promise<void>
  handleCreateFile: () => Promise<void>
  handlePaste: () => Promise<void>
  handlePreferences: () => void
  handleExit: () => void
  handleShowInfo: () => void | Promise<void>
}
