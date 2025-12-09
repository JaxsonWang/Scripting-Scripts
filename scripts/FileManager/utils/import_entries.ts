import { Path } from 'scripting'
import type { FileEntry } from '../types'

/**
 * 递归复制目录下所有内容
 * @param sourceDir 原目录路径
 * @param targetDir 目标目录路径
 */
const copyDirectoryRecursive = async (sourceDir: string, targetDir: string): Promise<void> => {
  await FileManager.createDirectory(targetDir, true)
  const children = await FileManager.readDirectory(sourceDir)
  for (const child of children) {
    const sourceChild = Path.join(sourceDir, child)
    const targetChild = Path.join(targetDir, child)
    if (FileManager.isDirectorySync(sourceChild)) {
      await copyDirectoryRecursive(sourceChild, targetChild)
    } else {
      await FileManager.copyFile(sourceChild, targetChild)
    }
  }
}

export type ImportEntriesOptions = {
  sources: string[]
  ensureUniqueName: (baseName: string) => string
  buildTargetPath: (name: string) => string
  buildPlaceholderEntry: (name: string, targetPath: string, sourcePath: string) => FileEntry
  softInsertEntry: (entry: FileEntry) => void
}

/**
 * 将外部路径导入到当前目录，返回成功数量
 * @param options 导入配置
 */
export const importEntries = async ({
  sources,
  ensureUniqueName,
  buildTargetPath,
  buildPlaceholderEntry,
  softInsertEntry
}: ImportEntriesOptions): Promise<number> => {
  let count = 0
  for (const sourcePath of sources) {
    const baseName = Path.basename(sourcePath) || 'imported'
    const targetName = ensureUniqueName(baseName)
    const targetPath = buildTargetPath(targetName)
    const placeholder = buildPlaceholderEntry(targetName, targetPath, sourcePath)
    softInsertEntry(placeholder)
    if (FileManager.isDirectorySync(sourcePath)) {
      await copyDirectoryRecursive(sourcePath, targetPath)
    } else {
      await FileManager.copyFile(sourcePath, targetPath)
    }
    count += 1
  }
  return count
}
