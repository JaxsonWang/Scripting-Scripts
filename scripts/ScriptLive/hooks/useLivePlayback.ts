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

/** 原生播放器的画中画状态；设备不支持或非 Pro 时整体为 null */
export type PictureInPictureState = {
  /** 源视图在屏幕上且系统允许启动 */
  possible: boolean
  /** 系统画中画窗口正在运行 */
  active: boolean
}

const withHttps = (line: LivePlayLine, forceHttps: boolean): LivePlayLine => (forceHttps ? { ...line, url: line.url.replace(/^http:\/\//, 'https://') } : line)

/**
 * 直播播放：Pro 用户（Script.hasFullAccess）使用原生 AVPlayer，免费用户使用网页播放器。
 * AVPlayer 只能播放 HLS；Pro 用户遇到只提供 FLV 的清晰度时改用网页播放器，并通过 note 在界面上说明原因。
 * 当前线路出错时自动切到下一条，全部失败后停在错误状态，由用户切换清晰度或重试。
 * 原生播放器支持系统画中画（VideoPictureInPictureController），AVPlayerView 需以 layer 模式绑定 pictureInPicture 句柄。
 */
export const useLivePlayback = (siteId: SiteId) => {
  const [isPro] = useState(() => Script.hasFullAccess())
  const [state, setState] = useState<PlaybackState>(INITIAL)
  /** 整个直播间共用一个句柄：重渲染、换线路都不替换，离开页面时释放 */
  const [pip] = useState(() => (isPro && VideoPictureInPictureController.isSupported() ? new VideoPictureInPictureController() : null))
  const [pipState, setPipState] = useState<PictureInPictureState>({ possible: false, active: false })
  /** 等待画中画 didStop 的换源请求 */
  const pipStopWaiters = useRef<(() => void)[]>([])
  /** 用户暂停了原生播放器：起播就绪时不再自动开始 */
  const userPausedRef = useRef(false)
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

  /** 系统要求替换视频前先停止画中画并等到 didStop */
  const exitPictureInPicture = async () => {
    if (!pip?.isActive) return
    await new Promise<void>(resolve => {
      pipStopWaiters.current.push(resolve)
      pip.stop()
    })
  }

  const playLine = async (index: number) => {
    const source = sourceRef.current
    const line = source?.lines[index]
    if (!source || !line) return
    const token = ++tokenRef.current
    lineRef.current = index
    userPausedRef.current = false
    patch({ lineIndex: index, status: 'loading' })
    try {
      if (source.engine === 'native') {
        const player = await ensureNative()
        await exitPictureInPicture()
        if (token !== tokenRef.current) return
        player.onReadyToPlay = () => {
          if (token !== tokenRef.current || userPausedRef.current) return
          if (!player.play()) fail(token, '原生播放器无法开始播放')
        }
        player.onError = message => fail(token, message)
        player.onEnded = () => fail(token, '直播流已结束，主播可能已下播')
        player.onTimeControlStatusChanged = status => {
          if (token !== tokenRef.current) return
          if (status === TimeControlStatus.playing) patch({ status: 'playing', error: null })
          else if (status === TimeControlStatus.waitingToPlayAtSpecifiedRate) patch({ status: 'buffering' })
          // 起播前也会报告 paused，只有播放开始后的暂停（画中画窗口、锁屏控制中心）才更新界面
          else setState(current => (current.status === 'playing' || current.status === 'buffering' ? { ...current, status: 'paused' } : current))
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
    await exitPictureInPicture()
    await webRef.current?.stop()
  }

  /**
   * 暂停或继续。直播继续播放时重新加载当前线路，回到直播进度而不是从暂停处接着播；
   * 画中画期间换源会退出画中画，所以直接在原处继续。
   * 原生播放器暂停时保留状态回调，画中画窗口和锁屏上的播放 / 暂停也能同步到界面。
   * @param paused 是否暂停
   */
  const setPaused = async (paused: boolean) => {
    const native = sourceRef.current?.engine === 'native' ? nativeRef.current : null
    if (native && paused) {
      userPausedRef.current = true
      native.pause()
      patch({ status: 'paused' })
      return
    }
    if (native && pip?.isActive) {
      userPausedRef.current = false
      if (!native.play()) fail(tokenRef.current, '原生播放器无法继续播放')
      return
    }
    if (!paused) return playLine(lineRef.current)
    tokenRef.current++
    await webRef.current?.setPaused(true)
    patch({ status: 'paused' })
  }

  /** 开启或退出画中画。start() 只能在用户操作中调用，请求被拒绝或启动失败时提示原因 */
  const togglePictureInPicture = async () => {
    if (!pip) return
    if (pip.isActive) {
      pip.stop()
      return
    }
    if (!pip.start()) await Dialog.alert({ title: '无法开启画中画', message: pip.lastError ?? '画面还没有准备好，请等视频开始播放后再试' })
  }

  /** 网页播放器因自动播放策略静音后，由用户点按恢复声音 */
  const unmute = async () => {
    await webRef.current?.setMuted(false)
  }

  /** 停止播放并清空状态，用于未开播或重新加载房间 */
  const reset = async () => {
    await stopCurrent()
    sourceRef.current = null
    setState(INITIAL)
  }

  useEffect(() => {
    if (pip) {
      pip.onPossibleChanged = possible => setPipState(current => ({ ...current, possible }))
      pip.onStateChanged = event => {
        if (event === 'didStart') setPipState(current => ({ ...current, active: true }))
        else if (event === 'didStop') {
          setPipState(current => ({ ...current, active: false }))
          for (const resolve of pipStopWaiters.current.splice(0)) resolve()
        } else if (event === 'failedToStart') {
          console.warn('[ScriptLive] 画中画启动失败', pip.lastError)
          Dialog.alert({ title: '无法开启画中画', message: pip.lastError ?? '系统拒绝了画中画请求' }).catch(error =>
            console.warn('[ScriptLive] 提示框显示失败', error)
          )
        }
      }
    }
    return () => {
      tokenRef.current++
      // 先释放画中画句柄，再释放它所依赖的播放器
      pip?.dispose()
      nativeRef.current?.dispose()
      webRef.current?.dispose()
      if (audioReadyRef.current) SharedAudioSession.setActive(false).catch(error => console.warn('[ScriptLive] 释放音频会话失败', error))
    }
  }, [])

  return {
    isPro,
    state,
    nativePlayer: nativeRef.current,
    webController: webRef.current?.controller ?? null,
    /** 绑定到 layer 模式 AVPlayerView 的画中画句柄 */
    pipController: pip,
    /** 仅原生播放器时有值 */
    pictureInPicture: pip && state.engine === 'native' ? pipState : null,
    start,
    playLine,
    setPaused,
    togglePictureInPicture,
    unmute,
    reset
  }
}
