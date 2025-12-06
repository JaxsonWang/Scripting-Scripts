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
  summary: string
  settings: string
  exit: string
  copy: string
  move: string
  info: string
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
}

export type FileEntry = {
  name: string
  path: string
  isDir: boolean
  stat?: FileStat
}
