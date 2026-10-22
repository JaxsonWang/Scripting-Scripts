import { Script, useEffect, useRef, useState } from 'scripting'
import type { LivePlayLine, LivePlayUrl, SiteId } from '../core/types'
import { WebLivePlayer } from '../player/web-player'
import type { WebInlineSupport, WebPlayerEvent } from '../player/web-player'
import { errorMessage } from '../utils/format'

export type PlaybackEngine = 'native' | 'web'

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'buffering' | 'paused' | 'error'

export type PlaybackState = {
  engine: PlaybackEngine | null
  lines: LivePlayLine[]
  lineIndex: number
  status: PlaybackStatus
  error: string | null
  /** 原生播放器已绑定媒体源，可以挂载 AVPlayerView */
  nativeReady: boolean
  /** 网页播放器因自动播放策略而静音 */
  muted: boolean
  /** Pro 用户遇到只有 FLV 的清晰度时给出的说明 */
  note: string | null
  /** 网页播放器的原位播放检测结果，原生播放器为 null */
  inline: WebInlineSupport | null
}

const INITIAL: PlaybackState = {
  engine: null,
  lines: [],
  lineIndex: 0,
  status: 'idle',
  error: null,
  nativeReady: false,
  muted: false,
  note: null,
  inline: null
}

const withHttps = (line: LivePlayLine, forceHttps: boolean): LivePlayLine => (forceHttps ? { ...line, url: line.url.replace(/^http:\/\//, 'https://') } : line)

/**
 * 直播播放：Pro 用户（Script.hasFullAccess）使用原生 AVPlayer，免费用户使用网页播放器。
 * AVPlayer 只能播放 HLS；Pro 用户遇到只提供 FLV 的清晰度时改用网页播放器，并通过 note 在界面上说明原因。
 * 当前线路出错时自动切到下一条，全部失败后停在错误状态，由用户切换清晰度或重试。
 */
export const useLivePlayback = (siteId: SiteId) => {
  const [isPro] = useState(() => Script.hasFullAccess())
  const [state, setState] = useState<PlaybackState>(INITIAL)
  const nativeRef = useRef<AVPlayer | null>(null)
  const webRef = useRef<WebLivePlayer | null>(null)
  const sourceRef = useRef<{ lines: LivePlayLine[]; headers?: Record<string, string>; engine: PlaybackEngine } | null>(null)
  /** 每次换线递增，旧线路的回调据此失效 */
  const tokenRef = useRef(0)
  const lineRef = useRef(0)
  const audioReadyRef = useRef(false)

  const patch = (next: Partial<PlaybackState>) => setState(current => ({ ...current, ...next }))

  const ensureNative = async (): Promise<AVPlayer> => {
    if (!audioReadyRef.current) {
      await SharedAudioSession.setCategory('playback', [])
      await SharedAudioSession.setActive(true)
      audioReadyRef.current = true
    }
    if (!nativeRef.current) nativeRef.current = new AVPlayer()
    return nativeRef.current
  }

  const ensureWeb = (): WebLivePlayer => {
    if (!webRef.current) webRef.current = new WebLivePlayer()
    return webRef.current
  }

  const fail = (token: number, message: string) => {
    if (token !== tokenRef.current) return
    const failed = lineRef.current
    console.warn(`[ScriptLive] 线路 ${failed + 1} 播放失败：${message}`)
    if (failed < (sourceRef.current?.lines.length ?? 0) - 1) {
      patch({ error: `线路${failed + 1}失败，正在尝试下一条` })
      playLine(failed + 1)
    } else {
      patch({ status: 'error', error: `播放失败：${message}` })
    }
  }

  const playLine = async (index: number) => {
    const source = sourceRef.current
    const line = source?.lines[index]
    if (!source || !line) return
    const token = ++tokenRef.current
    lineRef.current = index
    patch({ lineIndex: index, status: 'loading' })
    try {
      if (source.engine === 'native') {
        const player = await ensureNative()
        if (token !== tokenRef.current) return
        player.onReadyToPlay = () => {
          if (token !== tokenRef.current) return
          if (!player.play()) fail(token, '原生播放器无法开始播放')
        }
        player.onError = message => fail(token, message)
        player.onEnded = () => fail(token, '直播流已结束，主播可能已下播')
        player.onTimeControlStatusChanged = status => {
          if (token !== tokenRef.current) return
          if (status === TimeControlStatus.playing) patch({ status: 'playing', error: null })
          else if (status === TimeControlStatus.waitingToPlayAtSpecifiedRate) patch({ status: 'buffering' })
        }
        const accepted = player.setSource(line.url, source.headers ? { headers: source.headers } : undefined)
        // setSource 成功后才能挂载 AVPlayerView，否则视图绑定不到画面
        if (accepted) patch({ nativeReady: true })
        if (!accepted) fail(token, '播放地址无效')
      } else {
        const web = ensureWeb()
        web.onEvent = (event: WebPlayerEvent) => {
          if (token !== tokenRef.current) return
          if (event.type === 'playing') patch({ status: 'playing', error: null })
          else if (event.type === 'waiting') patch({ status: 'buffering' })
          else if (event.type === 'paused') patch({ status: 'paused' })
          else if (event.type === 'muted') patch({ muted: event.muted })
          else if (event.fatal) fail(token, event.message)
          else console.warn('[ScriptLive] 网页播放器提示', event.message)
        }
        const inline = await web.play(siteId, line)
        console.log('[ScriptLive] 网页原位播放检测', JSON.stringify(inline))
        if (token === tokenRef.current) patch({ inline })
      }
    } catch (error) {
      fail(token, errorMessage(error))
    }
  }

  /**
   * 开始播放一组线路。
   * @param playUrl 站点返回的播放地址
   * @param forceHttps 是否把 http 地址替换为 https
   */
  const start = async (playUrl: LivePlayUrl, forceHttps: boolean) => {
    const lines = playUrl.lines.map(line => withHttps(line, forceHttps))
    const hlsLines = lines.filter(line => line.format === 'hls')
    const engine: PlaybackEngine = isPro && hlsLines.length > 0 ? 'native' : 'web'
    const usable = engine === 'native' ? hlsLines : lines
    const note = isPro && engine === 'web' && lines.length > 0 ? '该清晰度只有 FLV 线路，原生播放器无法解码，已使用网页播放器' : null
    await stopCurrent()
    // 先创建网页控制器，下面这次渲染就能挂载 WebView，页面加载与视图挂载不再依赖后续状态更新
    if (engine === 'web') ensureWeb()
    sourceRef.current = { lines: usable, headers: playUrl.headers, engine }
    setState({ ...INITIAL, engine, lines: usable, note, status: usable.length ? 'loading' : 'error', error: usable.length ? null : '没有可用的播放线路' })
    if (usable.length) await playLine(0)
  }

  const stopCurrent = async () => {
    tokenRef.current++
    nativeRef.current?.pause()
    await webRef.current?.stop()
  }

  const setPaused = async (paused: boolean) => {
    if (sourceRef.current?.engine === 'native') {
      if (paused) nativeRef.current?.pause()
      else nativeRef.current?.play()
    } else await webRef.current?.setPaused(paused)
    if (paused) patch({ status: 'paused' })
  }

  /** 停止播放并清空状态，用于未开播或重新加载房间 */
  const reset = async () => {
    await stopCurrent()
    sourceRef.current = null
    setState(INITIAL)
  }

  useEffect(
    () => () => {
      tokenRef.current++
      nativeRef.current?.dispose()
      webRef.current?.dispose()
      if (audioReadyRef.current) SharedAudioSession.setActive(false).catch(error => console.warn('[ScriptLive] 释放音频会话失败', error))
    },
    []
  )

  return {
    isPro,
    state,
    nativePlayer: nativeRef.current,
    webController: webRef.current?.controller ?? null,
    start,
    playLine,
    setPaused,
    reset
  }
}
