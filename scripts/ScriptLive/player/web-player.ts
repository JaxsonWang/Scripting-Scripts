import { Path, Script } from 'scripting'
import type { LivePlayLine, SiteId } from '../core/types'

/** 页面回传给脚本的播放状态 */
export type WebPlayerEvent =
  | { type: 'playing' }
  | { type: 'waiting' }
  | { type: 'paused' }
  | { type: 'muted'; muted: boolean }
  | { type: 'error'; message: string; fatal: boolean }

/**
 * 网页内原位播放的检测结果。
 * playsInline 来自 <video playsinline>；inlineAllowed 来自 WebKit 的 (-webkit-video-playable-inline) 媒体查询，
 * 反映宿主 WKWebView 的 allowsInlineMediaPlayback，为 false 时 iPhone 会进入系统全屏播放。
 */
export type WebInlineSupport = { playsInline: boolean; inlineAllowed: boolean }

/**
 * 页面的来源决定了 <video> / mpegts.js 请求 CDN 时带的 Referer 与 Origin。
 * 各平台 CDN 按自家域名放行跨域，因此用房间所在站点作为 baseURL。
 */
const PAGE_ORIGIN: Record<SiteId, string> = {
  bilibili: 'https://live.bilibili.com/',
  douyu: 'https://m.douyu.com/',
  huya: 'https://www.huya.com/',
  douyin: 'https://live.douyin.com/'
}

let mpegtsSource: string | null = null

/** mpegts.js（Apache-2.0）随脚本分发在 assets 目录，首次播放 FLV 前读取一次 */
const loadMpegts = async (): Promise<string> => {
  if (mpegtsSource === null) mpegtsSource = await FileManager.readAsString(Path.join(Script.directory, 'assets', 'mpegts.js'))
  return mpegtsSource
}

const PAGE_SCRIPT = String.raw`
(() => {
  const video = document.getElementById('v')
  let flv = null
  let playRequest = 0
  // 线路请求编号随消息跨桥回传，排队中的旧事件不能更新新线路。
  let sourceRequest = 0
  const post = (message, request = sourceRequest) => { try { window.webkit.messageHandlers.playerEvent.postMessage({ ...message, request }) } catch (e) {} }
  const destroyFlv = () => { if (flv) { try { flv.destroy() } catch (e) {} flv = null } }
  // play() 被拒只说明这次没播起来（如来电、切后台时系统打断）；媒体源失败由 video 的 error 事件和 mpegts 的 ERROR 上报为致命错误
  const report = error => post({ type: 'error', message: String(error && error.message || error), fatal: false })
  const tryPlay = () => {
    const request = ++playRequest
    return video.play().catch(error => {
      if (request !== playRequest) return
      if (!error || error.name !== 'NotAllowedError') return report(error)
      // 带声音的自动播放被拦截时静音播放，由脚本界面提示点按恢复声音
      video.muted = true
      post({ type: 'muted', muted: true })
      return video.play().catch(error => {
        if (request !== playRequest) return
        report(error)
        // 静音也无法自动播放时停在暂停态，由播放器控件的「继续播放」再次发起
        if (error && error.name === 'NotAllowedError') post({ type: 'paused' })
      })
    })
  }
  video.addEventListener('playing', () => post({ type: 'playing' }))
  video.addEventListener('waiting', () => post({ type: 'waiting' }))
  video.addEventListener('pause', () => post({ type: 'paused' }))
  video.addEventListener('error', () => {
    const error = video.error
    post({ type: 'error', message: error ? 'MediaError ' + error.code + (error.message ? ': ' + error.message : '') : '播放失败', fatal: true })
  })
  window.__play = (url, format, request) => {
    playRequest++
    sourceRequest = request
    destroyFlv()
    video.removeAttribute('src')
    video.load()
    post({ type: 'muted', muted: video.muted })
    if (format === 'flv') {
      if (!window.mpegts || !mpegts.getFeatureList().mseLivePlayback) {
        post({ type: 'error', message: '当前系统不支持网页播放 FLV（需要 iOS 17.1 及以上）', fatal: true })
        return
      }
      flv = mpegts.createPlayer({ type: 'flv', isLive: true, url }, { enableWorker: false, lazyLoad: false, liveBufferLatencyChasing: true, liveBufferLatencyMaxLatency: 6, liveBufferLatencyMinRemain: 1 })
      flv.on(mpegts.Events.ERROR, (type, detail) => post({ type: 'error', message: type + ': ' + detail, fatal: true }, request))
      flv.attachMediaElement(video)
      flv.load()
    } else {
      video.src = url
    }
    tryPlay()
  }
  window.__setPaused = (paused, request) => { sourceRequest = request; if (paused) { playRequest++; video.pause() } else tryPlay() }
  window.__setMuted = muted => { video.muted = muted; post({ type: 'muted', muted }) }
  window.__stop = request => { playRequest++; sourceRequest = request; destroyFlv(); video.pause(); video.removeAttribute('src'); video.load() }
})()
`

const pageHtml = (mpegts: string) => `<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<meta name="referrer" content="strict-origin-when-cross-origin">
<style>
html,body{margin:0;height:100%;background:#000;overflow:hidden}
video{width:100%;height:100%;object-fit:contain;background:#000}
</style></head>
<body>
<video id="v" playsinline webkit-playsinline autoplay disableremoteplayback></video>
<script>${mpegts}</script>
<script>${PAGE_SCRIPT}</script>
</body></html>`

/**
 * 免费用户的网页播放器：WKWebView 的 <video> 直接播放 HLS，FLV 交给 mpegts.js（需要 ManagedMediaSource，iOS 17.1+）。
 * 网页播放无法附带自定义请求头。<video> 不显示网页控件，播放、暂停与声音由直播间的播放器控件统一操作，
 * 这样网页与原生播放器的全屏、弹幕层级保持一致。
 */
export class WebLivePlayer {
  readonly controller = new WebViewController()
  private loadedSite: SiteId | null = null
  private loadingPage: Promise<void> | null = null
  private handlerAdded = false
  private playRequest = 0
  private disposed = false
  onEvent?: (event: WebPlayerEvent) => void

  private async ensurePage(siteId: SiteId) {
    while (this.loadingPage) await this.loadingPage
    if (this.disposed || this.loadedSite === siteId) return
    this.loadingPage = this.loadPage(siteId)
    try {
      await this.loadingPage
    } finally {
      this.loadingPage = null
    }
  }

  private async loadPage(siteId: SiteId) {
    if (!this.handlerAdded) {
      await this.controller.addScriptMessageHandler<WebPlayerEvent & { request: number }>('playerEvent', event => {
        if (!event || this.disposed || event.request !== this.playRequest) return
        if (event.type === 'error' && event.fatal) this.playRequest++
        this.onEvent?.(event)
      })
      this.handlerAdded = true
    }
    if (this.disposed) return
    const mpegts = await loadMpegts()
    if (this.disposed) return
    const loaded = await this.controller.loadHTML(pageHtml(mpegts), PAGE_ORIGIN[siteId])
    if (this.disposed) return
    if (!loaded) throw new Error('网页播放器加载失败')
    this.loadedSite = siteId
  }

  async play(siteId: SiteId, line: LivePlayLine): Promise<WebInlineSupport | null> {
    const request = ++this.playRequest
    await this.ensurePage(siteId)
    if (this.disposed || request !== this.playRequest) return null
    return this.controller.evaluateJavaScript<WebInlineSupport>(`
      window.__play(${JSON.stringify(line.url)}, ${JSON.stringify(line.format)}, ${request})
      return {
        playsInline: document.getElementById('v').playsInline,
        inlineAllowed: window.matchMedia('(-webkit-video-playable-inline)').matches
      }
    `)
  }

  async setPaused(paused: boolean) {
    const request = ++this.playRequest
    if (this.loadedSite) await this.controller.evaluateJavaScript(`window.__setPaused(${paused}, ${request})`)
  }

  async setMuted(muted: boolean) {
    if (this.loadedSite) await this.controller.evaluateJavaScript(`window.__setMuted(${muted})`)
  }

  async stop() {
    const request = ++this.playRequest
    if (this.loadedSite) await this.controller.evaluateJavaScript(`window.__stop(${request})`)
  }

  dispose() {
    this.disposed = true
    this.playRequest++
    this.onEvent = undefined
    this.controller.dispose()
  }
}
