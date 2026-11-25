import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import 'tsx/cjs'

const load = createRequire(import.meta.url)
const { currentQualityLevel } = load('../scripts/ScriptLive/services/network-quality.ts')
const { HuyaSite } = load('../scripts/ScriptLive/core/sites/huya.ts')
const { HuyaDanmaku } = load('../scripts/ScriptLive/core/sites/huya-danmaku.ts')
const { TarsReader, TarsWriter } = load('../scripts/ScriptLive/core/sites/huya-tars.ts')

class NativeData {
  constructor(bytes) {
    this.bytes = Uint8Array.from(bytes)
  }
  static fromUint8Array(bytes) {
    return new NativeData(bytes)
  }
  static fromBase64String(text) {
    return new NativeData(Buffer.from(text, 'base64'))
  }
  toUint8Array() {
    return this.bytes
  }
  toBase64String() {
    return Buffer.from(this.bytes).toString('base64')
  }
  toHexString() {
    return Buffer.from(this.bytes).toString('hex')
  }
}
globalThis.Data = NativeData
globalThis.Crypto = { md5: data => new NativeData(createHash('md5').update(data.toUint8Array()).digest()) }
test.after(() => {
  delete globalThis.Data
  delete globalThis.Crypto
})

const loadScript = (path, imports, globals = {}) => {
  const module = { exports: {} }
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ESNext } })
  vm.runInNewContext(
    outputText,
    {
      module,
      exports: module.exports,
      require: name => {
        assert.ok(Object.hasOwn(imports, name), `未模拟模块：${name}`)
        return imports[name]
      },
      console,
      ...globals
    },
    { filename: path }
  )
  return module.exports
}

test('网络画质使用实际存在的接口 API，保留 Wi-Fi / 蜂窝偏好', t => {
  const address = (value, isInternal = false) => ({ address: value, isInternal })
  const settings = { qualityLevel: 2, qualityLevelCellular: 0 }
  const cases = [
    [{ en0: [address('192.168.1.2')] }, 2],
    [{ pdp_ip0: [address('10.1.2.3')] }, 0],
    [{ en0: [address('2001:db8::1')], pdp_ip0: [address('10.1.2.3')] }, 2],
    [{ pdp_ip1: [address('2001:db8::2')], en0: [address('fe80::1'), address('169.254.1.1')] }, 0],
    [{ lo0: [address('127.0.0.1', true)], utun0: [address('10.7.0.1')] }, 2],
    [{ pdp_ip0: [address('::'), address('0.0.0.0')] }, 2],
    [{}, 2]
  ]
  for (const [interfaces, expected] of cases) {
    globalThis.Device = { networkInterfaces: () => interfaces }
    assert.equal(currentQualityLevel(settings), expected)
  }
  t.after(() => delete globalThis.Device)
})

test('读取网络接口失败时保留默认画质并记录原因', t => {
  const error = new Error('接口读取失败')
  const warn = t.mock.method(console, 'warn', () => {})
  globalThis.Device = {
    networkInterfaces: () => {
      throw error
    }
  }
  t.after(() => delete globalThis.Device)
  assert.equal(currentQualityLevel({ qualityLevel: 1, qualityLevelCellular: 0 }), 1)
  assert.equal(warn.mock.calls[0].arguments[1], error)
})

const mockHuyaRequests = (t, token = 'wsSecret=fixture', presenterUid = '123') => {
  const streams = ['HS', 'AL', 'TX'].map(sCdnType => ({
    sCdnType,
    sStreamName: 'fixture',
    sFlvUrl: `http://${sCdnType.toLowerCase()}.flv.huya.com/src`,
    sHlsUrl: `http://${sCdnType.toLowerCase()}.hls.huya.com/src`,
    lPresenterUid: presenterUid,
    lChannelId: '123',
    lSubChannelId: '456'
  }))
  const roomInfo = {
    eLiveStatus: 2,
    tProfileInfo: { sNick: '主播' },
    tLiveInfo: { lYyid: '123', tLiveStreamInfo: { vStreamInfo: { value: streams }, vBitRateInfo: { value: [{ sDisplayName: '高清', iBitRate: 2000 }] } } }
  }
  const responseBody = new TarsWriter().writeBytesMap({ tRsp: new TarsWriter().writeStruct(0, writer => writer.writeString(token, 0)).toBytes() }, 0)
  const packet = new TarsWriter().writeBytes(responseBody.toBytes(), 7).toBytes()
  const response = new Uint8Array(packet.length + 4)
  new DataView(response.buffer).setInt32(0, response.length)
  response.set(packet, 4)
  return t.mock.method(globalThis, 'fetch', async url =>
    String(url).startsWith('https://m.huya.com/')
      ? new Response(`<script>window.HNF_GLOBAL_INIT=${JSON.stringify({ roomInfo })};</script>`)
      : new Response(response)
  )
}

test('虎牙按 HLS / FLV 分别排序，保留所有 CDN 与所选码率', async t => {
  const requests = mockHuyaRequests(t)
  const site = new HuyaSite()
  const detail = await site.getRoomDetail('123')
  const [quality] = await site.getPlayQualities(detail)
  const { lines } = await site.getPlayUrls(detail, quality)
  assert.deepEqual(
    lines.map(line => line.name),
    ['TX HLS', 'AL HLS', 'HS HLS', 'TX FLV', 'HS FLV', 'AL FLV']
  )
  assert.ok(lines.every(line => new URL(line.url).searchParams.get('ratio') === '2000'))
  assert.equal(requests.mock.callCount(), 2)
})

test('虎牙 fm 签名保留 int64 uid、序列号、低 32 位轮转与 MD5', async t => {
  t.mock.method(Date, 'now', () => 1700000000000)
  const fm = Buffer.from('fixture_$0_$1_$2_$3').toString('base64')
  const token = new URLSearchParams({ fm, wsTime: '6553f100', ctype: 'huya_pc_exe', t: '102', fs: 'fixture' }).toString()
  mockHuyaRequests(t, token, '9007199254740993')
  const site = new HuyaSite()
  const detail = await site.getRoomDetail('123')
  const [quality] = await site.getPlayQualities(detail)
  const { lines } = await site.getPlayUrls(detail, quality)
  assert.equal(lines.length, 6)
  for (const { url } of lines) {
    const params = new URL(url).searchParams
    assert.equal(params.get('u'), '9007199254741248')
    assert.equal(params.get('seqid'), '9008899254740993')
    assert.equal(params.get('wsSecret'), '426912e584b7ad3d40853cf7d7327687')
    assert.equal(params.get('wsTime'), '6553f100')
    assert.equal(params.get('fm'), fm)
    assert.equal(params.get('ratio'), '2000')
  }
})

const args = { ayyuid: '9007199254740993', topSid: '123', subSid: '456' }
const push = (uri, body) =>
  new TarsWriter().writeInt(7, 0).writeBytes(new TarsWriter().writeInt(0, 0).writeInt(uri, 1).writeBytes(body.toBytes(), 2).toBytes(), 1).toBytes()

const mockBrowser = (t, { holdLoad = false, loadResult = true } = {}) => {
  const views = []
  class BrowserSocket {
    sent = []
    closed = false
    constructor(url) {
      this.url = url
    }
    send(bytes) {
      this.sent.push(Uint8Array.from(bytes))
    }
    close() {
      this.closed = true
    }
  }
  globalThis.WebViewController = class {
    intervals = new Map()
    listeners = new Map()
    disposed = false
    loadCount = 0
    constructor(options) {
      this.options = options
      views.push(this)
    }
    async addScriptMessageHandler(name, handler) {
      this.handler = handler
      this.handlerName = name
    }
    async addEventListener(type, listener) {
      this.listeners.set(type, listener)
    }
    async loadHTML(html, baseURL) {
      this.loadCount++
      this.html = html
      this.baseURL = baseURL
      if (holdLoad) return new Promise(resolve => (this.finishLoad = resolve))
      return loadResult
    }
    async evaluateJavaScript(source) {
      const attachSocket = socket => (this.socket = socket)
      const context = {
        atob,
        btoa,
        Uint8Array,
        WebSocket: class extends BrowserSocket {
          constructor(url) {
            super(url)
            attachSocket(this)
          }
        },
        setInterval: (callback, delay) => {
          const id = Symbol()
          this.intervals.set(id, { callback, delay })
          return id
        },
        clearInterval: id => this.intervals.delete(id),
        window: { webkit: { messageHandlers: { [this.handlerName]: { postMessage: event => this.handler(event) } } } }
      }
      return vm.runInNewContext(`(function () { ${source} })()`, context)
    }
    dispose() {
      this.disposed = true
      this.intervals.clear()
      this.listeners.clear()
      this.socket?.close()
      this.finishLoad?.(false)
    }
  }
  t.after(() => delete globalThis.WebViewController)
  return views
}

test('虎牙使用隔离网页连接，入房保留 int64，60 秒心跳且收到推送才就绪', async t => {
  const views = mockBrowser(t)
  const client = new HuyaDanmaku()
  t.after(() => client.stop())
  const ready = t.mock.fn()
  const message = t.mock.fn()
  client.onReady = ready
  client.onMessage = message
  await client.start(args)
  const [web] = views
  assert.equal(web.options.ephemeral, true)
  assert.equal(web.options.settings.inactiveSchedulingPolicy, 'none')
  assert.equal(web.baseURL, 'https://www.huya.com/')
  assert.ok(web.html.includes('connect-src wss://cdnws.api.huya.com'))
  assert.equal(web.socket.binaryType, 'arraybuffer')
  web.socket.onopen()
  assert.equal(ready.mock.callCount(), 0)
  const join = new TarsReader(web.socket.sent[0])
  assert.equal(join.readNumber(0), 1)
  const registration = new TarsReader(join.readBytes(1, true))
  assert.equal(registration.readLong(0), BigInt(args.ayyuid))
  assert.equal(registration.readNumber(4), 123)
  assert.equal(registration.readNumber(5), 456)
  const [heartbeat] = web.intervals.values()
  assert.equal(heartbeat.delay, 60000)
  heartbeat.callback()
  assert.equal(Buffer.from(web.socket.sent[1]).toString('base64'), 'ABQdAAwsNgBM')
  const chat = push(
    1400,
    new TarsWriter()
      .writeStruct(0, writer => writer.writeString('观众', 2))
      .writeString('你好 👋', 3)
      .writeStruct(6, writer => writer.writeInt(0xff3b5c, 0))
  )
  web.socket.onmessage({ data: chat.buffer })
  const online = push(8006, new TarsWriter().writeInt(1234, 0))
  web.socket.onmessage({ data: online.buffer })
  assert.equal(ready.mock.callCount(), 1)
  assert.deepEqual(
    message.mock.calls.map(call => call.arguments[0]),
    [
      { type: 'chat', userName: '观众', message: '你好 👋', color: { r: 255, g: 59, b: 92 } },
      { type: 'online', online: 1234 }
    ]
  )
  await client.stop()
  assert.equal(web.disposed, true)
  assert.equal(web.intervals.size, 0)
})

test('虎牙断开只通知一次，清理心跳；旧连接事件不影响重连', async t => {
  const views = mockBrowser(t)
  const client = new HuyaDanmaku()
  t.after(() => client.stop())
  const close = t.mock.fn()
  client.onClose = close
  await client.start(args)
  const old = views[0]
  old.socket.onopen()
  const queuedError = old.socket.onerror
  old.socket.onclose({ code: 1006, reason: '断开' })
  assert.equal(close.mock.callCount(), 1)
  assert.match(close.mock.calls[0].arguments[0], /1006/)
  assert.equal(old.intervals.size, 0)
  await client.start(args)
  queuedError()
  assert.equal(close.mock.callCount(), 1)
  assert.equal(views[1].disposed, false)
})

test('虎牙在网页加载中停止，不再创建连接；加载失败释放资源', async t => {
  const views = mockBrowser(t, { holdLoad: true })
  const client = new HuyaDanmaku()
  const starting = client.start(args)
  await new Promise(setImmediate)
  await client.stop()
  await starting
  assert.equal(views[0].disposed, true)
  assert.equal(views[0].socket, undefined)

  const failedViews = mockBrowser(t, { loadResult: false })
  await assert.rejects(client.start(args), /网页环境加载失败/)
  assert.equal(failedViews[0].disposed, true)
})

test('虎牙无效入房参数不创建网页连接', async t => {
  const views = mockBrowser(t)
  const client = new HuyaDanmaku()
  await assert.rejects(client.start(undefined), /参数不完整/)
  await assert.rejects(client.start({ ...args, topSid: 'invalid' }), /参数不完整/)
  assert.equal(views.length, 0)
})

test('虎牙网页进程终止会断开并释放资源，旧事件不影响新连接', async t => {
  const views = mockBrowser(t)
  const client = new HuyaDanmaku()
  t.after(() => client.stop())
  const close = t.mock.fn()
  client.onClose = close
  await client.start(args)
  const old = views[0]
  old.socket.onopen()
  const terminated = old.listeners.get('webContentProcessTerminated')
  terminated()
  terminated()
  assert.equal(close.mock.callCount(), 1)
  assert.match(close.mock.calls[0].arguments[0], /网页已停止/)
  assert.equal(old.disposed, true)
  assert.equal(old.intervals.size, 0)
  await client.start(args)
  terminated()
  assert.equal(views[1].disposed, false)
  assert.equal(close.mock.callCount(), 1)
})

test('虎牙在网页加载中进程终止，只报告一次断开且不创建 socket', async t => {
  const views = mockBrowser(t, { holdLoad: true })
  const client = new HuyaDanmaku()
  const close = t.mock.fn()
  client.onClose = close
  const starting = client.start(args)
  await new Promise(setImmediate)
  views[0].listeners.get('webContentProcessTerminated')()
  await starting
  assert.equal(close.mock.callCount(), 1)
  assert.equal(views[0].disposed, true)
  assert.equal(views[0].socket, undefined)
})

const loadWebPlayer = () =>
  loadScript(
    '../scripts/ScriptLive/player/web-player.ts',
    { scripting: { Path: { join: (...parts) => parts.join('/') }, Script: { directory: '/fixture' } } },
    { WebViewController: globalThis.WebViewController, FileManager: { readAsString: async () => '' } }
  ).WebLivePlayer

const playLine = { name: 'TX HLS', format: 'hls', url: 'https://fixture.example/live.m3u8' }

test('网页播放器进程终止后重建页面，重复终止和旧线路事件不会重复换线', async t => {
  const views = mockBrowser(t)
  const WebLivePlayer = loadWebPlayer()
  const player = new WebLivePlayer()
  t.after(() => player.dispose())
  const [web] = views
  t.mock.method(web, 'evaluateJavaScript', async () => ({ playsInline: true, inlineAllowed: true }))
  const event = t.mock.fn()
  player.onEvent = event
  await player.play('huya', playLine)
  const terminated = web.listeners.get('webContentProcessTerminated')
  terminated()
  terminated()
  assert.equal(event.mock.callCount(), 1)
  assert.equal(event.mock.calls[0].arguments[0].fatal, true)
  await player.play('huya', playLine)
  assert.equal(web.loadCount, 2)
  web.handler({ type: 'playing', request: 1 })
  assert.equal(event.mock.callCount(), 1)
  web.handler({ type: 'playing', request: 3 })
  assert.equal(event.mock.callCount(), 2)
  player.dispose()
  terminated()
  assert.equal(event.mock.callCount(), 2)
})

test('网页播放器加载中进程终止只走加载失败路径，再试可重新加载', async t => {
  const views = mockBrowser(t, { holdLoad: true })
  const WebLivePlayer = loadWebPlayer()
  const player = new WebLivePlayer()
  t.after(() => player.dispose())
  const [web] = views
  t.mock.method(web, 'evaluateJavaScript', async () => ({ playsInline: true, inlineAllowed: true }))
  const event = t.mock.fn()
  player.onEvent = event
  const starting = player.play('huya', playLine)
  await new Promise(setImmediate)
  web.listeners.get('webContentProcessTerminated')()
  web.finishLoad(false)
  await assert.rejects(starting, /网页播放器加载失败/)
  assert.equal(event.mock.callCount(), 0)
  const retry = player.play('huya', playLine)
  await new Promise(setImmediate)
  web.finishLoad(true)
  assert.ok(await retry)
  assert.equal(web.loadCount, 2)
})

test('自动换线更新加载线路，全部失败后停止；手动重试清除旧错误且忽略旧回调', async t => {
  const slots = []
  const cleanups = []
  let cursor = 0
  const scripting = {
    Script: { hasFullAccess: () => true },
    useState: initial => {
      const index = cursor++
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial
      return [slots[index], next => (slots[index] = typeof next === 'function' ? next(slots[index]) : next)]
    },
    useRef: initial => {
      const index = cursor++
      return (slots[index] ??= { current: initial })
    },
    useEffect: effect => {
      const index = cursor++
      if (index in slots) return
      slots[index] = true
      cleanups.push(effect())
    }
  }
  const sources = t.mock.fn(() => true)
  const { useLivePlayback } = loadScript(
    '../scripts/ScriptLive/hooks/useLivePlayback.ts',
    {
      scripting,
      '../player/web-player': {},
      '../utils/format': { errorMessage: error => error.message }
    },
    {
      AVPlayer: class {
        setSource = sources
        play() {
          return true
        }
        pause() {}
        dispose() {}
      },
      SharedAudioSession: { setCategory: async () => {}, setActive: async () => {} },
      VideoPictureInPictureController: { isSupported: () => false },
      TimeControlStatus: { playing: 'playing' }
    }
  )
  t.after(() => cleanups.forEach(cleanup => cleanup?.()))
  const warnings = t.mock.method(console, 'warn', () => {})
  const render = () => {
    cursor = 0
    return useLivePlayback('huya')
  }
  await render().start({ lines: ['TX', 'AL', 'HS'].map(cdn => ({ ...playLine, name: `${cdn} HLS` })) }, false)
  const player = render().nativePlayer
  const oldError = player.onError
  player.onError('404')
  assert.equal(render().state.status, 'loading')
  assert.equal(render().state.lineIndex, 1)
  await new Promise(setImmediate)
  oldError('旧错误')
  assert.equal(render().state.lineIndex, 1)
  player.onError('403')
  await new Promise(setImmediate)
  player.onError('网络错误')
  assert.equal(render().state.status, 'error')
  assert.match(render().state.error, /网络错误/)
  assert.equal(sources.mock.callCount(), 3)
  assert.match(warnings.mock.calls[0].arguments[0], /huya 线路 1（TX HLS）/)
  const retry = render().playLine(0)
  assert.equal(render().state.error, null)
  assert.equal(render().state.status, 'loading')
  assert.equal(render().state.lineIndex, 0)
  await retry
  player.onTimeControlStatusChanged('playing')
  assert.equal(render().state.status, 'playing')
  assert.equal(sources.mock.callCount(), 4)
})
