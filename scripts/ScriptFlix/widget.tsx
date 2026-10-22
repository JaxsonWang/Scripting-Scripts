import { Script, Widget } from 'scripting'
import type { WidgetReloadPolicy } from 'scripting'
import { RecommendWidget, WidgetMessage, posterTargets } from './components/RecommendWidget'
import type { WidgetEnvironment, WidgetPoster } from './components/RecommendWidget'
import { AppearanceService } from './services/appearance'
import { DailyPicksService, widgetSlot } from './services/daily-picks'
import { SettingsService } from './services/settings'
import { createDiagnosticLogger, describeDiagnosticUrl, redactDiagnosticError } from './utils/diagnostics'
import type { DailyPick } from './types'

const RETRY_MINUTES = 30

const log = createDiagnosticLogger('widget')

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
      log('cover.empty', { url: describeDiagnosticUrl(url) })
      return null
    }
    const pixelScale = Device.screen.scale
    const ratio = Math.max((target.width * pixelScale) / image.width, (target.height * pixelScale) / image.height)
    return ratio < 1 ? image.preparingThumbnail({ width: Math.round(image.width * ratio), height: Math.round(image.height * ratio) }) : image
  } catch (error) {
    // 单张封面失败只影响这一张，显示品牌渐变占位
    log('cover.error', { url: describeDiagnosticUrl(url), error: redactDiagnosticError(error) })
    return null
  }
}

const toPoster = (pick: DailyPick, sourceUrl: string, sourceName: string, image: UIImage | null): WidgetPoster => ({
  pick,
  image,
  // run_single 重启脚本实例，index.tsx 通过 queryParameters 直接打开这部作品
  url: Script.createRunSingleURLScheme(Script.name, { vodId: String(pick.id), sourceUrl, sourceName })
})

const run = async () => {
  const now = new Date()
  const env: WidgetEnvironment = {
    family: Widget.family,
    size: Widget.displaySize,
    scheme: AppearanceService.colorSchemeOf(AppearanceService.getThemeMode()),
    showsBackground: !(Widget.isTransparentMode || Widget.isBlurMode || Widget.isTransparentBackground),
    date: now
  }

  const source = SettingsService.getCurrentSource()
  if (!source) {
    Widget.present(<WidgetMessage icon="sparkles.tv" title="开启影视推荐" message="在 ScriptFlix 中添加或启用视频源" env={env} />, {
      reloadPolicy: { policy: 'atEnd' }
    })
    return
  }

  try {
    const intervalMinutes = SettingsService.getWidgetRefreshMinutes()
    const slot = widgetSlot(now, intervalMinutes)
    const snapshot = await DailyPicksService.getDailyPicks(source, now, intervalMinutes)
    if (snapshot.picks.length === 0) {
      Widget.present(<WidgetMessage icon="film.stack" title="今日暂无推荐" message={`「${source.name}」暂无可推荐的电影或剧集`} env={env} />, {
        reloadPolicy: retryPolicy(now)
      })
      return
    }

    const targets = posterTargets(env.family, env.size)
    const posters: WidgetPoster[] = []
    for (const [index, pick] of snapshot.picks.slice(0, Math.max(1, targets.length)).entries()) {
      const image = targets[index] ? await loadCover(pick.pic, targets[index]) : null
      posters.push(toPoster(pick, snapshot.sourceUrl, snapshot.sourceName, image))
    }
    log('present', { family: env.family, picks: snapshot.picks.length, covers: posters.filter(poster => poster.image).length })
    Widget.present(<RecommendWidget posters={posters} sourceName={snapshot.sourceName} env={env} />, { reloadPolicy: { policy: 'after', date: slot.next } })
  } catch (error) {
    const message = redactDiagnosticError(error)
    log('error', { source: describeDiagnosticUrl(source.url), error: message })
    Widget.present(<WidgetMessage icon="wifi.exclamationmark" title="推荐加载失败" message={`${message}，${RETRY_MINUTES} 分钟后自动重试`} env={env} />, {
      reloadPolicy: retryPolicy(now)
    })
  }
}

run()
