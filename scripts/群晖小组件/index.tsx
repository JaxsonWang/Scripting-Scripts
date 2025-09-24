import { Button, HStack, Image, List, Navigation, NavigationStack, Script, Section, Spacer, Text, VStack, Widget } from 'scripting'
import { useEffect, useRef, useState } from 'scripting'
import { fetch } from 'scripting'
import { SettingsPage } from './components/settings-page'
import {
  type DSMInfo,
  type StorageInfo,
  type SystemLog,
  type SystemUtilization,
  formatUptime,
  getCurrentSynologyConfig,
  getDSMInfo,
  getStorageInfo,
  getSystemLog,
  getSystemUtilization,
  isSessionValid,
  loginToSynology,
  logoutFromSynology
} from './utils/synology-service'
import { ImageCacheManager } from './utils/image-cache'
import pkg from './script.json'

function SynologyMain() {
  // 状态管理
  const [dsmInfo, setDsmInfo] = useState<DSMInfo | null>(null)
  const [systemData, setSystemData] = useState<SystemUtilization | null>(null)
  const [storageData, setStorageData] = useState<StorageInfo | null>(null)
  const [systemLog, setSystemLog] = useState<SystemLog | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [bannerImagePath, setBannerImagePath] = useState<string | null>(null)
  const [refreshTimer, setRefreshTimer] = useState<number | null>(null)
  const [isAutoRefreshActive, setIsAutoRefreshActive] = useState<boolean>(false)
  const isAutoRefreshActiveRef = useRef<boolean>(false)

  // 退出监控并登出
  const dismiss = async () => {
    // 停止自动刷新
    setIsAutoRefreshActive(false)
    isAutoRefreshActiveRef.current = false
    if (refreshTimer) {
      clearTimeout(refreshTimer)
      setRefreshTimer(null)
    }

    // 登出群晖
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
        const imagePath = await ImageCacheManager.getCachedImagePath(bannerUrl)
        setBannerImagePath(imagePath)
      }
    } catch (error) {
      console.error('加载横幅图片失败:', error)
    }
  }

  // 刷新数据
  const refreshData = async () => {
    const config = getCurrentSynologyConfig()

    // 检查配置是否完整
    if (!config.nasIp || !config.username || !config.password) {
      console.log('⚠️ 请先配置 NAS 连接信息')
      return
    }

    setIsLoading(true)
    console.log('🔄 正在获取数据...')

    try {
      // 检查会话是否有效，无效则重新登录
      if (!isSessionValid()) {
        const loginResult = await loginToSynology(config)
        if (!loginResult.success) {
          console.error('❌ 登录失败:', loginResult.error)
          setIsLoading(false)
          return
        }
      }

      // 并行获取所有数据
      const [dsmResult, systemResult, storageResult, logResult] = await Promise.all([
        getDSMInfo(config),
        getSystemUtilization(config),
        getStorageInfo(config),
        getSystemLog(config)
      ])

      setDsmInfo(dsmResult)
      setSystemData(systemResult)
      setStorageData(storageResult)
      setSystemLog(logResult)

      if (dsmResult || systemResult || storageResult || logResult) {
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
    // 清除现有定时器
    if (refreshTimer) {
      clearTimeout(refreshTimer)
    }

    // 设置活跃状态
    setIsAutoRefreshActive(true)
    isAutoRefreshActiveRef.current = true

    // 递归函数实现定时刷新
    const scheduleNextRefresh = () => {
      if (!isAutoRefreshActiveRef.current) return // 如果已停止，不再继续

      const timer = setTimeout(async () => {
        const config = getCurrentSynologyConfig()
        if (config.nasIp && config.username && config.password && isSessionValid() && isAutoRefreshActiveRef.current) {
          console.log('🔄 自动刷新数据...')
          await refreshData()
          // 继续下一次刷新
          scheduleNextRefresh()
        }
      }, 1000)

      setRefreshTimer(timer)
    }

    scheduleNextRefresh()
    console.log('⏰ 已启动自动刷新，每秒更新一次')
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
      await Widget.preview({
        family: 'systemSmall'
      })
    } catch (error) {
      console.error('预览小组件失败:', error)
    }
  }

  // 清理缓存
  const clearCache = async () => {
    try {
      await ImageCacheManager.clearAllCache()
      console.log('✅ 缓存清理完成')
    } catch (error) {
      console.error('❌ 清理缓存失败:', error)
    }
  }

  // 格式化存储大小
  const formatStorageSize = (bytes: number): string => {
    const gb = bytes / 1024 ** 3
    return gb.toFixed(1) + ' GB'
  }

  // 格式化百分比
  const formatPercentage = (value: number): string => {
    return value.toFixed(1) + '%'
  }

  // 组件挂载时加载数据
  useEffect(() => {
    const initializeApp = async () => {
      await loadBannerImage()

      // 如果已配置，自动刷新数据并启动定时器
      const config = getCurrentSynologyConfig()
      if (config.nasIp && config.username && config.password) {
        await refreshData()
        // 启动自动刷新
        startAutoRefresh()
      }
    }

    initializeApp()

    // 组件卸载时清理定时器
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
          cancellationAction: <Button title="退出监控" action={dismiss} />,
          primaryAction: (
            <Button
              title="设置"
              action={async () => {
                await Navigation.present({
                  element: <SettingsPage />,
                  modalPresentationStyle: 'pageSheet'
                })
                // 设置页面关闭后刷新数据
                await refreshData()
              }}
            />
          )
        }}
      >
        {/* 监控状态 */}
        <Section>
          <HStack alignment="center">
            <VStack alignment="leading" spacing={2}>
              <Text font="body" foregroundStyle="label">
                监控状态
              </Text>
              <Text font="caption" foregroundStyle="secondaryLabel">
                实时数据监控
              </Text>
            </VStack>
            <Spacer />
            <HStack spacing={8}>
              <Image
                systemName={isAutoRefreshActive ? 'circle.fill' : 'circle'}
                foregroundStyle={isAutoRefreshActive ? 'systemGreen' : 'systemGray'}
                frame={{ width: 12, height: 12 }}
              />
              <Text font="body" fontWeight="medium" foregroundStyle={isAutoRefreshActive ? 'systemGreen' : 'systemGray'}>
                {isAutoRefreshActive ? '监控中' : '已停止'}
              </Text>
            </HStack>
          </HStack>
        </Section>

        {/* DSM 信息 */}
        {dsmInfo ? (
          <Section
            header={<Text font="headline">系统信息</Text>}
            footer={
              <Text font="footnote" foregroundStyle="secondaryLabel">
                显示群晖 NAS 的基本信息
              </Text>
            }
          >
            <VStack alignment="leading" spacing={8}>
              {/* 型号信息 */}
              <HStack alignment="center">
                <VStack alignment="leading" spacing={2}>
                  <Text font="body" foregroundStyle="label">
                    设备型号
                  </Text>
                  <Text font="caption" foregroundStyle="secondaryLabel">
                    群晖 NAS 型号
                  </Text>
                </VStack>
                <Spacer />
                <Text font="body" fontWeight="medium" foregroundStyle="label">
                  {dsmInfo.model}
                </Text>
              </HStack>

              {/* DSM 版本 */}
              <HStack alignment="center">
                <VStack alignment="leading" spacing={2}>
                  <Text font="body" foregroundStyle="label">
                    DSM 版本
                  </Text>
                  <Text font="caption" foregroundStyle="secondaryLabel">
                    系统版本信息
                  </Text>
                </VStack>
                <Spacer />
                <Text font="body" fontWeight="medium" foregroundStyle="label">
                  {dsmInfo.version_string}
                </Text>
              </HStack>

              {/* 运行时间 */}
              <HStack alignment="center">
                <VStack alignment="leading" spacing={2}>
                  <Text font="body" foregroundStyle="label">
                    运行时间
                  </Text>
                  <Text font="caption" foregroundStyle="secondaryLabel">
                    系统已运行时间
                  </Text>
                </VStack>
                <Spacer />
                <Text font="body" fontWeight="medium" foregroundStyle="systemGreen">
                  {formatUptime(dsmInfo.uptime)}
                </Text>
              </HStack>
            </VStack>
          </Section>
        ) : null}

        {/* 系统状态 */}
        {systemData ? (
          <Section
            header={<Text font="headline">性能监控</Text>}
            footer={
              <Text font="footnote" foregroundStyle="secondaryLabel">
                显示 CPU 和内存的实时使用情况
              </Text>
            }
          >
            <VStack alignment="leading" spacing={8}>
              {/* CPU 信息 */}
              <HStack alignment="center">
                <VStack alignment="leading" spacing={2}>
                  <Text font="body" foregroundStyle="label">
                    CPU 负载
                  </Text>
                  <Text font="caption" foregroundStyle="secondaryLabel">
                    1分钟平均负载
                  </Text>
                </VStack>
                <Spacer />
                <Text font="title2" fontWeight="semibold" foregroundStyle="systemBlue">
                  {formatPercentage(systemData.cpu['1min_load'])}
                </Text>
              </HStack>

              {/* 内存信息 */}
              <HStack alignment="center">
                <VStack alignment="leading" spacing={2}>
                  <Text font="body" foregroundStyle="label">
                    内存使用率
                  </Text>
                  <Text font="caption" foregroundStyle="secondaryLabel">
                    {formatStorageSize((systemData.memory.memory_size - systemData.memory.avail_real) * 1024 * 1024)} /{' '}
                    {formatStorageSize(systemData.memory.memory_size * 1024 * 1024)}
                  </Text>
                </VStack>
                <Spacer />
                <Text font="title2" fontWeight="semibold" foregroundStyle="systemOrange">
                  {formatPercentage(systemData.memory.real_usage)}
                </Text>
              </HStack>
            </VStack>
          </Section>
        ) : null}

        {/* 存储信息 */}
        {storageData ? (
          <Section
            header={<Text font="headline">存储状态</Text>}
            footer={
              <Text font="footnote" foregroundStyle="secondaryLabel">
                显示硬盘和存储空间的使用情况
              </Text>
            }
          >
            <VStack alignment="leading" spacing={12}>
              {/* 硬盘信息 */}
              {storageData.disks && storageData.disks.length > 0 ? (
                <VStack alignment="leading" spacing={6}>
                  <Text font="subheadline" fontWeight="semibold">
                    硬盘状态
                  </Text>
                  {storageData.disks.slice(0, 3).map((disk, index) => (
                    <HStack key={index} alignment="center">
                      <VStack alignment="leading" spacing={1}>
                        <Text font="body" foregroundStyle="label">
                          {disk.name} ({disk.model})
                        </Text>
                        <Text font="caption" foregroundStyle="secondaryLabel">
                          状态: {disk.status === 'normal' ? '正常' : disk.status}
                        </Text>
                      </VStack>
                      <Spacer />
                      <Text font="body" fontWeight="medium" foregroundStyle={disk.temp > 50 ? 'systemRed' : 'systemGreen'}>
                        {disk.temp}°C
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              ) : null}

              {/* 存储空间信息 */}
              {storageData.volumes && storageData.volumes.length > 0 ? (
                <VStack alignment="leading" spacing={6}>
                  <Text font="subheadline" fontWeight="semibold">
                    存储空间
                  </Text>
                  {storageData.volumes.slice(0, 2).map((volume, index) => {
                    const totalGB = parseInt(volume.size.total) / 1024 ** 3
                    const usedGB = parseInt(volume.size.used) / 1024 ** 3
                    const usagePercent = (usedGB / totalGB) * 100

                    return (
                      <HStack key={index} alignment="center">
                        <VStack alignment="leading" spacing={1}>
                          <Text font="body" foregroundStyle="label">
                            存储空间 {volume.id}
                          </Text>
                          <Text font="caption" foregroundStyle="secondaryLabel">
                            {usedGB.toFixed(1)} GB / {totalGB.toFixed(1)} GB
                          </Text>
                        </VStack>
                        <Spacer />
                        <Text
                          font="body"
                          fontWeight="medium"
                          foregroundStyle={usagePercent > 80 ? 'systemRed' : usagePercent > 60 ? 'systemOrange' : 'systemGreen'}
                        >
                          {usagePercent.toFixed(1)}%
                        </Text>
                      </HStack>
                    )
                  })}
                </VStack>
              ) : null}
            </VStack>
          </Section>
        ) : null}

        {/* 系统日志 */}
        {systemLog && systemLog.items && systemLog.items.length > 0 ? (
          <Section
            header={<Text font="headline">系统日志</Text>}
            footer={
              <Text font="footnote" foregroundStyle="secondaryLabel">
                显示最近 {systemLog.items.length} 条系统日志
              </Text>
            }
          >
            <VStack alignment="leading" spacing={6}>
              {systemLog.items.slice(0, 3).map((log, index) => (
                <VStack key={index} alignment="leading" spacing={2}>
                  <HStack alignment="center">
                    <Text font="caption" foregroundStyle="secondaryLabel">
                      {log.time}
                    </Text>
                    <Spacer />
                  </HStack>
                  <Text font="caption" foregroundStyle="label">
                    {log.descr.length > 80 ? log.descr.substring(0, 80) + '...' : log.descr}
                  </Text>
                </VStack>
              ))}
            </VStack>
          </Section>
        ) : null}

        {/* 操作区域 */}
        <Section
          header={<Text font="headline">操作</Text>}
          footer={
            <VStack spacing={10} alignment="leading">
              {bannerImagePath ? <Image filePath={bannerImagePath} resizable scaleToFit /> : null}
              <Text font="footnote" foregroundStyle="secondaryLabel">
                群晖小组件 v{pkg.version}
                {'\n'}
                显示 Synology NAS 硬件信息状态，支持实时监控 CPU、内存和存储使用情况
                {'\n'}
                ScriptPie© - 更多小组件请关注微信公众号「组件派」
              </Text>
            </VStack>
          }
        >
          <Button
            action={async () => {
              await refreshData()
              // 重启自动刷新
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
                  {isAutoRefreshActive ? '重新启动实时监控' : '开始实时监控数据'}
                </Text>
              </VStack>
              <Spacer />
              <Image systemName={isAutoRefreshActive ? 'arrow.clockwise' : 'play.circle'} foregroundStyle="systemBlue" frame={{ width: 16, height: 16 }} />
            </HStack>
          </Button>

          {isAutoRefreshActive ? (
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
                <Image systemName="stop.circle" foregroundStyle="systemRed" frame={{ width: 16, height: 16 }} />
              </HStack>
            </Button>
          ) : null}

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
              <Image systemName="eye" foregroundStyle="systemBlue" frame={{ width: 16, height: 16 }} />
            </HStack>
          </Button>

          <Button action={clearCache}>
            <HStack alignment="center">
              <VStack alignment="leading" spacing={2}>
                <Text font="body" foregroundStyle="label">
                  清理缓存
                </Text>
                <Text font="caption" foregroundStyle="secondaryLabel">
                  清除图片和数据缓存
                </Text>
              </VStack>
              <Spacer />
              <Image systemName="trash" foregroundStyle="systemRed" frame={{ width: 16, height: 16 }} />
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

// 执行主函数
main()
