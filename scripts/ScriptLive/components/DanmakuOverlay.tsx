import { TimelineCanvas } from 'scripting'
import type { CanvasRenderingContext, CanvasSize } from 'scripting'

export type DanmakuItem = { text: string; color: string }

type Flying = { text: string; color: string; lane: number; start: number; width: number }

const MAX_PENDING = 60
const LANE_GAP = 6

/**
 * 弹幕队列与轨道状态，由直播间持有。
 * TimelineCanvas 的 time 从画布出现时重新计时，队列和时钟放在画布之外，画布重建后弹幕能接着播放；
 * 画面尺寸、字号等布局变化时，在飞弹幕的位置与轨道不再成立，直接清掉，待显示的弹幕按新布局入场。
 */
export class DanmakuFeed {
  pending: DanmakuItem[] = []
  flying: Flying[] = []
  /** 上一帧的布局参数，变化即清空在飞弹幕 */
  layoutKey = ''
  private readonly origin = Date.now()

  /** 自有时钟：距队列创建的秒数，不随画布重建归零 */
  now() {
    return (Date.now() - this.origin) / 1000
  }

  push(item: DanmakuItem) {
    this.pending.push(item)
    if (this.pending.length > MAX_PENDING) this.pending.splice(0, this.pending.length - MAX_PENDING)
  }

  clear() {
    this.pending = []
    this.flying = []
    this.layoutKey = ''
  }
}

type Props = {
  feed: DanmakuFeed
  fontSize: number
  /** 横穿屏幕的秒数 */
  duration: number
  /** 占画面高度比例 0.25–1 */
  area: number
  opacity: number
  paused?: boolean
}

/**
 * 滚动弹幕层：叠在播放器上，不拦截触摸。
 * 每条弹幕进入时测一次宽度，选择不会与前条重叠的轨道，在 duration 秒内横穿画面；轨道都占满时丢弃最旧的待显示弹幕。
 */
export const DanmakuOverlay = ({ feed, fontSize, duration, area, opacity, paused }: Props) => {
  const draw = (ctx: CanvasRenderingContext, size: CanvasSize) => {
    const time = feed.now()
    const lineHeight = fontSize + LANE_GAP
    const laneCount = Math.max(1, Math.floor((size.height * area) / lineHeight))
    const speedOf = (width: number) => (size.width + width) / duration
    ctx.font = fontSize
    ctx.textBaseline = 'top'
    const layoutKey = `${size.width}|${fontSize}|${duration}|${laneCount}`
    if (feed.layoutKey !== layoutKey) {
      feed.flying = []
      feed.layoutKey = layoutKey
    }
    feed.flying = feed.flying.filter(item => time - item.start < duration)
    const lastInLane: (Flying | undefined)[] = []
    for (const item of feed.flying) lastInLane[item.lane] = item

    // 给待显示弹幕分配空闲轨道
    while (feed.pending.length) {
      const item = feed.pending[0]
      const width = ctx.measureText(item.text).width
      let lane = -1
      for (let i = 0; i < laneCount; i++) {
        const previous = lastInLane[i]
        // 入场时与前条尾部留出间距；前条离场时也要留出间距，覆盖后条更快的情况。
        const wait = previous ? Math.max((previous.width + fontSize) / speedOf(previous.width), duration - (size.width - fontSize) / speedOf(width)) : 0
        if (!previous || previous.start + wait <= time) {
          lane = i
          break
        }
      }
      if (lane < 0) break
      feed.pending.shift()
      const flying = { ...item, lane, start: time, width }
      feed.flying.push(flying)
      lastInLane[lane] = flying
    }

    ctx.globalAlpha = opacity
    // strokeText 在 Scripting 中等同填充，用阴影代替描边保证浅色画面上可读
    ctx.shadowColor = 'rgba(0,0,0,0.85)'
    ctx.shadowBlur = 2
    ctx.shadowOffsetX = 1
    ctx.shadowOffsetY = 1
    for (const item of feed.flying) {
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
    />
  )
}
