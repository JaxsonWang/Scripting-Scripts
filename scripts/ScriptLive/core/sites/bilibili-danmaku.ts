import { inflateZlib, messageBytes, toData, utf8Decode, utf8Encode } from '../bytes'
import { WHITE, numberToColor } from '../types'
import type { LiveDanmaku, LiveMessage, LiveSuperChatMessage } from '../types'

export type BilibiliDanmakuArgs = { roomId: number; uid: number; token: string; buvid: string; serverHost: string }
// 接口字段随命令变化，保留原始结构，在各命令分支读取。
export type BilibiliEvent = Record<string, any>

export function bilibiliSuperChat(item: BilibiliEvent): LiveSuperChatMessage {
  return {
    id: String(item.id ?? ''),
    userName: String(item.user_info?.uname ?? ''),
    face: String(item.user_info?.face ?? ''),
    message: String(item.message ?? ''),
    price: Number(item.price),
    startTime: Number(item.start_time) * 1000,
    endTime: Number(item.end_time) * 1000,
    backgroundColor: String(item.background_color),
    backgroundBottomColor: String(item.background_bottom_color)
  }
}

export class BilibiliDanmaku implements LiveDanmaku {
  onMessage?: (message: LiveMessage) => void
  onReady?: () => void
  onClose?: (reason: string) => void
  private socket?: WebSocket
  private timer?: ReturnType<typeof setInterval>
  async start(value: unknown): Promise<void> {
    await this.stop()
    const args = value as BilibiliDanmakuArgs
    const socket = new WebSocket(`wss://${args.serverHost}/sub`)
    this.socket = socket
    socket.onopen = () => {
      socket.send(
        toData(
          this.packet(JSON.stringify({ uid: args.uid, roomid: args.roomId, protover: 2, buvid: args.buvid, platform: 'web', type: 2, key: args.token }), 7)
        )
      )
      const heartbeat = () => socket.send(toData(this.packet('', 2)))
      heartbeat()
      this.timer = setInterval(heartbeat, 30000)
    }
    socket.onmessage = message => {
      try {
        this.decode(messageBytes(message))
      } catch (error) {
        this.fail(`B站弹幕解析失败：${String(error)}`)
      }
    }
    socket.onerror = error => this.fail(`B站弹幕连接失败：${error.message}`)
    socket.onclose = reason => this.fail(reason || 'B站弹幕连接已关闭')
  }
  private packet(text: string, operation: number): Uint8Array {
    const body = utf8Encode(text)
    const bytes = new Uint8Array(body.length + 16)
    const view = new DataView(bytes.buffer)
    view.setUint32(0, bytes.length)
    view.setUint16(4, 16)
    view.setUint16(6, 1)
    view.setUint32(8, operation)
    view.setUint32(12, 1)
    bytes.set(body, 16)
    return bytes
  }
  private decode(bytes: Uint8Array): void {
    let offset = 0
    while (offset + 16 <= bytes.length) {
      const view = new DataView(bytes.buffer, bytes.byteOffset + offset, bytes.length - offset)
      const length = view.getUint32(0),
        header = view.getUint16(4),
        version = view.getUint16(6),
        operation = view.getUint32(8)
      if (length < header || header < 16 || offset + length > bytes.length) throw new Error('无效的数据包长度')
      const body = bytes.subarray(offset + header, offset + length)
      if (version === 2) this.decode(inflateZlib(body))
      else if (operation === 3 && body.length >= 4)
        this.onMessage?.({ type: 'online', online: new DataView(body.buffer, body.byteOffset, body.length).getUint32(0) })
      else if (operation === 8) {
        const auth = body.length ? JSON.parse(utf8Decode(body)) : { code: 0 }
        if (auth.code !== 0) throw new Error(`认证被拒绝 (${auth.code})`)
        this.onReady?.()
      } else if (operation === 5) {
        const item = JSON.parse(utf8Decode(body)) as BilibiliEvent
        if (String(item.cmd).startsWith('DANMU_MSG'))
          this.onMessage?.({
            type: 'chat',
            userName: String(item.info[2][1]),
            message: String(item.info[1]),
            color: item.info[0][3] ? numberToColor(Number(item.info[0][3])) : WHITE
          })
        else if (item.cmd === 'SUPER_CHAT_MESSAGE') this.onMessage?.({ type: 'superChat', superChat: bilibiliSuperChat(item.data) })
      }
      offset += length
    }
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
  }
}
