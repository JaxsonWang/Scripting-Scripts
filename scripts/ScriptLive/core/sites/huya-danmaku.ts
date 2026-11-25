/** 虎牙二进制弹幕：WebKit 连接、Tars 入房、60 秒心跳、聊天与在线人数推送。 */
import { base64Decode, base64Encode } from '../bytes'
import type { LiveDanmaku, LiveMessage } from '../types'
import { WHITE, numberToColor } from '../types'
import { TarsReader, TarsWriter } from './huya-tars'

export type HuyaDanmakuArgs = { ayyuid: string; topSid: string; subSid: string }
type BridgeEvent = { type: 'message'; data: string } | { type: 'close'; reason: string }

export class HuyaDanmaku implements LiveDanmaku {
  onMessage?: (message: LiveMessage) => void
  onReady?: () => void
  onClose?: (reason: string) => void
  private web?: WebViewController
  private ready = false

  async start(args: unknown): Promise<void> {
    this.close()
    const value = args as HuyaDanmakuArgs | undefined
    if (!value || ![value.ayyuid, value.topSid, value.subSid].every(id => /^\d+$/.test(id))) {
      throw new Error('虎牙弹幕参数不完整，请刷新直播间后重试')
    }
    const { ayyuid, topSid, subSid } = value
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
    const join = base64Encode(new TarsWriter().writeInt(1, 0).writeBytes(registration, 1).toBytes())
    // 原生 WebSocket 实测收弹幕后约 30 秒报协议错误；沿用抖音的 WebKit 连接方式。
    const web = new WebViewController({ ephemeral: true, settings: { inactiveSchedulingPolicy: 'none' } })
    this.web = web
    try {
      await web.addEventListener('webContentProcessTerminated', () => {
        if (this.web === web) this.close('虎牙弹幕网页已停止，请重新连接')
      })
      if (this.web !== web) return
      await web.addScriptMessageHandler<BridgeEvent>('scriptliveHuya', event => {
        if (this.web !== web || !event) return
        if (event.type === 'close') this.close(event.reason)
        else if (event.type === 'message' && typeof event.data === 'string') {
          try {
            this.decode(base64Decode(event.data))
          } catch (error) {
            console.error('虎牙弹幕解码失败', error)
          }
        }
      })
      if (this.web !== web) return
      const loaded = await web.loadHTML(
        '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; connect-src wss://cdnws.api.huya.com"></head><body></body></html>',
        'https://www.huya.com/'
      )
      if (this.web !== web) return
      if (!loaded) throw new Error('虎牙弹幕网页环境加载失败，请重新连接')
      await web.evaluateJavaScript(`
        const post = event => window.webkit.messageHandlers.scriptliveHuya.postMessage(event);
        const bytes = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
        const socket = new WebSocket('wss://cdnws.api.huya.com');
        socket.binaryType = 'arraybuffer';
        let heartbeat;
        let closed = false;
        const close = reason => {
          if (closed) return;
          closed = true;
          clearInterval(heartbeat);
          socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
          socket.close();
          post({type: 'close', reason});
        };
        const send = data => {
          try { socket.send(bytes(data)); }
          catch (error) { close('虎牙弹幕发送失败：' + error.message); }
        };
        socket.onopen = () => {
          send(${JSON.stringify(join)});
          if (!closed) heartbeat = setInterval(() => send('ABQdAAwsNgBM'), 60000);
        };
        socket.onmessage = event => {
          let binary = '';
          for (const byte of new Uint8Array(event.data)) binary += String.fromCharCode(byte);
          post({type: 'message', data: btoa(binary)});
        };
        socket.onclose = event => close('虎牙弹幕连接已关闭（' + event.code + '）' + (event.reason ? '：' + event.reason : ''));
        socket.onerror = () => close('虎牙弹幕网络连接失败，请检查网络后重新连接');
        return true;
      `)
    } catch (error) {
      if (this.web !== web) return
      this.close()
      throw error
    }
  }

  async stop(): Promise<void> {
    this.close()
  }

  private close(reason?: string): void {
    const web = this.web
    this.web = undefined
    this.ready = false
    web?.dispose()
    if (web && reason) this.onClose?.(reason)
  }

  private decode(bytes: Uint8Array): void {
    const command = new TarsReader(bytes)
    if (command.readNumber(0) !== 7) return
    const push = new TarsReader(command.readBytes(1, true))
    const uri = push.readNumber(1)
    const body = new TarsReader(push.readBytes(2, true))
    if (!this.ready) {
      this.ready = true
      this.onReady?.()
    }
    if (uri === 1400) {
      const userName = body.readStruct(0, user => user.readString(2)) ?? ''
      const message = body.readString(3)
      const color = body.readStruct(6, format => format.readNumber(0)) ?? 0
      this.onMessage?.({ type: 'chat', userName, message, color: color <= 0 ? WHITE : numberToColor(color) })
    } else if (uri === 8006) this.onMessage?.({ type: 'online', online: body.readNumber(0) })
  }
}
