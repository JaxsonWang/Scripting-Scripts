import type { L10n } from './l10n'

export type RootId = 'appGroup' | 'documents' | 'iCloud' | 'temporary'

export type RootConfig = {
  icon: string
  id: RootId
  path: string | null
  title: string
}

export type FileEntry = {
  isDirectory: boolean
  name: string
  path: string
}

export type TransferState = {
  isMove: boolean
  sourcePath: string
} | null

export type NavigationPathState = {
  setValue: (value: string[]) => void
  value: string[]
}

export type DirectoryPageProps = {
  currentPath: string
  l10n: L10n
  navigationPath: NavigationPathState
  rootPath: string
  rootTitle: string
  setTransfer: (value: TransferState) => void
  transfer: TransferState
}

export type EntryRowProps = {
  entry: FileEntry
  l10n: L10n
  onCopy: (entry: FileEntry) => void
  onDelete: (entry: FileEntry) => void
  onMove: (entry: FileEntry) => void
  onOpenDirectory: (path: string) => void
  onPreviewFile: (path: string) => void
  onRename: (entry: FileEntry) => void
}

export type RootTabProps = {
  l10n: L10n
  root: RootConfig
  setTransfer: (value: TransferState) => void
  tabIndex: number
  transfer: TransferState
}
