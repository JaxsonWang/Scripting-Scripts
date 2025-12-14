// widget.tsx（网上国网 / WSGW）

import type { WidgetReloadPolicy } from 'scripting'
import { Text, VStack, Widget, fetch } from 'scripting'

import { extractDisplayData, getAccountData, getSettings, processBarChartData } from './api'

import { SGCC_WIDGET_STYLES } from './styles/registry'

import { safeGetObject, safeSet } from './shared/utils/storage'
import { formatRefreshIntervalLabel } from './shared/utils/time'

declare const FileManager: any

const LOGO_URL = 'https://raw.githubusercontent.com/Honye/scriptable-scripts/master/static/sgcc.png'

// ============================
// Logo 缓存
// ============================

type LogoCache = {
  url: string
  path: string
  updatedAt: number
}

const SGCC_LOGO_CACHE_KEY = 'wsgw_sgcc.logo.cache.v1'

function toHM(d: Date): string {
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

function toMDHM(d: Date): string {
  const MM = String(d.getMonth() + 1).padStart(2, '0')
  const DD = String(d.getDate()).padStart(2, '0')
  const HH = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${MM}-${DD} ${HH}:${mm}`
}

function pickFromCache(meta: any): boolean {
  if (!meta) return false
  if (meta.fromCache === true) return true
  if (meta.cacheHit === true) return true
  if (meta.mode && typeof meta.mode === 'string') {
    return meta.mode.includes('cache')
  }
  if (meta.decision && typeof meta.decision === 'string') {
    return meta.decision.includes('cache')
  }
  return false
}

async function getLogoPath(imageUrl: string = LOGO_URL): Promise<string | null> {
  if (!imageUrl) return null

  try {
    const cache = safeGetObject<LogoCache | null>(SGCC_LOGO_CACHE_KEY, null)

    if (cache && cache.url === imageUrl && cache.path && FileManager?.existsSync?.(cache.path)) {
      console.log('🖼️ WSGW Logo：命中缓存')
      return cache.path
    }

    if (cache?.path && FileManager?.existsSync?.(cache.path)) {
      try {
        FileManager.removeSync(cache.path)
      } catch {}
    }

    console.log('🖼️ WSGW Logo：下载更新…')
    const resp = await fetch(imageUrl)
    if (!resp.ok) {
      console.warn('⚠️ WSGW Logo：下载失败 status=', resp.status)
      return null
    }

    const buf = await resp.arrayBuffer()
    const bytes = new Uint8Array(buf)

    const dir = FileManager.temporaryDirectory
    const fileName = `sgcc_logo_${Date.now()}.png`
    const filePath = `${dir}/${fileName}`

    FileManager.writeAsBytesSync(filePath, bytes)

    safeSet(SGCC_LOGO_CACHE_KEY, {
      url: imageUrl,
      path: filePath,
      updatedAt: Date.now()
    } as LogoCache)

    console.log('✅ WSGW Logo：已写入缓存')
    return filePath
  } catch (e) {
    console.warn('⚠️ WSGW Logo：缓存异常:', e)
    return null
  }
}

function clampRefreshMinutes(v: any) {
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return 180
  return Math.max(60, Math.floor(n))
}

async function render() {
  try {
    const settings = getSettings()

    const refreshMinutes = clampRefreshMinutes((settings as any).refreshInterval)
    const reloadPolicy: WidgetReloadPolicy = {
      policy: 'after',
      date: new Date(Date.now() + refreshMinutes * 60 * 1000)
    }

    // 🔍 设置消费日志（重点：缓存）
    console.log(
      `⚙️ WSGW Widget 设置消费：refresh=${refreshMinutes}min（${formatRefreshIntervalLabel(refreshMinutes)}） | cache.enabled=${settings.cache?.enabled ? 'Y' : 'N'} | cache.mode=${settings.cache?.mode} | cache.ttlPolicy=${settings.cache?.ttlPolicy} | cache.ttlFixed=${settings.cache?.ttlMinutesFixed}min | cache.allowStale=${settings.cache?.allowStaleOnError ? 'Y' : 'N'} | cache.maxStale=${settings.cache?.maxStaleMinutes}min`
    )

    // ✅ 强制刷新：你想“每次进入都拉一次”就 true；想省流量就 false
    const forceRefresh = false

    const rawData = await getAccountData(forceRefresh)

    // 🔍 api meta（如果你想更细看决策）
    if (rawData?.__cacheMeta) {
      console.log('🧠 WSGW Cache meta:', JSON.stringify(rawData.__cacheMeta))
    }

    // ✅ 面板时间：永远显示“现在”
    const now = new Date()
    const fromCache = pickFromCache(rawData?.__cacheMeta)
    const updatedAtText = `${toMDHM(now)}${fromCache ? '（缓存）' : ''}`

    // ✅ 为了让“现有样式(用 lastUpdateTime 的)”立刻显示现在时间：
    // 直接覆盖 lastUpdateTime 为 now（这不影响业务数据，只影响展示）
    try {
      rawData.lastUpdateTime = now.getTime()
    } catch {}

    const displayData = extractDisplayData(rawData)
    const barData = processBarChartData(rawData, settings)

    // ✅ 给样式预留：如果你后续愿意改样式，优先显示 updatedAtText 就能带“（缓存）”
    ;(displayData as any).updatedAtText = updatedAtText
    ;(displayData as any).fromCache = fromCache

    let logoPath: string | null = null
    try {
      // 给 logo 下载一个很短的预算：比如 800ms
      logoPath = await Promise.race([getLogoPath(), new Promise<string | null>(r => setTimeout(() => r(null), 800))])
      if (!logoPath) console.log('🖼️ WSGW Logo：首帧跳过下载（避免阻塞渲染）')
    } catch (e) {
      console.log('🖼️ WSGW Logo：首帧跳过（异常）', String(e))
      logoPath = null
    }

    console.log(`⏱️ WSGW 渲染：${toHM(now)} | 面板时间：${updatedAtText}${rawData?.__cacheMeta?.decision ? ` | ${rawData.__cacheMeta.decision}` : ''}`)

    const styleKey = (settings as any).widgetStyle || 'classic'
    const renderer = (SGCC_WIDGET_STYLES as any)[styleKey] || SGCC_WIDGET_STYLES.classic

    Widget.present(
      renderer({
        displayData,
        barData,
        settings,
        logoPath
      }),
      reloadPolicy
    )
  } catch (e) {
    console.error('⛔️ WSGW Widget 渲染失败:', e)
    Widget.present(
      <VStack padding={10} alignment="center">
        <Text font={12} foregroundStyle={'#000000' as any}>
          加载失败
        </Text>
        <Text font={10} foregroundStyle={'#888888' as any}>
          {String(e)}
        </Text>
      </VStack>
    )
  }
}

render()
