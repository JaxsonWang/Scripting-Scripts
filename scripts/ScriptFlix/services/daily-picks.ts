import { fetchCategories, fetchVideoList } from './api'
import { DEFAULT_WIDGET_REFRESH_MINUTES } from './settings'
import type { ApiSource, Category, DailyPick, DailyPicksSnapshot, VideoItem } from '../types'

const AppStorage = Storage
const STORAGE_KEY = 'script_flix_daily_picks'
/** 大号小组件展示 1 张主推 + 4 张海报，多留一条余量 */
const PICK_LIMIT = 6

/** 不进推荐位的分类：短剧、伦理、预告、解说、资讯、体育等 */
const EXCLUDED_TYPE = /短剧|漫剧|伦理|福利|写真|擦边|预告|解说|资讯|新闻|体育|赛事|足球|篮球|网球|台球|斯诺克|演员/

type LaneRule = {
  label: string
  /** 匹配顶级分类名，如「电影片」「连续剧」 */
  main: RegExp
  /** 源没有对应顶级分类（扁平分类）时，按叶子分类名匹配 */
  leaf: (name: string) => boolean
}

const LANE_RULES: LaneRule[] = [
  { label: '电影', main: /^电影/, leaf: name => /片$/.test(name) && !/综艺|动漫/.test(name) },
  { label: '剧集', main: /(连续|电视)剧|剧集/, leaf: name => /剧$/.test(name) }
]

type Lane = { label: string; types: Category[] }

/** 本地日期，作为「每日」的边界 */
const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/** 按本地时间划分推荐轮次；每天模式保留次日 00:05 请求刷新，其余频率从 0 点对齐 */
export const widgetSlot = (now: Date, intervalMinutes: number) => {
  const day = dayKey(now)
  if (intervalMinutes === 1440) {
    return { key: day, next: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 5) }
  }
  const index = Math.floor((now.getHours() * 60 + now.getMinutes()) / intervalMinutes)
  return {
    key: `${day}#${intervalMinutes}#${index}`,
    next: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, (index + 1) * intervalMinutes)
  }
}

/** 把「轮次 + 源地址」折算成随机种子：同一轮同一源结果稳定，下一轮重新挑选 */
const seedOf = (text: string) => {
  let seed = 2166136261
  for (let i = 0; i < text.length; i++) {
    seed = Math.imul(seed ^ text.charCodeAt(i), 16777619)
  }
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

/**
 * 从源分类中识别电影、剧集两个推荐栏目及其可选子分类
 * @param categories 源返回的分类
 */
const resolveLanes = (categories: Category[]): Lane[] => {
  const usable = categories.filter(cat => !EXCLUDED_TYPE.test(cat.type_name))
  return LANE_RULES.map(rule => {
    const main = usable.find(cat => cat.type_pid === 0 && rule.main.test(cat.type_name))
    if (!main) {
      return { label: rule.label, types: usable.filter(cat => rule.leaf(cat.type_name)) }
    }
    const children = usable.filter(cat => cat.type_pid === main.type_id)
    // CMS 的 t 参数通常只认叶子分类，有子分类时不请求顶级分类
    return { label: rule.label, types: children.length > 0 ? children : [main] }
  }).filter(lane => lane.types.length > 0)
}

const scoreOf = (video: VideoItem) => {
  const value = Number(video.vod_score) || Number(video.vod_douban_score)
  return Number.isFinite(value) && value > 0 ? value : 0
}

/** CMS 简介常带 HTML 标签和转义实体（含 &amp;nbsp; 这类二次转义），小组件只展示纯文本 */
const toPlainText = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()

const blurbOf = (video: VideoItem) => {
  const blurb = toPlainText(video.vod_blurb || '')
  return (blurb.length >= 12 ? blurb : toPlainText(video.vod_content || '')).slice(0, 90)
}

const toPick = (video: VideoItem, lane: string): DailyPick => {
  const score = scoreOf(video)
  return {
    id: video.vod_id,
    name: video.vod_name.trim(),
    pic: video.vod_pic,
    lane,
    typeName: video.type_name || '',
    remarks: (video.vod_remarks || '').trim(),
    year: video.vod_year || '',
    // 合拍片的地区形如「阿根廷 / 西班牙」，只取首个
    area: (video.vod_area || '').split(/[/,，、]/)[0].trim(),
    score: score > 0 ? score.toFixed(1) : '',
    blurb: blurbOf(video)
  }
}

const isRecommendable = (video: VideoItem) => !!video.vod_name?.trim() && /^https?:\/\//.test(video.vod_pic || '') && !EXCLUDED_TYPE.test(video.type_name || '')

/**
 * 拉取并挑选本轮推荐：每个栏目按种子选一个子分类取最新一页，
 * 再按「随机值 + 评分加权」排序，有评分的作品更容易排到前面，最后各栏目轮流取用。
 * @param source 当前视频源
 * @param random 本轮的随机序列
 */
const buildPicks = async (source: ApiSource, random: () => number): Promise<DailyPick[]> => {
  const { class: categories = [] } = await fetchCategories(source.url)
  const lanes = resolveLanes(categories)
  const requests =
    lanes.length > 0
      ? lanes.map(lane => ({ label: lane.label, typeIds: [lane.types[Math.floor(random() * lane.types.length)].type_id] }))
      : [{ label: '最新', typeIds: undefined }]

  const responses = await Promise.all(requests.map(request => fetchVideoList(source.url, 1, request.typeIds)))
  const pools = responses.map((response, index) =>
    (response.list || [])
      .filter(isRecommendable)
      .map(video => ({ video, rank: random() + scoreOf(video) / 10 }))
      .sort((a, b) => b.rank - a.rank)
      .map(({ video }) => toPick(video, requests[index].label))
  )

  const picks: DailyPick[] = []
  const seen = new Set<string>()
  const start = Math.floor(random() * pools.length)
  for (let round = 0; picks.length < PICK_LIMIT && pools.some(pool => pool.length > round); round++) {
    for (let offset = 0; offset < pools.length && picks.length < PICK_LIMIT; offset++) {
      const pick = pools[(start + offset) % pools.length][round]
      if (pick && !seen.has(pick.name)) {
        seen.add(pick.name)
        picks.push(pick)
      }
    }
  }
  return picks
}

/**
 * 读取当前源的本轮推荐；同一轮各尺寸共用缓存，换轮或修改频率后重新挑选
 * @param source 当前视频源
 * @param now 当前时间
 * @param intervalMinutes 换批间隔（分钟），默认每小时
 */
const getDailyPicks = async (source: ApiSource, now: Date, intervalMinutes = DEFAULT_WIDGET_REFRESH_MINUTES): Promise<DailyPicksSnapshot> => {
  const day = dayKey(now)
  const slot = widgetSlot(now, intervalMinutes)
  const cached = AppStorage.get<DailyPicksSnapshot>(STORAGE_KEY)
  if (cached && cached.slotKey === slot.key && cached.sourceUrl === source.url && cached.picks.length > 0) {
    return { ...cached, sourceName: source.name }
  }

  const picks = await buildPicks(source, createRandom(seedOf(`${slot.key}|${source.url}`)))
  const snapshot: DailyPicksSnapshot = { day, slotKey: slot.key, sourceUrl: source.url, sourceName: source.name, picks }
  if (picks.length > 0) {
    AppStorage.set(STORAGE_KEY, snapshot)
  }
  return snapshot
}

export const DailyPicksService = {
  getDailyPicks
}
