import { GeometryReader, Text, ZStack, useEffect, useMemo, useRef, useState } from 'scripting'
import type { DanmuConfig } from '../types'
import type { Color } from 'scripting'

type DanmuItem = {
  time: number
  text: string
  mode?: number
  color?: Color
}

type DanmuKind = 'scroll' | 'top' | 'bottom'

type ActiveDanmu = {
  id: string
  kind: DanmuKind
  lane: number
  startTime: number
  endTime: number
  text: string
  color: Color
  approxWidth: number
}

type DanmuOverlayProps = {
  player: AVPlayer
  items: DanmuItem[]
  config: DanmuConfig
}

const SCROLL_DURATION_SECONDS = 8
const TOP_BOTTOM_DURATION_SECONDS = 3
const TICK_MS = 80

const getKindFromMode = (mode: number | undefined): DanmuKind => {
  if (mode === 4) return 'bottom'
  if (mode === 5) return 'top'
  return 'scroll'
}

const estimateTextWidth = (text: string, fontSize: number) => {
  // 经验估算：中文约 1em，英文约 0.6em，这里取一个折中比例，避免“完全看不见”的情况
  const len = Math.max(1, text.length)
  return Math.min(1200, Math.max(40, Math.round(len * fontSize * 0.65)))
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * 原生弹幕层（不使用 WebView），避免 WebView 背景不透明导致白底盖住视频画面。
 */
export const DanmuOverlay = ({ player, items, config }: DanmuOverlayProps) => {
  const [currentTime, setCurrentTime] = useState(0)
  const [active, setActive] = useState<ActiveDanmu[]>([])

  const idSeedRef = useRef(0)
  const indexRef = useRef(0)
  const lastTimeRef = useRef(0)
  const lanesRef = useRef<{ scroll: number[]; top: number[]; bottom: number[] }>({ scroll: [], top: [], bottom: [] })

  const opacity = clamp(config.opacity, 0.1, 1)
  const fontSize = clamp(config.fontSize, 10, 28)
  const lineHeight = Math.max(16, fontSize + 6)

  const enabledKinds = useMemo(() => {
    return {
      scroll: Boolean(config.modes?.scroll),
      top: Boolean(config.modes?.top),
      bottom: Boolean(config.modes?.bottom)
    }
  }, [config.modes?.bottom, config.modes?.scroll, config.modes?.top])

  // 用 setTimeout 模拟 interval（Scripting 没有 setInterval）
  useEffect(() => {
    let cancelled = false
    let timeoutId: number | null = null

    const tick = () => {
      if (cancelled) return
      const t = Number(player.currentTime ?? 0)
      if (Number.isFinite(t)) {
        setCurrentTime(t)
      }
      timeoutId = setTimeout(tick, TICK_MS)
    }

    tick()
    return () => {
      cancelled = true
      if (timeoutId !== null) clearTimeout(timeoutId)
    }
  }, [player])

  // items 变化（重新匹配/切集）时重置
  useEffect(() => {
    indexRef.current = 0
    lastTimeRef.current = 0
    lanesRef.current = { scroll: [], top: [], bottom: [] }
    setActive([])
  }, [items])

  return (
    <GeometryReader>
      {proxy => {
        const width = Math.max(1, Math.floor(proxy.size.width || 1))
        const height = Math.max(1, Math.floor(proxy.size.height || 1))
        const laneCount = Math.max(1, Math.floor(height / lineHeight))

        const ensureLaneSize = (kind: DanmuKind) => {
          const arr = lanesRef.current[kind]
          if (arr.length !== laneCount) {
            lanesRef.current[kind] = Array.from({ length: laneCount }, () => 0)
          }
        }

        const pickLane = (kind: DanmuKind, now: number) => {
          ensureLaneSize(kind)
          const lanes = lanesRef.current[kind]
          let best = 0
          for (let i = 1; i < lanes.length; i++) {
            if (lanes[i] < lanes[best]) best = i
          }
          lanes[best] = now
          return best
        }

        // 推进弹幕（根据 currentTime 发射并清理）
        // 注意：这里会在每次渲染时运行，但只在时间推进/seek 时产生有效更新。
        const nowTime = currentTime
        const lastTime = lastTimeRef.current

        const didSeekBackward = nowTime + 0.2 < lastTime
        if (didSeekBackward) {
          indexRef.current = 0
          setActive([])
          lanesRef.current = { scroll: [], top: [], bottom: [] }
        }
        lastTimeRef.current = nowTime

        // 清理过期弹幕
        if (active.length > 0) {
          const filtered = active.filter(a => a.endTime > nowTime)
          if (filtered.length !== active.length) {
            setActive(filtered)
          }
        }

        // 发射新弹幕
        const list = items
        let idx = indexRef.current
        const newly: ActiveDanmu[] = []

        while (idx < list.length && list[idx].time <= nowTime) {
          const raw = list[idx]
          idx++
          const text = String(raw.text ?? '').trim()
          if (!text) continue

          const kind = getKindFromMode(raw.mode)
          if (!enabledKinds[kind]) continue

          const approxWidth = estimateTextWidth(text, fontSize)
          const startTime = Math.max(0, Number(raw.time) || 0)
          const duration = kind === 'scroll' ? SCROLL_DURATION_SECONDS : TOP_BOTTOM_DURATION_SECONDS
          const lane = pickLane(kind, Date.now())

          idSeedRef.current += 1
          newly.push({
            id: `${startTime}-${idSeedRef.current}`,
            kind,
            lane,
            startTime,
            endTime: startTime + duration,
            text,
            color: (raw.color || '#fff') as Color,
            approxWidth
          })
        }

        if (idx !== indexRef.current) {
          indexRef.current = idx
          if (newly.length > 0) {
            setActive(prev => [...prev, ...newly])
          }
        }

        const renderDanmu = (d: ActiveDanmu) => {
          const laneY = d.lane * lineHeight + lineHeight / 2
          const yCenter = d.kind === 'bottom' ? height - laneY : laneY

          if (d.kind === 'scroll') {
            const p = clamp((nowTime - d.startTime) / SCROLL_DURATION_SECONDS, 0, 1)
            const fromLeft = width + 8
            const toLeft = -d.approxWidth - 16
            const left = fromLeft + (toLeft - fromLeft) * p
            const xCenter = left + d.approxWidth / 2
            return (
              <Text key={d.id} font={fontSize} foregroundStyle={d.color} opacity={opacity} position={{ x: xCenter, y: yCenter }} lineLimit={1}>
                {d.text}
              </Text>
            )
          }

          return (
            <Text key={d.id} font={fontSize} foregroundStyle={d.color} opacity={opacity} position={{ x: width / 2, y: yCenter }} lineLimit={1}>
              {d.text}
            </Text>
          )
        }

        return <ZStack>{active.map(renderDanmu)}</ZStack>
      }}
    </GeometryReader>
  )
}
