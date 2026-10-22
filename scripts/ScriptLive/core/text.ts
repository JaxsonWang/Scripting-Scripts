/** 常见命名实体；其余按数字实体解析 */
const NAMED: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" }

/**
 * 把站点接口里残留的 HTML 实体（如斗鱼标题中的 `&nbsp;`）还原为普通文字。
 * @param value 接口原文
 */
export const decodeEntities = (value: unknown): string =>
  String(value ?? '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    const lower = entity.toLowerCase()
    if (lower in NAMED) return NAMED[lower]
    if (lower.startsWith('#x')) return String.fromCodePoint(parseInt(lower.slice(2), 16))
    if (lower.startsWith('#')) return String.fromCodePoint(Number(lower.slice(1)))
    return match
  })
