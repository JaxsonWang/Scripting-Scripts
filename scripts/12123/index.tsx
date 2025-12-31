import {
  Button,
  HStack,
  Image,
  List,
  Navigation,
  NavigationStack,
  RoundedRectangle,
  Script,
  Section,
  Spacer,
  Text,
  TextField,
  VStack,
  Widget,
  useMemo,
  useState
} from 'scripting'
import { ConfigStorage } from './services/config_storage'
import { Traffic12123Auth } from './services/traffic_12123_auth'
import { Traffic12123Api } from './services/traffic_12123_api'
import { Traffic12123ApiError } from './services/traffic_12123_api'
import type { BizRequestParams, LoginConfig, WidgetConfig } from './services/config_storage'

const DEFAULT_ENDPOINT = 'https://miniappwx.122.gov.cn:8553'

const maskToken = (token: string) => {
  const t = token.trim()
  if (t.length <= 16) return t
  return `${t.slice(0, 6)}…${t.slice(-6)}`
}

const parseCurlDataRaw = (input: string): any => {
  // 仅支持 `params=...`（URL 编码后的 JSON）
  const trimmed = input.trim()

  // 处理超长粘贴被自动换行/夹杂空格的情况：先定位 params=，再把编码串里的空白全部移除
  const idx = trimmed.indexOf('params=')
  if (idx < 0) return null

  const after = trimmed.slice(idx + 'params='.length)
  const untilAmp = after.includes('&') ? after.slice(0, after.indexOf('&')) : after
  const encoded = untilAmp.replace(/\s+/g, '').trim()
  if (!encoded) return null
  try {
    const jsonText = decodeURIComponent(encoded)
    return JSON.parse(jsonText)
  } catch {
    return null
  }
}

const validateBizParams = (obj: any): BizRequestParams | null => {
  if (!obj || typeof obj !== 'object') return null
  const required = [
    'verifyToken',
    'productId',
    'version',
    'sign',
    'accessTime',
    'businessPrincipalId',
    'businessId',
    'userId',
    'certType',
    'certName',
    'certNo',
    'verifyChannel'
  ]
  for (const k of required) {
    if (!(k in obj)) return null
  }
  return obj as BizRequestParams
}

const SettingsScreen = () => {
  const saved = ConfigStorage.loadConfig()
  const savedLogin = ConfigStorage.loadLogin()
  const [input, setInput] = useState(saved ? `params=${encodeURIComponent(JSON.stringify(saved.bizParams))}` : '')
  const [loginBody, setLoginBody] = useState(savedLogin?.loginBody || '')
  const [status, setStatus] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<any | null>(null)

  const canSave = useMemo(() => {
    const obj = parseCurlDataRaw(input)
    return Boolean(validateBizParams(obj))
  }, [input])

  const save = () => {
    const obj = parseCurlDataRaw(input)
    const bizParams = validateBizParams(obj)
    if (!bizParams) {
      setStatus('业务参数格式不正确：请粘贴 params=...（URL 编码 JSON）')
      return
    }
    const config: WidgetConfig = { endpoint: DEFAULT_ENDPOINT, bizParams }
    ConfigStorage.saveConfig(config)
    const nextLoginBody = loginBody.trim()
    if (nextLoginBody) {
      const payload: LoginConfig = { loginBody: nextLoginBody }
      ConfigStorage.saveLogin(payload)
    } else {
      ConfigStorage.clearLogin()
    }
    setStatus('已保存配置，可去桌面刷新小组件验证。')
  }

  const refreshVerifyToken = async (config: WidgetConfig) => {
    const stateLoginBody = loginBody.trim()
    const loginFromState: LoginConfig | null = stateLoginBody ? { loginBody: stateLoginBody } : null
    const loginFromStorage = ConfigStorage.loadLogin()
    const login = loginFromState || loginFromStorage
    if (!login?.loginBody?.trim()) {
      throw new Error('缺少登录请求参数：请先粘贴 proxy12123?action=login 的请求 body')
    }

    // 保存一份，方便下次自动刷新（即使用户没点“保存登录参数”）
    ConfigStorage.saveLogin({ loginBody: login.loginBody.trim() })

    const auth = await Traffic12123Auth.refreshVerifyToken(login)
    console.log('[12123] verifyToken refresh', {
      before: maskToken(config.bizParams.verifyToken),
      after: maskToken(auth.verifyToken)
    })
    const nextBizParams: BizRequestParams = {
      ...config.bizParams,
      verifyToken: auth.verifyToken,
      // accessTime 通常是请求时间戳，刷新时更新更稳妥
      accessTime: Date.now()
    }
    const next: WidgetConfig = { ...config, bizParams: nextBizParams }
    ConfigStorage.saveConfig(next)
    setInput(`params=${encodeURIComponent(JSON.stringify(next.bizParams))}`)
    return next
  }

  const test = async () => {
    try {
      setStatus('测试中...')
      const obj = parseCurlDataRaw(input)
      const bizParams = validateBizParams(obj)
      if (!bizParams) {
        setStatus('业务参数格式不正确：无法测试（请粘贴 params=...）')
        return
      }
      let config: WidgetConfig = { endpoint: DEFAULT_ENDPOINT, bizParams }

      try {
        const data = await Traffic12123Api.queryIntegration(config)
        setPreviewData(data)
        const fetchedAt = Date.now()
        ConfigStorage.saveConfig(config)
        ConfigStorage.saveCache({ fetchedAt, response: data })
        try {
          Widget.reloadUserWidgets()
        } catch {
          // 某些环境可能不支持主动 reload，忽略即可（用户手动刷新桌面小组件也能生效）
        }
        setStatus('测试成功：已保存配置并更新缓存，可去桌面刷新小组件')
      } catch (e) {
        const errAny = e as any
        const resultCode: string | undefined = (errAny && typeof errAny === 'object' ? (errAny.resultCode as string | undefined) : undefined) || undefined

        if ((e instanceof Traffic12123ApiError || errAny?.name === 'Traffic12123ApiError') && resultCode === 'AUTHENTICATION_CREDENTIALS_NOT_EXIST') {
          console.log('[12123] AUTHENTICATION_CREDENTIALS_NOT_EXIST detected, triggering login refresh')
          setStatus('认证凭据不存在：正在请求 proxy12123?action=login 获取新 verifyToken...')
          config = await refreshVerifyToken(config)
          try {
            const data = await Traffic12123Api.queryIntegration(config)
            setPreviewData(data)
            const fetchedAt = Date.now()
            ConfigStorage.saveCache({ fetchedAt, response: data })
            try {
              Widget.reloadUserWidgets()
            } catch {
              // ignore
            }
            setStatus('已自动刷新 verifyToken 并重试成功：已更新缓存，可刷新小组件')
            return
          } catch (retryError) {
            setPreviewData(null)
            setStatus(`已尝试自动刷新 verifyToken，但重试仍失败：${String(retryError)}。可能登录参数（login_token/wxa_session 等）已过期，需要重新抓包后再试。`)
            return
          }
        }
        throw e
      }
    } catch (e) {
      setPreviewData(null)
      setStatus(`测试失败：${String(e)}`)
    }
  }

  const clear = () => {
    ConfigStorage.clearConfig()
    ConfigStorage.clearCache()
    ConfigStorage.clearLogin()
    setInput('')
    setLoginBody('')
    setPreviewData(null)
    setStatus('已清除配置、缓存与登录参数')
  }

  return (
    <NavigationStack>
      <List navigationTitle="12123小组件配置" navigationBarTitleDisplayMode="inline">
        <Section
          header={<Text>认证与业务参数</Text>}
          footer={
            <Text font={10} foregroundStyle="secondaryLabel">
              上：用于请求 proxy12123?action=login 刷新 verifyToken；下：业务接口 params JSON（可直接粘贴 HAR JSON 或 curl 的 params=...）。
            </Text>
          }
        >
          <TextField
            title="登录请求参数（login body）"
            value={loginBody}
            onChanged={setLoginBody}
            prompt="login_method=2&login_token=...&client_version=...&device=...&wxa_session=..."
          />
          <TextField title="业务请求参数（params=...）" value={input} onChanged={setInput} prompt="粘贴 params=...（URL 编码 JSON）" />
          <Button title="保存" disabled={!canSave} action={save} />
          <Button title="测试" action={() => void test()} />
          <Button
            title="手动刷新 verifyToken"
            disabled={!loginBody.trim() || !canSave}
            action={() => {
              void (async () => {
                try {
                  setStatus('刷新中...')
                  const obj = parseCurlDataRaw(input)
                  const bizParams = validateBizParams(obj)
                  if (!bizParams) {
                    setStatus('业务参数不正确：无法刷新 verifyToken')
                    return
                  }
                  const config: WidgetConfig = { endpoint: DEFAULT_ENDPOINT, bizParams }
                  ConfigStorage.saveLogin({ loginBody: loginBody.trim() })
                  await refreshVerifyToken(config)
                  setStatus('已刷新 verifyToken（已写入业务参数）')
                } catch (e) {
                  setStatus(`刷新失败：${String(e)}`)
                }
              })()
            }}
          />
          <Button title="清除配置" role="destructive" action={clear} />
          {status ? (
            <Text font={11} foregroundStyle="secondaryLabel">
              {status}
            </Text>
          ) : null}
        </Section>

        <Section
          header={<Text>预览</Text>}
          footer={
            <Text font={10} foregroundStyle="secondaryLabel">
              此预览仅用于快速验证字段是否有效
            </Text>
          }
        >
          {previewData ? (
            <VStack
              padding={12}
              spacing={8}
              frame={{ maxWidth: 'infinity', alignment: 'leading' }}
              background={<RoundedRectangle cornerRadius={14} style="continuous" fill="secondarySystemBackground" />}
            >
              <Text font={10} foregroundStyle="secondaryLabel">
                Debug JSON（预览）
              </Text>
              <Text font={9} monospaced foregroundStyle="label">
                {JSON.stringify(previewData, null, 2)}
              </Text>
            </VStack>
          ) : (
            <VStack
              spacing={8}
              padding={12}
              frame={{ maxWidth: 'infinity', alignment: 'center' }}
              background={<RoundedRectangle cornerRadius={14} style="continuous" fill="secondarySystemBackground" />}
            >
              <Image systemName="info.circle" foregroundStyle="secondaryLabel" />
              <Text font={12} foregroundStyle="label">
                暂无预览
              </Text>
              <Text font={10} foregroundStyle="secondaryLabel">
                点击“测试”获取数据
              </Text>
            </VStack>
          )}
        </Section>
      </List>
    </NavigationStack>
  )
}

const run = async () => {
  await Navigation.present({ element: <SettingsScreen /> })
  Script.exit()
}

run()
