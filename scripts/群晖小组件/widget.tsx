import { Circle, Color, Gauge, HStack, Image, Spacer, Text, VStack, Widget, ZStack } from 'scripting'
import { type DashboardData, formatNetworkSpeed, getCurrentSynologyConfig, getDashboardData, isSessionValid, loginToSynology } from './utils/synology-service'

/**
 * 获取状态颜色
 */
function getStatusColor(percentage: number): 'systemRed' | 'systemOrange' | 'systemGreen' | 'systemBlue' {
  if (percentage > 80) return 'systemRed'
  if (percentage > 60) return 'systemOrange'
  if (percentage > 40) return 'systemBlue'
  return 'systemGreen'
}

/**
 * 圆环仪表盘组件
 */
function GaugeIndicator({
  value,
  label,
  icon,
  color
}: {
  value: number
  label: string
  icon: string
  color: 'systemRed' | 'systemOrange' | 'systemGreen' | 'systemBlue'
}) {
  const normalizedValue = Math.min(Math.max(value / 100, 0), 1)

  return (
    <VStack spacing={2} alignment="center">
      <Gauge
        value={normalizedValue}
        label={<Image systemName={icon} font="caption2" />}
        min={0}
        max={1}
        currentValueLabel={
          <Text font="caption2" fontWeight="bold" foregroundStyle={color}>
            {Math.round(value)}%
          </Text>
        }
        gaugeStyle="accessoryCircular"
        tint={color}
      />
      <Text font="caption2" foregroundStyle="secondaryLabel">
        {label}
      </Text>
    </VStack>
  )
}

/**
 * 网络速率显示组件
 */
function NetworkSpeedView({ uploadSpeed, downloadSpeed }: { uploadSpeed: number; downloadSpeed: number }) {
  return (
    <HStack spacing={12} alignment="center">
      <HStack spacing={4} alignment="center">
        <Image systemName="arrow.up" font="caption2" foregroundStyle="systemGreen" />
        <Text font="caption2" fontWeight="medium" foregroundStyle="label">
          {formatNetworkSpeed(uploadSpeed)}
        </Text>
      </HStack>
      <HStack spacing={4} alignment="center">
        <Image systemName="arrow.down" font="caption2" foregroundStyle="systemBlue" />
        <Text font="caption2" fontWeight="medium" foregroundStyle="label">
          {formatNetworkSpeed(downloadSpeed)}
        </Text>
      </HStack>
    </HStack>
  )
}

/**
 * 连接状态指示器
 */
function ConnectionIndicator({ isOnline, latency }: { isOnline: boolean; latency: number }) {
  return (
    <HStack spacing={4} alignment="center">
      <Circle fill={isOnline ? 'systemGreen' : 'systemRed'} frame={{ width: 6, height: 6 }} />
      <Text font="caption2" foregroundStyle={isOnline ? 'systemGreen' : 'systemRed'}>
        {isOnline ? 'Online' : 'Offline'}
      </Text>
      {isOnline && latency > 0 && (
        <Text font="caption2" foregroundStyle="tertiaryLabel">
          {latency}ms
        </Text>
      )}
    </HStack>
  )
}

/**
 * 小号组件视图 - 简洁显示核心指标
 */
function SmallWidgetView({ data }: { data: DashboardData | null }) {
  if (!data) {
    return (
      <VStack spacing={8} padding={12} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} background="black">
        <HStack alignment="center">
          <Image systemName="externaldrive.badge.xmark" foregroundStyle="systemOrange" frame={{ width: 20, height: 20 }} />
          <Text font="caption" fontWeight="semibold" foregroundStyle="systemOrange">
            NAS 未连接
          </Text>
        </HStack>
        <Spacer />
        <Text font="caption2" foregroundStyle="secondaryLabel" multilineTextAlignment="center">
          请在 App 中配置连接
        </Text>
        <Spacer />
      </VStack>
    )
  }

  const cpuColor = getStatusColor(data.cpuUsage)
  const memColor = getStatusColor(data.memoryUsage)
  const diskColor = getStatusColor(data.diskUsage)

  return (
    <VStack spacing={6} padding={12} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} background="black">
      {/* 标题栏 */}
      <HStack alignment="center">
        <Text font="caption" fontWeight="bold" foregroundStyle="white">
          {data.dsmInfo?.model || 'Synology'}
        </Text>
        <Spacer />
        <ConnectionIndicator isOnline={data.connectionStatus.isOnline} latency={data.connectionStatus.latency} />
      </HStack>

      <Spacer />

      {/* 三个圆环仪表盘 */}
      <HStack spacing={8} alignment="center">
        <GaugeIndicator value={data.cpuUsage} label="CPU" icon="cpu" color={cpuColor} />
        <GaugeIndicator value={data.memoryUsage} label="MEM" icon="memorychip" color={memColor} />
        <GaugeIndicator value={data.diskUsage} label="DISK" icon="externaldrive" color={diskColor} />
      </HStack>

      <Spacer />

      {/* 时间 */}
      <Text font="caption2" foregroundStyle="tertiaryLabel">
        {data.lastUpdateTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </VStack>
  )
}

/**
 * 中号组件视图 - 完整显示所有指标
 */
function MediumWidgetView({ data }: { data: DashboardData | null }) {
  if (!data) {
    return (
      <VStack spacing={12} padding={16} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} background="black">
        <HStack alignment="center">
          <Image systemName="externaldrive.badge.xmark" foregroundStyle="systemOrange" frame={{ width: 28, height: 28 }} />
          <VStack alignment="leading" spacing={2}>
            <Text font="headline" fontWeight="bold" foregroundStyle="white">
              NAS 未连接
            </Text>
            <Text font="caption" foregroundStyle="secondaryLabel">
              请在 Scripting App 中配置连接信息
            </Text>
          </VStack>
          <Spacer />
        </HStack>
        <Spacer />
      </VStack>
    )
  }

  const cpuColor = getStatusColor(data.cpuUsage)
  const memColor = getStatusColor(data.memoryUsage)
  const diskColor = getStatusColor(data.diskUsage)

  return (
    <VStack spacing={10} padding={16} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} background="black">
      {/* 顶部信息栏 */}
      <HStack alignment="center">
        <VStack alignment="leading" spacing={2}>
          <Text font="headline" fontWeight="bold" foregroundStyle="white">
            {data.dsmInfo?.model || 'Synology NAS'}
          </Text>
          <ConnectionIndicator isOnline={data.connectionStatus.isOnline} latency={data.connectionStatus.latency} />
        </VStack>
        <Spacer />
        <VStack alignment="trailing" spacing={2}>
          <Text font="title2" fontWeight="bold" foregroundStyle="white">
            {data.lastUpdateTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text font="caption2" foregroundStyle="tertiaryLabel">
            {data.dsmInfo?.version_string || 'DSM'}
          </Text>
        </VStack>
      </HStack>

      {/* 中间仪表盘区域 */}
      <HStack spacing={16} alignment="center">
        <GaugeIndicator value={data.cpuUsage} label="CPU" icon="cpu" color={cpuColor} />
        <GaugeIndicator value={data.memoryUsage} label="MEM" icon="memorychip" color={memColor} />
        <GaugeIndicator value={data.diskUsage} label="DISK" icon="externaldrive" color={diskColor} />

        <Spacer />

        {/* 网络速率 */}
        <VStack spacing={6} alignment="trailing">
          <HStack spacing={4} alignment="center">
            <Image systemName="arrow.up.circle.fill" foregroundStyle="systemGreen" frame={{ width: 14, height: 14 }} />
            <Text font="caption" fontWeight="semibold" foregroundStyle="white">
              {formatNetworkSpeed(data.networkSpeed.uploadSpeed)}
            </Text>
          </HStack>
          <HStack spacing={4} alignment="center">
            <Image systemName="arrow.down.circle.fill" foregroundStyle="systemBlue" frame={{ width: 14, height: 14 }} />
            <Text font="caption" fontWeight="semibold" foregroundStyle="white">
              {formatNetworkSpeed(data.networkSpeed.downloadSpeed)}
            </Text>
          </HStack>
        </VStack>
      </HStack>

      {/* 底部存储信息 */}
      <HStack alignment="center">
        <Image systemName="internaldrive" foregroundStyle="secondaryLabel" frame={{ width: 12, height: 12 }} />
        <Text font="caption2" foregroundStyle="secondaryLabel">
          {data.diskUsedGB.toFixed(1)} GB / {data.diskTotalGB.toFixed(1)} GB
        </Text>
        <Spacer />
      </HStack>
    </VStack>
  )
}

/**
 * 大号组件视图
 */
function LargeWidgetView({ data }: { data: DashboardData | null }) {
  if (!data) {
    return (
      <VStack spacing={16} padding={20} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} background="black">
        <HStack alignment="center">
          <Image systemName="externaldrive.badge.xmark" foregroundStyle="systemOrange" frame={{ width: 36, height: 36 }} />
          <VStack alignment="leading" spacing={4}>
            <Text font="title3" fontWeight="bold" foregroundStyle="white">
              Synology NAS 未连接
            </Text>
            <Text font="subheadline" foregroundStyle="secondaryLabel">
              请在 Scripting App 中配置 NAS 连接信息
            </Text>
          </VStack>
          <Spacer />
        </HStack>
        <Spacer />
      </VStack>
    )
  }

  const cpuColor = getStatusColor(data.cpuUsage)
  const memColor = getStatusColor(data.memoryUsage)
  const diskColor = getStatusColor(data.diskUsage)

  return (
    <VStack spacing={16} padding={20} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} background="black">
      {/* 顶部信息栏 */}
      <HStack alignment="center">
        <VStack alignment="leading" spacing={4}>
          <Text font="title2" fontWeight="bold" foregroundStyle="white">
            {data.dsmInfo?.model || 'Synology NAS'}
          </Text>
          <HStack spacing={8}>
            <ConnectionIndicator isOnline={data.connectionStatus.isOnline} latency={data.connectionStatus.latency} />
            <Text font="caption" foregroundStyle="tertiaryLabel">
              {data.dsmInfo?.version_string || 'DSM'}
            </Text>
          </HStack>
        </VStack>
        <Spacer />
        <VStack alignment="trailing" spacing={4}>
          <Text font="largeTitle" fontWeight="bold" foregroundStyle="white">
            {data.lastUpdateTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text font="caption" foregroundStyle="tertiaryLabel">
            {data.lastUpdateTime.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
          </Text>
        </VStack>
      </HStack>

      {/* 核心指标仪表盘 */}
      <HStack spacing={24} alignment="center" frame={{ maxWidth: 'infinity' }}>
        <VStack spacing={4} alignment="center">
          <Gauge
            value={data.cpuUsage / 100}
            label={<Image systemName="cpu" />}
            min={0}
            max={1}
            currentValueLabel={
              <Text font="title3" fontWeight="bold" foregroundStyle={cpuColor}>
                {Math.round(data.cpuUsage)}%
              </Text>
            }
            gaugeStyle="accessoryCircular"
            tint={cpuColor}
          />
          <Text font="subheadline" foregroundStyle="secondaryLabel">
            CPU
          </Text>
        </VStack>

        <VStack spacing={4} alignment="center">
          <Gauge
            value={data.memoryUsage / 100}
            label={<Image systemName="memorychip" />}
            min={0}
            max={1}
            currentValueLabel={
              <Text font="title3" fontWeight="bold" foregroundStyle={memColor}>
                {Math.round(data.memoryUsage)}%
              </Text>
            }
            gaugeStyle="accessoryCircular"
            tint={memColor}
          />
          <Text font="subheadline" foregroundStyle="secondaryLabel">
            内存
          </Text>
        </VStack>

        <VStack spacing={4} alignment="center">
          <Gauge
            value={data.diskUsage / 100}
            label={<Image systemName="externaldrive" />}
            min={0}
            max={1}
            currentValueLabel={
              <Text font="title3" fontWeight="bold" foregroundStyle={diskColor}>
                {Math.round(data.diskUsage)}%
              </Text>
            }
            gaugeStyle="accessoryCircular"
            tint={diskColor}
          />
          <Text font="subheadline" foregroundStyle="secondaryLabel">
            存储
          </Text>
        </VStack>
      </HStack>

      {/* 网络流量 */}
      <VStack spacing={8} alignment="leading">
        <Text font="subheadline" fontWeight="semibold" foregroundStyle="secondaryLabel">
          网络流量
        </Text>
        <HStack spacing={24}>
          <HStack spacing={8} alignment="center">
            <Image systemName="arrow.up.circle.fill" foregroundStyle="systemGreen" frame={{ width: 20, height: 20 }} />
            <VStack alignment="leading" spacing={2}>
              <Text font="caption2" foregroundStyle="tertiaryLabel">
                上传
              </Text>
              <Text font="headline" fontWeight="semibold" foregroundStyle="white">
                {formatNetworkSpeed(data.networkSpeed.uploadSpeed)}
              </Text>
            </VStack>
          </HStack>
          <HStack spacing={8} alignment="center">
            <Image systemName="arrow.down.circle.fill" foregroundStyle="systemBlue" frame={{ width: 20, height: 20 }} />
            <VStack alignment="leading" spacing={2}>
              <Text font="caption2" foregroundStyle="tertiaryLabel">
                下载
              </Text>
              <Text font="headline" fontWeight="semibold" foregroundStyle="white">
                {formatNetworkSpeed(data.networkSpeed.downloadSpeed)}
              </Text>
            </VStack>
          </HStack>
          <Spacer />
        </HStack>
      </VStack>

      {/* 存储详情 */}
      <VStack spacing={8} alignment="leading">
        <Text font="subheadline" fontWeight="semibold" foregroundStyle="secondaryLabel">
          存储空间
        </Text>
        <HStack alignment="center">
          <Image systemName="internaldrive.fill" foregroundStyle="systemBlue" frame={{ width: 16, height: 16 }} />
          <Text font="body" foregroundStyle="white">
            {data.diskUsedGB.toFixed(1)} GB
          </Text>
          <Text font="body" foregroundStyle="tertiaryLabel">
            / {data.diskTotalGB.toFixed(1)} GB
          </Text>
          <Spacer />
          <Text font="body" fontWeight="semibold" foregroundStyle={diskColor}>
            {(100 - data.diskUsage).toFixed(1)}% 可用
          </Text>
        </HStack>
      </VStack>
    </VStack>
  )
}

/**
 * 主组件视图分发
 */
const WidgetView = ({ data }: { data: DashboardData | null }) => {
  const family = Widget.family

  switch (family) {
    case 'systemSmall':
      return <SmallWidgetView data={data} />
    case 'systemMedium':
      return <MediumWidgetView data={data} />
    case 'systemLarge':
      return <LargeWidgetView data={data} />
    default:
      return <SmallWidgetView data={data} />
  }
}

/**
 * 主函数
 */
const main = async () => {
  let dashboardData: DashboardData | null = null

  try {
    const config = getCurrentSynologyConfig()

    // 检查配置是否完整
    if (config.nasIp && config.username && config.password) {
      // 检查会话是否有效，无效则重新登录
      if (!isSessionValid()) {
        const loginResult = await loginToSynology(config)
        if (!loginResult.success) {
          console.error('登录失败:', loginResult.error)
        }
      }

      // 如果会话有效，获取仪表盘数据
      if (isSessionValid()) {
        dashboardData = await getDashboardData(config)
      }
    }
  } catch (error) {
    console.error('获取 NAS 数据失败:', error)
  }

  // 渲染组件
  Widget.present(<WidgetView data={dashboardData} />)
}

// 执行主函数
main()
