/** 抖音弹幕：官方页面签名 + WebKit Cookie 握手 + 最小 protobuf 解码。 */
import { base64Decode, base64Encode, gunzip } from '../bytes'
import { buildUrl } from '../http'
import type { LiveDanmaku, LiveMessage } from '../types'
import { WHITE } from '../types'
import { decodeFields, encodePushFrame, fieldBytes, fieldInt, fieldText } from './douyin-proto'
import type { DouyinSignInput, DouyinSigner } from './douyin-web'
import { DOUYIN_UA, DouyinWebContext, signWithOfficialPage } from './douyin-web'

export type DouyinDanmakuArgs = DouyinSignInput
export type DouyinSocketEvents = { ready: () => void; message: (bytes: Uint8Array) => void; close: (reason: string) => void }
export type DouyinSocket = { send: (bytes: Uint8Array) => Promise<void>; close: () => Promise<void> }
export type DouyinSocketFactory = (url: string, args: DouyinDanmakuArgs, events: DouyinSocketEvents, web?: DouyinWebContext) => Promise<DouyinSocket>

type BridgeEvent = { type: 'open' | 'message' | 'close' | 'error'; data?: string; reason?: string }

/** 浏览器 WebSocket 自动使用已写入的 ttwid；不向查询串泄漏 Cookie。 */
export const createDouyinWebSocket: DouyinSocketFactory = async (url, _args, events, web) => {
  if (!web) throw new Error('抖音弹幕缺少官方网页环境')
  const controller = web.controller
  await controller.addScriptMessageHandler<BridgeEvent>('scriptliveDouyin', event => {
    if (!event) return
    if (event.type === 'open') events.ready()
    else if (event.type === 'message' && event.data) events.message(base64Decode(event.data))
    else events.close(event.reason || '抖音弹幕连接失败')
  })
  await controller.evaluateJavaScript(`
    const sendEvent = value => window.webkit.messageHandlers.scriptliveDouyin.postMessage(value);
    const socket = new WebSocket(${JSON.stringify(url)});
    socket.binaryType = 'arraybuffer';
    window.__scriptliveSocket = socket;
    socket.onopen = () => sendEvent({type: 'open'});
    socket.onclose = event => sendEvent({type: 'close', reason: event.code + ' ' + event.reason});
    socket.onerror = () => sendEvent({type: 'error', reason: '抖音弹幕握手失败，请更新 Cookie 或在官方页面完成验证'});
    socket.onmessage = event => {
      const bytes = new Uint8Array(event.data);
      let binary = '';
      for (let index = 0; index < bytes.length; index++) binary += String.fromCharCode(bytes[index]);
      sendEvent({type: 'message', data: btoa(binary)});
    };
    return true;
  `)
  return {
    send: async bytes => {
      await controller.evaluateJavaScript(`
        const socket = window.__scriptliveSocket;
        if (!socket || socket.readyState !== 1) throw new Error('抖音弹幕连接未就绪');
        const binary = atob(${JSON.stringify(base64Encode(bytes))});
        socket.send(Uint8Array.from(binary, char => char.charCodeAt(0)));
        return true;
      `)
    },
    close: async () => {
      await controller.evaluateJavaScript(`
        const socket = window.__scriptliveSocket;
        if (socket) { socket.onclose = null; socket.onerror = null; socket.onmessage = null; socket.onopen = null; socket.close(); }
        delete window.__scriptliveSocket;
        return true;
      `)
    }
  }
}

export class DouyinDanmaku implements LiveDanmaku {
  onMessage?: (message: LiveMessage) => void
  onReady?: () => void
  onClose?: (reason: string) => void
  private socket?: DouyinSocket
  private web?: DouyinWebContext
  private heartbeat?: ReturnType<typeof setInterval>
  private generation = 0
  private closed = true
  private ready = false

  constructor(
    private readonly signer: DouyinSigner = signWithOfficialPage,
    private readonly socketFactory: DouyinSocketFactory = createDouyinWebSocket
  ) {}

  async start(value: unknown): Promise<void> {
    await this.stop()
    const args = value as DouyinDanmakuArgs | undefined
    if (!args?.roomId || !args.userId || !args.webRid || !args.cookie) throw new Error('抖音弹幕参数不完整，请重新打开直播间')
    const generation = ++this.generation
    this.closed = false
    try {
      // 注入 signer 和 transport 时不创建 WebView，便于独立验证协议。
      if (this.signer === signWithOfficialPage || this.socketFactory === createDouyinWebSocket) {
        const web = new DouyinWebContext()
        this.web = web
        // 首页同样加载官方签名 SDK，避免隐藏直播间额外启动视频与弹幕连接。
        await web.load('https://live.douyin.com/', args.cookie)
      }
      if (generation !== this.generation) return
      const signature = await this.signer(args, this.web)
      if (generation !== this.generation) return
      const url = buildUrl('wss://webcast3-ws-web-lq.douyin.com/webcast/im/push/v2/', {
        app_name: 'douyin_web',
        version_code: '180800',
        webcast_sdk_version: '1.3.0',
        update_version_code: '1.3.0',
        compress: 'gzip',
        cursor: `h-1_t-${Date.now()}_r-1_d-1_u-1`,
        host: 'https://live.douyin.com',
        aid: '6383',
        live_id: '1',
        did_rule: '3',
        debug: 'false',
        maxCacheMessageNumber: '20',
        endpoint: 'live_pc',
        support_wrds: '1',
        im_path: '/webcast/im/fetch/',
        user_unique_id: args.userId,
        device_platform: 'web',
        cookie_enabled: 'true',
        screen_width: '1920',
        screen_height: '1080',
        browser_language: 'zh-CN',
        browser_platform: 'Win32',
        browser_name: 'Mozilla',
        browser_version: DOUYIN_UA.replace('Mozilla/', ''),
        browser_online: 'true',
        tz_name: 'Asia/Shanghai',
        identity: 'audience',
        room_id: args.roomId,
        heartbeatDuration: '0',
        signature
      })
      const socket = await this.socketFactory(
        url,
        args,
        {
          ready: () => {
            if (generation !== this.generation || this.closed) return
            this.ready = true
            this.onReady?.()
            if (this.socket) this.beginHeartbeat(generation)
          },
          message: bytes => {
            if (generation !== this.generation || this.closed) return
            try {
              this.decodeMessage(bytes)
            } catch (error) {
              this.fail(`抖音弹幕解码失败：${String(error)}`)
            }
          },
          close: reason => {
            if (generation === this.generation) this.fail(reason)
          }
        },
        this.web
      )
      if (generation !== this.generation || this.closed) {
        await socket.close()
        return
      }
      this.socket = socket
      if (this.ready) this.beginHeartbeat(generation)
    } catch (error) {
      if (generation === this.generation) {
        this.fail(String(error))
        throw error
      }
    }
  }

  private beginHeartbeat(generation: number): void {
    this.send(encodePushFrame('hb'))
    this.heartbeat = setInterval(() => {
      if (generation === this.generation) this.send(encodePushFrame('hb'))
    }, 10000)
  }

  private send(bytes: Uint8Array): void {
    void this.socket?.send(bytes).catch(error => this.fail(`抖音弹幕发送失败：${String(error)}`))
  }

  /** ACK 的 internalExt 应放 payload（字段 8），修正上游误覆盖 payloadType 的问题。 */
  private decodeMessage(bytes: Uint8Array): void {
    const frame = decodeFields(bytes)
    const payload = fieldBytes(frame, 8)
    if (!payload.length) return
    const response = decodeFields(payload[0] === 31 && payload[1] === 139 ? gunzip(payload) : payload)
    if (fieldInt(response, 9)) this.send(encodePushFrame('ack', fieldInt(frame, 2), fieldText(response, 5)))
    for (const field of response) {
      if (field.id !== 1 || !(field.value instanceof Uint8Array)) continue
      const message = decodeFields(field.value)
      const method = fieldText(message, 1)
      if (method !== 'WebcastChatMessage' && method !== 'WebcastRoomUserSeqMessage') continue
      const body = decodeFields(fieldBytes(message, 2))
      if (method === 'WebcastChatMessage') {
        const user = decodeFields(fieldBytes(body, 2))
        this.onMessage?.({ type: 'chat', userName: fieldText(user, 3), message: fieldText(body, 3), color: WHITE })
      } else this.onMessage?.({ type: 'online', online: Number(fieldInt(body, 7)) })
    }
  }

  private fail(reason: string): void {
    if (this.closed) return
    this.closed = true
    void this.stop().catch(error => console.error('抖音弹幕资源释放失败', error))
    this.onClose?.(reason)
  }

  async stop(): Promise<void> {
    this.generation++
    this.closed = true
    this.ready = false
    if (this.heartbeat !== undefined) clearInterval(this.heartbeat)
    this.heartbeat = undefined
    const socket = this.socket
    const web = this.web
    this.socket = undefined
    this.web = undefined
    try {
      await socket?.close()
    } finally {
      web?.dispose()
    }
  }
}
