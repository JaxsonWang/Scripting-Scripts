/**
 * 统一存储管理类
 * 通用的存储管理解决方案，可在任何小组件中使用
 *
 * 使用方法：
 * 1. 定义存储名称：const STORAGE_NAME = 'YourWidgetSettings'
 * 2. 创建实例：const storage = new UnifiedStorage(STORAGE_NAME)
 * 3. 使用各种方法进行存储操作
 */
export class UnifiedStorage {
  private storageName: string

  constructor(storageName: string) {
    this.storageName = storageName
  }

  /**
   * 获取完整的存储对象
   * @returns 完整的存储数据对象
   */
  private getStorageData(): Record<string, any> {
    try {
      return Storage.get<Record<string, any>>(this.storageName) || {}
    } catch (error) {
      console.error('获取存储数据失败:', error)
      return {}
    }
  }

  /**
   * 保存完整的存储对象
   * @param data 要保存的存储数据对象
   */
  private setStorageData(data: Record<string, any>): void {
    try {
      Storage.set(this.storageName, data)
    } catch (error) {
      console.error('保存存储数据失败:', error)
    }
  }

  /**
   * 获取指定键的值
   * @param key 存储键
   * @returns 存储的值
   */
  get<T = any>(key: string): T | undefined {
    const data = this.getStorageData()
    return data[key] as T
  }

  /**
   * 设置指定键的值
   * @param key 存储键
   * @param value 要存储的值
   */
  set(key: string, value: any): void {
    const data = this.getStorageData()
    data[key] = value
    this.setStorageData(data)
  }

  /**
   * 删除指定键
   * @param key 存储键
   */
  remove(key: string): void {
    const data = this.getStorageData()
    delete data[key]
    this.setStorageData(data)
  }

  /**
   * 清空所有存储数据
   */
  clear(): void {
    this.setStorageData({})
  }

  /**
   * 获取所有存储的键
   * @returns 所有存储键的数组
   */
  getAllKeys(): string[] {
    const data = this.getStorageData()
    return Object.keys(data)
  }

  /**
   * 获取完整的存储数据（用于调试或导出）
   * @returns 完整的存储数据对象
   */
  getAllData(): Record<string, any> {
    return this.getStorageData()
  }

  /**
   * 批量设置多个键值对
   * @param updates 要更新的键值对对象
   */
  batchSet(updates: Record<string, any>): void {
    const data = this.getStorageData()
    Object.assign(data, updates)
    this.setStorageData(data)
  }

  /**
   * 检查指定键是否存在
   * @param key 存储键
   * @returns 是否存在该键
   */
  has(key: string): boolean {
    const data = this.getStorageData()
    return key in data
  }

  /**
   * 导出存储配置（用于备份或迁移）
   * @returns JSON格式的存储配置字符串
   */
  exportConfig(): string {
    const data = this.getStorageData()
    return JSON.stringify(data, null, 2)
  }

  /**
   * 导入存储配置（用于恢复或迁移）
   * @param configJson JSON格式的存储配置字符串
   * @param confirm 确认导入，防止误操作
   */
  importConfig(configJson: string, confirm: boolean = false): boolean {
    if (!confirm) {
      console.log('请传入 confirm: true 参数以确认导入存储配置')
      return false
    }

    try {
      const config = JSON.parse(configJson)
      this.clear() // 清空现有数据
      this.batchSet(config) // 导入新数据
      console.log('存储配置导入成功')
      return true
    } catch (error) {
      console.error('存储配置导入失败:', error)
      return false
    }
  }

  /**
   * 获取存储名称
   * @returns 当前使用的存储名称
   */
  getStorageName(): string {
    return this.storageName
  }
}

/**
 * 存储管理工具函数
 * 基于 UnifiedStorage 实例提供便捷的管理功能
 */
export class StorageManager {
  public storage: UnifiedStorage

  constructor(storage: UnifiedStorage) {
    this.storage = storage
  }

  /**
   * 获取所有存储数据（用于调试或数据导出）
   * @returns 完整的存储数据对象
   */
  getAllStorageData(): Record<string, any> {
    return this.storage.getAllData()
  }

  /**
   * 获取所有存储键
   * @returns 所有存储键的数组
   */
  getAllStorageKeys(): string[] {
    return this.storage.getAllKeys()
  }

  /**
   * 清空所有存储数据
   * @param confirm 确认清空，防止误操作
   */
  clearAllStorageData(confirm: boolean = false): void {
    if (!confirm) {
      console.error('请传入 confirm: true 参数以确认清空所有存储数据')
      return
    }
    this.storage.clear()
    console.log('已清空所有存储数据')
  }

  /**
   * 批量更新存储数据
   * @param updates 要更新的键值对对象
   */
  batchUpdateStorage(updates: Record<string, any>): void {
    this.storage.batchSet(updates)
  }

  /**
   * 检查指定存储键是否存在
   * @param key 存储键
   * @returns 是否存在该键
   */
  hasStorageKey(key: string): boolean {
    return this.storage.has(key)
  }

  /**
   * 删除指定存储键
   * @param key 存储键
   */
  removeStorageKey(key: string): void {
    this.storage.remove(key)
  }

  /**
   * 导出存储配置（用于备份或迁移）
   * @returns JSON格式的存储配置字符串
   */
  exportStorageConfig(): string {
    return this.storage.exportConfig()
  }

  /**
   * 导入存储配置（用于恢复或迁移）
   * @param configJson JSON格式的存储配置字符串
   * @param confirm 确认导入，防止误操作
   */
  importStorageConfig(configJson: string, confirm: boolean = false): boolean {
    return this.storage.importConfig(configJson, confirm)
  }
}

/**
 * 创建统一存储实例的工厂函数
 * @param storageName 存储名称
 * @returns UnifiedStorage 实例
 */
export const createUnifiedStorage = (storageName: string): UnifiedStorage => {
  return new UnifiedStorage(storageName)
}

/**
 * 创建存储管理器的工厂函数
 * @param storageName 存储名称
 * @returns StorageManager 实例
 */
export const createStorageManager = (storageName: string): StorageManager => {
  const storage = new UnifiedStorage(storageName)
  return new StorageManager(storage)
}
