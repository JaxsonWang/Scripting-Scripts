import { BilibiliSite } from '../core/sites/bilibili'
import { DouyinSite } from '../core/sites/douyin'
import { DouyuSite } from '../core/sites/douyu'
import { HuyaSite } from '../core/sites/huya'
import type { LiveSite, SiteId } from '../core/types'
import { accountStore } from './accounts'

/** 四个平台的单例；账号 Cookie 每次请求时从存储读取，登录或退出后立即生效 */
const SITES: Record<SiteId, LiveSite> = {
  bilibili: new BilibiliSite(() => accountStore.get().bilibiliCookie),
  douyu: new DouyuSite(),
  huya: new HuyaSite(),
  douyin: new DouyinSite(() => accountStore.get().douyinCookie)
}

export const getSite = (id: SiteId): LiveSite => SITES[id]

export const isSiteId = (value: unknown): value is SiteId => typeof value === 'string' && Object.prototype.hasOwnProperty.call(SITES, value)
