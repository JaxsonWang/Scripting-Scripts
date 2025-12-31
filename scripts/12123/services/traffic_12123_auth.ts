import { fetch } from 'scripting'

import type { LoginConfig } from './config_storage'

type LoginResponse = {
  base_resp?: {
    ret: number
    err_msg?: string
    open_id?: string
    wxa_session?: string
    wxa_session_expire?: number
    timestamp?: number
  }
  verify_token?: string
  verify_token_expire?: number
  conf_item?: {
    business_principal_id?: string
  }
  login_12123_resp?: {
    businessId?: string
    resultCode?: string
    resultMsg?: string
    success?: boolean
  }
}

const WECHAT_MINIAPP_REFERER = 'https://servicewechat.com/wx49a80525eebd2583/37/page-frame.html'
const WECHAT_MINIAPP_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 MicroMessenger/7.0.20.1781(0x6700143B) NetType/WIFI MiniProgramEnv/Mac MacWechat/WMPF MacWechat/3.8.7(0x13080712) UnifiedPCMacWechat(0xf264160b) XWEB/18056'

const maskToken = (token: string) => {
  const t = token.trim()
  if (t.length <= 16) return t
  return `${t.slice(0, 6)}…${t.slice(-6)}`
}

export const Traffic12123Auth = {
  async refreshVerifyToken(login: LoginConfig): Promise<{
    verifyToken: string
    businessId?: string
    businessPrincipalId?: string
    userId?: string
  }> {
    const loginBody = login.loginBody.trim()
    if (!loginBody) {
      throw new Error('未配置登录参数：请先在设置里粘贴 proxy12123?action=login 的请求 body')
    }

    const url = 'https://mp.weixin.qq.com/intp/proxy12123?action=login'

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WEAPP-BIZ-VERSION': '1.0.25',
        'User-Agent': WECHAT_MINIAPP_USER_AGENT,
        xweb_xhr: '1',
        Accept: '*/*',
        Referer: WECHAT_MINIAPP_REFERER
      },
      body: loginBody
    })

    if (!res.ok) {
      throw new Error(`login HTTP ${res.status}`)
    }

    const json = (await res.json()) as LoginResponse
    const ret = json.base_resp?.ret
    if (ret !== 0) {
      throw new Error(`login failed: ${ret ?? 'unknown'} ${json.base_resp?.err_msg || ''}`.trim())
    }

    const verifyToken = json.verify_token
    if (!verifyToken) {
      throw new Error('login failed: missing verify_token')
    }

    // 打印关键字段，便于确认确实触发了登录刷新流程（避免输出完整敏感信息）
    console.log('[12123][login] ok', {
      ret,
      openId: json.base_resp?.open_id,
      wxaSessionExpire: json.base_resp?.wxa_session_expire,
      verifyTokenExpire: json.verify_token_expire,
      businessId: json.login_12123_resp?.businessId,
      businessPrincipalId: json.conf_item?.business_principal_id,
      verifyToken: maskToken(verifyToken)
    })

    return {
      verifyToken,
      businessId: json.login_12123_resp?.businessId,
      businessPrincipalId: json.conf_item?.business_principal_id,
      userId: json.base_resp?.open_id
    }
  }
}
