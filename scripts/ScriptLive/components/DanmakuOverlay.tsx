import { TimelineCanvas, useEffect, useRef } from 'scripting'
import type { CanvasRenderingContext, CanvasSize } from 'scripting'

export type DanmakuItem = { text: string; color: string }

/** 弹幕队列：页面收到消息后 push，画布在下一帧取走并分配轨道 */
export type DanmakuFeed = { push(item: DanmakuItem): void; clear(): void }

type Flying = { text: string; color: string; lane: number; start: number; width: number }

type Props = {
  feed: { current: DanmakuFeed | null }
  fontSize: number
  /** 横穿屏幕的秒数 */
  duration: number
  /** 占画面高度比例 0.25–1 */
  area: number
  opacity: number
  paused?: boolean
  /** 横屏时铺到安全区外，弹幕从屏幕最右侧飞到最左侧 */
  fullBleed?: boolean
}

const MAX_PENDING = 60
const LANE_GAP = 6

/**
 * 滚动弹幕层：叠在播放器上，不拦截触摸。
 * 每条弹幕进入时测一次宽度并选择最先腾空的轨道，之后每帧只做平移绘制；轨道都占满时丢弃最旧的待显示弹幕。
 */
export const DanmakuOverlay = ({ feed, fontSize, duration, area, opacity, paused, fullBleed }: Props) => {
  const pending = useRef<DanmakuItem[]>([])
  const flying = useRef<Flying[]>([])
  /** 每条轨道上最后一条弹幕完全进入画面的时间 */
  const laneFree = useRef<number[]>([])

  useEffect(() => {
    feed.current = {
      push: item => {
        pending.current.push(item)
        if (pending.current.length > MAX_PENDING) pending.current.splice(0, pending.current.length - MAX_PENDING)
      },
      clear: () => {
        pending.current = []
        flying.current = []
        laneFree.current = []
      }
    }
    return () => {
      feed.current = null
    }
  }, [feed])

  const draw = (ctx: CanvasRenderingContext, size: CanvasSize, time: number) => {
    const lineHeight = fontSize + LANE_GAP
    const laneCount = Math.max(1, Math.floor((size.height * area) / lineHeight))
    const speedOf = (width: number) => (size.width + width) / duration
    ctx.font = fontSize
    ctx.textBaseline = 'top'

    // 给待显示弹幕分配空闲轨道
    while (pending.current.length) {
      let lane = -1
      for (let i = 0; i < laneCount; i++) {
        if ((laneFree.current[i] ?? 0) <= time) {
          lane = i
          break
        }
      }
      if (lane < 0) break
      const item = pending.current.shift() as DanmakuItem
      const width = ctx.measureText(item.text).width
      flying.current.push({ ...item, lane, start: time, width })
      // 尾部离开右边缘再留一点间距后，这条轨道才能放下一条
      laneFree.current[lane] = time + (width + fontSize) / speedOf(width)
    }

    flying.current = flying.current.filter(item => time - item.start < duration && item.lane < laneCount)
    ctx.globalAlpha = opacity
    // strokeText 在 Scripting 中等同填充，用阴影代替描边保证浅色画面上可读
    ctx.shadowColor = 'rgba(0,0,0,0.85)'
    ctx.shadowBlur = 2
    ctx.shadowOffsetX = 1
    ctx.shadowOffsetY = 1
    for (const item of flying.current) {
      const x = size.width - (time - item.start) * speedOf(item.width)
      const y = item.lane * lineHeight + 4
      ctx.fillStyle = item.color
      ctx.fillText(item.text, x, y)
    }
  }

  return (
    <TimelineCanvas
      draw={draw}
      opaque={false}
      paused={paused}
      schedule={{ minimumInterval: 1 / 30 }}
      allowsHitTesting={false}
      frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}
      ignoresSafeArea={!!fullBleed}
    />
  )
}
