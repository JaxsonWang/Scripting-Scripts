import type { LiveRoomItem, SiteId } from '../core/types'
import { errorMessage } from '../utils/format'
import type { WidgetSource } from './settings'
import { getSite } from './sites'
import { createStore } from './store'

/** 小组件里的直播间，带上所属平台 */
export type WidgetRoom = LiveRoomItem & { siteId: SiteId }

/** 一轮推荐的时间段：一天按换批间隔切分，从 0 点起对齐 */
export type WidgetSlot = {
  /** 本地日期 + 序号，如 2026-10-22#14 */
  key: string
  start: Date
  /** 下一轮开始时间，小组件在这之后刷新 */
  next: Date
}

type WidgetSnapshot = {
  /** `${slot.key}|${source}`：换轮或换来源后失效 */
  key: string
  rooms: WidgetRoom[]
}

/** 大号小组件展示 1 个主推 + 3 个直播间 */
const PICK_LIMIT = 4
/** 只在每个平台推荐页的前若干个直播间里挑，保证热度 */
const POOL_SIZE = 20

/** 本轮结果：各尺寸小组件读同一份，一轮之内内容一致 */
const snapshotStore = createStore<WidgetSnapshot | null>('widget_picks', null)

const pad = (value: number) => String(value).padStart(2, '0')

/**
 * 计算当前所在的推荐轮次。
 * @param now 当前时间
 * @param intervalMinutes 换批间隔，能整除一天
 */
export const widgetSlot = (now: Date, intervalMinutes: number): WidgetSlot => {
  const index = Math.floor((now.getHours() * 60 + now.getMinutes()) / intervalMinutes)
  const at = (slot: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, slot * intervalMinutes)
  return {
    key: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}#${index}`,
    start: at(index),
    next: at(index + 1)
  }
}

/** 把轮次标识折算成随机种子：同时刷新的多个小组件挑出同一批 */
const seedFrom = (text: string) => {
  let seed = 2166136261
  for (let i = 0; i < text.length; i++) seed = Math.imul(seed ^ text.charCodeAt(i), 16777619)
  return seed >>> 0
}

/** mulberry32：可复现的伪随机序列 */
const createRandom = (seed: number) => {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const idOf = (room: WidgetRoom) => `${room.siteId}_${room.roomId}`

const isUsable = (room: LiveRoomItem) => !!room.roomId && !!(room.title || room.userName) && /^https?:\/\//.test(room.cover)

/**
 * 并发读取各平台推荐页第一页。综合推荐时单个平台失败只记录日志，用其余平台继续；全部失败才报错。
 * @param sites 参与推荐的平台
 */
const fetchPools = async (sites: SiteId[]): Promise<WidgetRoom[][]> => {
  const results = await Promise.allSettled(sites.map(id => getSite(id).getRecommendRooms(1)))
  const pools: WidgetRoom[][] = []
  const errors: string[] = []
  results.forEach((result, index) => {
    const site = getSite(sites[index])
    if (result.status === 'fulfilled') {
      pools.push(
        result.value.items
          .filter(isUsable)
          .slice(0, POOL_SIZE)
          .map(room => ({ ...room, siteId: site.id }))
      )
    } else {
      console.warn(`[ScriptLive] 小组件读取${site.name}推荐失败`, result.reason)
      errors.push(`${site.name}：${errorMessage(result.reason)}`)
    }
  })
  if (!pools.length) throw new Error(errors.join('；'))
  return pools
}

/**
 * 每个平台按「随机值 + 推荐位次加权」排序，越靠前的直播间越容易选中；上一轮出现过的排到最后，保证每轮都换一批。
 * 然后各平台轮流取用，主推所在的平台也随轮次变化。
 */
const pickRooms = (pools: WidgetRoom[][], random: () => number, recent: Set<string>): WidgetRoom[] => {
  const ranked = pools.map(pool =>
    pool
      .map((room, index) => ({ room, rank: random() + (1 - index / pool.length) * 0.5 - (recent.has(idOf(room)) ? 2 : 0) }))
      .sort((a, b) => b.rank - a.rank)
      .map(({ room }) => room)
  )
  const rooms: WidgetRoom[] = []
  const start = Math.floor(random() * ranked.length)
  for (let round = 0; rooms.length < PICK_LIMIT && ranked.some(pool => pool.length > round); round++) {
    for (let offset = 0; offset < ranked.length && rooms.length < PICK_LIMIT; offset++) {
      const room = ranked[(start + offset) % ranked.length][round]
      if (room && !rooms.some(item => idOf(item) === idOf(room))) rooms.push(room)
    }
  }
  return rooms
}

/**
 * 读取本轮推荐；本轮已挑选过就直接复用。
 * @param slot 当前轮次
 * @param source 推荐来源
 * @param siteOrder 综合推荐时参与的平台
 */
export const getWidgetPicks = async (slot: WidgetSlot, source: WidgetSource, siteOrder: SiteId[]): Promise<WidgetRoom[]> => {
  const key = `${slot.key}|${source}`
  const previous = snapshotStore.get()
  if (previous?.key === key && previous.rooms.length) return previous.rooms

  const pools = await fetchPools(source === 'mix' ? siteOrder : [source])
  const rooms = pickRooms(pools, createRandom(seedFrom(key)), new Set(previous?.rooms.map(idOf)))
  if (rooms.length) snapshotStore.set({ key, rooms })
  return rooms
}
