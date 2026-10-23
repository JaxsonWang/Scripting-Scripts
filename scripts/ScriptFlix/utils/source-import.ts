import type { ApiSource } from '../types'

export type SourceImport = {
  sources: ApiSource[]
  /** 文件指定的当前源下标；缺省或旧备份中的 null 为 null */
  currentSourceIndex: number | null
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * 解析导入的视频源 JSON，格式与 iCloud 备份 settings.json 相同。
 * 只读取 sources 与 currentSourceIndex，history 等其余字段不参与导入。
 */
export const parseSourceImport = (text: string): SourceImport => {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('文件不是有效的 JSON，请选择 ScriptFlix 的 settings.json 备份')
  }

  if (!isRecord(data) || !Array.isArray(data.sources)) {
    throw new Error('文件缺少 sources 视频源数组，请使用与 iCloud 同步相同的 JSON 格式')
  }

  // 与手动添加源一致：名称和地址去掉首尾空格后保存
  const sources = data.sources.map((item: unknown, index: number): ApiSource => {
    const name = isRecord(item) && typeof item.name === 'string' ? item.name.trim() : ''
    const url = isRecord(item) && typeof item.url === 'string' ? item.url.trim() : ''
    const disabled = isRecord(item) ? item.disabled : undefined
    if (!name || !url || (disabled !== undefined && typeof disabled !== 'boolean')) {
      throw new Error(`第 ${index + 1} 个视频源格式错误：name 和 url 必须为非空字符串，disabled 可省略或填写布尔值`)
    }
    return disabled ? { name, url, disabled: true } : { name, url }
  })

  const index = data.currentSourceIndex
  if (index != null && (typeof index !== 'number' || !Number.isInteger(index) || index < 0)) {
    throw new Error('currentSourceIndex 必须为从 0 开始的整数下标')
  }

  return { sources, currentSourceIndex: typeof index === 'number' ? index : null }
}
