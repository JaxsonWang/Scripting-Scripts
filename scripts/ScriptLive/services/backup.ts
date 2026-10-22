import { Path } from 'scripting'
import { base64Encode, utf8Encode } from '../core/bytes'
import { isSiteId } from './sites'
import { accountStore, setBilibiliAccount } from './accounts'
import { DEFAULT_TAG, followStore, mergeFollows, tagStore } from './follows'
import { historyStore } from './history'
import { settingsStore, updateSettings } from './settings'
import { createStore } from './store'
import type { FollowTag, FollowUser, HistoryItem } from '../types'
import { formatDateTime, parseDateTime } from '../utils/format'

/**
 * 完整备份包含关注、标签、观看记录、屏蔽词、B站账号与设置。
 * 每个文件的内容为 { data: ... }。
 */
const FILES = {
  follows: 'ScriptLive_follows.json',
  tags: 'ScriptLive_tags.json',
  histories: 'ScriptLive_histories.json',
  blockedWords: 'ScriptLive_blocked_word.json',
  bilibili: 'ScriptLive_bilibili_account.json',
  settings: 'ScriptLive_settings.json'
} as const

const REMOTE_DIR = 'ScriptLive'
const REMOTE_FILE = `${REMOTE_DIR}/backup.zip`

export type WebDavConfig = { url: string; user: string; password: string; lastUpload: number; lastRestore: number }

export const webDavStore = createStore<WebDavConfig>('webdav', { url: '', user: '', password: '', lastUpload: 0, lastRestore: 0 })

// ---------- 关注列表 JSON ----------

/** 把外部 JSON 规范成关注列表，丢弃平台未知或缺少房间号的条目 */
const normalizeFollows = (raw: unknown): FollowUser[] => {
  if (!Array.isArray(raw)) throw new Error('关注数据格式不正确，应为数组')
  return raw.flatMap(item => {
    const siteId = item?.siteId
    const roomId = item?.roomId === undefined || item?.roomId === null ? '' : String(item.roomId)
    if (!isSiteId(siteId) || !roomId) return []
    return [
      {
        id: `${siteId}_${roomId}`,
        roomId,
        siteId,
        userName: String(item.userName ?? roomId),
        face: String(item.face ?? ''),
        addTime: typeof item.addTime === 'string' && parseDateTime(item.addTime) ? item.addTime : formatDateTime(new Date()),
        tag: typeof item.tag === 'string' && item.tag ? item.tag : DEFAULT_TAG
      }
    ]
  })
}

export const exportFollowsJson = (): string => JSON.stringify(followStore.get(), null, 2)

/**
 * 导入关注 JSON，支持数组或 { data: [...] }。
 * @returns 导入条数
 */
export const importFollowsJson = (text: string): number => {
  const parsed = JSON.parse(text)
  const users = normalizeFollows(Array.isArray(parsed) ? parsed : parsed?.data)
  mergeFollows(users)
  return users.length
}

// ---------- 整体备份 ----------

const normalizeHistory = (raw: unknown): HistoryItem[] =>
  Array.isArray(raw)
    ? raw.flatMap(item =>
        isSiteId(item?.siteId) && item?.roomId
          ? [
              {
                id: `${item.siteId}_${item.roomId}`,
                roomId: String(item.roomId),
                siteId: item.siteId,
                userName: String(item.userName ?? ''),
                face: String(item.face ?? ''),
                updateTime: String(item.updateTime ?? formatDateTime(new Date()))
              }
            ]
          : []
      )
    : []

const normalizeTags = (raw: unknown): FollowTag[] =>
  Array.isArray(raw)
    ? raw.flatMap(item =>
        typeof item?.tag === 'string' && item.tag
          ? [{ id: String(item.id ?? item.tag), tag: item.tag, userId: Array.isArray(item.userId) ? item.userId.map(String) : [] }]
          : []
      )
    : []

/** 把当前数据写成备份目录并压缩，返回 zip 路径 */
const writeBackupZip = async (): Promise<string> => {
  const root = Path.join(FileManager.temporaryDirectory, `ScriptLive_backup_${Date.now()}`)
  const folder = Path.join(root, 'backup')
  await FileManager.createDirectory(folder, true)
  const { bilibiliCookie } = accountStore.get()
  const files: Record<string, unknown> = {
    [FILES.follows]: { data: followStore.get() },
    [FILES.tags]: { data: tagStore.get() },
    [FILES.histories]: { data: historyStore.get() },
    [FILES.blockedWords]: { data: settingsStore.get().shieldWords },
    [FILES.bilibili]: { data: { cookie: bilibiliCookie } },
    [FILES.settings]: { data: settingsStore.get() }
  }
  for (const [name, content] of Object.entries(files)) {
    await FileManager.writeAsString(Path.join(folder, name), JSON.stringify(content))
  }
  const zipPath = Path.join(root, 'backup.zip')
  await FileManager.zip(folder, zipPath, false)
  return zipPath
}

const readJsonFile = async (folder: string, name: string) => {
  const path = Path.join(folder, name)
  if (!(await FileManager.exists(path))) return null
  return JSON.parse(await FileManager.readAsString(path))?.data
}

/** 解压备份并合并到本地：关注与标签合并，观看记录按时间合并，屏蔽词取并集，B站 Cookie 与设置覆盖 */
const restoreBackupZip = async (zipPath: string) => {
  const folder = Path.join(FileManager.temporaryDirectory, `ScriptLive_restore_${Date.now()}`)
  await FileManager.unzip(zipPath, folder)
  const follows = await readJsonFile(folder, FILES.follows)
  if (follows === null) {
    await FileManager.remove(folder)
    throw new Error('备份格式不匹配，请选择当前 ScriptLive 导出的完整备份')
  }
  const tags = await readJsonFile(folder, FILES.tags)
  mergeFollows(normalizeFollows(follows), normalizeTags(tags))
  const histories = normalizeHistory(await readJsonFile(folder, FILES.histories))
  if (histories.length) {
    const merged = new Map([...historyStore.get(), ...histories].map(item => [item.id, item]))
    historyStore.set([...merged.values()].sort((a, b) => parseDateTime(b.updateTime) - parseDateTime(a.updateTime)).slice(0, 200))
  }
  const words = await readJsonFile(folder, FILES.blockedWords)
  if (Array.isArray(words)) updateSettings({ shieldWords: Array.from(new Set([...settingsStore.get().shieldWords, ...words.map(String)])) })
  const bilibili = await readJsonFile(folder, FILES.bilibili)
  if (typeof bilibili?.cookie === 'string' && bilibili.cookie) setBilibiliAccount(bilibili.cookie, null)
  const settings = await readJsonFile(folder, FILES.settings)
  if (settings && typeof settings === 'object') updateSettings(settings)
  await FileManager.remove(folder)
}

/** 导出完整备份到「文件」App */
export const exportBackupFile = async (): Promise<boolean> => {
  const zipPath = await writeBackupZip()
  const data = await FileManager.readAsData(zipPath)
  const saved = await DocumentPicker.exportFiles({ files: [{ data, name: `ScriptLive_${formatDateTime(new Date()).slice(0, 10)}.zip` }] })
  return saved.length > 0
}

/** 从「文件」App 选择备份 zip 恢复 */
export const importBackupFile = async (): Promise<boolean> => {
  const [path] = await DocumentPicker.pickFiles({ types: ['public.zip-archive'] })
  if (!path) return false
  await restoreBackupZip(path)
  return true
}

// ---------- WebDAV ----------

const davUrl = (config: WebDavConfig, path: string) => `${config.url.replace(/\/+$/, '')}/${path}`

const davHeaders = (config: WebDavConfig): Record<string, string> => ({
  authorization: `Basic ${base64Encode(utf8Encode(`${config.user}:${config.password}`))}`
})

const davRequest = async (config: WebDavConfig, method: string, path: string, body?: Data, accept: number[] = []) => {
  const response = await fetch(davUrl(config, path), { method, body, headers: davHeaders(config), timeout: 30 })
  if (!response.ok && !accept.includes(response.status)) throw new Error(`WebDAV ${method} 失败（HTTP ${response.status}）`)
  return response
}

/** 检查服务器连通与账号；405 表示目录已存在 */
export const testWebDav = async (config: WebDavConfig) => {
  await davRequest(config, 'MKCOL', `${REMOTE_DIR}/`, undefined, [405])
}

export const uploadWebDav = async () => {
  const config = webDavStore.get()
  await davRequest(config, 'MKCOL', `${REMOTE_DIR}/`, undefined, [405])
  const zipPath = await writeBackupZip()
  await davRequest(config, 'PUT', REMOTE_FILE, await FileManager.readAsData(zipPath))
  webDavStore.update(current => ({ ...current, lastUpload: Date.now() }))
}

export const restoreWebDav = async () => {
  const config = webDavStore.get()
  const response = await davRequest(config, 'GET', REMOTE_FILE)
  const zipPath = Path.join(FileManager.temporaryDirectory, `ScriptLive_remote_${Date.now()}.zip`)
  await FileManager.writeAsData(zipPath, await response.data())
  await restoreBackupZip(zipPath)
  webDavStore.update(current => ({ ...current, lastRestore: Date.now() }))
}
