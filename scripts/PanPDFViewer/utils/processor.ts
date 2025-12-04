import type { BaiduDiskClient, BaiduFile } from './baidu-client'
import { getShareInfo } from './baidu-client'

interface ShareData {
  shareid: number
  uk: number
  sekey: string
}

export const processDownload = async (client: BaiduDiskClient, files: BaiduFile[], shareData: ShareData, userAgent?: string) => {
  console.log('[processDownload] start', { fileCount: files.length })
  const fs_ids = files.map(f => f.fs_id)
  const transferDir = `/netdisk/${UUID.string()}`
  const errors: string[] = []
  const validFiles: any[] = []

  try {
    console.log('[processDownload] createDir', { transferDir })
    await client.createDir(transferDir)

    // 2. Transfer
    try {
      await client.transferFiles(fs_ids, shareData.shareid, shareData.uk, shareData.sekey, transferDir)
    } catch (e: any) {
      // Retry logic: clean root /netdisk and retry
      try {
        await client.deleteFiles(['/netdisk'])
        await client.createDir(transferDir)
        await client.transferFiles(fs_ids, shareData.shareid, shareData.uk, shareData.sekey, transferDir)
      } catch (retryErr: any) {
        throw new Error(`Transfer failed: ${retryErr.message}`)
      }
    }

    const localFiles: any[] = []
    await recursiveListFiles(client, transferDir, localFiles)
    console.log('[processDownload] recursiveListFiles done', { count: localFiles.length })
    if (localFiles.length === 0) throw new Error('No files found after transfer')

    const filesToProcess = localFiles.map(f => f.path)
    const pathInfoMap: Record<string, any> = {}

    localFiles.forEach(f => {
      let relative = f.path
      if (f.path.startsWith(transferDir)) relative = f.path.substring(transferDir.length + 1)
      pathInfoMap[f.path] = { size: f.size, filename: f.server_filename, relativePath: relative }
    })

    // 4. Rename to .pdf
    const newPaths: string[] = []
    for (const path of filesToProcess) {
      const info = pathInfoMap[path]
      if (info.size > 150 * 1024 * 1024) {
        // 150MB limit
        errors.push(`Skipped ${info.filename}: Size > 150MB`)
        continue
      }

      const newPath = path + '.pdf'
      try {
        const renamed = await client.renameFile(path, info.filename + '.pdf')
        if (renamed) {
          newPaths.push(newPath)
          pathInfoMap[newPath] = info
        } else {
          errors.push(`Rename failed for ${info.filename}`)
        }
      } catch (e: any) {
        errors.push(`Rename error for ${info.filename}: ${e.message}`)
      }
    }

    console.log(new Date())
    // 5. Wait for sync (simulated delay)
    await new Promise<void>(resolve => setTimeout(() => resolve(), 3000))
    console.log(new Date())

    const targetUA = userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
    console.log('[processDownload] targetUA', targetUA)
    console.log('[processDownload] will get links', { pathCount: newPaths.length })

    for (const path of newPaths) {
      const info = pathInfoMap[path]
      try {
        const dlink = await client.getSmallFileLink(path, targetUA)
        validFiles.push({
          path: path.slice(0, -4),
          dlink: dlink,
          size: info.size,
          filename: info.filename,
          relativePath: info.relativePath
        })
      } catch (e: any) {
        errors.push(`Failed to get link for ${info.filename}: ${e.message}`)
      }
    }

    setTimeout(() => {
      console.log('[processDownload] start cleanup', { transferDir })
      client.deleteFiles([transferDir]).catch(err => console.error('[processDownload] cleanup error', err))
    }, 30000)
  } catch (e) {
    console.error('[processDownload] error', e)
    client.deleteFiles([transferDir]).catch(() => {})
    throw e
  }

  console.log('[processDownload] finished', { validCount: validFiles.length, errorCount: errors.length })
  return { files: validFiles, errors }
}

async function recursiveListFiles(client: BaiduDiskClient, dirPath: string, resultList: any[]) {
  if (resultList.length > 500) return
  const items = await client.listFiles(dirPath)
  for (const item of items) {
    if (item.isdir == 1) {
      await recursiveListFiles(client, item.path, resultList)
    } else {
      resultList.push(item)
    }
  }
}
