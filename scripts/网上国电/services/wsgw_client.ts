import { fetch } from 'scripting'
import { safeGetObject, safeSet } from '../shared/utils/storage'

export type WsgwCredentials = {
  username: string
  password: string
  logDebug?: boolean
}

export type WsgwAccountPayload = {
  eleBill: any
  userInfo: any
  dayElecQuantity: any
  dayElecQuantity31: any
  monthElecQuantity: any
  lastYearElecQuantity: any
  stepElecQuantity: any
  arrearsOfFees: boolean
}

const SERVER_HOST = 'https://api.120399.xyz'
const BASE_URL = 'https://www.95598.cn'
const JSON_HEADERS = { 'content-type': 'application/json' }
const BIZRT_CACHE_KEY = 'wsgw_sgcc.bizrt.cache.v1'

const API = {
  getKeyCode: '/oauth2/outer/c02/f02',
  getAuth: '/oauth2/oauth/authorize',
  getWebToken: '/oauth2/outer/getWebToken',
  loginVerifyCodeNew: '/osg-web0004/open/c44/f05',
  loginTestCodeNew: '/osg-web0004/open/c44/f06',
  searchUser: '/osg-open-uc0001/member/c9/f02',
  accapi: '/osg-open-bc0001/member/c05/f01',
  busInfoApi: '/osg-web0004/member/c24/f01',
  segmentDate: '/osg-open-bc0001/member/arg/020070013',
  LowelectBill: '/osg-open-bc0001/member/c04/f01',
  HideelectBill: '/osg-open-bc0001/member/c04/f02',
  electBill: '/osg-open-bc0001/member/c04/f03'
}

const CONFIG = {
  uscInfo: {
    member: '0902',
    devciceIp: '',
    devciceId: '',
    tenant: 'state_grid'
  },
  source: 'SGAPP',
  target: '32101',
  userInform: { serviceCode: '0101183', source: 'SGAPP' },
  account: { channelCode: '0902', funcCode: 'WEBA1007200' },
  getday: {
    channelCode: '0902',
    clearCache: '11',
    funcCode: 'WEBALIPAY_01',
    promotCode: '1',
    promotType: '1',
    serviceCode: 'BCP_000026',
    source: 'app'
  },
  mouthOut: {
    channelCode: '0902',
    clearCache: '11',
    funcCode: 'WEBALIPAY_01',
    promotCode: '1',
    promotType: '1',
    serviceCode: 'BCP_000026',
    source: 'app'
  },
  stepelect: {
    channelCode: '0902',
    funcCode: 'WEBALIPAY_01',
    promotType: '1',
    clearCache: '09',
    serviceCode: 'BCP_000026',
    source: 'app'
  }
}

const FORCE_REAUTH_CODES = new Set(['10015', '10108', '10009', '10207', '10005', '10010', '30010'])
const PREVENTABLE_CODES = new Set(['10010', '30010', '20103'])

class Logger {
  private readonly levels: Array<'trace' | 'debug' | 'info' | 'warn' | 'error'> = ['trace', 'debug', 'info', 'warn', 'error']
  private currentLevelIndex: number

  constructor(
    private prefix = 'WSGW',
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error' = 'info'
  ) {
    this.currentLevelIndex = this.levels.indexOf(level)
    if (this.currentLevelIndex === -1) this.currentLevelIndex = 2
  }

  private should(level: 'trace' | 'debug' | 'info' | 'warn' | 'error') {
    return this.levels.indexOf(level) >= this.currentLevelIndex
  }

  private output(level: string, args: any[]) {
    const prefix = this.prefix ? `[${this.prefix}] ` : ''
    console.log(`${prefix}[${level.toUpperCase()}]`, ...args)
  }

  trace(...args: any[]) {
    if (this.should('trace')) this.output('trace', args)
  }
  debug(...args: any[]) {
    if (this.should('debug')) this.output('debug', args)
  }
  info(...args: any[]) {
    if (this.should('info')) this.output('info', args)
  }
  warn(...args: any[]) {
    if (this.should('warn')) this.output('warn', args)
  }
  error(...args: any[]) {
    if (this.should('error')) this.output('error', args)
  }
}

async function postJson(url: string, body: unknown): Promise<any> {
  const resp = await fetch(url, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(body)
  })
  if (!resp) throw new Error(`请求 ${url} 无响应`)
  const text = await resp.text()
  if (!resp.ok) throw new Error(`请求 ${url} 失败: HTTP ${resp.status} ${text}`)
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`请求 ${url} 响应解析失败: ${text}`)
  }
}

function pad(num: number) {
  return String(num).padStart(2, '0')
}

function getBeforeDate(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function hasValidBizrt(bizrt: any) {
  return !!(bizrt && bizrt.token && Array.isArray(bizrt.userInfo) && bizrt.userInfo.length > 0)
}

function isCriticalResponse(code: any, message: string | undefined, hasToken: boolean) {
  const codeStr = code != null ? String(code) : ''
  if (PREVENTABLE_CODES.has(codeStr)) return true
  if (codeStr === '10002' && message === 'WEB渠道KeyCode已失效') return true
  if (codeStr === '10002' && hasToken && message === 'Token 为空！') return true
  return false
}

function shouldForceReauth(url: string, code: any, message: string | undefined, hasToken: boolean) {
  if (!url.includes('oauth2/oauth/authorize')) return false
  const codeStr = code != null ? String(code) : ''
  if (FORCE_REAUTH_CODES.has(codeStr)) return true
  if (codeStr === '10002' && message === 'WEB渠道KeyCode已失效') return true
  if (codeStr === '10002' && hasToken && message === 'Token 为空！') return true
  return false
}

export async function fetchWsgwAccounts(credentials: WsgwCredentials): Promise<WsgwAccountPayload[]> {
  const client = new WsgwClient(credentials)
  return client.fetchAllAccounts()
}

class WsgwClient {
  private requestKey: any = null
  private authorizeCode = ''
  private accessToken = ''
  private bizrt: any
  private bindInfo: any = null
  private eleBill: any = {}
  private dayElecQuantity: any = {}
  private dayElecQuantity31: any = {}
  private monthElecQuantity: any = {}
  private lastYearElecQuantity: any = {}
  private stepElecQuantity: any = {}
  private readonly logger: Logger

  constructor(private credentials: WsgwCredentials) {
    const level = credentials.logDebug ? 'debug' : 'info'
    this.logger = new Logger('WSGW', level)
    this.bizrt = safeGetObject<any | null>(BIZRT_CACHE_KEY, null)
  }

  async fetchAllAccounts(): Promise<WsgwAccountPayload[]> {
    if (!this.credentials.username || !this.credentials.password) {
      throw new Error('缺少网上国网账号或密码')
    }

    try {
      await this.getKeyCode()
      if (!hasValidBizrt(this.bizrt)) {
        await this.doLogin()
      } else {
        this.logger.debug('♻️ 使用缓存凭证')
      }

      await this.getAuthcode()
      await this.getAccessToken()
      await this.getBindInfo()

      const list = this.bindInfo?.powerUserList || []
      if (!Array.isArray(list) || list.length === 0) {
        throw new Error('未找到任何绑定户号')
      }

      const result: WsgwAccountPayload[] = []
      for (let i = 0; i < list.length; i += 1) {
        try {
          await this.getAllData(i)
        } catch (err) {
          this.logger.warn(`⚠️ 第 ${i + 1} 个用户数据拉取失败，尝试回退月份`, err)
          let months = new Date().getMonth() - 1
          if (months === -1) months = 11
          await this.getStepElecQuantity(i, months)
        }

        const user = list[i]
        const arrears = Number(this.eleBill?.historyOwe || '0') > 0 || Number(this.eleBill?.sumMoney || '0') < 0

        result.push({
          eleBill: this.eleBill,
          userInfo: user,
          dayElecQuantity: this.dayElecQuantity,
          dayElecQuantity31: this.dayElecQuantity31,
          monthElecQuantity: this.monthElecQuantity,
          lastYearElecQuantity: this.lastYearElecQuantity,
          stepElecQuantity: this.stepElecQuantity,
          arrearsOfFees: arrears
        })
      }

      return result
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error)
      if (/无效|失效|过期|重新获取|请求异常|token/i.test(err)) {
        this.clearBizrt()
      }
      this.logger.error('⛔️ WSGW 拉取失败:', err)
      throw error
    }
  }

  private clearBizrt() {
    this.bizrt = null
    safeSet(BIZRT_CACHE_KEY, null)
  }

  private async getKeyCode() {
    this.logger.info('⏳ 获取 keyCode/publicKey…')
    const req = { url: `/api${API.getKeyCode}`, method: 'post', headers: {} }
    this.requestKey = await this.request(req)
    this.logger.debug('🔑 keyCode: ', JSON.stringify(this.requestKey))
  }

  private async getVerifyCode() {
    this.logger.info('⏳ 获取验证码…')
    const payload = {
      url: `/api${API.loginVerifyCodeNew}`,
      method: 'post',
      headers: { ...this.requestKey },
      data: {
        password: this.credentials.password,
        account: this.credentials.username,
        canvasHeight: 200,
        canvasWidth: 310
      }
    }
    const ticketResp = await this.request(payload)
    const recog = await this.recognize(ticketResp.canvasSrc)
    this.logger.debug('🔑 验证码票据: ', ticketResp.ticket)
    return { code: recog.data, ticket: ticketResp.ticket }
  }

  private async login(loginKey: string, code: string) {
    this.logger.info('⏳ 登录中…')
    const payload = {
      url: `/api${API.loginTestCodeNew}`,
      method: 'post',
      headers: { ...this.requestKey },
      data: {
        loginKey,
        code,
        params: {
          uscInfo: {
            devciceIp: '',
            tenant: 'state_grid',
            member: '0902',
            devciceId: ''
          },
          quInfo: {
            optSys: 'android',
            pushId: '000000',
            addressProvince: '110100',
            password: this.credentials.password,
            addressRegion: '110101',
            account: this.credentials.username,
            addressCity: '330100'
          }
        },
        Channels: 'web'
      }
    }

    const resp = await this.request(payload)
    const bizrt = resp?.bizrt ?? resp
    if (!(bizrt?.userInfo?.length > 0)) {
      throw new Error('登录失败: 请检查账户信息')
    }
    this.bizrt = bizrt
    safeSet(BIZRT_CACHE_KEY, bizrt)
    this.logger.info('✅ 登录成功')
  }

  private async doLogin() {
    const { code, ticket } = await this.getVerifyCode()
    await this.login(ticket, code)
  }

  private async getAuthcode() {
    this.logger.info('⏳ 获取授权码…')
    const payload = {
      url: `/api${API.getAuth}`,
      method: 'post',
      headers: { ...this.requestKey, token: this.bizrt.token }
    }
    const resp = await this.request(payload)
    this.authorizeCode = (resp.redirect_url || '').split('?code=')[1] || ''
    this.logger.debug('🔑 authorizeCode=', this.authorizeCode)
  }

  private async getAccessToken() {
    this.logger.info('⏳ 获取 accessToken…')
    const payload = {
      url: `/api${API.getWebToken}`,
      method: 'post',
      headers: {
        ...this.requestKey,
        token: this.bizrt.token,
        authorizecode: this.authorizeCode
      }
    }
    const resp = await this.request(payload)
    this.accessToken = resp.access_token
    this.logger.debug('🔑 accessToken=', this.accessToken)
  }

  private async getBindInfo() {
    this.logger.info('⏳ 查询绑定信息…')
    const payload = {
      url: `/api${API.searchUser}`,
      method: 'post',
      headers: {
        ...this.requestKey,
        token: this.bizrt.token,
        acctoken: this.accessToken
      },
      data: {
        serviceCode: CONFIG.userInform.serviceCode,
        source: CONFIG.source,
        target: CONFIG.target,
        uscInfo: { ...CONFIG.uscInfo },
        quInfo: { userId: this.bizrt.userInfo[0].userId },
        token: this.bizrt.token,
        Channels: 'web'
      }
    }
    const resp = await this.request(payload)
    this.bindInfo = resp.bizrt
    this.logger.info('✅ 绑定信息获取成功')
  }

  private async getElcFee(idx: number) {
    const user = this.bindInfo.powerUserList[idx]
    const [profile] = this.bizrt.userInfo
    const payload = {
      url: `/api${API.accapi}`,
      method: 'post',
      headers: {
        ...this.requestKey,
        token: this.bizrt.token,
        acctoken: this.accessToken
      },
      data: {
        data: {
          srvCode: '',
          serialNo: '',
          channelCode: CONFIG.account.channelCode,
          funcCode: CONFIG.account.funcCode,
          acctId: profile.userId,
          userName: profile.loginAccount || profile.nickname,
          promotType: '1',
          promotCode: '1',
          userAccountId: profile.userId,
          list: [
            {
              consNoSrc: user.consNo_dst,
              proCode: user.proNo,
              sceneType: user.constType,
              consNo: user.consNo,
              orgNo: user.orgNo
            }
          ]
        },
        serviceCode: '0101143',
        source: CONFIG.source,
        target: user.proNo || user.provinceId
      }
    }
    const resp = await this.request(payload)
    this.eleBill = resp.list?.[0] || {}
  }

  private async getDayElecQuantity(idx: number) {
    const user = this.bindInfo.powerUserList[idx]
    const [profile] = this.bizrt.userInfo
    const start = getBeforeDate(6)
    const end = getBeforeDate(1)
    const payload = {
      url: `/api${API.busInfoApi}`,
      method: 'post',
      headers: {
        ...this.requestKey,
        token: this.bizrt.token,
        acctoken: this.accessToken
      },
      data: {
        params1: {
          serviceCode: CONFIG.userInform.serviceCode,
          source: CONFIG.source,
          target: CONFIG.target,
          uscInfo: { ...CONFIG.uscInfo },
          quInfo: { userId: profile.userId },
          token: this.bizrt.token
        },
        params3: {
          data: {
            acctId: profile.userId,
            consNo: user.consNo_dst,
            consType: user.constType === '02' ? '02' : '01',
            endTime: end,
            orgNo: user.orgNo,
            queryYear: String(new Date().getFullYear()),
            proCode: user.proNo || user.provinceId,
            serialNo: '',
            srvCode: '',
            startTime: start,
            userName: profile.nickname || profile.loginAccount,
            funcCode: CONFIG.getday.funcCode,
            channelCode: CONFIG.getday.channelCode,
            clearCache: CONFIG.getday.clearCache,
            promotCode: CONFIG.getday.promotCode,
            promotType: CONFIG.getday.promotType
          },
          serviceCode: CONFIG.getday.serviceCode,
          source: CONFIG.getday.source,
          target: user.proNo || user.provinceId
        },
        params4: '010103'
      }
    }
    this.dayElecQuantity = await this.request(payload)
  }

  private async getDayElecQuantity31(idx: number) {
    const user = this.bindInfo.powerUserList[idx]
    const [profile] = this.bizrt.userInfo
    const start = getBeforeDate(32)
    const end = getBeforeDate(1)
    const payload = {
      url: `/api${API.busInfoApi}`,
      method: 'post',
      headers: {
        ...this.requestKey,
        token: this.bizrt.token,
        acctoken: this.accessToken
      },
      data: {
        params1: {
          serviceCode: CONFIG.userInform.serviceCode,
          source: CONFIG.source,
          target: CONFIG.target,
          uscInfo: { ...CONFIG.uscInfo },
          quInfo: { userId: profile.userId },
          token: this.bizrt.token
        },
        params3: {
          data: {
            acctId: profile.userId,
            consNo: user.consNo_dst,
            consType: user.constType === '02' ? '02' : '01',
            endTime: end,
            orgNo: user.orgNo,
            queryYear: String(new Date().getFullYear()),
            proCode: user.proNo || user.provinceId,
            serialNo: '',
            srvCode: '',
            startTime: start,
            userName: profile.nickname || profile.loginAccount,
            funcCode: CONFIG.getday.funcCode,
            channelCode: CONFIG.getday.channelCode,
            clearCache: CONFIG.getday.clearCache,
            promotCode: CONFIG.getday.promotCode,
            promotType: CONFIG.getday.promotType
          },
          serviceCode: CONFIG.getday.serviceCode,
          source: CONFIG.getday.source,
          target: user.proNo || user.provinceId
        },
        params4: '010103'
      }
    }
    this.dayElecQuantity31 = await this.request(payload)
  }

  private async getMonthElecQuantity(idx: number) {
    const user = this.bindInfo.powerUserList[idx]
    const [profile] = this.bizrt.userInfo
    const payload = {
      url: `/api${API.busInfoApi}`,
      method: 'post',
      headers: {
        ...this.requestKey,
        token: this.bizrt.token,
        acctoken: this.accessToken
      },
      data: {
        params1: {
          serviceCode: CONFIG.userInform.serviceCode,
          source: CONFIG.source,
          target: CONFIG.target,
          uscInfo: { ...CONFIG.uscInfo },
          quInfo: { userId: profile.userId },
          token: this.bizrt.token
        },
        params3: {
          data: {
            acctId: profile.userId,
            consNo: user.consNo_dst,
            consType: user.constType === '02' ? '02' : '01',
            orgNo: user.orgNo,
            proCode: user.proNo || user.provinceId,
            provinceCode: user.proNo || user.provinceId,
            queryYear: String(new Date().getFullYear()),
            serialNo: '',
            srvCode: '',
            userName: profile.nickname || profile.loginAccount,
            funcCode: CONFIG.mouthOut.funcCode,
            channelCode: CONFIG.mouthOut.channelCode,
            clearCache: CONFIG.mouthOut.clearCache,
            promotCode: CONFIG.mouthOut.promotCode,
            promotType: CONFIG.mouthOut.promotType
          },
          serviceCode: CONFIG.mouthOut.serviceCode,
          source: CONFIG.mouthOut.source,
          target: user.proNo || user.provinceId
        },
        params4: '010102'
      }
    }
    this.monthElecQuantity = await this.request(payload)
  }

  private async getLastYearElecQuantity(idx: number) {
    const user = this.bindInfo.powerUserList[idx]
    const [profile] = this.bizrt.userInfo
    const payload = {
      url: `/api${API.busInfoApi}`,
      method: 'post',
      headers: {
        ...this.requestKey,
        token: this.bizrt.token,
        acctoken: this.accessToken
      },
      data: {
        params1: {
          serviceCode: CONFIG.userInform.serviceCode,
          source: CONFIG.source,
          target: CONFIG.target,
          uscInfo: { ...CONFIG.uscInfo },
          quInfo: { userId: profile.userId },
          token: this.bizrt.token
        },
        params3: {
          data: {
            acctId: profile.userId,
            consNo: user.consNo_dst,
            consType: user.constType === '02' ? '02' : '01',
            orgNo: user.orgNo,
            proCode: user.proNo || user.provinceId,
            provinceCode: user.proNo || user.provinceId,
            queryYear: String(new Date().getFullYear() - 1),
            serialNo: '',
            srvCode: '',
            userName: profile.nickname || profile.loginAccount,
            funcCode: CONFIG.mouthOut.funcCode,
            channelCode: CONFIG.mouthOut.channelCode,
            clearCache: CONFIG.mouthOut.clearCache,
            promotCode: CONFIG.mouthOut.promotCode,
            promotType: CONFIG.mouthOut.promotType
          },
          serviceCode: CONFIG.mouthOut.serviceCode,
          source: CONFIG.mouthOut.source,
          target: user.proNo || user.provinceId
        },
        params4: '010102'
      }
    }
    this.lastYearElecQuantity = await this.request(payload)
  }

  private async getSegmentDate(user: any, dateObj: { year: number; months: number }) {
    const payload = {
      url: `/api${API.segmentDate}`,
      method: 'post',
      headers: {
        ...this.requestKey,
        token: this.bizrt.token,
        acctoken: this.accessToken
      },
      data: {
        data: {
          acctId: 'acctid01',
          channelCode: 'SGAPP',
          consNo: user.consNo_dst,
          funcCode: 'A10079078',
          promotCode: '1',
          promotType: '1',
          provinceCode: '32101',
          serialNo: '',
          srvCode: '123',
          userName: 'acctid01',
          year: dateObj.year
        },
        serviceCode: '0101798',
        source: 'app',
        target: user.proNo
      }
    }
    const resp = await this.request(payload)
    const list = resp.billList || []
    return list[list.length - 1]
  }

  private async getStepElecQuantity(idx: number, months?: number) {
    const user = this.bindInfo.powerUserList[idx]
    const [profile] = this.bizrt.userInfo
    const now = new Date()
    const query = { year: now.getFullYear(), months: months ?? now.getMonth() }
    const monthStr = query.months <= 9 ? `${query.year}-0${query.months}` : `${query.year}-${query.months}`
    let queryDate = monthStr
    let calcInfo: any = null
    if (user.proNo === '32101') {
      calcInfo = await this.getSegmentDate(user, query)
      queryDate = `${query.year}-${query.months}`
    }

    const endpoint = user.orgNo === '33101' ? (user.constType === '01' ? API.HideelectBill : API.LowelectBill) : API.electBill

    const payload = {
      url: `/api${endpoint}`,
      method: 'post',
      headers: {
        ...this.requestKey,
        token: this.bizrt.token,
        acctoken: this.accessToken
      },
      data: {
        data: {
          channelCode: CONFIG.stepelect.channelCode,
          funcCode: CONFIG.stepelect.funcCode,
          promotType: CONFIG.stepelect.promotType,
          clearCache: CONFIG.stepelect.clearCache,
          consNo: user.consNo_dst,
          promotCode: user.proNo || user.provinceId,
          orgNo: user.orgNo,
          queryDate,
          provinceCode: user.proNo || user.provinceId,
          consType: user.constType || user.consSortCode,
          userAccountId: profile.userId,
          serialNo: '',
          srvCode: '',
          calcId: calcInfo ? calcInfo.calcId : undefined,
          userName: profile.nickname || profile.loginAccount,
          acctId: profile.userId
        },
        serviceCode: CONFIG.stepelect.serviceCode,
        source: CONFIG.stepelect.source,
        target: user.proNo || user.provinceId
      }
    }
    const resp = await this.request(payload)
    if (String(resp.rtnCode) !== '1') throw new Error(resp.rtnMsg || '阶梯用电查询失败')
    this.stepElecQuantity = resp.list || {}
  }

  private async getAllData(idx: number) {
    await Promise.all([
      this.getElcFee(idx),
      this.getDayElecQuantity(idx),
      this.getDayElecQuantity31(idx),
      this.getMonthElecQuantity(idx),
      this.getLastYearElecQuantity(idx),
      this.getStepElecQuantity(idx)
    ])
  }

  private async recognize(payload: string) {
    const resp = await postJson(`${SERVER_HOST}/wsgw/get_x`, { yuheng: payload })
    return resp
  }

  private async encrypt(payload: any) {
    const resp = await postJson(`${SERVER_HOST}/wsgw/encrypt`, { yuheng: payload })
    const data = resp?.data
    if (!data) throw new Error('encrypt 响应为空')
    data.url = `${BASE_URL}${data.url}`
    if (data.data !== undefined) {
      data.body = JSON.stringify(data.data)
      delete data.data
    }
    return data
  }

  private async decrypt(config: any, data: any, encryptKey?: string) {
    const cfg = {
      ...config,
      headers: { ...(config.headers || {}) },
      data: config.data
    }
    if (config.url === `/api${API.getKeyCode}` && encryptKey) {
      cfg.headers.encryptKey = encryptKey
    }
    const resp = await postJson(`${SERVER_HOST}/wsgw/decrypt`, {
      yuheng: { config: cfg, data }
    })
    const inner = resp?.data
    const code = inner?.code
    const message = inner?.message
    if (String(code) === '1') return inner.data
    if (shouldForceReauth(config.url, code, message, hasValidBizrt(this.bizrt))) {
      throw new Error(`重新获取: ${message || code}`)
    }
    throw new Error(message || '解密失败')
  }

  private async request(config: any) {
    const encrypted = await this.encrypt(config)
    if (config.url === `/api${API.getAuth}` && typeof encrypted.body === 'string') {
      encrypted.body = encrypted.body.replace(/^"|"$/g, '')
    }
    const resp = await fetch(encrypted.url, {
      method: (encrypted.method || 'POST').toUpperCase(),
      headers: encrypted.headers,
      body: encrypted.body
    })
    if (!resp) throw new Error('请求无响应')
    const text = await resp.text()
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${text}`)
    let parsed: any = text
    try {
      parsed = JSON.parse(text)
    } catch {
      // keep as text
    }
    if (parsed && typeof parsed === 'object' && 'code' in parsed) {
      const code = parsed.code
      const message = parsed.message || parsed.msg
      if (isCriticalResponse(code, message, hasValidBizrt(this.bizrt))) {
        throw new Error(message || '接口异常')
      }
    }
    return this.decrypt(config, parsed, encrypted.encryptKey)
  }
}
