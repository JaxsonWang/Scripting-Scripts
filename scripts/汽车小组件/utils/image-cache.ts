import { fetch } from 'scripting'
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
 * 图片缓存管理类
 */
export class ImageCacheManager {
  /**
   * 初始化缓存目录
   */
  private static async initCacheDirectory(): Promise<void> {
    try {
      await FileManager.createDirectory(CACHE_CONFIG.cacheDirectory, true)
    } catch (error) {
      console.error('创建缓存目录失败:', error)
    }
  }

  /**
   * 获取图片缓存元数据
   */
  private static getImageMetadata(): Record<string, ImageCacheMetadata> {
    return cacheStorageManager.storage.get<Record<string, ImageCacheMetadata>>(CACHE_STORAGE_KEYS.IMAGE_METADATA) || {}
  }

  /**
   * 保存图片缓存元数据
   */
  private static saveImageMetadata(metadata: Record<string, ImageCacheMetadata>): void {
    cacheStorageManager.storage.set(CACHE_STORAGE_KEYS.IMAGE_METADATA, metadata)
  }

  /**
   * 生成缓存文件名
   */
  private static generateCacheFileName(url: string): string {
    // 使用URL的hash作为文件名，避免特殊字符问题
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
   * 检查缓存是否有效（基于URL匹配，不再使用时间过期）
   */
  private static isCacheValid(metadata: ImageCacheMetadata, currentUrl: string): boolean {
    return metadata.url === currentUrl
  }

  /**
   * 获取缓存大小
   */
  private static async getCacheSize(): Promise<number> {
    try {
      const metadata = this.getImageMetadata()
      return Object.values(metadata).reduce((total, item) => total + item.fileSize, 0)
    } catch (error) {
      console.error('获取缓存大小失败:', error)
      return 0
    }
  }

  /**
   * 清理无效缓存（文件不存在的缓存记录）
   */
  private static async cleanupInvalidCache(): Promise<void> {
    try {
      const metadata = this.getImageMetadata()
      const updatedMetadata: Record<string, ImageCacheMetadata> = {}

      for (const [key, item] of Object.entries(metadata)) {
        // 检查文件是否仍然存在
        try {
          await FileManager.stat(item.localPath)
          updatedMetadata[key] = item
        } catch {
          // 文件不存在，从元数据中移除
          console.log('清理不存在的缓存文件记录:', item.localPath)
        }
      }

      this.saveImageMetadata(updatedMetadata)
    } catch (error) {
      console.error('清理无效缓存失败:', error)
    }
  }

  /**
   * 清理最旧的缓存文件（当缓存空间不足时）
   */
  private static async cleanupOldestCache(targetSize: number): Promise<void> {
    try {
      const metadata = this.getImageMetadata()
      const sortedItems = Object.entries(metadata).sort(([, a], [, b]) => a.cachedAt - b.cachedAt)

      let currentSize = await this.getCacheSize()
      const updatedMetadata = { ...metadata }

      for (const [key, item] of sortedItems) {
        if (currentSize <= targetSize) break

        try {
          await FileManager.remove(item.localPath)
          delete updatedMetadata[key]
          currentSize -= item.fileSize
          console.log('清理最旧缓存:', item.localPath)
        } catch (error) {
          console.error('删除缓存文件失败:', error)
        }
      }

      this.saveImageMetadata(updatedMetadata)
    } catch (error) {
      console.error('清理最旧缓存失败:', error)
    }
  }

  /**
   * 下载并缓存图片
   */
  private static async downloadAndCacheImage(url: string, localPath: string): Promise<ImageCacheMetadata | null> {
    try {
      console.log('开始下载图片:', url)

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const imageData = await response.arrayBuffer()
      const uint8Array = new Uint8Array(imageData)

      // 保存图片到本地
      await FileManager.writeAsBytes(localPath, uint8Array)

      // 获取文件信息
      const stat = await FileManager.stat(localPath)
      const mimeType = FileManager.mimeType(localPath)
      const etag = response.headers.get('etag') || undefined

      const metadata: ImageCacheMetadata = {
        url,
        localPath,
        cachedAt: Date.now(),
        fileSize: stat.size,
        mimeType,
        etag
      }

      console.log('图片下载并缓存成功:', localPath)
      return metadata
    } catch (error) {
      console.error('下载图片失败:', error)
      return null
    }
  }

  /**
   * 保存 UIImage 到缓存目录
   */
  static async saveUIImageToCache(uiImage: any, fileName: string): Promise<string | null> {
    try {
      // 初始化缓存目录
      await this.initCacheDirectory()

      const localPath = CACHE_CONFIG.cacheDirectory + '/' + fileName

      // 根据文件扩展名选择合适的编码格式
      let imageData: any = null
      const fileExtension = fileName.toLowerCase().split('.').pop()

      if (fileExtension === 'png') {
        // PNG 格式保持无损
        imageData = Data.fromPNG(uiImage)
        console.log('使用 PNG 格式保存图片')
      } else {
        // 其他格式使用 JPEG（包括 jpg, jpeg 等）
        imageData = Data.fromJPEG(uiImage)
        console.log('使用 JPEG 格式保存图片')
      }

      if (imageData) {
        await FileManager.writeAsData(localPath, imageData)
        console.log('UIImage 已保存到缓存:', localPath)
        return localPath
      } else {
        console.error('无法将 UIImage 转换为图片数据')
        return null
      }
    } catch (error) {
      console.error('保存 UIImage 失败:', error)
      return null
    }
  }

  /**
   * 获取缓存的图片路径，如果URL变化或不存在则下载并缓存
   */
  static async getCachedImagePath(url: string): Promise<string | null> {
    if (!url) return null

    try {
      // 初始化缓存目录
      await this.initCacheDirectory()

      // 清理无效缓存
      await this.cleanupInvalidCache()

      const metadata = this.getImageMetadata()
      const cacheKey = url
      const cachedItem = metadata[cacheKey]

      // 检查是否有有效缓存（URL匹配且文件存在）
      if (cachedItem && this.isCacheValid(cachedItem, url)) {
        try {
          // 验证文件是否存在
          await FileManager.stat(cachedItem.localPath)
          console.log('使用缓存图片:', cachedItem.localPath)
          return cachedItem.localPath
        } catch {
          // 文件不存在，从元数据中移除
          delete metadata[cacheKey]
          this.saveImageMetadata(metadata)
        }
      } else if (cachedItem && !this.isCacheValid(cachedItem, url)) {
        // URL已变化，删除旧缓存
        console.log('URL已变化，删除旧缓存:', cachedItem.localPath)
        try {
          await FileManager.remove(cachedItem.localPath)
        } catch (error) {
          console.error('删除旧缓存失败:', error)
        }
        delete metadata[cacheKey]
        this.saveImageMetadata(metadata)
      }

      // 检查缓存空间
      const currentCacheSize = await this.getCacheSize()
      if (currentCacheSize > CACHE_CONFIG.maxCacheSize * CACHE_CONFIG.cleanupThreshold) {
        await this.cleanupOldestCache(CACHE_CONFIG.maxCacheSize * 0.5) // 清理到50%
      }

      // 下载并缓存新图片
      const fileName = this.generateCacheFileName(url)
      const localPath = CACHE_CONFIG.cacheDirectory + '/' + fileName

      const newMetadata = await this.downloadAndCacheImage(url, localPath)
      if (newMetadata) {
        metadata[cacheKey] = newMetadata
        this.saveImageMetadata(metadata)
        return localPath
      }

      return null
    } catch (error) {
      console.error('获取缓存图片失败:', error)
      return null
    }
  }

  /**
   * 清空所有缓存
   */
  static async clearAllCache(): Promise<void> {
    try {
      const metadata = this.getImageMetadata()

      // 删除所有缓存文件
      for (const item of Object.values(metadata)) {
        try {
          await FileManager.remove(item.localPath)
        } catch (error) {
          console.error('删除缓存文件失败:', error)
        }
      }

      // 清空元数据
      this.saveImageMetadata({})

      console.log('已清空所有图片缓存')
    } catch (error) {
      console.error('清空缓存失败:', error)
    }
  }

  /**
   * 获取缓存统计信息
   */
  static async getCacheStats(): Promise<{
    totalFiles: number
    totalSize: number
    oldestCache: number
    newestCache: number
  }> {
    try {
      const metadata = this.getImageMetadata()
      const items = Object.values(metadata)

      if (items.length === 0) {
        return { totalFiles: 0, totalSize: 0, oldestCache: 0, newestCache: 0 }
      }

      const totalFiles = items.length
      const totalSize = items.reduce((sum, item) => sum + item.fileSize, 0)
      const cacheTimes = items.map(item => item.cachedAt)
      const oldestCache = Math.min(...cacheTimes)
      const newestCache = Math.max(...cacheTimes)

      return { totalFiles, totalSize, oldestCache, newestCache }
    } catch (error) {
      console.error('获取缓存统计失败:', error)
      return { totalFiles: 0, totalSize: 0, oldestCache: 0, newestCache: 0 }
    }
  }
}
