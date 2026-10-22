import { Button, HStack, Image, Rectangle, Spacer, Text, VStack, ZStack, useEffect, useRef, useState } from 'scripting'
import type { LinearGradient, VirtualNode } from 'scripting'
import { palette } from '../theme'

/** 播放中无操作多久后收起控件 */
const AUTO_HIDE_MS = 4000

const topScrim: LinearGradient = { colors: ['rgba(0,0,0,0.68)', 'rgba(0,0,0,0)'], startPoint: 'top', endPoint: 'bottom' }
const bottomScrim: LinearGradient = { colors: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.68)'], startPoint: 'top', endPoint: 'bottom' }

type Props = {
  /** 横屏影院模式：顶部标题栏 + 底部操作栏；竖屏只有底部的播放与全屏 */
  landscape: boolean
  /** 加载、暂停、出错或未开播时控件常驻，不自动收起 */
  pinned: boolean
  /** 是否可以暂停 / 继续（直播中且播放器已就绪） */
  canPlay: boolean
  paused: boolean
  /** 网页播放器因自动播放策略静音 */
  muted: boolean
  title: string
  subtitle?: string
  /** 横屏底栏的直播角标文字，如「直播中 · 12.3万」 */
  badge?: string
  canRotate: boolean
  onTogglePlay: () => void
  onUnmute: () => void
  onRefresh: () => void
  onEnterLandscape: () => void
  onExitLandscape: () => void
  /** 叠在点按层之上的状态内容：加载圈、错误与重试 */
  status?: VirtualNode | null
  /** 横屏顶栏右侧：清晰度、线路 */
  topTrailing?: VirtualNode | null
  /** 横屏底栏右侧：弹幕开关与弹幕设置 */
  bottomTrailing?: VirtualNode | null
}

const ChromeButton = ({ icon, label, size = 17, action }: { icon: string; label: string; size?: number; action: () => void }) => (
  <Button action={action} buttonStyle="plain" accessibilityLabel={label}>
    <Image systemName={icon} font={size} foregroundStyle="#FFFFFF" frame={{ width: 36, height: 36 }} contentShape="rect" />
  </Button>
)

/**
 * 播放器上的控件层，原生与网页播放器共用：点按画面显示 / 收起，播放中 4 秒无操作自动收起。
 * 视频与弹幕在它下面铺满整屏；控件本身留在安全区内，避开刘海和底部横条。
 */
export const PlayerChrome = (props: Props) => {
  const { landscape, pinned, canPlay, paused, muted, canRotate } = props
  const [visible, setVisible] = useState(true)
  const timer = useRef<number | null>(null)

  const stopTimer = () => {
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
  }

  const show = () => {
    stopTimer()
    setVisible(true)
    timer.current = setTimeout(() => {
      timer.current = null
      setVisible(false)
    }, AUTO_HIDE_MS)
  }

  const toggle = () => {
    if (visible && !pinned) {
      stopTimer()
      setVisible(false)
    } else show()
  }

  // 转屏或开始播放时重新显示一会儿，让用户知道控件在哪
  useEffect(() => {
    show()
    return stopTimer
  }, [pinned, landscape])

  /** 先执行操作（如转屏请求），再重新计时收起控件 */
  const act = (action: () => void) => () => {
    action()
    show()
  }

  const shown = pinned || visible
  const playButton = canPlay && (
    <ChromeButton icon={paused ? 'play.fill' : 'pause.fill'} label={paused ? '继续播放' : '暂停'} size={18} action={act(props.onTogglePlay)} />
  )

  const topBar = (
    <HStack spacing={10} padding={{ leading: 8, trailing: 16, top: 8, bottom: 30 }} background={<Rectangle fill={topScrim} ignoresSafeArea />}>
      <ChromeButton icon="chevron.backward" label="退出全屏" size={19} action={act(props.onExitLandscape)} />
      <VStack alignment="leading" spacing={2}>
        <Text font="headline" bold lineLimit={1} foregroundStyle="#FFFFFF">
          {props.title}
        </Text>
        {!!props.subtitle && (
          <Text font="caption" lineLimit={1} foregroundStyle="rgba(255,255,255,0.72)">
            {props.subtitle}
          </Text>
        )}
      </VStack>
      <Spacer minLength={12} />
      {props.topTrailing}
    </HStack>
  )

  const bottomBar = landscape ? (
    <HStack spacing={12} padding={{ leading: 8, trailing: 12, top: 30, bottom: 6 }} background={<Rectangle fill={bottomScrim} ignoresSafeArea />}>
      {playButton}
      <ChromeButton icon="arrow.clockwise" label="刷新播放" action={act(props.onRefresh)} />
      {!!props.badge && (
        <HStack spacing={5} padding={{ horizontal: 9, vertical: 4 }} background="rgba(255,255,255,0.14)" clipShape="capsule">
          <Rectangle fill={palette.live} frame={{ width: 6, height: 6 }} clipShape="circle" />
          <Text font="caption" bold monospacedDigit lineLimit={1} foregroundStyle="#FFFFFF">
            {props.badge}
          </Text>
        </HStack>
      )}
      <Spacer />
      {props.bottomTrailing}
      {canRotate && <ChromeButton icon="arrow.down.right.and.arrow.up.left" label="退出全屏" action={act(props.onExitLandscape)} />}
    </HStack>
  ) : (
    <HStack spacing={8} padding={{ horizontal: 6, top: 24, bottom: 2 }} background={bottomScrim}>
      {playButton}
      <Spacer />
      {canRotate && <ChromeButton icon="arrow.up.left.and.arrow.down.right" label="横屏全屏" action={act(props.onEnterLandscape)} />}
    </HStack>
  )

  return (
    <ZStack frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
      <Rectangle fill="clear" contentShape="rect" ignoresSafeArea={{ edges: landscape ? 'all' : [] }} onTapGesture={toggle} />
      {props.status}
      <VStack
        spacing={0}
        frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}
        opacity={shown ? 1 : 0}
        allowsHitTesting={shown}
        animation={{ animation: Animation.easeOut(0.2), value: shown }}
      >
        {landscape && topBar}
        <Spacer />
        {bottomBar}
      </VStack>
      {canPlay && paused && (
        <Button action={act(props.onTogglePlay)} buttonStyle="plain" accessibilityLabel="继续播放">
          <Image systemName="play.fill" font={26} foregroundStyle="#FFFFFF" frame={{ width: 64, height: 64 }} background="rgba(0,0,0,0.5)" clipShape="circle" />
        </Button>
      )}
      {muted && (
        <VStack frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'bottomLeading' }} padding={{ leading: 12, bottom: landscape ? 64 : 44 }}>
          <Button action={props.onUnmute} buttonStyle="plain">
            <HStack spacing={6} padding={{ horizontal: 12, vertical: 7 }} background="rgba(0,0,0,0.6)" clipShape="capsule">
              <Image systemName="speaker.slash.fill" font={12} foregroundStyle="#FFFFFF" />
              <Text font="footnote" bold foregroundStyle="#FFFFFF">
                点按开启声音
              </Text>
            </HStack>
          </Button>
        </VStack>
      )}
    </ZStack>
  )
}
