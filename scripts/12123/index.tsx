import {
  Button,
  HStack,
  Image,
  List,
  Navigation,
  NavigationStack,
  Path,
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
import { Traffic12123Api } from './services/traffic_12123_api'
import { Traffic12123ApiError } from './services/traffic_12123_api'
import type { BizRequestParams, WidgetConfig } from './services/config_storage'
import type { IntegrationData } from './services/traffic_12123_api'

// 对齐「交管12123」demo：使用 miniappcsfw 渠道接口更稳定
const DEFAULT_ENDPOINT = 'https://miniappcsfw.122.gov.cn:8443'

const normalizeTokenInput = (input: string) => input.replace(/\s+/g, '').trim()

const parseTokenToBizParams = (rawToken: string): BizRequestParams | null => {
  const trimmed = rawToken.trim()
  if (!trimmed) return null

  // 对齐 demo：支持直接粘贴 params=...；也兼容 token 被包成数组 [{ val: '...' }]
  let tokenStr = trimmed
  if (tokenStr.startsWith('params=')) {
    tokenStr = tokenStr.slice('params='.length)
  }

  try {
    const maybeArray = JSON.parse(tokenStr)
    if (Array.isArray(maybeArray) && maybeArray.length > 0 && maybeArray[0]?.val) {
      tokenStr = String(maybeArray[0].val)
      if (tokenStr.startsWith('params=')) {
        tokenStr = tokenStr.slice('params='.length)
      }
    }
  } catch {
    // ignore
  }

  try {
    const body = JSON.parse(decodeURIComponent(tokenStr))
    if (!body || typeof body !== 'object') return null
    if (typeof body.sign !== 'string' || !body.sign.trim()) return null
    if (typeof body.verifyToken !== 'string' || !body.verifyToken.trim()) return null
    return {
      sign: body.sign,
      verifyToken: body.verifyToken,
      productId: typeof body.productId === 'string' ? body.productId : undefined,
      version: typeof body.version === 'string' ? body.version : undefined
    }
  } catch {
    return null
  }
}

const SettingsScreen = () => {
  const saved = ConfigStorage.loadConfig()
  const [token, setToken] = useState(saved?.token || (saved ? `params=${encodeURIComponent(JSON.stringify(saved.bizParams))}` : ''))
  const [vehicleImagePath, setVehicleImagePath] = useState(saved?.vehicleImagePath || '')
  const [status, setStatus] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<any | null>(null)

  const canSave = useMemo(() => {
    const bizParams = parseTokenToBizParams(normalizeTokenInput(token))
    return Boolean(bizParams)
  }, [token])

  const save = () => {
    const normalized = normalizeTokenInput(token)
    const bizParams = parseTokenToBizParams(normalized)
    if (!bizParams) {
      setStatus('Token 格式不正确：请粘贴 params=...（URL 编码 JSON）')
      return
    }
    const config: WidgetConfig = {
      endpoint: DEFAULT_ENDPOINT,
      token: normalized,
      bizParams,
      vehicleImagePath: vehicleImagePath.trim() || undefined
    }
    ConfigStorage.saveConfig(config)
    setStatus('已保存配置，可去桌面刷新小组件验证。')
  }

  const pickVehicleImage = async () => {
    try {
      setStatus('选择图片中...')
      const selectedPhotos = await Photos.pickPhotos(1)
      const photo = selectedPhotos?.[0]
      if (!photo) {
        setStatus('已取消选择')
        return
      }

      // 优先保留 PNG 透明通道，若失败再降级为 JPEG
      const png = Data.fromPNG(photo)
      const imageData = png ?? Data.fromJPEG(photo, 1)
      if (!imageData) {
        setStatus('选择失败：无法读取所选图片数据')
        return
      }

      const dir = Path.join(FileManager.appGroupDocumentsDirectory, 'scripting_12123')
      await FileManager.createDirectory(dir, true)
      const ext = png ? '.png' : '.jpg'
      const dest = Path.join(dir, `vehicle_image${ext}`)
      try {
        await FileManager.remove(dest)
      } catch {
        // ignore
      }
      await FileManager.writeAsData(dest, imageData)
      setVehicleImagePath(dest)
      setStatus('已选择车辆图片（保存后生效）')
    } catch (e) {
      setStatus(`选择图片失败：${String(e)}`)
    }
  }

  const test = async () => {
    try {
      setStatus('测试中...')
      const normalized = normalizeTokenInput(token)
      const bizParams = parseTokenToBizParams(normalized)
      if (!bizParams) {
        setStatus('Token 格式不正确：无法测试')
        return
      }
      const config: WidgetConfig = { endpoint: DEFAULT_ENDPOINT, token: normalized, bizParams, vehicleImagePath: vehicleImagePath.trim() || undefined }

      try {
        const integration = await Traffic12123Api.queryIntegration(config)
        let vioCount: string | null = null
        try {
          vioCount = await Traffic12123Api.queryUnhandledVioCount(config, integration)
        } catch (e) {
          console.log('[12123] vio count fetch failed', e)
        }

        const data: { integration: IntegrationData; vioCount?: string } = { integration, ...(vioCount != null ? { vioCount } : {}) }
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
          setPreviewData(null)
          setStatus('认证凭据不存在：Token 可能已过期，请重新获取 Token 后再试')
          return
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
    setToken('')
    setVehicleImagePath('')
    setPreviewData(null)
    setStatus('已清除配置与缓存')
  }

  return (
    <NavigationStack>
      <List navigationTitle="12123小组件配置" navigationBarTitleDisplayMode="inline">
        <Section
          header={<Text>认证与业务参数</Text>}
          footer={
            <Text font={10} foregroundStyle="secondaryLabel">
              粘贴交管 12123 Token（通常以 params=... 开头）。
            </Text>
          }
        >
          <TextField
            title="Token"
            value={token}
            onChanged={setToken}
            prompt="粘贴 params=..."
          />
          <HStack>
            <Button title="选择车辆图片" action={() => void pickVehicleImage()} />
            <Spacer />
            <Text font={10} foregroundStyle="secondaryLabel" lineLimit={1}>
              {vehicleImagePath ? Path.basename(vehicleImagePath) : '未设置'}
            </Text>
          </HStack>
          <Button title="保存" disabled={!canSave} action={save} />
          <Button title="测试" action={() => void test()} />
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
