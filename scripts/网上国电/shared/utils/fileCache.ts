// shared/utils/fileCache.ts
// 通用文件缓存（Scripting 环境）
//
// A) URL -> File cache
// - URL -> bytes -> FileManager 落盘
// - meta 只存 Storage（通过 safeGetObject/safeSet），避免爆 Storage
//
// B) Local JSON file helpers (供 api.ts / widget.tsx 写缓存)
// - JSON 数据落盘读写（fileCache）
// - 提供 writeJsonToCachedFileWithMeta：写新前删旧，并更新 meta（单文件策略）
//
// 设计要点：
// - 不依赖 Buffer / TextEncoder（避免 TS/运行时差异）
// - 尽量做路径 normalize，兼容旧数据/双斜杠
// - 时间戳 now 只取一次，fileName/updatedAt 一致

import { safeGetObject, safeSet } from "./storage"
import { fetch } from "scripting"

declare const FileManager: any

type BaseDir = "documents" | "temporary"

type FileCacheMeta = {
  url: string
  path: string
  updatedAt: number
}

export type EnsureCachedFilePathArgs = {
  url: string
  cacheKey: string
  filePrefix?: string
  fileExt?: string
  forceRefresh?: boolean
  baseDir?: BaseDir
}

export type EnsureCachedJsonArgs = {
  url: string
  cacheKey: string
  filePrefix?: string
  forceRefresh?: boolean
  baseDir?: BaseDir
}

// ===============================
// Runtime guards
// ===============================
function hasFMBytes(): boolean {
  return (
    !!FileManager &&
    typeof FileManager.existsSync === "function" &&
    typeof FileManager.writeAsBytesSync === "function" &&
    typeof FileManager.removeSync === "function" &&
    (typeof FileManager.temporaryDirectory === "string" || typeof FileManager.documentsDirectory === "string")
  )
}

function hasFMString(): boolean {
  return (
    !!FileManager &&
    typeof FileManager.existsSync === "function" &&
    typeof FileManager.writeAsStringSync === "function" &&
    typeof FileManager.readAsStringSync === "function" &&
    typeof FileManager.removeSync === "function" &&
    (typeof FileManager.temporaryDirectory === "string" || typeof FileManager.documentsDirectory === "string")
  )
}

function normalizePath(p: string): string {
  return String(p || "").replace(/\/{2,}/g, "/")
}

function pickBaseDir(baseDir?: BaseDir): string {
  if (baseDir === "temporary" && typeof FileManager.temporaryDirectory === "string") return FileManager.temporaryDirectory
  if (baseDir === "documents" && typeof FileManager.documentsDirectory === "string") return FileManager.documentsDirectory

  // 默认优先 documents（更持久），没有就用 temporary
  return typeof FileManager.documentsDirectory === "string"
    ? FileManager.documentsDirectory
    : FileManager.temporaryDirectory
}

export function safeRemoveFile(path: string) {
  try {
    const p = normalizePath(path)
    if (!p) return
    if (!FileManager || typeof FileManager.existsSync !== "function") return
    if (FileManager.existsSync(p) && typeof FileManager.removeSync === "function") {
      FileManager.removeSync(p)
    }
  } catch { }
}

export function cleanupCachedFiles(args: {
  filePrefix: string
  baseDir?: "documents" | "temporary"
  keepLatest?: number
}) {
  const { filePrefix, baseDir = "documents", keepLatest = 2 } = args
  try {
    if (!FileManager) return
    const dir = pickBaseDir(baseDir)
    if (!dir) return
    if (typeof FileManager.listContentsSync !== "function") return

    const files: string[] = FileManager.listContentsSync(dir) || []
    const matched = files
      .filter((name) => typeof name === "string" && name.startsWith(`${filePrefix}_`))
      .sort() // 因为文件名里是 Date.now()，字符串排序≈时间排序

    if (matched.length <= keepLatest) return

    const toDelete = matched.slice(0, matched.length - keepLatest)
    for (const name of toDelete) {
      safeRemoveFile(`${dir}/${name}`)
    }
  } catch { }
}

// ✅ 纯 TS UTF-8 编码，不依赖 TextEncoder/Buffer（bytes 写入兜底用）
function utf8ToBytes(str: string): Uint8Array {
  const bytes: number[] = []
  for (let i = 0; i < str.length; i++) {
    let codePoint = str.charCodeAt(i)

    // surrogate pair
    if (codePoint >= 0xd800 && codePoint <= 0xdbff && i + 1 < str.length) {
      const next = str.charCodeAt(i + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        codePoint = 0x10000 + ((codePoint - 0xd800) << 10) + (next - 0xdc00)
        i++
      }
    }

    if (codePoint <= 0x7f) {
      bytes.push(codePoint)
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6))
      bytes.push(0x80 | (codePoint & 0x3f))
    } else if (codePoint <= 0xffff) {
      bytes.push(0xe0 | (codePoint >> 12))
      bytes.push(0x80 | ((codePoint >> 6) & 0x3f))
      bytes.push(0x80 | (codePoint & 0x3f))
    } else {
      bytes.push(0xf0 | (codePoint >> 18))
      bytes.push(0x80 | ((codePoint >> 12) & 0x3f))
      bytes.push(0x80 | ((codePoint >> 6) & 0x3f))
      bytes.push(0x80 | (codePoint & 0x3f))
    }
  }
  return new Uint8Array(bytes)
}

// ===============================
// A) URL -> File cache
// ===============================
export async function ensureCachedFilePath(
  args: EnsureCachedFilePathArgs,
): Promise<string | null> {
  const {
    url,
    cacheKey,
    filePrefix = "cache_file",
    fileExt = "bin",
    forceRefresh = false,
    baseDir,
  } = args

  if (!url || !cacheKey) return null
  if (!hasFMBytes()) {
    console.warn("⚠️ fileCache：当前环境不支持 FileManager bytes 方法")
    return null
  }

  try {
    const cached = safeGetObject<FileCacheMeta | null>(cacheKey, null)

    const cachedUrl = cached?.url ? String(cached.url) : ""
    const cachedPath = cached?.path ? normalizePath(cached.path) : ""

    // 命中缓存（url 一致 + 文件存在）
    if (!forceRefresh && cachedUrl === url && cachedPath && FileManager.existsSync(cachedPath)) {
      return cachedPath
    }

    // 清理旧文件（如果有）
    if (cachedPath) safeRemoveFile(cachedPath)

    const resp = await fetch(url)
    if (!resp?.ok) {
      console.warn("⚠️ fileCache：下载失败 status=", (resp as any)?.status)
      return null
    }

    const buf = await resp.arrayBuffer()
    const bytes = new Uint8Array(buf)

    // 写文件
    const now = Date.now()
    const dir = pickBaseDir(baseDir)
    const fileName = `${filePrefix}_${now}.${fileExt}`
    const filePath = normalizePath(`${dir}/${fileName}`)
    FileManager.writeAsBytesSync(filePath, bytes)

    // 写 meta（统一走 safeSet）
    safeSet(cacheKey, {
      url,
      path: filePath,
      updatedAt: now,
    } as FileCacheMeta)

    return filePath
  } catch (e) {
    console.warn("⚠️ fileCache：异常", e)
    return null
  }
}

export async function ensureCachedJson<T = any>(
  args: EnsureCachedJsonArgs,
): Promise<T | null> {
  const { url, cacheKey, filePrefix = "cache_json", forceRefresh = false, baseDir } = args
  const filePath = await ensureCachedFilePath({
    url,
    cacheKey,
    filePrefix,
    fileExt: "json",
    forceRefresh,
    baseDir,
  })
  if (!filePath) return null

  try {
    if (!hasFMString()) {
      console.warn("⚠️ fileCache：当前环境不支持 readAsStringSync")
      return null
    }
    const txt = FileManager.readAsStringSync(filePath)
    return txt ? (JSON.parse(txt) as T) : null
  } catch (e) {
    console.warn("⚠️ fileCache：JSON 解析失败", e)
    safeRemoveFile(filePath)
    return null
  }
}

// ===============================
// B) Local JSON file helpers (供 api.ts 写缓存)
// ===============================
export type WriteJsonToCachedFileArgs = {
  data: any
  filePrefix?: string
  fileExt?: string
  baseDir?: BaseDir
}

export function writeJsonToCachedFile(
  args: WriteJsonToCachedFileArgs,
): { path: string; updatedAt: number } | null {
  const { data, filePrefix = "cache_json", fileExt = "json", baseDir } = args

  // writeAsStringSync 最稳；没有就退化到 bytes 写入
  if (!FileManager || (typeof FileManager.writeAsStringSync !== "function" && !hasFMBytes())) {
    console.warn("⚠️ writeJsonToCachedFile：当前环境不支持写文件")
    return null
  }

  try {
    const now = Date.now()
    const dir = pickBaseDir(baseDir)
    const fileName = `${filePrefix}_${now}.${fileExt}`
    const filePath = normalizePath(`${dir}/${fileName}`)
    const txt = JSON.stringify(data ?? null)

    if (typeof FileManager.writeAsStringSync === "function") {
      FileManager.writeAsStringSync(filePath, txt)
    } else {
      const bytes = utf8ToBytes(txt)
      FileManager.writeAsBytesSync(filePath, bytes)
    }

    return { path: filePath, updatedAt: now }
  } catch (e) {
    console.warn("⚠️ writeJsonToCachedFile：异常", e)
    return null
  }
}

export function readJsonFromCachedFile<T = any>(path: string): T | null {
  const p = normalizePath(path)
  if (!p) return null
  if (!FileManager || typeof FileManager.existsSync !== "function") return null
  if (!FileManager.existsSync(p)) return null
  if (!hasFMString()) {
    console.warn("⚠️ readJsonFromCachedFile：当前环境不支持 readAsStringSync")
    return null
  }

  try {
    const txt = FileManager.readAsStringSync(p)
    return txt ? (JSON.parse(txt) as T) : null
  } catch (e) {
    console.warn("⚠️ readJsonFromCachedFile：异常", e)
    return null
  }
}

// ===============================
// C) Single-file strategy helper (写新前删旧，并更新 meta)
// ===============================
export function writeJsonToCachedFileWithMeta<T>(args: {
  metaKey: string                 // Storage 里的 meta key（例如 TRAFFIC_DATA_CACHE_KEY）
  data: T
  filePrefix: string
  fileExt?: string
  baseDir?: BaseDir
  // 可选：缓存隔离指纹
  key?: string
}) {
  const { metaKey, data, filePrefix, fileExt = "json", baseDir, key } = args

  // 1) 读旧 meta 并删旧文件（只要 prev.path 存在，就清）
  const prev = safeGetObject<any | null>(metaKey, null)
  if (prev?.path) safeRemoveFile(String(prev.path))

  // 2) 写新文件
  const out = writeJsonToCachedFile({ data, filePrefix, fileExt, baseDir })
  const updatedAt = out?.updatedAt ?? Date.now()
  if (!out?.path) return { updatedAt, path: "" }

  // 3) 写回 meta（updatedAt/path/key）
  safeSet(metaKey, {
    updatedAt,
    path: out.path,
    ...(key ? { key } : {}),
  })

  return { updatedAt, path: out.path }
}

export async function getCachedImagePath(opts: {
  url?: string
  cacheKey: string
  filePrefix: string
  fileExt: "png" | "jpg" | "jpeg" | "webp"
  baseDir?: "documents" | "temporary"
  forceRefresh?: boolean
  timeoutMs?: number
  keepLatest?: number
}): Promise<string> {
  const {
    url,
    cacheKey,
    filePrefix,
    fileExt,
    baseDir = "documents",
    forceRefresh = false,
    timeoutMs = 800,
    keepLatest = 2,
  } = opts

  if (!url) return ""

  try {
    const raw = await Promise.race([
      ensureCachedFilePath({
        url,
        cacheKey,
        filePrefix,
        fileExt,
        baseDir,
        forceRefresh,
      }) as Promise<any>,
      new Promise<any>((r) => setTimeout(() => r(null), timeoutMs)),
    ])

    if (typeof raw !== "string" || !raw) return ""

    const path = normalizePath(raw)

    // ✅ 轻量校验：存在 + size>0（避免空文件/半写入）
    const exists = !!FileManager?.existsSync?.(path)
    const stat =
      exists && typeof FileManager?.statSync === "function" ? FileManager.statSync(path) : null
    const size = typeof stat?.size === "number" ? stat.size : -1
    if (!exists || !Number.isFinite(size) || size <= 0) return ""

    // ✅ 不阻塞渲染：清理失败不影响返回
    try {
      cleanupCachedFiles({ filePrefix, baseDir, keepLatest })
    } catch { }

    return path
  } catch {
    return ""
  }
}