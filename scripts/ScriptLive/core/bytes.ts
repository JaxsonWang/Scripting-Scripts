/**
 * 二进制与编码工具：UTF-8、Base64、MD5、解压，以及弹幕协议常用的大端读写。
 * MD5 与解压走 Scripting 原生 Crypto / Data；Data.decompressed(zlib) 处理的是不带头的 raw DEFLATE，
 * 所以 zlib 与 gzip 数据先剥掉各自的头部再交给原生解压。
 */

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export const utf8Encode = (text: string): Uint8Array => encoder.encode(text)
export const utf8Decode = (bytes: Uint8Array): string => decoder.decode(bytes)

export const toData = (bytes: Uint8Array): Data => {
  const data = Data.fromUint8Array(bytes)
  if (!data) throw new Error('无法创建空的二进制数据')
  return data
}

export const fromData = (data: Data): Uint8Array => data.toUint8Array() ?? new Uint8Array(0)

export const md5Hex = (text: string): string => Crypto.md5(toData(utf8Encode(text))).toHexString()

export const base64Encode = (bytes: Uint8Array): string => toData(bytes).toBase64String()

export const base64Decode = (text: string): Uint8Array => {
  const data = Data.fromBase64String(text)
  if (!data) throw new Error('Base64 解码失败')
  return fromData(data)
}

export const base64DecodeText = (text: string): string => utf8Decode(base64Decode(text))

/** 解压 raw DEFLATE 数据 */
export const inflateRaw = (bytes: Uint8Array): Uint8Array => fromData(toData(bytes).decompressed(CompressionAlgorithm.zlib))

/** 解压带 2 字节头、4 字节 Adler-32 尾的 zlib 数据 */
export const inflateZlib = (bytes: Uint8Array): Uint8Array => inflateRaw(bytes.subarray(2, bytes.length - 4))

/** 解压 gzip 数据（RFC 1952），跳过可选的扩展、文件名、注释与头校验字段 */
export const gunzip = (bytes: Uint8Array): Uint8Array => {
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) throw new Error('不是有效的 gzip 数据')
  const flags = bytes[3]
  let offset = 10
  if (flags & 0x04) offset += 2 + (bytes[offset] | (bytes[offset + 1] << 8))
  if (flags & 0x08) while (bytes[offset++] !== 0);
  if (flags & 0x10) while (bytes[offset++] !== 0);
  if (flags & 0x02) offset += 2
  return inflateRaw(bytes.subarray(offset, bytes.length - 8))
}

export const concatBytes = (parts: Uint8Array[]): Uint8Array => {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

/** WebSocket 收到的消息统一转成字节 */
export const messageBytes = (message: string | Data): Uint8Array => (typeof message === 'string' ? utf8Encode(message) : fromData(message))

export const randomInt = (maxExclusive: number): number => Math.floor(Math.random() * maxExclusive)

export const randomString = (length: number, alphabet = '0123456789abcdefghijklmnopqrstuvwxyz'): string =>
  Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join('')
