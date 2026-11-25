import type { AppSettings, QualityLevel } from './settings'

/** shortcut: 按接口地址近似判断 Wi-Fi / 蜂窝，运行时提供活动网络路径 API 后替换。 */
export const currentQualityLevel = ({ qualityLevel, qualityLevelCellular }: Pick<AppSettings, 'qualityLevel' | 'qualityLevelCellular'>): QualityLevel => {
  try {
    const interfaces = Device.networkInterfaces()
    const connected = (pattern: RegExp) =>
      Object.entries(interfaces).some(
        ([name, addresses]) =>
          pattern.test(name) &&
          addresses.some(
            ({ address, isInternal }) =>
              !isInternal && address !== '0.0.0.0' && address !== '::' && !address.startsWith('169.254.') && !/^fe[89ab]/i.test(address)
          )
      )
    return connected(/^pdp_ip\d+$/) && !connected(/^en\d+$/) ? qualityLevelCellular : qualityLevel
  } catch (error) {
    console.warn('[ScriptLive] 读取网络接口失败，使用默认清晰度', error)
    return qualityLevel
  }
}
