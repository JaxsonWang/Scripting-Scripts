import { concatBytes, messageBytes, toData, utf8Decode, utf8Encode } from '../bytes'
import { WHITE } from '../types'
import type { LiveDanmaku, LiveMessage, LiveMessageColor } from '../types'

/** 斗鱼 STT 转义必须先还原斜杠，再还原 @，避免二次展开。 */
export function parseDouyuStt(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const field of text.split('/')) {
    const index = field.indexOf('@=')
    if (index < 0) continue
    result[field.slice(0, index)] = field
      .slice(index + 2)
      .replace(/@S/g, '/')
      .replace(/@A/g, '@')
  }
  return result
}
export function encodeDouyuPacket(text: string): Uint8Array {
  const body = utf8Encode(text)
  const bytes = new Uint8Array(body.length + 13)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, bytes.length - 4, true)
  view.setUint32(4, bytes.length - 4, true)
  view.setUint16(8, 689, true)
  bytes.set(body, 12)
  return bytes
}
const COLORS: LiveMessageColor[] = [
  WHITE,
  { r: 255, g: 0, b: 0 },
  { r: 30, g: 135, b: 240 },
  { r: 122, g: 200, b: 75 },
  { r: 255, g: 127, b: 0 },
  { r: 155, g: 57, b: 244 },
  { r: 255, g: 105, b: 180 }
]
export class DouyuDanmaku implements LiveDanmaku {
  onMessage?: (message: LiveMessage) => void
  onReady?: () => void
  onClose?: (reason: string) => void
  private socket?: WebSocket
  private timer?: ReturnType<typeof setInterval>
  private pending = new Uint8Array(0)
  async start(args: unknown): Promise<void> {
    await this.stop()
    const roomId = String(args)
    const socket = new WebSocket('wss://danmuproxy.douyu.com:8506/')
    this.socket = socket
    const send = (text: string) => socket.send(toData(encodeDouyuPacket(text)))
    socket.onopen = () => {
      send(`type@=loginreq/roomid@=${roomId}/`)
      send(`type@=joingroup/rid@=${roomId}/gid@=-9999/`)
      send('type@=mrkl/')
      this.timer = setInterval(() => send('type@=mrkl/'), 45000)
    }
    socket.onmessage = message => {
      try {
        const bytes = concatBytes([this.pending, messageBytes(message)])
        let offset = 0
        while (offset + 12 <= bytes.length) {
          const length = new DataView(bytes.buffer, bytes.byteOffset + offset).getUint32(0, true) + 4
          if (length < 13) throw new Error('无效的斗鱼数据包长度')
          if (offset + length > bytes.length) break
          const data = parseDouyuStt(utf8Decode(bytes.subarray(offset + 12, offset + length - 1)))
          if (data.type === 'loginres') this.onReady?.()
          else if (data.type === 'chatmsg' && data.dms !== undefined)
            this.onMessage?.({ type: 'chat', userName: data.nn, message: data.txt, color: COLORS[Number(data.col)] ?? WHITE })
          offset += length
        }
        this.pending = bytes.slice(offset)
      } catch (error) {
        this.fail(`斗鱼弹幕解析失败：${String(error)}`)
      }
    }
    socket.onerror = error => this.fail(`斗鱼弹幕连接失败：${error.message}`)
    socket.onclose = reason => this.fail(reason || '斗鱼弹幕连接已关闭')
  }
  private fail(reason: string): void {
    const callback = this.onClose
    void this.stop()
    callback?.(reason)
  }
  async stop(): Promise<void> {
    if (this.timer !== undefined) clearInterval(this.timer)
    this.timer = undefined
    const socket = this.socket
    this.socket = undefined
    if (socket) {
      socket.onclose = undefined
      socket.onerror = undefined
      socket.onmessage = undefined
      socket.onopen = undefined
      socket.close()
    }
    this.pending = new Uint8Array(0)
  }
}
