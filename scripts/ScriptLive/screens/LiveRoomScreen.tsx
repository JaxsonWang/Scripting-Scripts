import {
  AVPlayerView,
  Button,
  EnvironmentValuesReader,
  HStack,
  Image,
  Menu,
  Navigation,
  NavigationStack,
  ProgressView,
  Rectangle,
  Script,
  ScrollView,
  Spacer,
  Text,
  VStack,
  WebView,
  ZStack,
  useEffect,
  useObservable,
  useRef,
  useState
} from 'scripting'
import type { PIPStatus } from 'scripting'
import { Chip, SiteBadge } from '../components/Chips'
import { DanmakuMenu } from '../components/DanmakuMenu'
import { DanmakuOverlay } from '../components/DanmakuOverlay'
import type { DanmakuFeed } from '../components/DanmakuOverlay'
import { ChatList, SuperChatList } from '../components/LiveChat'
import type { ChatLine } from '../components/LiveChat'
import { PlayerChrome } from '../components/PlayerChrome'
import { Avatar } from '../components/RoomCard'
import { ScreenBackground } from '../components/ScreenBackground'
import { SectionHeader } from '../components/SectionHeader'
import { EmptyView, LoadingView } from '../components/StateView'
import type { LiveDanmaku, LiveMessage, LivePlayQuality, LiveRoomDetail, LiveSuperChatMessage, SiteId } from '../core/types'
import { colorToHex } from '../core/types'
import { useLivePlayback } from '../hooks/useLivePlayback'
import { usePlayerOrientation } from '../hooks/usePlayerOrientation'
import { useStore } from '../hooks/useStore'
import { useThemeScheme } from '../hooks/useThemeScheme'
import { addFollow, followId, followStore, removeFollow } from '../services/follows'
import { addHistory } from '../services/history'
import { isShielded, settingsStore } from '../services/settings'
import type { QualityLevel } from '../services/settings'
import { getSite } from '../services/sites'
import { FULL_FRAME, SITE_STYLE, brandGradient, palette, radius } from '../theme'
import { errorMessage, formatLiveDuration, formatOnline } from '../utils/format'

type Panel = 'chat' | 'sc' | 'info'

const MAX_CHAT = 200

const CHAT_FLUSH_MS = 500

/** 与上游一致：最高取第一档，最低取最后一档，中等取中间 */
const pickQualityIndex = (count: number, level: QualityLevel) => (level === 2 ? 0 : level === 0 ? count - 1 : Math.floor(count / 2))

/** 蜂窝网络下使用单独的清晰度偏好；读取网络状态失败时沿用默认偏好并记录日志 */
const currentQualityLevel = async (): Promise<QualityLevel> => {
  const { qualityLevel, qualityLevelCellular } = settingsStore.get()
  try {
    const network = await Device.getNetworkState()
    return network.interfaces.includes('cellular') && !network.interfaces.includes('wifi') ? qualityLevelCellular : qualityLevel
  } catch (error) {
    console.warn('[ScriptLive] 读取网络状态失败，使用默认清晰度', error)
    return qualityLevel
  }
}

/**
 * 直播间：播放器（Pro 原生 / 免费网页）+ 滚动弹幕 + 聊天、醒目留言、简介。
 * @param siteId 平台
 * @param roomId 房间号；抖音可能是开播编号，详情返回后以固定网页房间号为准
 */
export const LiveRoomScreen = ({ siteId, roomId }: { siteId: SiteId; roomId: string }) => {
  const dismiss = Navigation.useDismiss()
  const colorScheme = useThemeScheme()
  const settings = useStore(settingsStore)
  const follows = useStore(followStore)
  const site = getSite(siteId)
  const playback = useLivePlayback(siteId)
  const pipStatus = useObservable<PIPStatus>(null)
  const orientation = usePlayerOrientation()

  const [detail, setDetail] = useState<LiveRoomDetail | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [qualities, setQualities] = useState<LivePlayQuality[]>([])
  const [qualityIndex, setQualityIndex] = useState(0)
  const [playError, setPlayError] = useState<string | null>(null)
  const [online, setOnline] = useState(0)
  const [chat, setChat] = useState<ChatLine[]>([])
  const [superChats, setSuperChats] = useState<LiveSuperChatMessage[]>([])
  const [scError, setScError] = useState<string | null>(null)
  const [danmakuClosed, setDanmakuClosed] = useState<string | null>(null)
  const [danmakuOn, setDanmakuOn] = useState(settings.danmakuEnable)
  const [panel, setPanel] = useState<Panel>('chat')
  const [exitAt, setExitAt] = useState<number | null>(null)
  const [, setTick] = useState(0)

  const feed = useRef<DanmakuFeed | null>(null)
  const danmakuRef = useRef<LiveDanmaku | null>(null)
  const pendingChat = useRef<ChatLine[]>([])
  const chatId = useRef(0)
  const danmakuOnRef = useRef(danmakuOn)
  danmakuOnRef.current = danmakuOn
  const detailRef = useRef<LiveRoomDetail | null>(null)
  const mounted = useRef(true)

  const realRoomId = detail?.roomId ?? roomId
  const followed = follows.some(user => user.id === followId(siteId, realRoomId))
  const living = !!detail && (detail.status || !!detail.isRecord)

  const addSystem = (message: string) => pendingChat.current.push({ id: ++chatId.current, kind: 'system', message })

  const handleMessage = (message: LiveMessage) => {
    if (message.type === 'online') setOnline(message.online)
    else if (message.type === 'superChat') {
      if (settingsStore.get().showSuperChat) setSuperChats(list => (list.some(item => item.id === message.superChat.id) ? list : [...list, message.superChat]))
    } else if (message.type === 'chat') {
      if (isShielded(message.message, settingsStore.get().shieldWords)) return
      const color = colorToHex(message.color)
      pendingChat.current.push({ id: ++chatId.current, kind: 'chat', userName: message.userName, message: message.message, color })
      if (danmakuOnRef.current) feed.current?.push({ text: message.message, color })
    }
  }

  const stopDanmaku = async () => {
    const current = danmakuRef.current
    danmakuRef.current = null
    if (current) await current.stop()
  }

  const connectDanmaku = async (room: LiveRoomDetail) => {
    await stopDanmaku()
    const danmaku = site.getDanmaku()
    danmakuRef.current = danmaku
    const isCurrent = () => mounted.current && danmakuRef.current === danmaku
    danmaku.onMessage = message => isCurrent() && handleMessage(message)
    danmaku.onReady = () => {
      if (!isCurrent()) return
      setDanmakuClosed(null)
      addSystem('弹幕服务器连接正常')
    }
    danmaku.onClose = reason => {
      if (!isCurrent()) return
      setDanmakuClosed(reason || '连接已关闭')
      addSystem(`弹幕连接已断开：${reason || '连接已关闭'}`)
    }
    setDanmakuClosed(null)
    addSystem('开始连接弹幕服务器')
    try {
      await danmaku.start(room.danmakuData)
    } catch (error) {
      console.error('[ScriptLive] 弹幕连接失败', error)
      if (isCurrent()) {
        setDanmakuClosed(errorMessage(error))
        addSystem(`弹幕连接失败：${errorMessage(error)}`)
      }
    }
  }

  const playQuality = async (room: LiveRoomDetail, list: LivePlayQuality[], index: number) => {
    const quality = list[index]
    if (!quality) return
    setQualityIndex(index)
    setPlayError(null)
    try {
      const playUrl = await site.getPlayUrls(room, quality)
      if (!mounted.current || detailRef.current !== room) return
      await playback.start(playUrl, settingsStore.get().forceHttps)
    } catch (error) {
      console.error('[ScriptLive] 读取播放地址失败', error)
      if (mounted.current) setPlayError(`读取播放地址失败：${errorMessage(error)}`)
    }
  }

  const loadQualities = async (room: LiveRoomDetail) => {
    try {
      const list = await site.getPlayQualities(room)
      if (!mounted.current || detailRef.current !== room) return
      setQualities(list)
      if (!list.length) {
        setPlayError('无法读取播放清晰度')
        return
      }
      await playQuality(room, list, pickQualityIndex(list.length, await currentQualityLevel()))
    } catch (error) {
      console.error('[ScriptLive] 读取清晰度失败', error)
      if (mounted.current) setPlayError(`读取清晰度失败：${errorMessage(error)}`)
    }
  }

  const loadSuperChats = async (room: LiveRoomDetail) => {
    if (!settingsStore.get().showSuperChat) return
    try {
      const list = await site.getSuperChatMessages(room.roomId)
      if (mounted.current) setSuperChats(current => [...list.filter(item => !current.some(existing => existing.id === item.id)), ...current])
    } catch (error) {
      console.warn('[ScriptLive] 读取醒目留言失败', error)
      if (mounted.current) setScError(errorMessage(error))
    }
  }

  const loadRoom = async () => {
    setLoadError(null)
    setPlayError(null)
    setQualities([])
    setSuperChats([])
    setScError(null)
    feed.current?.clear()
    await playback.reset()
    addSystem('正在读取直播间信息')
    try {
      const room = await site.getRoomDetail(roomId)
      if (!mounted.current) return
      detailRef.current = room
      setDetail(room)
      setOnline(room.online)
      addHistory(siteId, room)
      // 已关注时同步最新昵称与头像
      if (followStore.get().some(user => user.id === followId(siteId, room.roomId))) {
        addFollow({ siteId, roomId: room.roomId, userName: room.userName, face: room.userAvatar })
      }
      loadSuperChats(room)
      if (room.status || room.isRecord) loadQualities(room)
      if (room.isRecord) addSystem('当前主播未开播，正在轮播录像')
      connectDanmaku(room)
    } catch (error) {
      console.error('[ScriptLive] 读取直播间失败', error)
      if (mounted.current) setLoadError(errorMessage(error))
    }
  }

  const reconnectDanmaku = () => {
    if (detailRef.current) connectDanmaku(detailRef.current)
  }

  const retryPlay = () => {
    const room = detailRef.current
    if (room && qualities.length) playQuality(room, qualities, qualityIndex)
    else if (room) loadQualities(room)
  }

  const toggleFollow = () => {
    if (!detail) return
    if (followed) removeFollow(followId(siteId, detail.roomId))
    else addFollow({ siteId, roomId: detail.roomId, userName: detail.userName, face: detail.userAvatar })
  }

  const toggleDanmaku = () => {
    if (danmakuOn) feed.current?.clear()
    setDanmakuOn(!danmakuOn)
  }

  const togglePlay = async () => {
    try {
      await playback.setPaused(playback.state.status !== 'paused')
    } catch (error) {
      console.error('[ScriptLive] 切换播放状态失败', error)
      setPlayError(`切换播放状态失败：${errorMessage(error)}`)
    }
  }

  const unmute = async () => {
    try {
      await playback.unmute()
    } catch (error) {
      console.error('[ScriptLive] 开启声音失败', error)
      await Dialog.alert({ title: '无法开启声音', message: errorMessage(error) })
    }
  }

  const openInBrowser = async () => {
    if (!detail?.url) return
    try {
      if (!(await Safari.openURL(detail.url))) await Dialog.alert({ title: '无法打开', message: detail.url })
    } catch (error) {
      console.error('[ScriptLive] 打开浏览器失败', error)
      await Dialog.alert({ title: '无法打开浏览器', message: errorMessage(error) })
    }
  }

  const copyLink = async () => {
    if (!detail?.url) return
    try {
      await Pasteboard.setString(detail.url)
      await Dialog.alert({ title: '已复制', message: detail.url })
    } catch (error) {
      console.error('[ScriptLive] 复制链接失败', error)
      await Dialog.alert({ title: '复制失败', message: errorMessage(error) })
    }
  }

  const close = () => dismiss()

  useEffect(() => {
    mounted.current = true
    loadRoom()
    const flush = setInterval(() => {
      if (!pendingChat.current.length) return
      const batch = pendingChat.current
      pendingChat.current = []
      setChat(list => [...list, ...batch].slice(-MAX_CHAT))
    }, CHAT_FLUSH_MS)
    // 每秒刷新一次：醒目留言倒计时、开播时长与定时关闭倒计时
    const ticker = setInterval(() => {
      setTick(tick => tick + 1)
      setSuperChats(list => (list.some(item => item.endTime <= Date.now()) ? list.filter(item => item.endTime > Date.now()) : list))
    }, 1000)
    return () => {
      mounted.current = false
      clearInterval(flush)
      clearInterval(ticker)
      stopDanmaku().catch(error => console.warn('[ScriptLive] 关闭弹幕失败', error))
    }
  }, [siteId, roomId])

  // 定时关闭：到时询问是否延迟，10 秒内未选择则直接关闭脚本
  useEffect(() => {
    if (!settings.autoExitEnable) {
      setExitAt(null)
      return
    }
    let forceTimer: number | null = null
    let exitTimer: number | null = null
    const exitScript = () => {
      dismiss()
      Script.exit()
    }
    const arm = () => {
      const minutes = Math.max(1, settingsStore.get().autoExitMinutes)
      setExitAt(Date.now() + minutes * 60_000)
      exitTimer = setTimeout(async () => {
        forceTimer = setTimeout(exitScript, 10_000)
        const delay = await Dialog.confirm({ title: '定时关闭', message: '定时关闭已到时，是否延迟关闭？', confirmLabel: '延迟', cancelLabel: '关闭' })
        if (forceTimer !== null) clearTimeout(forceTimer)
        if (delay) arm()
        else exitScript()
      }, minutes * 60_000)
    }
    arm()
    return () => {
      if (exitTimer !== null) clearTimeout(exitTimer)
      if (forceTimer !== null) clearTimeout(forceTimer)
    }
  }, [settings.autoExitEnable, settings.autoExitMinutes])

  const { state } = playback
  const quality = qualities[qualityIndex]
  const style = SITE_STYLE[siteId]

  const playerStatus = (() => {
    if (loadError) return null
    if (!detail) return <ProgressView progressViewStyle="circular" tint="#FFFFFF" />
    if (!living) return null
    if (playError || state.status === 'error') return null
    if (state.status === 'idle' || state.status === 'loading' || state.status === 'buffering')
      return <ProgressView progressViewStyle="circular" tint="#FFFFFF" />
    return null
  })()

  const failure = playError ?? (state.status === 'error' ? state.error : null)

  /** 叠在播放器控件下方的状态：失败时给出原因与重试，加载中显示转圈 */
  const renderStatus = (landscape: boolean) =>
    failure ? (
      <VStack
        spacing={10}
        padding={16}
        frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}
        background={<Rectangle fill="rgba(0,0,0,0.6)" ignoresSafeArea={landscape} />}
      >
        <Image systemName="exclamationmark.triangle.fill" font={24} foregroundStyle="#FBBF24" />
        <Text font="footnote" foregroundStyle="#FFFFFF" multilineTextAlignment="center" lineLimit={3}>
          {failure}
        </Text>
        <Button action={retryPlay} buttonStyle="plain">
          <Text font="footnote" bold foregroundStyle="#FFFFFF" padding={{ horizontal: 16, vertical: 8 }} background={brandGradient} clipShape="capsule">
            重试
          </Text>
        </Button>
      </VStack>
    ) : playerStatus ? (
      <VStack allowsHitTesting={false}>{playerStatus}</VStack>
    ) : null

  /**
   * 播放器：竖屏 16:9，横屏为影院模式——黑底、视频与弹幕铺满整屏，控件留在安全区内。
   * 两种方向下视图结构保持一致，转屏时播放器和弹幕画布不会重建。
   */
  const renderPlayer = (landscape: boolean) => (
    <ZStack
      frame={landscape ? { maxWidth: 'infinity', maxHeight: 'infinity' } : { maxWidth: 'infinity' }}
      aspectRatio={landscape ? undefined : { value: 16 / 9, contentMode: 'fit' }}
      background={<Rectangle fill="#000000" ignoresSafeArea={landscape} />}
    >
      {detail && !living && (
        <ZStack frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} clipped ignoresSafeArea={landscape}>
          {!!detail.cover && <Image imageUrl={detail.cover} resizable scaleToFill opacity={0.35} blur={12} />}
          <VStack spacing={8}>
            <Image systemName="moon.zzz.fill" font={30} foregroundStyle="#FFFFFF" />
            <Text font="headline" foregroundStyle="#FFFFFF">
              主播未开播
            </Text>
          </VStack>
        </ZStack>
      )}
      {living && state.engine === 'native' && state.nativeReady && playback.nativePlayer && (
        <AVPlayerView
          player={playback.nativePlayer}
          pipStatus={pipStatus}
          showsPlaybackControls={false}
          allowsPictureInPicturePlayback={false}
          updatesNowPlayingInfoCenter
          frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}
          ignoresSafeArea={landscape}
        />
      )}
      {living && state.engine === 'web' && playback.webController && (
        <WebView controller={playback.webController} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} ignoresSafeArea={landscape} />
      )}
      {living && danmakuOn && (
        <DanmakuOverlay
          feed={feed}
          fontSize={settings.danmakuSize}
          duration={settings.danmakuSpeed}
          area={settings.danmakuArea}
          opacity={settings.danmakuOpacity}
          paused={state.status === 'paused'}
          fullBleed={landscape}
        />
      )}
      <PlayerChrome
        landscape={landscape}
        pinned={!living || !state.engine || !!failure || state.status === 'idle' || state.status === 'paused'}
        canPlay={living && !!state.engine && !failure}
        paused={state.status === 'paused'}
        muted={state.engine === 'web' && state.muted}
        title={detail?.title || detail?.userName || style.short}
        subtitle={detail ? `${detail.userName} · ${style.name}` : undefined}
        badge={detail?.status ? `直播中 · ${formatOnline(online)}` : detail?.isRecord ? '轮播录像' : undefined}
        canRotate={orientation.canRotate}
        onTogglePlay={togglePlay}
        onUnmute={unmute}
        onRefresh={retryPlay}
        onEnterLandscape={orientation.enterLandscape}
        onExitLandscape={orientation.exitLandscape}
        status={renderStatus(landscape)}
        topTrailing={
          living ? (
            <HStack spacing={16}>
              {qualityMenu}
              {lineMenu}
            </HStack>
          ) : null
        }
        bottomTrailing={
          living ? (
            <HStack spacing={4}>
              {danmakuButton}
              {danmakuOn && <DanmakuMenu settings={settings} />}
            </HStack>
          ) : null
        }
      />
    </ZStack>
  )

  const qualityMenu = (
    <Menu
      label={
        <HStack spacing={3}>
          <Text font="footnote" bold foregroundStyle="#FFFFFF">
            {quality?.quality ?? '清晰度'}
          </Text>
          <Image systemName="chevron.down" font={10} foregroundStyle="rgba(255,255,255,0.68)" />
        </HStack>
      }
    >
      {qualities.map((item, index) => (
        <Button
          key={`${item.quality}-${index}`}
          title={item.quality}
          systemImage={index === qualityIndex ? 'checkmark' : undefined}
          action={() => detail && playQuality(detail, qualities, index)}
        />
      ))}
    </Menu>
  )

  const lineMenu = state.lines.length > 1 && (
    <Menu
      label={
        <HStack spacing={3}>
          <Text font="footnote" foregroundStyle="rgba(255,255,255,0.82)">{`线路${state.lineIndex + 1}`}</Text>
          <Image systemName="chevron.down" font={10} foregroundStyle="rgba(255,255,255,0.68)" />
        </HStack>
      }
    >
      {state.lines.map((line, index) => (
        <Button
          key={`${line.url}-${index}`}
          title={`线路${index + 1}${line.name ? ` · ${line.name}` : ''} · ${line.format.toUpperCase()}`}
          systemImage={index === state.lineIndex ? 'checkmark' : undefined}
          action={() => playback.playLine(index)}
        />
      ))}
    </Menu>
  )

  const danmakuButton = (
    <Button action={toggleDanmaku} buttonStyle="plain" accessibilityLabel={danmakuOn ? '关闭弹幕' : '开启弹幕'}>
      <Image
        systemName={danmakuOn ? 'text.bubble.fill' : 'text.bubble'}
        font={17}
        foregroundStyle={danmakuOn ? palette.live : 'rgba(255,255,255,0.64)'}
        frame={{ width: 32, height: 32 }}
        contentShape="rect"
      />
    </Button>
  )

  const controlBar = living && (
    <HStack spacing={6} padding={{ leading: 14, trailing: 8, vertical: 4 }} background="rgba(8,7,10,0.82)">
      <Text
        font="caption2"
        bold
        foregroundStyle="#FFFFFF"
        padding={{ horizontal: 7, vertical: 3 }}
        background={state.engine === 'native' ? brandGradient : '#64748B'}
        clipShape="capsule"
      >
        {state.engine === 'native' ? '原生' : '网页'}
      </Text>
      {qualityMenu}
      {lineMenu}
      <Spacer />
      {danmakuButton}
      {danmakuOn && <DanmakuMenu settings={settings} />}
      <Button action={retryPlay} buttonStyle="plain" accessibilityLabel="重新播放">
        <Image systemName="arrow.clockwise" font={16} foregroundStyle="rgba(255,255,255,0.82)" frame={{ width: 32, height: 32 }} contentShape="rect" />
      </Button>
    </HStack>
  )

  const header = detail && (
    <HStack spacing={12} padding={{ horizontal: 14, vertical: 12 }}>
      <Avatar url={detail.userAvatar} size={44} live={detail.status} />
      <VStack alignment="leading" spacing={4}>
        <HStack spacing={6}>
          <Text font="body" bold lineLimit={1} foregroundStyle={palette.textPrimary}>
            {detail.userName}
          </Text>
          <SiteBadge siteId={siteId} />
        </HStack>
        <HStack spacing={8}>
          <Text font="caption" lineLimit={1} foregroundStyle={palette.textSecondary}>
            {detail.title}
          </Text>
        </HStack>
        <HStack spacing={10}>
          {living && (
            <HStack spacing={3}>
              <Image systemName="flame.fill" font={10} foregroundStyle={palette.live} />
              <Text font="caption" monospacedDigit foregroundStyle={palette.textTertiary}>
                {`${formatOnline(online)} 人气`}
              </Text>
            </HStack>
          )}
          {living && !!formatLiveDuration(detail.showTime) && (
            <HStack spacing={3}>
              <Image systemName="clock" font={10} foregroundStyle={palette.textTertiary} />
              <Text font="caption" monospacedDigit foregroundStyle={palette.textTertiary}>
                {formatLiveDuration(detail.showTime)}
              </Text>
            </HStack>
          )}
        </HStack>
      </VStack>
      <Spacer />
      <Button action={toggleFollow} buttonStyle="plain">
        <HStack spacing={4} padding={{ horizontal: 14, vertical: 7 }} background={followed ? palette.card : brandGradient} clipShape="capsule">
          <Image systemName={followed ? 'checkmark' : 'plus'} font={12} foregroundStyle={followed ? palette.textSecondary : '#FFFFFF'} />
          <Text font="footnote" bold foregroundStyle={followed ? palette.textSecondary : '#FFFFFF'}>
            {followed ? '已关注' : '关注'}
          </Text>
        </HStack>
      </Button>
    </HStack>
  )

  const infoRow = (icon: string, label: string, value: string) => (
    <HStack key={label} spacing={10} padding={{ vertical: 6 }}>
      <Image systemName={icon} font={14} foregroundStyle={style.color} frame={{ width: 20 }} />
      <Text font="subheadline" foregroundStyle={palette.textSecondary}>
        {label}
      </Text>
      <Spacer />
      <Text font="subheadline" lineLimit={1} foregroundStyle={palette.textPrimary}>
        {value}
      </Text>
    </HStack>
  )

  const info = detail && (
    <ScrollView scrollIndicator="hidden">
      <VStack alignment="leading" spacing={12} padding={{ vertical: 14 }}>
        <SectionHeader title="简介" subtitle={`${style.name} · 直播间信息`} />
        <VStack padding={{ horizontal: 16 }}>
          <VStack
            alignment="leading"
            spacing={14}
            padding={16}
            frame={{ maxWidth: 'infinity', alignment: 'leading' }}
            background={palette.card}
            clipShape={{ type: 'rect', cornerRadius: radius.lg, style: 'continuous' }}
          >
            {infoRow('number', '房间号', detail.roomId)}
            {infoRow('dot.radiowaves.left.and.right', '状态', detail.status ? '直播中' : detail.isRecord ? '轮播录像' : '未开播')}
            {detail.status && !!formatLiveDuration(detail.showTime) && infoRow('clock', '已开播', formatLiveDuration(detail.showTime))}
            {infoRow('play.rectangle', '播放器', state.engine === 'native' ? '原生播放器（Pro）' : '网页播放器')}
            {state.engine === 'web' && !!state.inline && infoRow('rectangle.inset.filled', '原位播放', state.inline.inlineAllowed ? '允许' : '不允许')}
            {state.engine === 'web' && state.inline?.inlineAllowed === false && (
              <Text font="footnote" foregroundStyle={palette.warning} lineSpacing={3}>
                {`Scripting 的网页视图没有开启原位播放（allowsInlineMediaPlayback），视频会进入系统全屏。页面已带 playsinline（当前 ${state.inline.playsInline ? '生效' : '未生效'}），这项原生设置只能由 Scripting 开放。`}
              </Text>
            )}
            {exitAt !== null && infoRow('timer', '定时关闭', `${Math.max(0, Math.ceil((exitAt - Date.now()) / 60_000))} 分钟后`)}
            {!!state.note && (
              <Text font="footnote" foregroundStyle={palette.warning} lineSpacing={3}>
                {state.note}
              </Text>
            )}
            {!playback.isPro && (
              <Text font="footnote" foregroundStyle={palette.textTertiary} lineSpacing={3}>
                当前使用网页播放器。开通 Scripting Pro 后，HLS 线路会使用原生播放器。
              </Text>
            )}
            {[detail.introduction, detail.notice]
              .filter((text): text is string => !!text)
              .map((text, index) => (
                <Text key={index} font="subheadline" foregroundStyle={palette.textSecondary} lineSpacing={4} textSelection>
                  {text}
                </Text>
              ))}
            <HStack spacing={10}>
              <Button title="在浏览器打开" systemImage="safari" action={openInBrowser} buttonStyle="bordered" />
              <Button title="复制链接" systemImage="link" action={copyLink} buttonStyle="bordered" />
            </HStack>
          </VStack>
        </VStack>
      </VStack>
    </ScrollView>
  )

  return (
    <EnvironmentValuesReader keys={['verticalSizeClass']}>
      {({ verticalSizeClass }) => {
        // iPhone 横屏时垂直尺寸类为 compact：隐藏导航栏、状态栏与聊天面板，播放器铺满全屏
        const landscape = verticalSizeClass === 'compact'
        return (
          <NavigationStack statusBarHidden={landscape} persistentSystemOverlays={landscape ? 'hidden' : 'automatic'}>
            <VStack
              spacing={0}
              frame={FULL_FRAME}
              background={landscape ? <Rectangle fill="#000000" ignoresSafeArea /> : <ScreenBackground />}
              toolbarVisibility={{ visibility: landscape ? 'hidden' : 'automatic', bars: ['navigationBar'] }}
              preferredColorScheme={colorScheme}
              environments={{ colorScheme }}
              navigationTitle={detail?.userName ?? style.short}
              navigationBarTitleDisplayMode="inline"
              toolbarBackground={palette.bg}
              toolbarColorScheme={colorScheme}
              toolbar={{
                cancellationAction: <Button title="关闭" systemImage="xmark" action={close} />,
                topBarTrailing: detail ? (
                  <Menu title="更多" systemImage="ellipsis.circle">
                    <Button title="刷新直播间" systemImage="arrow.clockwise" action={loadRoom} />
                    <Button title="在浏览器打开" systemImage="safari" action={openInBrowser} />
                    <Button title="复制链接" systemImage="link" action={copyLink} />
                  </Menu>
                ) : undefined
              }}
            >
              {renderPlayer(landscape)}
              {landscape ? null : loadError ? (
                <EmptyView icon="exclamationmark.triangle" title="直播间加载失败" message={loadError} actionTitle="重试" onAction={loadRoom} />
              ) : !detail ? (
                <LoadingView label="正在读取直播间信息" />
              ) : (
                <VStack spacing={0} frame={FULL_FRAME}>
                  {controlBar}
                  {header}
                  <ScrollView axes="horizontal" scrollIndicator="hidden">
                    <HStack spacing={8} padding={{ horizontal: 14, vertical: 8 }}>
                      <Chip label="聊天" active={panel === 'chat'} onTap={() => setPanel('chat')} />
                      {settings.showSuperChat && <Chip label="SC" count={superChats.length} active={panel === 'sc'} onTap={() => setPanel('sc')} />}
                      <Chip label="简介" active={panel === 'info'} onTap={() => setPanel('info')} />
                    </HStack>
                  </ScrollView>
                  <Rectangle fill={palette.separator} frame={{ height: 0.5 }} />
                  <VStack frame={FULL_FRAME}>
                    {panel === 'chat' || (panel === 'sc' && !settings.showSuperChat) ? (
                      <ChatList lines={chat} fontSize={settings.chatTextSize} closedReason={danmakuClosed} onReconnect={reconnectDanmaku} />
                    ) : panel === 'sc' && settings.showSuperChat ? (
                      <SuperChatList items={superChats} error={scError} />
                    ) : (
                      info
                    )}
                  </VStack>
                </VStack>
              )}
            </VStack>
          </NavigationStack>
        )
      }}
    </EnvironmentValuesReader>
  )
}
