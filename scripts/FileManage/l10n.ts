export type Locale = 'en' | 'zh'

export type L10n = {
  actions: string
  alreadyExistsTitle: string
  cancelCopyMove: string
  cancelLabel: string
  copy: string
  createFileAction: string
  createFileDefaultName: string
  createFileTitle: string
  createFolderAction: string
  createFolderPlaceholder: string
  createFolderTitle: string
  currentDirectory: string
  delete: string
  deleteConfirm: (name: string) => string
  deleteConfirmLabel: string
  deleteTitle: string
  directoryEmpty: string
  entries: string
  fileNotFoundTitle: string
  iCloudDisabledMessage: string
  iCloudDownloadFailed: string
  invalidNameMessage: string
  invalidNameTitle: string
  itemCount: (count: number) => string
  loadMoreHint: string
  loading: string
  move: string
  noActiveTaskMessage: string
  noActiveTaskTitle: string
  noMatchingEntries: string
  openFolder: string
  operationFailedTitle: string
  previewFailedTitle: string
  previewFile: string
  readFailedTitle: string
  refreshAction: string
  rename: string
  renameConfirm: string
  renameTitle: string
  searchPrompt: string
  sourceMissingTitle: string
  tabAppGroup: string
  tabDocuments: string
  tabICloud: string
  tabTemporary: string
  showingItems: (shown: number, total: number) => string
  unavailable: string
  untitledName: string
}

const l10nEN: L10n = {
  actions: 'Actions',
  alreadyExistsTitle: 'Already Exists',
  cancelCopyMove: 'Cancel Copy/Move',
  cancelLabel: 'Cancel',
  copy: 'Copy',
  createFileAction: 'Create File',
  createFileDefaultName: 'untitled.txt',
  createFileTitle: 'Create File',
  createFolderAction: 'Create Folder',
  createFolderPlaceholder: 'New Folder',
  createFolderTitle: 'Create Folder',
  currentDirectory: 'Current Directory',
  delete: 'Delete',
  deleteConfirm: (name: string) => `Delete "${name}" permanently?`,
  deleteConfirmLabel: 'Delete',
  deleteTitle: 'Delete',
  directoryEmpty: 'Directory is empty.',
  entries: 'Entries',
  fileNotFoundTitle: 'File Not Found',
  iCloudDisabledMessage: 'iCloud is not enabled. Please enable iCloud for Scripting first.',
  iCloudDownloadFailed: 'Failed to download iCloud file.',
  invalidNameMessage: 'File or folder name cannot contain "/".',
  invalidNameTitle: 'Invalid Name',
  itemCount: (count: number) => `${count} item(s)`,
  loadMoreHint: 'Scroll down to auto load more',
  loading: 'Loading...',
  move: 'Move',
  noActiveTaskMessage: 'Copy or move an item first.',
  noActiveTaskTitle: 'No Active Task',
  noMatchingEntries: 'No matching entries.',
  openFolder: 'Open Folder',
  operationFailedTitle: 'Operation Failed',
  previewFailedTitle: 'Preview Failed',
  previewFile: 'Preview File',
  readFailedTitle: 'Read Failed',
  refreshAction: 'Refresh',
  rename: 'Rename',
  renameConfirm: 'Rename',
  renameTitle: 'Rename',
  searchPrompt: 'Search files',
  sourceMissingTitle: 'Source Missing',
  tabAppGroup: 'App Group',
  tabDocuments: 'Documents',
  tabICloud: 'iCloud',
  tabTemporary: 'Temporary',
  showingItems: (shown: number, total: number) => `Showing ${shown} / ${total}`,
  unavailable: 'Unavailable',
  untitledName: 'untitled'
}

const l10nZH: L10n = {
  actions: '操作',
  alreadyExistsTitle: '已存在',
  cancelCopyMove: '取消拷贝/移动',
  cancelLabel: '取消',
  copy: '拷贝',
  createFileAction: '新建文件',
  createFileDefaultName: '未命名.txt',
  createFileTitle: '新建文件',
  createFolderAction: '新建文件夹',
  createFolderPlaceholder: '新建文件夹',
  createFolderTitle: '新建文件夹',
  currentDirectory: '当前目录',
  delete: '删除',
  deleteConfirm: (name: string) => `确认永久删除“${name}”吗？`,
  deleteConfirmLabel: '删除',
  deleteTitle: '删除',
  directoryEmpty: '目录为空。',
  entries: '目录内容',
  fileNotFoundTitle: '文件不存在',
  iCloudDisabledMessage: 'iCloud 未启用，请先在 Scripting 中启用 iCloud。',
  iCloudDownloadFailed: '下载 iCloud 文件失败。',
  invalidNameMessage: '文件或文件夹名称不能包含 "/"。',
  invalidNameTitle: '名称无效',
  itemCount: (count: number) => `${count} 项`,
  loadMoreHint: '下滑到底自动加载更多',
  loading: '加载中...',
  move: '移动',
  noActiveTaskMessage: '请先选择拷贝或移动项目。',
  noActiveTaskTitle: '无可执行任务',
  noMatchingEntries: '没有匹配项。',
  openFolder: '打开文件夹',
  operationFailedTitle: '操作失败',
  previewFailedTitle: '预览失败',
  previewFile: '预览文件',
  readFailedTitle: '读取失败',
  refreshAction: '刷新',
  rename: '重命名',
  renameConfirm: '重命名',
  renameTitle: '重命名',
  searchPrompt: '搜索文件',
  sourceMissingTitle: '源文件不存在',
  tabAppGroup: 'App Group',
  tabDocuments: 'Documents',
  tabICloud: 'iCloud',
  tabTemporary: 'Temporary',
  showingItems: (shown: number, total: number) => `已显示 ${shown} / ${total}`,
  unavailable: '不可用',
  untitledName: '未命名'
}

const L10N_MAP: Record<Locale, L10n> = {
  en: l10nEN,
  zh: l10nZH
}

export const getL10n = (locale: Locale): L10n => L10N_MAP[locale] ?? l10nEN
