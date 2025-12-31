import { fetch } from 'scripting'
import type { BizRequestParams, WidgetConfig } from './config_storage'

export type IntegrationData = {
  name?: string
  platformName?: string
  userType?: string
  userCode?: string
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
    cumulativePoint?: string
    allowToDrive?: string
    validityEnd?: string
    inspectionValidityEnd?: string
    issueOrganizationName?: string
  }
}

type IntegrationResponse = {
  success: boolean
  resultCode?: string
  resultMsg?: string
  data?: IntegrationData
}

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

const buildFormBody = (paramsObj: any) => {
  const encoded = encodeURIComponent(JSON.stringify(paramsObj))
  return `params=${encoded}`
}

const normalizeParams = (bizParams: BizRequestParams): BizRequestParams => {
  // HAR 里 params 有时是对象、有时是字符串。服务端接受对象即可。
  const inner = typeof bizParams.params === 'string' ? JSON.parse(bizParams.params) : bizParams.params
  return { ...bizParams, params: inner }
}

export const Traffic12123Api = {
  async queryIntegration(config: WidgetConfig): Promise<IntegrationData> {
    const endpoint = config.endpoint.replace(/\/+$/, '')
    const url = `${endpoint}/openapi/invokeApi/business/biz`

    const paramsObj = normalizeParams({
      ...config.bizParams,
      api: 'biz.user.integration.query',
      params: {}
    })

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
      body: buildFormBody(paramsObj)
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
  }
}
