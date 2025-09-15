import { Path, fetch } from 'scripting'
import { createStorageManager } from './storage'

// 图片缓存存储管理
const CACHE_STORAGE_NAME = 'ScriptPie.ImageCache'
const cacheStorageManager = createStorageManager(CACHE_STORAGE_NAME)

// 存储键
const CACHE_STORAGE_KEYS = {
  IMAGE_METADATA: 'imageMetadata' // 存储图片元数据（URL、本地路径、缓存时间等）
}

// 图片缓存元数据接口
interface ImageCacheMetadata {
  url: string
  localPath: string
  cachedAt: number
  fileSize: number
  mimeType: string
  etag?: string // HTTP ETag，用于缓存验证
}

// 缓存配置
const CACHE_CONFIG = {
  cacheDirectory: FileManager.appGroupDocumentsDirectory + '/ImageCache', // 缓存目录
  maxCacheSize: 50 * 1024 * 1024, // 最大缓存大小：50MB
  cleanupThreshold: 0.8 // 当缓存使用率超过80%时进行清理
}

/**
 * 图片缓存管理器
 */
export class ImageCacheManager {
  private static readonly CACHE_EXPIRE_DAYS = 7 // 缓存过期天数

  /**
   * 获取缓存目录路径
   */
  private static getCacheDirectory(): string {
    return CACHE_CONFIG.cacheDirectory
  }

  /**
   * 生成缓存文件名
   */
  private static generateCacheFileName(url: string): string {
    // 使用URL的hash作为文件名，避免特殊字符
    const hash = url.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0)
      return a & a
    }, 0)

    // 获取文件扩展名
    const urlParts = url.split('.')
    const extension = urlParts.length > 1 ? urlParts[urlParts.length - 1].split('?')[0] : 'jpg'

    return `${Math.abs(hash)}.${extension}`
  }

  /**
   * 获取缓存的图片路径
   */
  static async getCachedImagePath(imageUrl: string): Promise<string | null> {
    try {
      const fileName = ImageCacheManager.generateCacheFileName(imageUrl)
      const cacheDir = ImageCacheManager.getCacheDirectory()
      const filePath = Path.join(cacheDir, fileName)

      // 检查文件是否存在
      try {
        await FileManager.stat(filePath)
        // 检查缓存是否过期
        const cacheInfo = cacheStorageManager.storage.get<any>(`cache_${fileName}`)
        if (cacheInfo) {
          const cacheTime = new Date(cacheInfo.timestamp)
          const now = new Date()
          const daysDiff = (now.getTime() - cacheTime.getTime()) / (1000 * 60 * 60 * 24)

          if (daysDiff < ImageCacheManager.CACHE_EXPIRE_DAYS) {
            console.log(`使用缓存图片: ${fileName}`)
            return filePath
          } else {
            // 缓存过期，删除文件
            await FileManager.remove(filePath)
            cacheStorageManager.storage.remove(`cache_${fileName}`)
          }
        }
      } catch {
        // 文件不存在，继续下载
      }

      // 下载并缓存图片
      return await ImageCacheManager.downloadAndCacheImage(imageUrl, fileName)
    } catch (error) {
      console.error('获取缓存图片失败:', error)
      return null
    }
  }

  /**
   * 下载并缓存图片
   */
  private static async downloadAndCacheImage(imageUrl: string, fileName: string): Promise<string | null> {
    try {
      // console.log(`下载图片: ${imageUrl}`)

      const response = await fetch(imageUrl)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const imageData = await response.arrayBuffer()
      const cacheDir = ImageCacheManager.getCacheDirectory()

      // 确保缓存目录存在
      await FileManager.createDirectory(cacheDir, true)

      const filePath = Path.join(cacheDir, fileName)

      // 写入文件
      await FileManager.writeAsBytes(filePath, new Uint8Array(imageData))

      // 保存缓存信息
      const cacheInfo = {
        url: imageUrl,
        timestamp: new Date().toISOString(),
        fileName: fileName
      }
      cacheStorageManager.storage.set(`cache_${fileName}`, cacheInfo)

      console.log(`图片缓存成功: ${fileName}`)

      // 清理过期缓存
      ImageCacheManager.cleanExpiredCache()

      return filePath
    } catch (error) {
      console.error('下载并缓存图片失败:', error)
      return null
    }
  }

  /**
   * 清理过期缓存
   */
  private static cleanExpiredCache(): void {
    try {
      // Storage没有allKeys方法，这里简化处理
      console.log('缓存清理功能暂不可用')
    } catch (error) {
      console.error('清理缓存失败:', error)
    }
  }

  /**
   * 清空所有缓存
   */
  static async clearAllCache(): Promise<void> {
    try {
      const cacheDir = ImageCacheManager.getCacheDirectory()
      try {
        await FileManager.stat(cacheDir)
        await FileManager.remove(cacheDir)
      } catch {
        // 目录不存在，忽略
      }
      cacheStorageManager.clearAllStorageData(true)
      console.log('所有图片缓存已清空')
    } catch (error) {
      console.error('清空缓存失败:', error)
    }
  }
}
