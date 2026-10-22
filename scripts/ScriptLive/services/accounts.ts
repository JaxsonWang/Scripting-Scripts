import { createStore } from './store'

export type BilibiliUser = { uid: number; uname: string; face: string }

export type Accounts = {
  bilibiliCookie: string
  /** 登录后读取的用户信息，用于「我的」页展示 */
  bilibiliUser: BilibiliUser | null
  douyinCookie: string
}

export const accountStore = createStore<Accounts>('accounts', { bilibiliCookie: '', bilibiliUser: null, douyinCookie: '' }, stored => ({
  bilibiliCookie: stored.bilibiliCookie ?? '',
  bilibiliUser: stored.bilibiliUser ?? null,
  douyinCookie: stored.douyinCookie ?? ''
}))

export const setBilibiliAccount = (cookie: string, user: BilibiliUser | null) =>
  accountStore.update(current => ({ ...current, bilibiliCookie: cookie, bilibiliUser: user }))

export const setDouyinCookie = (cookie: string) => accountStore.update(current => ({ ...current, douyinCookie: cookie.trim() }))
