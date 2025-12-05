import { HStack, Image, Spacer, Text, VStack, Widget } from 'scripting'
import {
  type DSMInfo,
  type StorageInfo,
  type SystemUtilization,
  getCurrentSynologyConfig,
  getDSMInfo,
  getStorageInfo,
  getSystemUtilization,
  isSessionValid,
  loginToSynology
} from './utils/synology-service'

/**
 * 格式化百分比
 */
function formatPercentage(value: number): string {
  return value.toFixed(1) + '%'
}

/**
 * 获取状态颜色
 */
function getStatusColor(percentage: number): 'systemRed' | 'systemOrange' | 'systemGreen' {
  if (percentage > 80) return 'systemRed'
  if (percentage > 60) return 'systemOrange'
  return 'systemGreen'
}

/**
 * 小号组件视图
 */
function SmallWidgetView({
  dsmInfo,
  systemData,
  storageData
}: {
  dsmInfo: DSMInfo | null
  systemData: SystemUtilization | null
  storageData: StorageInfo | null
}) {
  return (
    <VStack
      spacing={4}
      padding={16}
      frame={{
        maxWidth: 'infinity',
        maxHeight: 'infinity'
      }}
    >
      {/* 标题 */}
      <HStack alignment="center">
        <Image systemName="externaldrive.connected.to.line.below" foregroundStyle="systemBlue" frame={{ width: 16, height: 16 }} />
        <Text font="caption" fontWeight="semibold" foregroundStyle="systemBlue">
          群晖 NAS
        </Text>
        <Spacer />
      </HStack>

      <Spacer />

      {/* 系统信息 */}
      {systemData ? (
        <VStack spacing={6}>
          {/* CPU */}
          <HStack alignment="center">
            <Text font="caption2" foregroundStyle="secondaryLabel">
              CPU
            </Text>
            <Spacer />
            <Text font="caption" fontWeight="semibold" foregroundStyle={getStatusColor(systemData.cpu['1min_load'])}>
              {formatPercentage(systemData.cpu['1min_load'])}
            </Text>
          </HStack>

          {/* 内存 */}
          <HStack alignment="center">
            <Text font="caption2" foregroundStyle="secondaryLabel">
              内存
            </Text>
            <Spacer />
            <Text font="caption" fontWeight="semibold" foregroundStyle={getStatusColor(systemData.memory.real_usage)}>
              {formatPercentage(systemData.memory.real_usage)}
            </Text>
          </HStack>

          {/* 存储 */}
          {storageData?.volumes?.[0]
            ? (() => {
                const volume = storageData.volumes[0]
                const totalGB = parseInt(volume.size.total) / 1024 ** 3
                const usedGB = parseInt(volume.size.used) / 1024 ** 3
                const usagePercent = (usedGB / totalGB) * 100

                return (
                  <HStack alignment="center">
                    <Text font="caption2" foregroundStyle="secondaryLabel">
                      存储
                    </Text>
                    <Spacer />
                    <Text font="caption" fontWeight="semibold" foregroundStyle={getStatusColor(usagePercent)}>
                      {usagePercent.toFixed(1)}%
                    </Text>
                  </HStack>
                )
              })()
            : null}
        </VStack>
      ) : (
        <VStack alignment="center" spacing={4}>
          <Image systemName="exclamationmark.triangle" foregroundStyle="systemOrange" frame={{ width: 20, height: 20 }} />
          <Text font="caption2" foregroundStyle="secondaryLabel" multilineTextAlignment="center">
            未连接
            {'\n'}
            请配置连接信息
          </Text>
        </VStack>
      )}

      <Spacer />

      {/* 更新时间 */}
      <Text font="caption2" foregroundStyle="tertiaryLabel" multilineTextAlignment="center">
        {new Date().toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit'
        })}
      </Text>
    </VStack>
  )
}

/**
 * 中号组件视图
 */
function MediumWidgetView({
  dsmInfo,
  systemData,
  storageData
}: {
  dsmInfo: DSMInfo | null
  systemData: SystemUtilization | null
  storageData: StorageInfo | null
}) {
  return (
    <VStack
      spacing={8}
      padding={16}
      frame={{
        maxWidth: 'infinity',
        maxHeight: 'infinity'
      }}
    >
      {/* 标题栏 */}
      <HStack alignment="center">
        <Image systemName="externaldrive.connected.to.line.below" foregroundStyle="systemBlue" frame={{ width: 20, height: 20 }} />
        <Text font="subheadline" fontWeight="semibold" foregroundStyle="systemBlue">
          群晖 NAS 状态
        </Text>
        <Spacer />
        <Text font="caption2" foregroundStyle="tertiaryLabel">
          {new Date().toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </HStack>

      {systemData ? (
        <VStack spacing={8}>
          {/* 系统资源 */}
          <VStack spacing={6}>
            <HStack alignment="center">
              <VStack alignment="leading" spacing={1}>
                <Text font="caption" foregroundStyle="secondaryLabel">
                  CPU 负载
                </Text>
                <Text font="title3" fontWeight="semibold" foregroundStyle={getStatusColor(systemData.cpu['1min_load'])}>
                  {formatPercentage(systemData.cpu['1min_load'])}
                </Text>
              </VStack>
              <Spacer />
              <VStack alignment="trailing" spacing={1}>
                <Text font="caption" foregroundStyle="secondaryLabel">
                  内存使用
                </Text>
                <Text font="title3" fontWeight="semibold" foregroundStyle={getStatusColor(systemData.memory.real_usage)}>
                  {formatPercentage(systemData.memory.real_usage)}
                </Text>
              </VStack>
            </HStack>
          </VStack>

          {/* 存储信息 */}
          {storageData?.volumes && storageData.volumes.length > 0 ? (
            <VStack spacing={4}>
              <Text font="caption" foregroundStyle="secondaryLabel">
                存储空间
              </Text>
              {storageData.volumes.slice(0, 2).map((volume, index) => {
                const totalGB = parseInt(volume.size.total) / 1024 ** 3
                const usedGB = parseInt(volume.size.used) / 1024 ** 3
                const usagePercent = (usedGB / totalGB) * 100

                return (
                  <HStack key={index} alignment="center">
                    <Text font="caption2" foregroundStyle="secondaryLabel">
                      卷 {volume.id}
                    </Text>
                    <Spacer />
                    <Text font="caption" fontWeight="medium" foregroundStyle={getStatusColor(usagePercent)}>
                      {usagePercent.toFixed(1)}% ({usedGB.toFixed(1)}GB)
                    </Text>
                  </HStack>
                )
              })}
            </VStack>
          ) : null}
        </VStack>
      ) : (
        <VStack alignment="center" spacing={8}>
          <Image systemName="exclamationmark.triangle" foregroundStyle="systemOrange" frame={{ width: 32, height: 32 }} />
          <VStack alignment="center" spacing={4}>
            <Text font="body" fontWeight="medium" foregroundStyle="label">
              未连接到 NAS
            </Text>
            <Text font="caption" foregroundStyle="secondaryLabel" multilineTextAlignment="center">
              请在应用中配置连接信息
            </Text>
          </VStack>
        </VStack>
      )}
    </VStack>
  )
}

/**
 * 主组件视图
 */
const WidgetView = ({
  dsmInfo,
  systemData,
  storageData
}: {
  dsmInfo: DSMInfo | null
  systemData: SystemUtilization | null
  storageData: StorageInfo | null
}) => {
  // 根据组件大小返回不同的视图
  const family = Widget.family

  switch (family) {
    case 'systemSmall':
      return <SmallWidgetView dsmInfo={dsmInfo} systemData={systemData} storageData={storageData} />
    case 'systemMedium':
      return <MediumWidgetView dsmInfo={dsmInfo} systemData={systemData} storageData={storageData} />
    case 'systemLarge':
      return <MediumWidgetView dsmInfo={dsmInfo} systemData={systemData} storageData={storageData} />
    default:
      return <SmallWidgetView dsmInfo={dsmInfo} systemData={systemData} storageData={storageData} />
  }
}

/**
 * 主函数
 */
const main = async () => {
  let dsmInfo: DSMInfo | null = null
  let systemData: SystemUtilization | null = null
  let storageData: StorageInfo | null = null

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

      // 如果会话有效，获取数据
      if (isSessionValid()) {
        const [dsmResult, systemResult, storageResult] = await Promise.all([getDSMInfo(config), getSystemUtilization(config), getStorageInfo(config)])

        dsmInfo = dsmResult
        systemData = systemResult
        storageData = storageResult
      }
    }
  } catch (error) {
    console.error('获取 NAS 数据失败:', error)
  }

  // 渲染组件
  Widget.present(<WidgetView dsmInfo={dsmInfo} systemData={systemData} storageData={storageData} />)
}

// 执行主函数
main()
