import { getJson, request } from '../http'

export type BilibiliUserInfo = { uid: number; uname: string; face: string }
export type BilibiliQRStatus = { status: 'unscanned' | 'scanned' | 'expired' | 'success'; cookie?: string }
const PASSPORT = 'https://passport.bilibili.com/x/passport-login/web/qrcode'

export async function generateBilibiliQRCode(): Promise<{ url: string; key: string }> {
  const response = await getJson(`${PASSPORT}/generate`)
  if (response.code !== 0) throw new Error(`生成登录二维码失败：${response.message}`)
  return { url: response.data.url, key: response.data.qrcode_key }
}

export async function pollBilibiliQRCode(key: string): Promise<BilibiliQRStatus> {
  const response = await request(`${PASSPORT}/poll`, { method: 'GET' }, { query: { qrcode_key: key } })
  const result = JSON.parse(await response.text())
  if (result.code !== 0) throw new Error(`查询扫码状态失败：${result.message}`)
  switch (result.data.code) {
    case 86101:
      return { status: 'unscanned' }
    case 86090:
      return { status: 'scanned' }
    case 86038:
      return { status: 'expired' }
    case 0: {
      // Scripting 将多个 Set-Cookie 合并；只截取每项的名称和值，不把 Expires 内的逗号当作边界。
      const header = response.headers.get('set-cookie') ?? ''
      const cookies = header
        .split(/,(?=\s*[^;,=\s]+=)/)
        .map((part: string) => part.trim().split(';')[0])
        .filter(Boolean)
      if (!cookies.some((cookie: string) => cookie.startsWith('SESSDATA='))) throw new Error('扫码成功，但接口未返回登录凭据，请重新扫码')
      return { status: 'success', cookie: cookies.join('; ') }
    }
    default:
      throw new Error(`扫码登录失败：${result.data.message} (${result.data.code})`)
  }
}

export async function getBilibiliUserInfo(cookie: string): Promise<BilibiliUserInfo> {
  const response = await getJson('https://api.bilibili.com/x/web-interface/nav', { headers: { Cookie: cookie } })
  if (response.code !== 0 || !response.data.isLogin) throw new Error('哔哩哔哩登录已失效，请重新扫码')
  return { uid: Number(response.data.mid), uname: String(response.data.uname), face: String(response.data.face) }
}
