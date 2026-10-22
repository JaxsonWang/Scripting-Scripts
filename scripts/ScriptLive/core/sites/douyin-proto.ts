/** 抖音弹幕所需的 protobuf 子集；字段号来自上游 douyin.proto（GPL-3.0）。 */
import { concatBytes, utf8Decode, utf8Encode } from '../bytes'

type Field = { id: number; value: bigint | Uint8Array }

/** 64 位整数保留为 bigint，避免房间号、日志号被浮点数截断。 */
export function decodeFields(bytes: Uint8Array): Field[] {
  let offset = 0
  function varint(): bigint {
    let value = 0n
    for (let shift = 0n; shift < 70n; shift += 7n) {
      if (offset >= bytes.length) throw new Error('抖音 protobuf 数据被截断')
      const byte = bytes[offset++]
      value |= BigInt(byte & 127) << shift
      if (!(byte & 128)) return value
    }
    throw new Error('抖音 protobuf varint 超过 64 位')
  }
  const fields: Field[] = []
  while (offset < bytes.length) {
    const tag = Number(varint())
    const id = tag >>> 3
    const wire = tag & 7
    if (!id) throw new Error('抖音 protobuf 字段号无效')
    if (wire === 0) fields.push({ id, value: varint() })
    else if (wire === 2) {
      const length = Number(varint())
      if (length > bytes.length - offset) throw new Error('抖音 protobuf 字段长度越界')
      fields.push({ id, value: bytes.subarray(offset, offset + length) })
      offset += length
    } else if (wire === 1 || wire === 5) {
      offset += wire === 1 ? 8 : 4
      if (offset > bytes.length) throw new Error('抖音 protobuf 固定字段被截断')
    } else throw new Error(`不支持的抖音 protobuf wire type：${wire}`)
  }
  return fields
}

export const fieldBytes = (fields: Field[], id: number): Uint8Array => {
  const value = fields.find(field => field.id === id)?.value
  return value instanceof Uint8Array ? value : new Uint8Array(0)
}
export const fieldText = (fields: Field[], id: number): string => utf8Decode(fieldBytes(fields, id))
export const fieldInt = (fields: Field[], id: number): bigint => {
  const value = fields.find(field => field.id === id)?.value
  return typeof value === 'bigint' ? value : 0n
}

function encodeVarint(value: bigint): Uint8Array {
  const result: number[] = []
  do {
    const byte = Number(value & 127n)
    value >>= 7n
    result.push(byte | (value ? 128 : 0))
  } while (value)
  return Uint8Array.from(result)
}

export function encodePushFrame(type: 'hb' | 'ack', logId = 0n, payload = ''): Uint8Array {
  const parts: Uint8Array[] = []
  if (logId) parts.push(encodeVarint(16n), encodeVarint(logId))
  const typeBytes = utf8Encode(type)
  parts.push(encodeVarint(58n), encodeVarint(BigInt(typeBytes.length)), typeBytes)
  if (payload) {
    const bytes = utf8Encode(payload)
    parts.push(encodeVarint(66n), encodeVarint(BigInt(bytes.length)), bytes)
  }
  return concatBytes(parts)
}
