import { Capsule, Ellipse, HStack, Image, RoundedRectangle, Spacer, Text, VStack, Widget, useMemo } from 'scripting'
import type { Color } from 'scripting'
import { ConfigStorage } from './services/config_storage'
import type { IntegrationData } from './services/traffic_12123_api'

const RELOAD_MINUTES = 30

type WidgetViewProps = {
  data: IntegrationData
  updatedAtText: string
  fromCache: boolean
  vehicleImagePath?: string
  vioCount?: string
}

const greedColor: Color = '#67c23a'
const dangerColor: Color = '#f56c6c'

const safeText = (value: unknown) => (typeof value === 'string' ? value : value == null ? '' : String(value))

const parsePointNumber = (value: unknown) => {
  const n = Number.parseInt(safeText(value), 10)
  return Number.isFinite(n) ? n : null
}

const formatDate = (timestamp: number) => {
  const d = new Date(timestamp)
  try {
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${mm}-${dd} ${hh}:${mi}`
  } catch {
    return d.toISOString()
  }
}

type ImageSourceProps = { filePath: string } | { imageUrl: string }

const buildImageProps = (path: string): ImageSourceProps => {
  return /^https?:\/\//.test(path) ? { imageUrl: path } : { filePath: path }
}

const WidgetView = ({ data, updatedAtText, fromCache, vehicleImagePath, vioCount }: WidgetViewProps) => {
  const viewModel = useMemo(() => {
    const vehicle = data.vehicles?.[0]
    const drivingLicense = data.drivingLicense
    const points = parsePointNumber(drivingLicense?.cumulativePoint)
    const pointsText = safeText(drivingLicense?.cumulativePoint) || '-'
    const inspectionValidityEnd = safeText(drivingLicense?.inspectionValidityEnd)
    const status = safeText(drivingLicense?.status)

    return {
      title: '交管12123',
      updatedAtText,
      fromCache,
      name: safeText(data.name),
      platformName: safeText(data.platformName),
      subtitle: `${safeText(data.name)}${safeText(data.name) && safeText(data.platformName) ? ' · ' : ''}${safeText(data.platformName)}`.trim(),
      plateNumber: safeText(vehicle?.plateNumber) || '-',
      vehicleValidEnd: safeText(vehicle?.validPeriodEnd),
      allowToDrive: safeText(data.drivingLicense?.allowToDrive),
      licenseValidEnd: safeText(data.drivingLicense?.validityEnd || data.drivingLicense?.inspectionValidityEnd),
      status,
      points,
      pointsText,
      inspectionValidityEnd
    }
  }, [data, fromCache, updatedAtText])

  const family = Widget.family
  const pointsColor = viewModel.points != null && viewModel.points > 0 ? 'systemRed' : 'systemGreen'

  if (family !== 'systemMedium') {
    return (
      <VStack
        padding={12}
        spacing={10}
        frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'center' }}
        background={<RoundedRectangle cornerRadius={18} style="continuous" fill="secondarySystemBackground" />}
      >
        <Image systemName="hammer.fill" foregroundStyle="systemOrange" />
        <Text font={12} foregroundStyle="label">
          正在开发中...
        </Text>
        <Text font={10} foregroundStyle="secondaryLabel">
          {family}
        </Text>
      </VStack>
    )
  }

  return (
    <HStack padding frame={{ maxWidth: 'infinity', alignment: 'leading' }}>
      <VStack spacing={6} frame={{ alignment: 'leading' }}>
        <Text font={18} foregroundStyle="label" lineLimit={1}>
          {viewModel.plateNumber}
        </Text>
        {viewModel.vehicleValidEnd ? (
          <Text font={10} foregroundStyle="secondaryLabel" lineLimit={1}>
            年检 {viewModel.vehicleValidEnd}
          </Text>
        ) : (
          <Text font={10} foregroundStyle="secondaryLabel">
            暂无年检信息
          </Text>
        )}
        {viewModel.licenseValidEnd ? (
          <Text font={10} foregroundStyle="secondaryLabel" lineLimit={1}>
            换证 {viewModel.licenseValidEnd}
          </Text>
        ) : (
          <Text font={10} foregroundStyle="secondaryLabel">
            暂无换证信息
          </Text>
        )}

        <HStack
          padding={{ vertical: 2, horizontal: 4 }}
          background={
            <RoundedRectangle
              cornerRadius={8}
              stroke={{ shapeStyle: viewModel.pointsText === '0' ? greedColor : dangerColor, strokeStyle: { lineWidth: 1 } }}
            />
          }
        >
          <Image systemName="person.text.rectangle" font="caption" foregroundStyle={viewModel.pointsText === '0' ? greedColor : dangerColor} />
          <Text font="caption" foregroundStyle={viewModel.pointsText === '0' ? greedColor : dangerColor}>
            记 {viewModel.pointsText} 分
          </Text>
        </HStack>

        <HStack
          padding={{ vertical: 2, horizontal: 4 }}
          background={
            <RoundedRectangle
              cornerRadius={8}
              stroke={{
                shapeStyle: vioCount === '0' ? greedColor : dangerColor,
                strokeStyle: { lineWidth: 1 }
              }}
            />
          }
        >
          <Image systemName="person.text.rectangle" font="caption" foregroundStyle={vioCount === '0' ? greedColor : dangerColor} />
          <Text font="caption" foregroundStyle={vioCount === '0' ? greedColor : dangerColor}>
            {vioCount} 违章
          </Text>
        </HStack>
      </VStack>

      <VStack frame={{ maxWidth: 'infinity', alignment: 'trailing' }}>
        {vehicleImagePath ? (
          <Image
            {...buildImageProps(vehicleImagePath)}
            resizable
            scaleToFit
            frame={{
              idealWidth: 'infinity',
              maxHeight: 'infinity'
            }}
          />
        ) : (
          <VStack frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'center' }}>
            <Image systemName="car" font={24} foregroundStyle="secondaryLabel" />
            <Text font={10} foregroundStyle="secondaryLabel">
              未设置车辆图片
            </Text>
          </VStack>
        )}
        <HStack>
          <Text font="caption2" foregroundStyle="gray">
            准驾车型: {viewModel.allowToDrive}
          </Text>
          <Text font="caption2" foregroundStyle="gray">
            驾照状态: {viewModel.status === 'A' ? '正常' : '异常'}
          </Text>
        </HStack>
      </VStack>
    </HStack>
  )
}

const ErrorView = ({ title, message }: { title: string; message: string }) => {
  const now = formatDate(Date.now())
  return (
    <VStack
      spacing={8}
      padding={12}
      frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'center' }}
      background={<RoundedRectangle cornerRadius={18} style="continuous" fill="secondarySystemBackground" />}
    >
      <Image systemName="exclamationmark.triangle.fill" foregroundStyle="systemRed" />
      <Text font={12} foregroundStyle="label">
        {title}
      </Text>
      <Text font={10} foregroundStyle="secondaryLabel" lineLimit={2}>
        {message}
      </Text>
      <Text font={9} foregroundStyle="secondaryLabel">
        {now}
      </Text>
    </VStack>
  )
}

const formatUpdatedAt = (timestamp: number) => {
  const d = new Date(timestamp)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

const main = async () => {
  const config = ConfigStorage.loadConfig()
  const cache = ConfigStorage.loadCache()
  const vehicleImagePath = config?.vehicleImagePath

  // Widget 环境里直接发起网络请求可能触发 “message channel not found”，因此只读取 App 端写入的缓存。
  if (cache?.response) {
    const cachedAny = cache.response as any
    const integration = (cachedAny && typeof cachedAny === 'object' && 'integration' in cachedAny ? cachedAny.integration : cachedAny) as IntegrationData
    const vioCount = cachedAny && typeof cachedAny === 'object' && 'vioCount' in cachedAny ? String(cachedAny.vioCount) : undefined
    Widget.present(
      <WidgetView
        data={integration}
        updatedAtText={formatUpdatedAt(cache.fetchedAt)}
        fromCache={true}
        vehicleImagePath={vehicleImagePath}
        vioCount={vioCount}
      />,
      {
        policy: 'after',
        date: new Date(Date.now() + 1000 * 60 * RELOAD_MINUTES)
      }
    )
    return
  }

  if (!config) {
    Widget.present(<ErrorView title="未配置" message="先运行脚本进入配置页，粘贴 params 并点击“测试”" />)
    return
  }

  Widget.present(<ErrorView title="无缓存" message="已配置但尚未刷新数据：去配置页点击“测试”生成缓存后再刷新小组件" />, {
    policy: 'after',
    date: new Date(Date.now() + 1000 * 60 * RELOAD_MINUTES)
  })
}

main()
