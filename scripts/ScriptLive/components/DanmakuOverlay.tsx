import { TimelineCanvas } from 'scripting'
import type { CanvasRenderingContext, CanvasSize } from 'scripting'

export type DanmakuItem = { text: string; color: string }

type Flying = { text: string; color: string; lane: number; start: number; width: number }

const MAX_PENDING = 60
const LANE_GAP = 6

/**
 * 弹幕队列与轨道状态，由直播间持有。
 * 转屏、全屏切换会重建弹幕画布，而 TimelineCanvas 的 time 从画布出现时重新计时；
 * 队列和时钟放在画布之外，重建后正在飞行和待显示的弹幕都能接着播放。
 */
export class DanmakuFeed {
  pending: DanmakuItem[] = []
  flying: Flying[] = []
  /** 每条轨道上最后一条弹幕完全进入画面的时间（秒，基于 now()） */
  laneFree: number[] = []
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
    this.laneFree = []
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
 * 每条弹幕进入时测一次宽度并选择最先腾空的轨道，之后每帧只做平移绘制；轨道都占满时丢弃最旧的待显示弹幕。
 */
export const DanmakuOverlay = ({ feed, fontSize, duration, area, opacity, paused }: Props) => {
  const draw = (ctx: CanvasRenderingContext, size: CanvasSize) => {
    const time = feed.now()
    const lineHeight = fontSize + LANE_GAP
    const laneCount = Math.max(1, Math.floor((size.height * area) / lineHeight))
    const speedOf = (width: number) => (size.width + width) / duration
    ctx.font = fontSize
    ctx.textBaseline = 'top'

    // 给待显示弹幕分配空闲轨道
    while (feed.pending.length) {
      let lane = -1
      for (let i = 0; i < laneCount; i++) {
        if ((feed.laneFree[i] ?? 0) <= time) {
          lane = i
          break
        }
      }
      if (lane < 0) break
      const item = feed.pending.shift() as DanmakuItem
      const width = ctx.measureText(item.text).width
      feed.flying.push({ ...item, lane, start: time, width })
      // 尾部离开右边缘再留一点间距后，这条轨道才能放下一条
      feed.laneFree[lane] = time + (width + fontSize) / speedOf(width)
    }

    feed.flying = feed.flying.filter(item => time - item.start < duration && item.lane < laneCount)
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
