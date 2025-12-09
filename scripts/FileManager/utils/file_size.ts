/**
/**
 * 递归计算目录大小
 * @param dirPath 目录路径
 */
export const computeDirectorySize = async (dirPath: string): Promise<number> => {
  let total = 0
  let entries: string[] = []
  try {
    entries = await FileManager.readDirectory(dirPath, true)
  } catch (error) {
    console.error('[computeDirectorySize] readDirectory failed', dirPath, error)
    return total
  }

  for (const entry of entries) {
    const fullPath = dirPath + '/' + entry
    try {
      const isDir = FileManager.isDirectorySync(fullPath)
      if (isDir) {
        total += await computeDirectorySize(fullPath)
      } else {
        const stat = await FileManager.stat(fullPath)
        total += stat.size
      }
    } catch (error) {
      console.error('[computeDirectorySize] failed for', fullPath, error)
    }
  }

  return total
}
