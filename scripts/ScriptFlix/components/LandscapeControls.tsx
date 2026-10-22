import { Button, HStack, Image, Rectangle, Slider, Spacer, Text, VStack, ZStack, useEffect, useRef, useState } from 'scripting'
import type { LinearGradient } from 'scripting'

/** 播放中无操作多久后收起控件，与系统播放控件的节奏接近 */
const AUTO_HIDE_MS = 3000
/** 控件显示时刷新进度的间隔 */
const TICK_MS = 500
/** 快退 / 快进的秒数，与系统控件一致 */
const SKIP_SECONDS = 10

const topScrim: LinearGradient = { colors: ['rgba(0,0,0,0.6)', 'rgba(0,0,0,0)'], startPoint: 'top', endPoint: 'bottom' }
const bottomScrim: LinearGradient = { colors: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)'], startPoint: 'top', endPoint: 'bottom' }

type Snapshot = { time: number; duration: number; paused: boolean; muted: boolean }

const readSnapshot = (player: AVPlayer): Snapshot => ({
  time: player.currentTime,
  duration: Number.isFinite(player.duration) ? player.duration : 0,
  paused: player.timeControlStatus === TimeControlStatus.paused,
  muted: player.volume === 0
})

const pad = (value: number) => String(value).padStart(2, '0')

/** 1:05:09 / 5:09 */
const formatTime = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(total % 60)}` : `${minutes}:${pad(total % 60)}`
}

const ControlButton = ({ icon, label, size, circle, action }: { icon: string; label: string; size: number; circle?: number; action: () => void }) => (
  <Button action={action} buttonStyle="plain" accessibilityLabel={label}>
    <Image
      systemName={icon}
      font={size}
      foregroundStyle="#FFFFFF"
      frame={{ width: circle ?? 40, height: circle ?? 40 }}
      background={circle ? 'rgba(0,0,0,0.4)' : undefined}
      clipShape="circle"
      contentShape="rect"
    />
  </Button>
)

/**
 * 横屏播放控件：暂停、快退 / 快进 10 秒、进度条、静音和退出横屏放在同一层，一起显示、一起收起。
 * 横屏时系统播放控件关闭，由这一层接管——系统控件的显示状态读不到，自己的按钮无法跟它同步。
 * 点按画面显示 / 收起；播放中 3 秒无操作自动收起，暂停时常驻。控件留在安全区内，避开刘海与底部横条。
 */
export const LandscapeControls = ({ player, onExit }: { player: AVPlayer; onExit: () => void }) => {
  const [visible, setVisible] = useState(true)
  const [snapshot, setSnapshot] = useState(() => readSnapshot(player))
  /** 拖动进度条时的位置；松手后才跳转，期间不被播放进度覆盖 */
  const [scrub, setScrub] = useState<number | null>(null)
  const timer = useRef<number | null>(null)
  const restoreVolume = useRef(1)

  const stopTimer = () => {
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
  }

  const show = () => {
    stopTimer()
    setVisible(true)
    setSnapshot(readSnapshot(player))
    timer.current = setTimeout(() => {
      timer.current = null
      // 暂停时与系统控件一样保持显示
      if (player.timeControlStatus !== TimeControlStatus.paused) setVisible(false)
    }, AUTO_HIDE_MS)
  }

  useEffect(() => {
    show()
    return stopTimer
  }, [])

  // 只在控件可见时刷新进度，收起后不触发重绘
  useEffect(() => {
    if (!visible) return
    const id = setInterval(() => setSnapshot(readSnapshot(player)), TICK_MS)
    return () => clearInterval(id)
  }, [visible])

  const toggle = () => {
    if (visible && !snapshot.paused) {
      stopTimer()
      setVisible(false)
    } else show()
  }

  /** 先执行操作，再刷新状态并重新计时收起 */
  const act = (action: () => void) => () => {
    action()
    show()
  }

  const togglePlay = act(() => {
    if (player.timeControlStatus === TimeControlStatus.paused) player.play()
    else player.pause()
  })

  const skip = (delta: number) =>
    act(() => {
      const end = snapshot.duration > 0 ? snapshot.duration : Infinity
      player.currentTime = Math.min(Math.max(player.currentTime + delta, 0), end)
    })

  const toggleMute = act(() => {
    if (player.volume > 0) {
      restoreVolume.current = player.volume
      player.volume = 0
    } else player.volume = restoreVolume.current
  })

  const onScrubEditing = (editing: boolean) => {
    if (editing) {
      stopTimer()
      setScrub(snapshot.time)
      return
    }
    if (scrub !== null) player.currentTime = scrub
    setScrub(null)
    show()
  }

  const shown = visible || snapshot.paused
  const position = scrub ?? snapshot.time
  const seekable = snapshot.duration > 0

  return (
    <ZStack frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
      <Rectangle fill="clear" contentShape="rect" ignoresSafeArea onTapGesture={toggle} />
      <VStack
        spacing={0}
        frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}
        opacity={shown ? 1 : 0}
        allowsHitTesting={shown}
        animation={{ animation: Animation.easeOut(0.2), value: shown }}
      >
        <HStack spacing={4} padding={{ horizontal: 8, top: 6, bottom: 24 }} background={<Rectangle fill={topScrim} ignoresSafeArea />}>
          <Spacer />
          <ControlButton
            icon={snapshot.muted ? 'speaker.slash.fill' : 'speaker.wave.2.fill'}
            label={snapshot.muted ? '取消静音' : '静音'}
            size={16}
            action={toggleMute}
          />
          <ControlButton icon="arrow.down.right.and.arrow.up.left" label="退出横屏" size={16} action={act(onExit)} />
        </HStack>
        <Spacer />
        <HStack spacing={48}>
          <ControlButton icon="gobackward.10" label="后退 10 秒" size={22} circle={52} action={skip(-SKIP_SECONDS)} />
          <ControlButton
            icon={snapshot.paused ? 'play.fill' : 'pause.fill'}
            label={snapshot.paused ? '播放' : '暂停'}
            size={28}
            circle={68}
            action={togglePlay}
          />
          <ControlButton icon="goforward.10" label="前进 10 秒" size={22} circle={52} action={skip(SKIP_SECONDS)} />
        </HStack>
        <Spacer />
        <HStack spacing={12} padding={{ horizontal: 16, top: 24, bottom: 8 }} background={<Rectangle fill={bottomScrim} ignoresSafeArea />}>
          <Text font="caption" monospacedDigit foregroundStyle="#FFFFFF">
            {formatTime(position)}
          </Text>
          <Slider
            min={0}
            max={seekable ? snapshot.duration : 1}
            value={seekable ? Math.min(position, snapshot.duration) : 0}
            onChanged={value => setScrub(value)}
            onEditingChanged={onScrubEditing}
            tint="#FFFFFF"
            disabled={!seekable}
          />
          <Text font="caption" monospacedDigit foregroundStyle="#FFFFFF">
            {seekable ? `-${formatTime(snapshot.duration - position)}` : '--:--'}
          </Text>
        </HStack>
      </VStack>
    </ZStack>
  )
}
