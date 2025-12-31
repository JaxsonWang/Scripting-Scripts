import { fetch } from 'scripting'
import type { WidgetConfig } from './config_storage'

export type IntegrationData = {
  name?: string
  platformName?: string
  userType?: string
  userCode?: string
  issueOrganization?: string
  idType?: string
  idNumber?: string
  vehicles?: Array<{
    plateNumber?: string
    plateType?: string
    validPeriodEnd?: string
    issueOrganization?: string
    vehType?: string
    firtsRegDate?: string
    forceScrapTime?: string
  }>
  drivingLicense?: {
    idType?: string
    idNumber?: string
    issueOrganization?: string
    cumulativePoint?: string
    allowToDrive?: string
    validityEnd?: string
    inspectionValidityEnd?: string
    issueOrganizationName?: string
    status?: string
  }
}

type IntegrationResponse = {
  success: boolean
  resultCode?: string
  resultMsg?: string
  data?: IntegrationData
}

type UnhandledVioCountData = {
  list?: Array<{
    plateNumber?: string
    count?: string
    internalOrder?: string
  }>
}

type UnhandledVioCountResponse = {
  success: boolean
  resultCode?: string
  resultMsg?: string
  data?: UnhandledVioCountData
}

// 对齐「交管12123」demo：使用 miniappcsfw 渠道的 openapi_business_url（更稳定）
const STABLE_INFO_URL = 'https://miniappcsfw.122.gov.cn:8443/openapi/invokeApi/business/biz'
const DEFAULT_PRODUCT_ID = 'p10000000000000000001'

const WECHAT_MINIAPP_REFERER = 'https://servicewechat.com/wx49a80525eebd2583/37/page-frame.html'
const WECHAT_MINIAPP_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 MicroMessenger/7.0.20.1781(0x6700143B) NetType/WIFI MiniProgramEnv/Mac MacWechat/WMPF MacWechat/3.8.7(0x13080712) UnifiedPCMacWechat(0xf264160b) XWEB/18056'

export class Traffic12123ApiError extends Error {
  readonly resultCode?: string
  readonly resultMsg?: string

  constructor(resultCode?: string, resultMsg?: string) {
    super(resultMsg || resultCode || '请求失败')
    this.name = 'Traffic12123ApiError'
    this.resultCode = resultCode
    this.resultMsg = resultMsg
    // 修复部分运行时下 Error 继承导致 instanceof 失效的问题
    Object.setPrototypeOf(this, Traffic12123ApiError.prototype)
  }
}

const getAuthParams = (config: WidgetConfig) => {
  const p = config.bizParams
  return {
    sign: p.sign,
    verifyToken: p.verifyToken,
    productId: p.productId || DEFAULT_PRODUCT_ID
  }
}

const buildBizBody = (payload: any, encode: boolean) => {
  const jsonText = JSON.stringify(payload)
  return encode ? `params=${encodeURIComponent(jsonText)}` : `params=${jsonText}`
}

export const Traffic12123Api = {
  async queryIntegration(config: WidgetConfig): Promise<IntegrationData> {
    const auth = getAuthParams(config)
    const paramsObj = {
      api: 'biz.user.integration.query',
      productId: auth.productId,
      sign: auth.sign,
      verifyToken: auth.verifyToken
    }

    // 对齐 demo：该接口使用 encodeURIComponent 包一层
    const res = await fetch(STABLE_INFO_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WEAPP-BIZ-VERSION': '1.0.25',
        'User-Agent': WECHAT_MINIAPP_USER_AGENT,
        xweb_xhr: '1',
        Accept: '*/*',
        Referer: WECHAT_MINIAPP_REFERER
      },
      body: buildBizBody(paramsObj, true)
    })

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }

    const json = (await res.json()) as IntegrationResponse
    if (!json.success) {
      throw new Traffic12123ApiError(json.resultCode, json.resultMsg)
    }
    console.log('response', json)
    return json.data || {}
  },

  async queryUnhandledVioCount(config: WidgetConfig, _integration?: IntegrationData): Promise<string> {
    const auth = getAuthParams(config)
    // 对齐 demo：违章数量接口仅需要 sign+verifyToken+productId
    const paramsObj = {
      api: 'biz.vio.unhandledVioCount.query',
      productId: auth.productId,
      sign: auth.sign,
      verifyToken: auth.verifyToken
    }

    // 对齐 demo：该接口不 encodeURIComponent（直接 JSON.stringify）
    const res = await fetch(STABLE_INFO_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-WEAPP-BIZ-VERSION': '1.0.25',
        'User-Agent': WECHAT_MINIAPP_USER_AGENT,
        xweb_xhr: '1',
        Accept: '*/*',
        Referer: WECHAT_MINIAPP_REFERER
      },
      body: buildBizBody(paramsObj, false)
    })

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }

    const json = (await res.json()) as UnhandledVioCountResponse
    if (!json.success) {
      throw new Traffic12123ApiError(json.resultCode, json.resultMsg)
    }
    const count = json.data?.list?.[0]?.count
    return typeof count === 'string' ? count : '0'
  }
}
