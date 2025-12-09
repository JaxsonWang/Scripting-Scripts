import scriptConfig from '../script.json'

/**
 * 获取当前本地版本号
 * @returns 当前本地版本号
 */
export const getCurrentVersion = (): string => {
  return scriptConfig.version
}
