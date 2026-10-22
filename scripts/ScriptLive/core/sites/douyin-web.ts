/**
 * 抖音官方网页环境：只调用页面自带的 SDK，不复制或执行仓库内的第三方混淆脚本。
 * WebKit 的 Cookie jar 同时用于签名和弹幕握手；原生 WebSocket 无法设置抖音必需的 Cookie。
 */
import { md5Hex } from '../bytes'

export const DOUYIN_UA =
  'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.5845.97 Safari/537.36 Core/1.116.567.400 QQBrowser/19.7.6764.400'
export const DOUYIN_COOKIE =
  'ttwid=1%7CB1qls3GdnZhUov9o2NxOMxxYS2ff6OSvEWbv0ytbES4%7C1680522049%7C280d802d6d478e3e78d0c807f7c487e7ffec0ae4e5fdd6a0fe74c3c6af149511'

export type DouyinSignInput = { roomId: string; userId: string; webRid: string; cookie: string }
export type DouyinSigner = (input: DouyinSignInput, web?: DouyinWebContext) => Promise<string>
export type DouyinSearchRequest = (url: string, cookie: string, keyword: string) => Promise<unknown>

export class DouyinWebContext {
  readonly controller: WebViewController
  constructor() {
    if (typeof WebViewController === 'undefined') throw new Error('抖音签名与弹幕需要 Scripting 的 WebViewController')
    this.controller = new WebViewController({ ephemeral: true })
    this.controller.setCustomUserAgent(DOUYIN_UA)
  }

  async load(url: string, cookie: string): Promise<void> {
    for (const part of cookie.split(';')) {
      const separator = part.indexOf('=')
      if (separator < 1) continue
      const accepted = await this.controller.setCookie({
        name: part.slice(0, separator).trim(),
        value: part.slice(separator + 1).trim(),
        domain: '.douyin.com',
        path: '/',
        isSecure: true,
        isHTTPOnly: false,
        isSessionOnly: true
      })
      if (!accepted) throw new Error('无法将抖音 Cookie 写入 WebView')
    }
    if (!(await this.controller.loadURL(url))) throw new Error('抖音官方页面加载失败，请检查网络或更新 Cookie')
  }

  dispose(): void {
    this.controller.dispose()
  }
}

/** 按官方弹幕协议将固定参数组合成签名摘要。 */
export function douyinSignatureStub(input: Pick<DouyinSignInput, 'roomId' | 'userId'>): string {
  const fields = {
    live_id: '1',
    aid: '6383',
    version_code: '180800',
    webcast_sdk_version: '1.3.0',
    room_id: input.roomId,
    sub_room_id: '',
    sub_channel_id: '',
    did_rule: '3',
    user_unique_id: input.userId,
    device_platform: 'web',
    device_type: '',
    ac: '',
    identity: 'audience'
  }
  return md5Hex(
    Object.entries(fields)
      .map(([key, value]) => `${key}=${value}`)
      .join(',')
  )
}

export const signWithOfficialPage: DouyinSigner = async (input, web) => {
  if (!web) throw new Error('抖音签名缺少官方网页环境')
  const signature = await web.controller.evaluateJavaScript<string>(`
    if (!window.byted_acrawler || typeof window.byted_acrawler.frontierSign !== 'function') {
      throw new Error('抖音官方签名 SDK 未加载，页面可能需要验证');
    }
    const result = window.byted_acrawler.frontierSign({'X-MS-STUB': ${JSON.stringify(douyinSignatureStub(input))}});
    return result && result['X-Bogus'];
  `)
  if (!signature) throw new Error('抖音官方 SDK 没有返回弹幕签名')
  return signature
}

/** 搜索请求在官方页面内发送，由官方 SDK 为 fetch 附带风控参数。 */
export const searchWithOfficialPage: DouyinSearchRequest = async (url, cookie, keyword) => {
  const web = new DouyinWebContext()
  try {
    await web.load(`https://www.douyin.com/search/${encodeURIComponent(keyword)}?type=live`, cookie)
    const text = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('抖音搜索请求超时，请检查网络或更新 Cookie')), 25000)
      web.controller
        .addScriptMessageHandler<{ text?: string; error?: string }>('scriptliveSearch', result => {
          clearTimeout(timeout)
          if (result?.error) reject(new Error(result.error))
          else resolve(result?.text ?? '')
        })
        .then(() =>
          web.controller.evaluateJavaScript(`
          fetch(${JSON.stringify(url)}, {credentials: 'include'}).then(async response => {
            if (!response.ok) throw new Error('抖音搜索 HTTP ' + response.status);
            return response.text();
          }).then(text => window.webkit.messageHandlers.scriptliveSearch.postMessage({text}))
            .catch(error => window.webkit.messageHandlers.scriptliveSearch.postMessage({error: String(error)}));
          return true;
        `)
        )
        .catch(error => {
          clearTimeout(timeout)
          reject(error)
        })
    })
    if (!text || text === 'blocked') throw new Error('抖音搜索被限制，请在官方页面完成验证或更新 Cookie')
    return JSON.parse(text) as unknown
  } finally {
    web.dispose()
  }
}
