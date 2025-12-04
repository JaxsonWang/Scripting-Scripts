/**
 * 统一存储管理类
 */
export class UnifiedStorage {
  private storageName: string

  constructor(storageName: string) {
    this.storageName = storageName
  }

  private getStorageData(): Record<string, any> {
    try {
      return Storage.get<Record<string, any>>(this.storageName) || {}
    } catch (error) {
      console.error('获取存储数据失败:', error)
      return {}
    }
  }

  private setStorageData(data: Record<string, any>): void {
    try {
      Storage.set(this.storageName, data)
    } catch (error) {
      console.error('保存存储数据失败:', error)
    }
  }

  get<T = any>(key: string): T | undefined {
    const data = this.getStorageData()
    return data[key] as T
  }

  set(key: string, value: any): void {
    const data = this.getStorageData()
    data[key] = value
    this.setStorageData(data)
  }
}

export const storage = new UnifiedStorage('PanPDFViewerSettings')
