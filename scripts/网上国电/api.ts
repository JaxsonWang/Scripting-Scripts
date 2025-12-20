// api.ts（网上国网 / WSGW | 缓存 + 日志 + meta，数据缓存复用 fileCache）
// - Storage 仅存 meta（updatedAt/path/key）
// - 数据本体落盘（fileCache）
// - 支持 cacheScopeKey 指纹隔离
// - 更新时间（lastUpdateTime）永远使用“当前时间”，而非缓存时间

import { safeGetObject } from "./shared/utils/storage"
import { fetchWsgwAccounts } from "./services/wsgw_client"

import {
  type SGCCSettings,
  defaultSGCCSettings,
  loadSGCCSettings,
  saveSGCCSettings,
  SETTINGS_KEY,
  SGCC_DATA_CACHE_KEY,
} from "./settings"

import type { CacheConfig, CacheMode } from "./shared/ui-kit/cacheSection"

// ✅ 统一文件缓存工具（数据落盘 + meta）
import {
  readJsonFromCachedFile,
  writeJsonToCachedFileWithMeta, cleanupCachedFiles,
} from "./shared/utils/fileCache"

// --- 类型导出 ---
export { type SGCCSettings }
export const DEFAULT_SETTINGS = defaultSGCCSettings

export interface BarData {
  value: number
  level: number
  label?: string
}

// =======================
// 设置读写（收口在 settings.ts，这里只做透传）
// =======================
export function getSettings(): SGCCSettings {
  return loadSGCCSettings()
}
export function saveSettings(settings: SGCCSettings) {
  saveSGCCSettings(settings)
}

// =======================
// 缓存
// =======================
type SGCCCacheHit = {
  updatedAt: number
  data: any
  keyMatched: boolean
}

const MIN_CACHE_MS = 4 * 60 * 60 * 1000
const DEFAULT_MAX_STALE_MS = 24 * 60 * 60 * 1000

function fingerprint(raw: string): string {
  const s = String(raw ?? "")
  let hash = 5381
  for (let i = 0; i < s.length; i++) hash = ((hash << 5) + hash) ^ s.charCodeAt(i)
  return `djb2:${(hash >>> 0).toString(36)}`
}

function toMin(ms: number) {
  return Math.round(ms / 60000)
}

function clampRefreshMinutes(v: any): number {
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return 180
  return Math.max(60, Math.floor(n))
}

function isFresh(updatedAt: number, ttlMs: number) {
  return Date.now() - updatedAt <= ttlMs
}

function isWithinStale(updatedAt: number, maxStaleMs: number) {
  return Date.now() - updatedAt <= maxStaleMs
}

// ✅ 关键：永远用“可选链 + 布尔化”拿 keyMatched，避免被 TS 收窄成 never
function pickKeyMatched(hit: SGCCCacheHit | null | undefined): boolean | undefined {
  return hit ? hit.keyMatched === true : undefined
}

function readCache(boundKey: string, allowKeyMismatch: boolean): SGCCCacheHit | null {
  const meta = safeGetObject<any | null>(SGCC_DATA_CACHE_KEY, null)
  if (!meta || typeof meta !== "object") return null
  if (typeof meta.updatedAt !== "number") return null

  const path = String(meta.path ?? "")
  if (!path) return null

  const wantKey = fingerprint(boundKey)
  const storedKey = typeof meta.key === "string" ? meta.key : ""
  const keyMatched = !!storedKey && storedKey === wantKey

  // key 不匹配且不允许复用：直接 miss
  if (!keyMatched && !allowKeyMismatch) return null

  // 只读新格式：文件落盘的数据
  const data = readJsonFromCachedFile<any>(path)
  if (data == null) return null

  return { updatedAt: meta.updatedAt, data, keyMatched }
}

function writeCache(data: any, boundKey: string) {
  const out = writeJsonToCachedFileWithMeta({
    metaKey: SGCC_DATA_CACHE_KEY,
    data,
    filePrefix: "sgcc_data",
    fileExt: "json",
    baseDir: "documents",
    key: fingerprint(boundKey),
  })

  cleanupCachedFiles({ filePrefix: "sgcc_data", baseDir: "documents", keepLatest: 2 })
  return out.updatedAt
}

// =======================
// 超时工具：避免 fetch “挂死”
// =======================
function withTimeout<T>(p: Promise<T>, ms: number, tag: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${tag} timeout after ${ms}ms`)), ms)
    p.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      },
    )
  })
}

// =======================
// 网络请求（直连）
// =======================
async function fetchSGCCAllFromNetwork(settings: SGCCSettings): Promise<any[] | null> {
  const username = (settings.username || "").trim()
  const password = settings.password || ""
  const serverHost = typeof (settings as any).serverHost === "string" ? (settings as any).serverHost.trim() : ""

  if (!username || !password) {
    console.warn("⚠️ WSGW：缺少账号或密码，跳过网络请求")
    return null
  }

  const TIMEOUT_MS = 25000
  try {
    const data = await withTimeout(
      fetchWsgwAccounts({ username, password, logDebug: settings.logDebug, serverHost }),
      TIMEOUT_MS,
      "WSGW(native)",
    )
    if (Array.isArray(data)) return data
    console.warn("⚠️ WSGW：接口返回空或异常结构")
    return null
  } catch (e) {
    console.warn("⚠️ WSGW 原始请求失败：", String(e))
    return null
  }
}

// =======================
// TTL 计算
// =======================
function ttlFromCacheSettings(cache: CacheConfig, refreshIntervalMinutes?: number): number {
  const refreshMs =
    typeof refreshIntervalMinutes === "number" && Number.isFinite(refreshIntervalMinutes)
      ? Math.max(0, refreshIntervalMinutes) * 60 * 1000
      : 0

  const fixedMs =
    typeof cache.ttlMinutesFixed === "number" && Number.isFinite(cache.ttlMinutesFixed)
      ? Math.max(0, cache.ttlMinutesFixed) * 60 * 1000
      : 0

  const base = cache.ttlPolicy === "fixed" ? fixedMs : refreshMs
  return Math.max(MIN_CACHE_MS, base)
}

// =======================
// 数据获取（带缓存）
// =======================
export type FetchSGCCCachedOptions = {
  forceRefresh?: boolean
  cacheKey?: string
  refreshIntervalMinutes?: number
  cache?: CacheConfig
}

export type FetchSGCCCachedResult = {
  data: any
  fromCache: boolean
  ttlMs: number
  mode:
  | "cache_fresh"
  | "network_fresh"
  | "cache_stale_fallback"
  | "none"
  | "cache_only_hit"
  | "cache_only_miss"
  | "network_only"
  | "cache_disabled"

  // ✅ UI 展示用：永远是当前时间
  fetchedAt: number

  // ✅ 调试用：缓存文件真实更新时间
  cacheUpdatedAt?: number

  meta?: {
    cacheEnabled: boolean
    cacheMode: CacheMode
    ttlPolicy: "auto" | "fixed"
    ttlMinutes: number
    allowStaleOnError: boolean
    maxStaleMinutes: number
    allowStaleOnKeyMismatch: boolean
    keyMatched?: boolean
    cacheAgeMinutes?: number
    forceRefresh: boolean
    decision: string
  }
}

export async function getElectricityData(
  options: FetchSGCCCachedOptions = {},
): Promise<FetchSGCCCachedResult> {
  const settings = getSettings()
  const now = Date.now()

  const boundKey =
    (typeof options.cacheKey === "string" && options.cacheKey.trim().length > 0
      ? options.cacheKey.trim()
      : typeof (settings as any).cacheScopeKey === "string" && (settings as any).cacheScopeKey.trim().length > 0
        ? String((settings as any).cacheScopeKey).trim()
        : SETTINGS_KEY)

  const refreshMinutes =
    typeof options.refreshIntervalMinutes === "number" && Number.isFinite(options.refreshIntervalMinutes)
      ? Math.max(0, options.refreshIntervalMinutes)
      : clampRefreshMinutes((settings as any)?.refreshInterval)

  const cacheSettings: CacheConfig =
    options.cache ??
    (settings as any).cache ??
    defaultSGCCSettings.cache

  const cacheEnabled = cacheSettings.enabled !== false
  const cacheMode: CacheMode = (cacheSettings.mode ?? "auto") as CacheMode
  const allowStaleOnError = cacheSettings.allowStaleOnError !== false
  const allowKeyMismatch = (cacheSettings as any).allowStaleOnKeyMismatch !== false

  const ttlMs = ttlFromCacheSettings(cacheSettings, refreshMinutes)

  const maxStaleMs =
    typeof cacheSettings.maxStaleMinutes === "number" && Number.isFinite(cacheSettings.maxStaleMinutes)
      ? Math.max(0, cacheSettings.maxStaleMinutes) * 60 * 1000
      : DEFAULT_MAX_STALE_MS

  const forceRefresh = options.forceRefresh === true

  // ✅ 用独立变量，别让 TS 通过控制流“推断”
  const cacheHit: SGCCCacheHit | null = cacheEnabled ? readCache(boundKey, allowKeyMismatch) : null
  const cacheAgeMs = cacheHit ? Date.now() - cacheHit.updatedAt : null
  const cacheAgeMin = cacheAgeMs != null ? toMin(cacheAgeMs) : undefined
  const keyMatched = pickKeyMatched(cacheHit)

  console.log(
    `🧠 WSGW Cache 设置消费：enabled=${cacheEnabled ? "Y" : "N"} | mode=${cacheMode} | ttlPolicy=${cacheSettings.ttlPolicy} | ttl=${toMin(ttlMs)}min | allowStale=${allowStaleOnError ? "Y" : "N"} | maxStale=${toMin(maxStaleMs)}min | allowKeyMismatch=${allowKeyMismatch ? "Y" : "N"} | refresh=${refreshMinutes}min | force=${forceRefresh ? "Y" : "N"} | keyMatched=${keyMatched === undefined ? "-" : keyMatched ? "Y" : "N"}`,
  )

  // ====== cache disabled ======
  // ====== cache disabled ======
  if (!cacheEnabled) {
    const fresh = await fetchSGCCAllFromNetwork(settings)

    // ✅ 关键：即使“禁用缓存读取”，网络成功也写缓存，方便下次兜底/排障
    let cacheUpdatedAt: number | undefined
    if (fresh) {
      try {
        cacheUpdatedAt = writeCache(fresh, boundKey)
      } catch (e) {
        console.warn("⚠️ WSGW cache_disabled 写缓存失败：", String(e))
      }
    }

    return {
      data: fresh ?? [],
      fromCache: false,
      ttlMs,
      mode: fresh ? "cache_disabled" : "none",
      fetchedAt: now,
      cacheUpdatedAt,
      meta: {
        cacheEnabled: false,
        cacheMode,
        ttlPolicy: cacheSettings.ttlPolicy,
        ttlMinutes: toMin(ttlMs),
        allowStaleOnError,
        maxStaleMinutes: toMin(maxStaleMs),
        allowStaleOnKeyMismatch: allowKeyMismatch,
        keyMatched: undefined,
        forceRefresh,
        decision: fresh
          ? "cache_disabled(read_off) -> network_ok -> cache_written"
          : "cache_disabled(read_off) -> network_fail",
      },
    }
  }

  // ====== cache_only ======
  if (cacheMode === "cache_only") {
    if (cacheHit) {
      return {
        data: cacheHit.data,
        fromCache: true,
        ttlMs,
        mode: "cache_only_hit",
        fetchedAt: now,                 // ✅ 当前时间
        cacheUpdatedAt: cacheHit.updatedAt,
        meta: {
          cacheEnabled: true,
          cacheMode,
          ttlPolicy: cacheSettings.ttlPolicy,
          ttlMinutes: toMin(ttlMs),
          allowStaleOnError,
          maxStaleMinutes: toMin(maxStaleMs),
          allowStaleOnKeyMismatch: allowKeyMismatch,
          keyMatched,
          cacheAgeMinutes: cacheAgeMin,
          forceRefresh,
          decision: keyMatched ? "cache_only -> hit" : "cache_only -> hit(key_mismatch_reuse)",
        },
      }
    }

    return {
      data: [],
      fromCache: false,
      ttlMs,
      mode: "cache_only_miss",
      fetchedAt: now,
      cacheUpdatedAt: undefined,
      meta: {
        cacheEnabled: true,
        cacheMode,
        ttlPolicy: cacheSettings.ttlPolicy,
        ttlMinutes: toMin(ttlMs),
        allowStaleOnError,
        maxStaleMinutes: toMin(maxStaleMs),
        allowStaleOnKeyMismatch: allowKeyMismatch,
        keyMatched,
        forceRefresh,
        decision: "cache_only -> miss",
      },
    }
  }

  // ====== network_only ======
  if (cacheMode === "network_only") {
    const fresh = await fetchSGCCAllFromNetwork(settings)
    if (fresh) {
      const cacheUpdatedAt = writeCache(fresh, boundKey)
      return {
        data: fresh,
        fromCache: false,
        ttlMs,
        mode: "network_only",
        fetchedAt: now,
        cacheUpdatedAt,
        meta: {
          cacheEnabled: true,
          cacheMode,
          ttlPolicy: cacheSettings.ttlPolicy,
          ttlMinutes: toMin(ttlMs),
          allowStaleOnError,
          maxStaleMinutes: toMin(maxStaleMs),
          allowStaleOnKeyMismatch: allowKeyMismatch,
          keyMatched,
          forceRefresh,
          decision: "network_only -> network_ok -> cache_written",
        },
      }
    }

    return {
      data: [],
      fromCache: false,
      ttlMs,
      mode: "none",
      fetchedAt: now,
      cacheUpdatedAt: undefined,
      meta: {
        cacheEnabled: true,
        cacheMode,
        ttlPolicy: cacheSettings.ttlPolicy,
        ttlMinutes: toMin(ttlMs),
        allowStaleOnError,
        maxStaleMinutes: toMin(maxStaleMs),
        allowStaleOnKeyMismatch: allowKeyMismatch,
        keyMatched,
        forceRefresh,
        decision: "network_only -> network_fail",
      },
    }
  }

  // ====== auto：优先新鲜缓存 ======
  if (cacheHit && !forceRefresh && isFresh(cacheHit.updatedAt, ttlMs)) {
    return {
      data: cacheHit.data,
      fromCache: true,
      ttlMs,
      mode: "cache_fresh",
      fetchedAt: now,                  // ✅ 当前时间
      cacheUpdatedAt: cacheHit.updatedAt,
      meta: {
        cacheEnabled: true,
        cacheMode,
        ttlPolicy: cacheSettings.ttlPolicy,
        ttlMinutes: toMin(ttlMs),
        allowStaleOnError,
        maxStaleMinutes: toMin(maxStaleMs),
        allowStaleOnKeyMismatch: allowKeyMismatch,
        keyMatched,
        cacheAgeMinutes: cacheAgeMin,
        forceRefresh,
        decision: keyMatched ? "auto -> cache_fresh" : "auto -> cache_fresh(key_mismatch_reuse)",
      },
    }
  }

  // 走网络刷新
  const fresh = await fetchSGCCAllFromNetwork(settings)
  if (fresh) {
    const cacheUpdatedAt = writeCache(fresh, boundKey)
    return {
      data: fresh,
      fromCache: false,
      ttlMs,
      mode: "network_fresh",
      fetchedAt: now,
      cacheUpdatedAt,
      meta: {
        cacheEnabled: true,
        cacheMode,
        ttlPolicy: cacheSettings.ttlPolicy,
        ttlMinutes: toMin(ttlMs),
        allowStaleOnError,
        maxStaleMinutes: toMin(maxStaleMs),
        allowStaleOnKeyMismatch: allowKeyMismatch,
        keyMatched,
        forceRefresh,
        decision: "auto -> network_ok -> cache_written",
      },
    }
  }

  // 网络失败：兜底旧缓存
  if (allowStaleOnError && cacheHit && isWithinStale(cacheHit.updatedAt, maxStaleMs)) {
    return {
      data: cacheHit.data,
      fromCache: true,
      ttlMs,
      mode: "cache_stale_fallback",
      fetchedAt: now,                  // ✅ 当前时间
      cacheUpdatedAt: cacheHit.updatedAt,
      meta: {
        cacheEnabled: true,
        cacheMode,
        ttlPolicy: cacheSettings.ttlPolicy,
        ttlMinutes: toMin(ttlMs),
        allowStaleOnError,
        maxStaleMinutes: toMin(maxStaleMs),
        allowStaleOnKeyMismatch: allowKeyMismatch,
        keyMatched,
        cacheAgeMinutes: cacheAgeMin,
        forceRefresh,
        decision: keyMatched
          ? "auto -> network_fail -> stale_fallback"
          : "auto -> network_fail -> stale_fallback(key_mismatch_reuse)",
      },
    }
  }

  return {
    data: [],
    fromCache: false,
    ttlMs,
    mode: "none",
    fetchedAt: now,
    cacheUpdatedAt: cacheHit ? cacheHit.updatedAt : undefined,
    meta: {
      cacheEnabled: true,
      cacheMode,
      ttlPolicy: cacheSettings.ttlPolicy,
      ttlMinutes: toMin(ttlMs),
      allowStaleOnError,
      maxStaleMinutes: toMin(maxStaleMs),
      allowStaleOnKeyMismatch: allowKeyMismatch,
      keyMatched,
      cacheAgeMinutes: cacheAgeMin,
      forceRefresh,
      decision: "auto -> network_fail -> no_cache",
    },
  }
}

export async function getAccountData(forceRefresh = false): Promise<any> {
  const settings = getSettings()
  const refreshMinutes = clampRefreshMinutes((settings as any).refreshInterval)

  const result = await getElectricityData({
    forceRefresh,
    refreshIntervalMinutes: refreshMinutes,
    cache: (settings as any).cache,
  })

  const allData = result.data
  const fetchedAt = result.fetchedAt // ✅ 当前时间
  const cacheUpdatedAt = result.cacheUpdatedAt

  const cacheMeta = {
    ...(result.meta || {}),
    fromCache: result.fromCache === true,
    mode: result.mode,
    fetchedAt,      // ✅ 展示用时间
    cacheUpdatedAt, // ✅ 调试用缓存真实时间
  }

  if (Array.isArray(allData) && allData.length > 0) {
    const index = Math.min(
      Math.max(0, Number((settings as any).accountIndex) || 0),
      allData.length - 1,
    )
    return {
      ...allData[index],
      lastUpdateTime: fetchedAt, // ✅ 永远用当前时间
      __cacheMeta: cacheMeta,
    }
  }

  return {
    eleBill: { sumMoney: "0.00" },
    arrearsOfFees: false,
    stepElecQuantity: [],
    monthElecQuantity: { dataInfo: {}, mothEleList: [] },
    dayElecQuantity31: { sevenEleList: [] },
    lastUpdateTime: fetchedAt, // ✅ 永远用当前时间
    __cacheMeta: cacheMeta,
  }
}

// =======================
// 业务逻辑处理（保持原样）
// =======================
export function processBarChartData(data: any, settings: SGCCSettings): BarData[] {
  const { oneLevelPq, twoLevelPq, barCount, dimension } = settings

  const monthlyData: { yearTotal: number; monthElec: number; level: number }[] = []
  let yearTotal = 0

  const mothEleList = data.monthElecQuantity?.mothEleList || []

  for (const { monthEleNum } of mothEleList) {
    const n = Number(monthEleNum || 0)
    yearTotal += n
    const level = yearTotal > twoLevelPq ? 3 : yearTotal > oneLevelPq ? 2 : 1
    monthlyData.push({ yearTotal, monthElec: n, level })
  }

  let barData: BarData[] = []

  if (dimension === "monthly") {
    barData = monthlyData.map(({ monthElec, level }) => ({ value: monthElec, level }))
  } else {
    const sevenEleList = data.dayElecQuantity31?.sevenEleList || []
    const currentYear = new Date().getFullYear()

    for (const { day, dayElePq } of sevenEleList) {
      if (dayElePq && !isNaN(Number(dayElePq))) {
        const match = String(day).match(/^(\d{4})\D?(\d{2})/)
        if (match) {
          const year = Number(match[1])
          const month = Number(match[2])
          let level = 1

          if (currentYear === year) {
            const safeIndex = Math.max(0, Math.min(monthlyData.length - 1, month - 1))
            level = monthlyData[safeIndex]?.level || 1
          }

          barData.unshift({ value: Number(dayElePq), level, label: day })
        }
      }
    }
  }

  return barData.slice(-Number(barCount) || 7)
}

export function extractDisplayData(data: any) {
  const balance = data.eleBill?.sumMoney || "0.00"
  const hasArrear = !!data.arrearsOfFees

  let lastBill = "0.00"
  let lastUsage = "0"

  if (data.monthElecQuantity?.mothEleList?.length > 0) {
    const list = data.monthElecQuantity.mothEleList
    const last = list[list.length - 1]
    if (last) {
      lastBill = last.monthEleCost || last.cost || last.eleCost || "0.00"
      lastUsage = last.monthEleNum || last.eleNum || last.usage || "0"
    }
  } else if (data.stepElecQuantity?.[0]?.electricParticulars) {
    const p = data.stepElecQuantity[0].electricParticulars
    lastBill = p.totalAmount || "0.00"
    lastUsage = p.totalPq || "0"
  }

  const yearBill = data.monthElecQuantity?.dataInfo?.totalEleCost || "0"
  const yearUsage = data.monthElecQuantity?.dataInfo?.totalEleNum || "0"

  let totalYearPq = 0
  if (data.stepElecQuantity?.[0]?.electricParticulars) {
    totalYearPq = Number(data.stepElecQuantity[0].electricParticulars.totalYearPq || 0)
  }

  return {
    balance,
    hasArrear,
    lastBill,
    lastUsage,
    yearBill,
    yearUsage,
    totalYearPq,
    lastUpdateTime: data.lastUpdateTime,
  }
}
