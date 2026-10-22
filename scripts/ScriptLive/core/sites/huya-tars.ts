/**
 * 虎牙用到的 Tars 编解码与 TUP（精简版 TUP3）封包，移植自上游 packages/tars_dart，只保留虎牙需要的类型。
 * Tars 字段由「头部 + 数据」组成：头部高 4 位是 tag（tag ≥ 15 时额外跟 1 字节），低 4 位是类型。
 * 整数一律按大端存储；int64 用 BigInt 处理，避免超过 2^53 的 uid 丢精度。
 */
import { utf8Decode, utf8Encode } from '../bytes'

const TYPE = {
  BYTE: 0,
  SHORT: 1,
  INT: 2,
  LONG: 3,
  FLOAT: 4,
  DOUBLE: 5,
  STRING1: 6,
  STRING4: 7,
  MAP: 8,
  LIST: 9,
  STRUCT_BEGIN: 10,
  STRUCT_END: 11,
  ZERO_TAG: 12,
  SIMPLE_LIST: 13
} as const

const INT32_MIN = -2147483648
const INT32_MAX = 2147483647
const UINT32_MASK = BigInt(0xffffffff)
const INT64_MIN = -(BigInt(1) << BigInt(63))
const INT64_MAX = (BigInt(1) << BigInt(63)) - BigInt(1)

export type TarsInt = number | bigint

export class TarsWriter {
  private buffer = new Uint8Array(64)
  private length = 0

  private ensure(size: number) {
    if (this.length + size <= this.buffer.length) return
    let capacity = this.buffer.length * 2
    while (capacity < this.length + size) capacity *= 2
    const next = new Uint8Array(capacity)
    next.set(this.buffer.subarray(0, this.length))
    this.buffer = next
  }

  private pushByte(value: number) {
    this.ensure(1)
    this.buffer[this.length++] = value & 0xff
  }

  private pushRaw(bytes: Uint8Array) {
    this.ensure(bytes.length)
    this.buffer.set(bytes, this.length)
    this.length += bytes.length
  }

  /** 按大端写入 size 字节的整数（size ≤ 4） */
  private pushInt(value: number, size: number) {
    for (let shift = (size - 1) * 8; shift >= 0; shift -= 8) this.pushByte(value >> shift)
  }

  private writeHead(type: number, tag: number) {
    if (tag < 15) {
      this.pushByte((tag << 4) | type)
    } else if (tag < 256) {
      this.pushByte(0xf0 | type)
      this.pushByte(tag)
    } else {
      throw new Error(`Tars tag 过大：${tag}`)
    }
  }

  /** 写入整数，按数值大小自动选择 ZERO / BYTE / SHORT / INT / LONG */
  writeInt(value: TarsInt, tag: number): this {
    if (typeof value === 'bigint') {
      if (value >= BigInt(INT32_MIN) && value <= BigInt(INT32_MAX)) return this.writeInt(Number(value), tag)
      return this.writeLong(value, tag)
    }
    if (!Number.isInteger(value)) throw new Error(`Tars 整数字段收到非整数：${value}`)
    if (value === 0) {
      this.writeHead(TYPE.ZERO_TAG, tag)
    } else if (value >= -128 && value <= 127) {
      this.writeHead(TYPE.BYTE, tag)
      this.pushByte(value)
    } else if (value >= -32768 && value <= 32767) {
      this.writeHead(TYPE.SHORT, tag)
      this.pushInt(value, 2)
    } else if (value >= INT32_MIN && value <= INT32_MAX) {
      this.writeHead(TYPE.INT, tag)
      this.pushInt(value, 4)
    } else {
      this.writeLong(BigInt(value), tag)
    }
    return this
  }

  private writeLong(value: bigint, tag: number): this {
    if (value < INT64_MIN || value > INT64_MAX) throw new Error(`Tars int64 越界：${value}`)
    const unsigned = BigInt.asUintN(64, value)
    this.writeHead(TYPE.LONG, tag)
    this.pushInt(Number((unsigned >> BigInt(32)) & UINT32_MASK), 4)
    this.pushInt(Number(unsigned & UINT32_MASK), 4)
    return this
  }

  writeBool(value: boolean, tag: number): this {
    return this.writeInt(value ? 1 : 0, tag)
  }

  writeString(value: string, tag: number): this {
    const bytes = utf8Encode(value)
    if (bytes.length > 255) {
      this.writeHead(TYPE.STRING4, tag)
      this.pushInt(bytes.length, 4)
    } else {
      this.writeHead(TYPE.STRING1, tag)
      this.pushByte(bytes.length)
    }
    this.pushRaw(bytes)
    return this
  }

  /** 写入 byte[]（SIMPLE_LIST） */
  writeBytes(value: Uint8Array, tag: number): this {
    this.writeHead(TYPE.SIMPLE_LIST, tag)
    this.writeHead(TYPE.BYTE, 0)
    this.writeInt(value.length, 0)
    this.pushRaw(value)
    return this
  }

  writeStringMap(map: Record<string, string>, tag: number): this {
    const keys = Object.keys(map)
    this.writeHead(TYPE.MAP, tag)
    this.writeInt(keys.length, 0)
    for (const key of keys) this.writeString(key, 0).writeString(map[key], 1)
    return this
  }

  writeBytesMap(map: Record<string, Uint8Array>, tag: number): this {
    const keys = Object.keys(map)
    this.writeHead(TYPE.MAP, tag)
    this.writeInt(keys.length, 0)
    for (const key of keys) this.writeString(key, 0).writeBytes(map[key], 1)
    return this
  }

  /** 写入嵌套结构体，body 负责写结构体内部字段 */
  writeStruct(tag: number, body: (writer: TarsWriter) => void): this {
    this.writeHead(TYPE.STRUCT_BEGIN, tag)
    body(this)
    this.writeHead(TYPE.STRUCT_END, 0)
    return this
  }

  toBytes(): Uint8Array {
    return this.buffer.slice(0, this.length)
  }
}

type Head = { type: number; tag: number; size: number }

export class TarsReader {
  private offset: number
  private readonly view: DataView

  constructor(
    private readonly bytes: Uint8Array,
    offset = 0
  ) {
    this.offset = offset
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  }

  private readByte(): number {
    if (this.offset >= this.bytes.length) throw new Error('Tars 数据意外结束')
    return this.bytes[this.offset++]
  }

  private take(size: number): Uint8Array {
    if (size < 0 || this.offset + size > this.bytes.length) throw new Error(`Tars 长度越界：${size}`)
    const value = this.bytes.subarray(this.offset, this.offset + size)
    this.offset += size
    return value
  }

  private readInt32(): number {
    const start = this.offset
    this.take(4)
    return this.view.getInt32(start)
  }

  private peekHead(): Head | undefined {
    if (this.offset >= this.bytes.length) return undefined
    const first = this.bytes[this.offset]
    const type = first & 0x0f
    let tag = first >> 4
    let size = 1
    if (tag === 15) {
      if (this.offset + 1 >= this.bytes.length) return undefined
      tag = this.bytes[this.offset + 1]
      size = 2
    }
    return { type, tag, size }
  }

  private readHead(): Head {
    const head = this.peekHead()
    if (!head) throw new Error('Tars 数据意外结束')
    this.offset += head.size
    return head
  }

  /** 前进到指定 tag；遇到更大的 tag 或结构体结束时停下，返回是否找到 */
  private skipToTag(tag: number): boolean {
    for (let head = this.peekHead(); head; head = this.peekHead()) {
      if (tag <= head.tag || head.type === TYPE.STRUCT_END) return head.tag === tag && head.type !== TYPE.STRUCT_END
      this.offset += head.size
      this.skipValue(head.type)
    }
    return false
  }

  private skipToStructEnd() {
    for (;;) {
      const head = this.readHead()
      this.skipValue(head.type)
      if (head.type === TYPE.STRUCT_END) return
    }
  }

  private skipField() {
    this.skipValue(this.readHead().type)
  }

  private skipValue(type: number) {
    switch (type) {
      case TYPE.BYTE:
        this.take(1)
        break
      case TYPE.SHORT:
        this.take(2)
        break
      case TYPE.INT:
      case TYPE.FLOAT:
        this.take(4)
        break
      case TYPE.LONG:
      case TYPE.DOUBLE:
        this.take(8)
        break
      case TYPE.STRING1:
        this.take(this.readByte())
        break
      case TYPE.STRING4:
        this.take(this.readInt32())
        break
      case TYPE.MAP: {
        const size = this.readNumber(0, true)
        for (let i = 0; i < size * 2; i++) this.skipField()
        break
      }
      case TYPE.LIST: {
        const size = this.readNumber(0, true)
        for (let i = 0; i < size; i++) this.skipField()
        break
      }
      case TYPE.SIMPLE_LIST: {
        if (this.readHead().type !== TYPE.BYTE) throw new Error('Tars SIMPLE_LIST 只支持 byte')
        this.take(this.readNumber(0, true))
        break
      }
      case TYPE.STRUCT_BEGIN:
        this.skipToStructEnd()
        break
      case TYPE.STRUCT_END:
      case TYPE.ZERO_TAG:
        break
      default:
        throw new Error(`未知 Tars 类型：${type}`)
    }
  }

  private missing(tag: number, required: boolean) {
    if (required) throw new Error(`Tars 缺少必填字段 tag=${tag}`)
  }

  /** 读取整数原值；int64 以 BigInt 返回 */
  readLong(tag: number, required = false): bigint {
    if (!this.skipToTag(tag)) {
      this.missing(tag, required)
      return BigInt(0)
    }
    const head = this.readHead()
    const start = this.offset
    switch (head.type) {
      case TYPE.ZERO_TAG:
        return BigInt(0)
      case TYPE.BYTE:
        this.take(1)
        return BigInt(this.view.getInt8(start))
      case TYPE.SHORT:
        this.take(2)
        return BigInt(this.view.getInt16(start))
      case TYPE.INT:
        this.take(4)
        return BigInt(this.view.getInt32(start))
      case TYPE.LONG: {
        this.take(8)
        const high = BigInt(this.view.getInt32(start))
        const low = BigInt(this.view.getUint32(start + 4))
        return (high << BigInt(32)) | low
      }
      default:
        throw new Error(`Tars 字段 tag=${tag} 不是整数（类型 ${head.type}）`)
    }
  }

  /** 读取整数并转为 number；只用于不会超过 2^53 的字段 */
  readNumber(tag: number, required = false): number {
    return Number(this.readLong(tag, required))
  }

  readString(tag: number, required = false): string {
    if (!this.skipToTag(tag)) {
      this.missing(tag, required)
      return ''
    }
    const head = this.readHead()
    if (head.type === TYPE.STRING1) return utf8Decode(this.take(this.readByte()))
    if (head.type === TYPE.STRING4) return utf8Decode(this.take(this.readInt32()))
    throw new Error(`Tars 字段 tag=${tag} 不是字符串（类型 ${head.type}）`)
  }

  /** 读取 byte[]，兼容 SIMPLE_LIST 与逐个元素编码的 LIST */
  readBytes(tag: number, required = false): Uint8Array {
    if (!this.skipToTag(tag)) {
      this.missing(tag, required)
      return new Uint8Array(0)
    }
    const head = this.readHead()
    if (head.type === TYPE.SIMPLE_LIST) {
      if (this.readHead().type !== TYPE.BYTE) throw new Error('Tars SIMPLE_LIST 只支持 byte')
      return this.take(this.readNumber(0, true)).slice()
    }
    if (head.type === TYPE.LIST) {
      const size = this.readNumber(0, true)
      const result = new Uint8Array(size)
      for (let i = 0; i < size; i++) result[i] = this.readNumber(0, true)
      return result
    }
    throw new Error(`Tars 字段 tag=${tag} 不是 byte[]（类型 ${head.type}）`)
  }

  /** 读取 map<string, byte[]> */
  readBytesMap(tag: number, required = false): Record<string, Uint8Array> {
    const result: Record<string, Uint8Array> = {}
    if (!this.skipToTag(tag)) {
      this.missing(tag, required)
      return result
    }
    const head = this.readHead()
    if (head.type !== TYPE.MAP) throw new Error(`Tars 字段 tag=${tag} 不是 map（类型 ${head.type}）`)
    const size = this.readNumber(0, true)
    for (let i = 0; i < size; i++) {
      const key = this.readString(0, true)
      result[key] = this.readBytes(1, true)
    }
    return result
  }

  /**
   * 读取嵌套结构体：body 用同一个 reader 读取内部字段，读完后跳到结构体结尾。
   * 字段缺失时返回 undefined。
   */
  readStruct<T>(tag: number, body: (reader: TarsReader) => T, required = false): T | undefined {
    if (!this.skipToTag(tag)) {
      this.missing(tag, required)
      return undefined
    }
    const head = this.readHead()
    if (head.type !== TYPE.STRUCT_BEGIN) throw new Error(`Tars 字段 tag=${tag} 不是结构体（类型 ${head.type}）`)
    const value = body(this)
    this.skipToStructEnd()
    return value
  }
}

/**
 * 编码 TUP3 请求包：RequestPacket 的 sBuffer 是 map<string, byte[]>，其中 tReq 为请求结构体。
 * 整包前缀 4 字节大端长度（含自身）。
 * @param servant 服务名，如 liveui
 * @param func 方法名
 * @param writeReq 写入请求结构体字段
 */
export function encodeTupRequest(servant: string, func: string, writeReq: (writer: TarsWriter) => void): Uint8Array {
  const req = new TarsWriter().writeStruct(0, writeReq).toBytes()
  const buffer = new TarsWriter().writeBytesMap({ tReq: req }, 0).toBytes()
  const body = new TarsWriter()
    .writeInt(3, 1) // iVersion = TUP3
    .writeInt(0, 2) // cPacketType = TARSNORMAL
    .writeInt(0, 3) // iMessageType
    .writeInt(0, 4) // iRequestId
    .writeString(servant, 5)
    .writeString(func, 6)
    .writeBytes(buffer, 7)
    .writeInt(0, 8) // iTimeout
    .writeStringMap({}, 9) // context
    .writeStringMap({}, 10) // status
    .toBytes()
  const packet = new Uint8Array(body.length + 4)
  new DataView(packet.buffer).setInt32(0, packet.length)
  packet.set(body, 4)
  return packet
}

/**
 * 解码 TUP3 响应包，校验返回码后读取 tRsp 结构体。
 * @param bytes 完整响应字节（含 4 字节长度头）
 * @param readRsp 读取响应结构体字段
 */
export function decodeTupResponse<T>(bytes: Uint8Array, readRsp: (reader: TarsReader) => T): T {
  if (bytes.length < 4) throw new Error('TUP 响应长度不足')
  const buffer = new TarsReader(bytes, 4).readBytes(7, true)
  const data = new TarsReader(buffer).readBytesMap(0)
  const code = data[''] ? new TarsReader(data['']).readNumber(0) : 0
  if (code !== 0) throw new Error(`TUP 请求失败（返回码 ${code}）`)
  if (!data.tRsp) throw new Error('TUP 响应缺少 tRsp')
  const rsp = new TarsReader(data.tRsp).readStruct(0, readRsp, true)
  return rsp as T
}
