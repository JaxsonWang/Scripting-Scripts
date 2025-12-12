import {
  Button,
  Circle,
  Gauge,
  HStack,
  Image,
  List,
  Navigation,
  NavigationStack,
  Script,
  Section,
  Spacer,
  Text,
  VStack,
  Widget,
  fetch,
  useEffect,
  useRef,
  useState
} from 'scripting'
import { SettingsPage } from './components/settings-page'
import {
  type DSMInfo,
  type DashboardData,
  type StorageInfo,
  type SystemLog,
  type SystemUtilization,
  formatNetworkSpeed,
  formatUptime,
  getCurrentSynologyConfig,
  getDSMInfo,
  getDashboardData,
  getStorageInfo,
  getSystemLog,
  getSystemUtilization,
  isSessionValid,
  loginToSynology,
  logoutFromSynology,
  measureLatency
} from './utils/synology-service'
import pkg from './script.json'

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
function GaugeCard({ value, label, icon, subtitle }: { value: number; label: string; icon: string; subtitle?: string }) {
  const color = getStatusColor(value)
  const normalizedValue = Math.min(Math.max(value / 100, 0), 1)

  return (
    <VStack spacing={6} alignment="center" padding={12}>
      <Gauge
        value={normalizedValue}
        label={<Image systemName={icon} font="caption" foregroundStyle={color} />}
        min={0}
        max={1}
        currentValueLabel={
          <Text font="headline" fontWeight="bold" foregroundStyle={color}>
            {Math.round(value)}%
          </Text>
        }
        gaugeStyle="accessoryCircular"
        tint={color}
      />
      <VStack spacing={2} alignment="center">
        <Text font="subheadline" fontWeight="semibold" foregroundStyle="label">
          {label}
        </Text>
        {subtitle ? (
          <Text font="caption2" foregroundStyle="tertiaryLabel">
            {subtitle}
          </Text>
        ) : null}
      </VStack>
    </VStack>
  )
}

/**
 * 连接状态指示器
 */
function ConnectionStatus({ isOnline, latency }: { isOnline: boolean; latency: number }) {
  return (
    <HStack spacing={6} alignment="center">
      <Circle fill={isOnline ? 'systemGreen' : 'systemRed'} frame={{ width: 8, height: 8 }} />
      <Text font="subheadline" fontWeight="medium" foregroundStyle={isOnline ? 'systemGreen' : 'systemRed'}>
        {isOnline ? 'Online' : 'Offline'}
      </Text>
      {isOnline && latency > 0 && (
        <Text font="caption" foregroundStyle="tertiaryLabel">
          · {latency}ms
        </Text>
      )}
    </HStack>
  )
}

function SynologyMain() {
  // 状态管理
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [dsmInfo, setDsmInfo] = useState<DSMInfo | null>(null)
  const [systemData, setSystemData] = useState<SystemUtilization | null>(null)
  const [storageData, setStorageData] = useState<StorageInfo | null>(null)
  const [systemLog, setSystemLog] = useState<SystemLog | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [bannerImageUrl, setBannerImageUrl] = useState<string>('')
  const [refreshTimer, setRefreshTimer] = useState<number | null>(null)
  const [isAutoRefreshActive, setIsAutoRefreshActive] = useState<boolean>(false)
  const isAutoRefreshActiveRef = useRef<boolean>(false)

  // 退出监控并登出
  const dismiss = async () => {
    setIsAutoRefreshActive(false)
    isAutoRefreshActiveRef.current = false
    if (refreshTimer) {
      clearTimeout(refreshTimer)
      setRefreshTimer(null)
    }

    const config = getCurrentSynologyConfig()
    if (config.nasIp && config.username && config.password) {
      console.log('🚪 正在登出群晖...')
      await logoutFromSynology(config)
    }

    Script.exit()
  }

  // 加载横幅图片
  const loadBannerImage = async () => {
    try {
      const response = await fetch('https://joiner.i95.me/scripting/joiner.json')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = (await response.json()) as any
      const bannerUrl = data.bannerImage

      if (bannerUrl) {
        setBannerImageUrl(bannerUrl)
      }
    } catch (error) {
      console.error('加载横幅图片失败:', error)
    }
  }

  // 刷新数据
  const refreshData = async () => {
    const config = getCurrentSynologyConfig()

    if (!config.nasIp || !config.username || !config.password) {
      console.log('⚠️ 请先配置 NAS 连接信息')
      return
    }

    setIsLoading(true)
    console.log('🔄 正在获取数据...')

    try {
      if (!isSessionValid()) {
        const loginResult = await loginToSynology(config)
        if (!loginResult.success) {
          console.error('❌ 登录失败:', loginResult.error)
          setIsLoading(false)
          return
        }
      }

      // 并行获取所有数据
      const [dashboard, dsmResult, systemResult, storageResult, logResult] = await Promise.all([
        getDashboardData(config),
        getDSMInfo(config),
        getSystemUtilization(config),
        getStorageInfo(config),
        getSystemLog(config)
      ])

      setDashboardData(dashboard)
      setDsmInfo(dsmResult)
      setSystemData(systemResult)
      setStorageData(storageResult)
      setSystemLog(logResult)

      if (dashboard || dsmResult || systemResult || storageResult || logResult) {
        console.log('✅ 数据更新成功')
      } else {
        console.log('⚠️ 获取数据失败，请检查连接')
      }
    } catch (error) {
      console.error('❌ 刷新数据失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 启动自动刷新
  const startAutoRefresh = () => {
    if (refreshTimer) {
      clearTimeout(refreshTimer)
    }

    setIsAutoRefreshActive(true)
    isAutoRefreshActiveRef.current = true

    const scheduleNextRefresh = () => {
      if (!isAutoRefreshActiveRef.current) return

      const timer = setTimeout(async () => {
        const config = getCurrentSynologyConfig()
        if (config.nasIp && config.username && config.password && isSessionValid() && isAutoRefreshActiveRef.current) {
          console.log('🔄 自动刷新数据...')
          await refreshData()
          scheduleNextRefresh()
        }
      }, 1500) // 1.5秒刷新一次

      setRefreshTimer(timer)
    }

    scheduleNextRefresh()
    console.log('⏰ 已启动自动刷新')
  }

  // 停止自动刷新
  const stopAutoRefresh = () => {
    setIsAutoRefreshActive(false)
    isAutoRefreshActiveRef.current = false
    if (refreshTimer) {
      clearTimeout(refreshTimer)
      setRefreshTimer(null)
    }
    console.log('⏹️ 已停止自动刷新')
  }

  // 预览小组件
  const previewWidget = async () => {
    try {
      await Widget.preview({ family: 'systemSmall' })
    } catch (error) {
      console.error('预览小组件失败:', error)
    }
  }

  // 格式化存储大小
  const formatStorageSize = (bytes: number): string => {
    const gb = bytes / 1024 ** 3
    return gb.toFixed(1) + ' GB'
  }

  // 组件挂载时加载数据
  useEffect(() => {
    const initializeApp = async () => {
      await loadBannerImage()

      const config = getCurrentSynologyConfig()
      if (config.nasIp && config.username && config.password) {
        await refreshData()
        startAutoRefresh()
      }
    }

    initializeApp()

    return () => {
      setIsAutoRefreshActive(false)
      isAutoRefreshActiveRef.current = false
      if (refreshTimer) {
        clearTimeout(refreshTimer)
      }
    }
  }, [])

  return (
    <NavigationStack>
      <List
        navigationTitle="群晖小组件"
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          cancellationAction: <Button title="退出" action={dismiss} />,
          primaryAction: (
            <Button
              title="设置"
              action={async () => {
                await Navigation.present({
                  element: <SettingsPage />,
                  modalPresentationStyle: 'pageSheet'
                })
                await refreshData()
              }}
            />
          )
        }}
      >
        {/* 仪表盘概览 */}
        {dashboardData && (
          <Section
            header={
              <HStack alignment="center">
                <Text font="headline">系统概览</Text>
                <Spacer />
                <ConnectionStatus isOnline={dashboardData.connectionStatus.isOnline} latency={dashboardData.connectionStatus.latency} />
              </HStack>
            }
          >
            {/* 设备信息栏 */}
            <HStack alignment="center" padding={{ vertical: 8 }}>
              <Image systemName="externaldrive.connected.to.line.below" foregroundStyle="systemBlue" frame={{ width: 24, height: 24 }} />
              <VStack alignment="leading" spacing={2}>
                <Text font="headline" fontWeight="bold" foregroundStyle="label">
                  {dashboardData.dsmInfo?.model || 'Synology NAS'}
                </Text>
                <Text font="caption" foregroundStyle="secondaryLabel">
                  {dashboardData.dsmInfo?.version_string || 'DSM'}
                </Text>
              </VStack>
              <Spacer />
              <VStack alignment="trailing" spacing={2}>
                <Text font="title3" fontWeight="bold" foregroundStyle="label">
                  {dashboardData.lastUpdateTime.toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </Text>
                <HStack spacing={4}>
                  <Circle fill={isAutoRefreshActive ? 'systemGreen' : 'systemGray'} frame={{ width: 6, height: 6 }} />
                  <Text font="caption2" foregroundStyle="tertiaryLabel">
                    {isAutoRefreshActive ? '监控中' : '已停止'}
                  </Text>
                </HStack>
              </VStack>
            </HStack>

            {/* 三个圆环仪表盘 */}
            <HStack spacing={0} alignment="center" frame={{ maxWidth: 'infinity' }}>
              <GaugeCard value={dashboardData.cpuUsage} label="CPU" icon="cpu" subtitle="处理器" />
              <GaugeCard value={dashboardData.memoryUsage} label="内存" icon="memorychip" subtitle="使用率" />
              <GaugeCard
                value={dashboardData.diskUsage}
                label="存储"
                icon="externaldrive"
                subtitle={`${dashboardData.diskUsedGB.toFixed(0)}/${dashboardData.diskTotalGB.toFixed(0)}GB`}
              />
            </HStack>

            {/* 网络速率 */}
            <VStack spacing={8} padding={{ vertical: 8 }}>
              <Text font="subheadline" fontWeight="semibold" foregroundStyle="secondaryLabel">
                网络流量
              </Text>
              <HStack spacing={24} alignment="center">
                <HStack spacing={8} alignment="center">
                  <Image systemName="arrow.up.circle.fill" foregroundStyle="systemGreen" frame={{ width: 20, height: 20 }} />
                  <VStack alignment="leading" spacing={1}>
                    <Text font="caption2" foregroundStyle="tertiaryLabel">
                      上传
                    </Text>
                    <Text font="headline" fontWeight="semibold" foregroundStyle="label">
                      {formatNetworkSpeed(dashboardData.networkSpeed.uploadSpeed)}
                    </Text>
                  </VStack>
                </HStack>
                <HStack spacing={8} alignment="center">
                  <Image systemName="arrow.down.circle.fill" foregroundStyle="systemBlue" frame={{ width: 20, height: 20 }} />
                  <VStack alignment="leading" spacing={1}>
                    <Text font="caption2" foregroundStyle="tertiaryLabel">
                      下载
                    </Text>
                    <Text font="headline" fontWeight="semibold" foregroundStyle="label">
                      {formatNetworkSpeed(dashboardData.networkSpeed.downloadSpeed)}
                    </Text>
                  </VStack>
                </HStack>
                <Spacer />
              </HStack>
            </VStack>
          </Section>
        )}

        {/* DSM 信息 */}
        {dsmInfo && (
          <Section header={<Text font="headline">系统信息</Text>}>
            <HStack alignment="center">
              <Text font="body" foregroundStyle="label">
                设备型号
              </Text>
              <Spacer />
              <Text font="body" fontWeight="medium" foregroundStyle="label">
                {dsmInfo.model}
              </Text>
            </HStack>
            <HStack alignment="center">
              <Text font="body" foregroundStyle="label">
                DSM 版本
              </Text>
              <Spacer />
              <Text font="body" fontWeight="medium" foregroundStyle="label">
                {dsmInfo.version_string}
              </Text>
            </HStack>
            <HStack alignment="center">
              <Text font="body" foregroundStyle="label">
                运行时间
              </Text>
              <Spacer />
              <Text font="body" fontWeight="medium" foregroundStyle="systemGreen">
                {formatUptime(dsmInfo.uptime)}
              </Text>
            </HStack>
          </Section>
        )}

        {/* 存储详情 */}
        {storageData && (
          <Section header={<Text font="headline">存储详情</Text>}>
            {/* 硬盘信息 */}
            {storageData.disks && storageData.disks.length > 0 && (
              <VStack spacing={8} alignment="leading">
                <Text font="subheadline" fontWeight="semibold" foregroundStyle="secondaryLabel">
                  硬盘状态
                </Text>
                {storageData.disks.slice(0, 4).map((disk, index) => (
                  <HStack key={index} alignment="center">
                    <Image
                      systemName="internaldrive"
                      foregroundStyle={disk.status === 'normal' ? 'systemGreen' : 'systemOrange'}
                      frame={{ width: 16, height: 16 }}
                    />
                    <VStack alignment="leading" spacing={1}>
                      <Text font="body" foregroundStyle="label">
                        {disk.name}
                      </Text>
                      <Text font="caption2" foregroundStyle="tertiaryLabel">
                        {disk.model}
                      </Text>
                    </VStack>
                    <Spacer />
                    <VStack alignment="trailing" spacing={1}>
                      <Text font="body" fontWeight="medium" foregroundStyle={disk.temp > 50 ? 'systemRed' : disk.temp > 40 ? 'systemOrange' : 'systemGreen'}>
                        {disk.temp}°C
                      </Text>
                      <Text font="caption2" foregroundStyle="tertiaryLabel">
                        {disk.status === 'normal' ? '正常' : disk.status}
                      </Text>
                    </VStack>
                  </HStack>
                ))}
              </VStack>
            )}

            {/* 存储空间 */}
            {storageData.volumes && storageData.volumes.length > 0 && (
              <VStack spacing={8} alignment="leading" padding={{ top: 8 }}>
                <Text font="subheadline" fontWeight="semibold" foregroundStyle="secondaryLabel">
                  存储空间
                </Text>
                {storageData.volumes.slice(0, 3).map((volume, index) => {
                  const totalGB = parseInt(volume.size.total) / 1024 ** 3
                  const usedGB = parseInt(volume.size.used) / 1024 ** 3
                  const usagePercent = (usedGB / totalGB) * 100
                  const color = getStatusColor(usagePercent)

                  return (
                    <HStack key={index} alignment="center">
                      <Image systemName="folder.fill" foregroundStyle={color} frame={{ width: 16, height: 16 }} />
                      <Text font="body" foregroundStyle="label">
                        卷 {volume.id}
                      </Text>
                      <Spacer />
                      <Text font="caption" foregroundStyle="tertiaryLabel">
                        {usedGB.toFixed(1)} / {totalGB.toFixed(1)} GB
                      </Text>
                      <Text font="body" fontWeight="semibold" foregroundStyle={color}>
                        {usagePercent.toFixed(1)}%
                      </Text>
                    </HStack>
                  )
                })}
              </VStack>
            )}
          </Section>
        )}

        {/* 系统日志 */}
        {systemLog && systemLog.items && systemLog.items.length > 0 && (
          <Section header={<Text font="headline">系统日志</Text>}>
            {systemLog.items.slice(0, 3).map((log, index) => (
              <VStack key={index} alignment="leading" spacing={2}>
                <Text font="caption" foregroundStyle="tertiaryLabel">
                  {log.time}
                </Text>
                <Text font="caption" foregroundStyle="label" lineLimit={2}>
                  {log.descr}
                </Text>
              </VStack>
            ))}
          </Section>
        )}

        {/* 操作区域 */}
        <Section
          header={<Text font="headline">操作</Text>}
          footer={
            <VStack spacing={10} alignment="leading">
              {bannerImageUrl ? <Image filePath={bannerImageUrl} resizable scaleToFit /> : null}
              <Text font="footnote" foregroundStyle="secondaryLabel">
                群晖小组件 v{pkg.version}
                {'\n'}
                实时监控 Synology NAS 的 CPU、内存、存储和网络状态
                {'\n'}
                ScriptPie© - 更多小组件请关注微信公众号「组件派」
              </Text>
            </VStack>
          }
        >
          <Button
            action={async () => {
              await refreshData()
              startAutoRefresh()
            }}
            disabled={isLoading}
          >
            <HStack alignment="center">
              <VStack alignment="leading" spacing={2}>
                <Text font="body" foregroundStyle="label">
                  {isLoading ? '刷新中...' : isAutoRefreshActive ? '重启监控' : '开始监控'}
                </Text>
                <Text font="caption" foregroundStyle="secondaryLabel">
                  {isAutoRefreshActive ? '重新启动实时监控' : '开始实时数据监控'}
                </Text>
              </VStack>
              <Spacer />
              <Image systemName={isAutoRefreshActive ? 'arrow.clockwise' : 'play.circle'} foregroundStyle="systemBlue" frame={{ width: 20, height: 20 }} />
            </HStack>
          </Button>

          {isAutoRefreshActive && (
            <Button action={stopAutoRefresh}>
              <HStack alignment="center">
                <VStack alignment="leading" spacing={2}>
                  <Text font="body" foregroundStyle="label">
                    停止监控
                  </Text>
                  <Text font="caption" foregroundStyle="secondaryLabel">
                    停止实时数据监控
                  </Text>
                </VStack>
                <Spacer />
                <Image systemName="stop.circle" foregroundStyle="systemRed" frame={{ width: 20, height: 20 }} />
              </HStack>
            </Button>
          )}

          <Button action={previewWidget}>
            <HStack alignment="center">
              <VStack alignment="leading" spacing={2}>
                <Text font="body" foregroundStyle="label">
                  预览组件
                </Text>
                <Text font="caption" foregroundStyle="secondaryLabel">
                  查看小组件效果
                </Text>
              </VStack>
              <Spacer />
              <Image systemName="eye" foregroundStyle="systemBlue" frame={{ width: 20, height: 20 }} />
            </HStack>
          </Button>
        </Section>
      </List>
    </NavigationStack>
  )
}

/**
 * 主函数
 */
const main = async () => {
  await Navigation.present({
    element: <SynologyMain />,
    modalPresentationStyle: 'fullScreen'
  })
  Script.exit()
}

main()
