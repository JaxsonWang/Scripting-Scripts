/** 虎牙二进制弹幕：Tars 入房、60 秒心跳、聊天与在线人数推送。 */
import { base64Decode, messageBytes, toData } from '../bytes'
import type { LiveDanmaku, LiveMessage } from '../types'
import { WHITE, numberToColor } from '../types'
import { TarsReader, TarsWriter } from './huya-tars'

export type HuyaDanmakuArgs = { ayyuid: string; topSid: string; subSid: string }

export class HuyaDanmaku implements LiveDanmaku {
  onMessage?: (message: LiveMessage) => void
  onReady?: () => void
  onClose?: (reason: string) => void
  private socket?: WebSocket
  private heartbeat?: number

  async start(args: unknown): Promise<void> {
    await this.stop()
    const { ayyuid, topSid, subSid } = args as HuyaDanmakuArgs
    const registration = new TarsWriter()
      .writeInt(BigInt(ayyuid), 0)
      .writeBool(true, 1)
      .writeString('', 2)
      .writeString('', 3)
      .writeInt(BigInt(topSid), 4)
      .writeInt(BigInt(subSid), 5)
      .writeInt(0, 6)
      .writeInt(0, 7)
      .toBytes()
    const join = toData(new TarsWriter().writeInt(1, 0).writeBytes(registration, 1).toBytes())
    const heartbeat = toData(base64Decode('ABQdAAwsNgBM'))
    const socket = new WebSocket('wss://cdnws.api.huya.com')
    this.socket = socket
    socket.onopen = () => {
      if (this.socket !== socket) return
      socket.send(join)
      this.heartbeat = setInterval(() => socket.send(heartbeat), 60000)
      this.onReady?.()
    }
    socket.onmessage = message => {
      if (this.socket !== socket) return
      try {
        this.decode(messageBytes(message))
      } catch (error) {
        console.error('虎牙弹幕解码失败', error)
      }
    }
    const close = (reason: string) => {
      if (this.socket !== socket) return
      this.clearHeartbeat()
      this.socket = undefined
      socket.onopen = undefined
      socket.onmessage = undefined
      socket.onclose = undefined
      socket.onerror = undefined
      socket.close()
      this.onClose?.(reason)
    }
    socket.onclose = reason => close(reason || '虎牙弹幕连接已关闭')
    socket.onerror = error => close(`虎牙弹幕连接失败：${error.message}`)
  }

  async stop(): Promise<void> {
    this.clearHeartbeat()
    const socket = this.socket
    this.socket = undefined
    if (!socket) return
    socket.onopen = undefined
    socket.onmessage = undefined
    socket.onclose = undefined
    socket.onerror = undefined
    socket.close()
  }

  private clearHeartbeat(): void {
    if (this.heartbeat !== undefined) clearInterval(this.heartbeat)
    this.heartbeat = undefined
  }

  private decode(bytes: Uint8Array): void {
    const command = new TarsReader(bytes)
    if (command.readNumber(0) !== 7) return
    const push = new TarsReader(command.readBytes(1, true))
    const uri = push.readNumber(1)
    const body = new TarsReader(push.readBytes(2, true))
    if (uri === 1400) {
      const userName = body.readStruct(0, user => user.readString(2)) ?? ''
      const message = body.readString(3)
      const color = body.readStruct(6, format => format.readNumber(0)) ?? 0
      this.onMessage?.({ type: 'chat', userName, message, color: color <= 0 ? WHITE : numberToColor(color) })
    } else if (uri === 8006) this.onMessage?.({ type: 'online', online: body.readNumber(0) })
  }
}
