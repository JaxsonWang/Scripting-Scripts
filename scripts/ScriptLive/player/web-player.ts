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
  douyu: 'https://www.douyu.com/',
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
  const tip = document.getElementById('tip')
  let flv = null
  const post = message => { try { window.webkit.messageHandlers.playerEvent.postMessage(message) } catch (e) {} }
  const destroyFlv = () => { if (flv) { try { flv.destroy() } catch (e) {} flv = null } }
  const tryPlay = () => video.play().catch(() => {
    // 带声音的自动播放被拦截时静音播放，并提示点按恢复声音
    video.muted = true
    tip.style.display = 'block'
    post({ type: 'muted', muted: true })
    return video.play().catch(error => post({ type: 'error', message: String(error && error.message || error), fatal: false }))
  })
  tip.onclick = () => { video.muted = false; tip.style.display = 'none'; post({ type: 'muted', muted: false }) }
  video.addEventListener('playing', () => post({ type: 'playing' }))
  video.addEventListener('waiting', () => post({ type: 'waiting' }))
  video.addEventListener('pause', () => post({ type: 'paused' }))
  video.addEventListener('error', () => {
    const error = video.error
    post({ type: 'error', message: error ? 'MediaError ' + error.code + (error.message ? ': ' + error.message : '') : '播放失败', fatal: true })
  })
  window.__play = (url, format) => {
    destroyFlv()
    video.removeAttribute('src')
    video.load()
    if (format === 'flv') {
      if (!window.mpegts || !mpegts.getFeatureList().mseLivePlayback) {
        post({ type: 'error', message: '当前系统不支持网页播放 FLV（需要 iOS 17.1 及以上）', fatal: true })
        return
      }
      flv = mpegts.createPlayer({ type: 'flv', isLive: true, url }, { enableWorker: false, lazyLoad: false, liveBufferLatencyChasing: true, liveBufferLatencyMaxLatency: 6, liveBufferLatencyMinRemain: 1 })
      flv.on(mpegts.Events.ERROR, (type, detail) => post({ type: 'error', message: type + ': ' + detail, fatal: true }))
      flv.attachMediaElement(video)
      flv.load()
    } else {
      video.src = url
    }
    tryPlay()
  }
  window.__setPaused = paused => { if (paused) video.pause(); else tryPlay() }
  window.__stop = () => { destroyFlv(); video.pause(); video.removeAttribute('src'); video.load() }
})()
`

const pageHtml = (mpegts: string) => `<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<meta name="referrer" content="strict-origin-when-cross-origin">
<style>
html,body{margin:0;height:100%;background:#000;overflow:hidden}
video{width:100%;height:100%;object-fit:contain;background:#000}
#tip{display:none;position:absolute;right:10px;bottom:46px;padding:6px 12px;border-radius:14px;background:rgba(0,0,0,.6);color:#fff;font:600 13px -apple-system;z-index:2}
</style></head>
<body>
<video id="v" playsinline webkit-playsinline autoplay controls disableremoteplayback></video>
<div id="tip">🔇 点按开启声音</div>
<script>${mpegts}</script>
<script>${PAGE_SCRIPT}</script>
</body></html>`

/**
 * 免费用户的网页播放器：WKWebView 的 <video> 直接播放 HLS，FLV 交给 mpegts.js（需要 ManagedMediaSource，iOS 17.1+）。
 * 网页播放无法附带自定义请求头。
 */
export class WebLivePlayer {
  readonly controller = new WebViewController()
  private loadedSite: SiteId | null = null
  onEvent?: (event: WebPlayerEvent) => void

  private async ensurePage(siteId: SiteId) {
    if (this.loadedSite === siteId) return
    if (this.loadedSite === null) {
      await this.controller.addScriptMessageHandler<WebPlayerEvent>('playerEvent', event => {
        if (event) this.onEvent?.(event)
      })
    }
    const loaded = await this.controller.loadHTML(pageHtml(await loadMpegts()), PAGE_ORIGIN[siteId])
    if (!loaded) throw new Error('网页播放器加载失败')
    this.loadedSite = siteId
  }

  async play(siteId: SiteId, line: LivePlayLine): Promise<WebInlineSupport> {
    await this.ensurePage(siteId)
    return this.controller.evaluateJavaScript<WebInlineSupport>(`
      window.__play(${JSON.stringify(line.url)}, ${JSON.stringify(line.format)})
      return {
        playsInline: document.getElementById('v').playsInline,
        inlineAllowed: window.matchMedia('(-webkit-video-playable-inline)').matches
      }
    `)
  }

  async setPaused(paused: boolean) {
    if (this.loadedSite) await this.controller.evaluateJavaScript(`window.__setPaused(${paused})`)
  }

  async stop() {
    if (this.loadedSite) await this.controller.evaluateJavaScript('window.__stop()')
  }

  dispose() {
    this.onEvent = undefined
    this.controller.dispose()
  }
}
