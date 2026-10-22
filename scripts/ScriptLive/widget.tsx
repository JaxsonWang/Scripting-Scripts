import { Script, Widget } from 'scripting'
import type { WidgetReloadPolicy } from 'scripting'
import { RecommendWidget, WidgetMessage, coverTargets } from './components/RecommendWidget'
import type { WidgetCover, WidgetEnvironment } from './components/RecommendWidget'
import { settingsStore } from './services/settings'
import { getWidgetPicks, widgetSlot } from './services/widget-picks'
import type { WidgetRoom } from './services/widget-picks'
import { colorSchemeOf } from './theme'
import { errorMessage } from './utils/format'

const RETRY_MINUTES = 15

const retryPolicy = (now: Date): WidgetReloadPolicy => ({ policy: 'after', date: new Date(now.getTime() + RETRY_MINUTES * 60_000) })

/**
 * 下载封面并缩到显示所需像素，控制在小组件约 30MB 的内存上限内；逐张处理以限制峰值内存
 * @param url 封面地址
 * @param target 显示尺寸（pt）
 */
const loadCover = async (url: string, target: { width: number; height: number }): Promise<UIImage | null> => {
  try {
    const image = await UIImage.fromURL(url)
    if (!image) {
      console.warn('[ScriptLive] 小组件封面为空', url)
      return null
    }
    const scale = Device.screen.scale
    const ratio = Math.max((target.width * scale) / image.width, (target.height * scale) / image.height)
    return ratio < 1 ? image.preparingThumbnail({ width: Math.round(image.width * ratio), height: Math.round(image.height * ratio) }) : image
  } catch (error) {
    // 单张封面失败只影响这一张，显示品牌渐变占位
    console.warn('[ScriptLive] 小组件封面加载失败', url, error)
    return null
  }
}

/** run_single 重启脚本实例，index.tsx 通过 queryParameters 直接打开这个直播间 */
const toCover = (room: WidgetRoom, image: UIImage | null): WidgetCover => ({
  room,
  image,
  url: Script.createRunSingleURLScheme(Script.name, { siteId: room.siteId, roomId: room.roomId })
})

const run = async () => {
  const now = new Date()
  const settings = settingsStore.get()
  const slot = widgetSlot(now, settings.widgetRefreshMinutes)
  const env: WidgetEnvironment = {
    family: Widget.family,
    size: Widget.displaySize,
    scheme: colorSchemeOf(settings.themeMode),
    showsBackground: !(Widget.isTransparentMode || Widget.isBlurMode || Widget.isTransparentBackground),
    source: settings.widgetSource,
    intervalMinutes: settings.widgetRefreshMinutes,
    slotStart: slot.start
  }

  try {
    const rooms = await getWidgetPicks(slot, settings.widgetSource, settings.siteOrder)
    if (!rooms.length) {
      Widget.present(<WidgetMessage icon="tv" title="暂无直播推荐" message={`${RETRY_MINUTES} 分钟后再看看`} env={env} />, { reloadPolicy: retryPolicy(now) })
      return
    }
    const targets = coverTargets(env.family, env.size)
    const covers: WidgetCover[] = []
    for (const [index, room] of rooms.slice(0, Math.max(1, targets.length)).entries()) {
      covers.push(toCover(room, targets[index] ? await loadCover(room.cover, targets[index]) : null))
    }
    // 下一轮开始后换一批；系统会按电量和使用情况调度，实际刷新可能稍晚
    Widget.present(<RecommendWidget covers={covers} env={env} />, { reloadPolicy: { policy: 'after', date: slot.next } })
  } catch (error) {
    console.error('[ScriptLive] 小组件推荐加载失败', error)
    Widget.present(
      <WidgetMessage icon="wifi.exclamationmark" title="推荐加载失败" message={`${errorMessage(error)}，${RETRY_MINUTES} 分钟后自动重试`} env={env} />,
      { reloadPolicy: retryPolicy(now) }
    )
  }
}

run()
