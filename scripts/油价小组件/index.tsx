import { Button, HStack, Image, List, Navigation, NavigationStack, Script, Section, Spacer, Text, VStack, Widget, useEffect, useState } from 'scripting'
import type { CompleteOilData } from './utils/oil-price-service'
import {
  areaOptions,
  fetchBannerImage,
  formatForecastPrice,
  getChangelog,
  getCompleteOilData,
  getCurrentAreaSettings,
  getCurrentVersion,
  getLocalVersionInfo,
  markUpdateLogDismissed,
  shouldShowUpdateLog
} from './utils/oil-price-service'
import { SettingsPage } from './components/settings-page'

/**
 * 油价详情页面
 */
const GasPriceDetail = () => {
  const dismiss = Navigation.useDismiss()
  const [oilData, setOilData] = useState<CompleteOilData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentArea, setCurrentArea] = useState(() => {
    const settings = getCurrentAreaSettings()
    return settings.areaType
  })
  const [versionInfo, setVersionInfo] = useState<any>(null)
  const [hasCheckedUpdate, setHasCheckedUpdate] = useState(false)
  const [showChangelogSheet, setShowChangelogSheet] = useState(false)
  const [changelogContent, setChangelogContent] = useState<string>('')
  const [updateTitle, setUpdateTitle] = useState<string>('')
  const [bannerImageUrl, setBannerImageUrl] = useState<string>('')

  // 加载数据
  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getCompleteOilData()
      setOilData(data)
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 刷新当前地区设置和数据
  const refreshData = async () => {
    const settings = getCurrentAreaSettings()
    setCurrentArea(settings.areaType)
    await loadData()
  }

  // 加载版本信息
  const loadVersionInfo = () => {
    try {
      const info = getLocalVersionInfo()
      console.log('获取到的本地版本信息:', info)
      setVersionInfo(info)
    } catch (error) {
      console.error('加载版本信息失败:', error)
    }
  }

  // 加载横幅图片
  const loadBannerImage = async () => {
    try {
      const bannerUrl = await fetchBannerImage()
      if (bannerUrl) {
        setBannerImageUrl(bannerUrl)
        console.log('获取到的横幅图片:', bannerUrl)
      }
    } catch (error) {
      console.error('加载横幅图片失败:', error)
    }
  }

  // 检查并显示更新提醒
  const checkAndShowUpdateAlert = async () => {
    try {
      if (hasCheckedUpdate) return

      const shouldShow = await shouldShowUpdateLog()
      console.log('是否需要显示更新提醒:', shouldShow)

      if (shouldShow) {
        // 获取本地更新内容
        const changelog = getChangelog()
        const currentVersion = getCurrentVersion()

        let changelogText = '暂无更新内容'
        if (Array.isArray(changelog) && changelog.length > 0) {
          changelogText = changelog.map((item: string, index: number) => `${index + 1}. ${item}`).join('\n')
        }

        setChangelogContent(changelogText)
        setUpdateTitle(`脚本更新 - ${currentVersion}`)
        setShowChangelogSheet(true) // 使用 changelog sheet 来显示更新提醒
      }

      setHasCheckedUpdate(true)
    } catch (error) {
      console.error('检查更新失败:', error)
      setHasCheckedUpdate(true)
    }
  }

  // 处理更新提醒确认
  const handleUpdateDismiss = () => {
    markUpdateLogDismissed()
    setShowChangelogSheet(false)
  }

  // 显示更新日志
  const showChangelogAlert = async () => {
    try {
      // 优先使用已加载的版本信息
      let targetVersionInfo = versionInfo

      // 如果没有版本信息，获取本地信息
      if (!targetVersionInfo) {
        console.log('本地没有版本信息，获取本地信息')
        targetVersionInfo = getLocalVersionInfo()
      }

      if (!targetVersionInfo || !targetVersionInfo.changelog || !targetVersionInfo.changelog.length) {
        setChangelogContent('暂无更新日志信息')
        setUpdateTitle('更新日志')
        setShowChangelogSheet(true)
        return
      }

      console.log('准备显示更新日志:', targetVersionInfo.changelog)

      // 格式化更新日志内容
      const changelogText = targetVersionInfo.changelog.map((item: string, index: number) => `${index + 1}. ${item}`).join('\n')

      setChangelogContent(changelogText || '暂无更新日志')
      setUpdateTitle(`更新日志 - ${targetVersionInfo.version || '未知版本'}`)
      setShowChangelogSheet(true)
    } catch (error) {
      console.error('显示更新日志失败:', error)
      setChangelogContent('获取更新日志失败')
      setUpdateTitle('错误')
      setShowChangelogSheet(true)
    }
  }

  // 初始加载
  useEffect(() => {
    const initializeApp = async () => {
      await loadData()
      loadVersionInfo() // 现在是同步函数，不需要 await
      await loadBannerImage() // 加载横幅图片

      // 延迟检查更新，确保组件已完全渲染
      setTimeout(() => {
        checkAndShowUpdateAlert()
      }, 1000)
    }
    initializeApp()
  }, [])

  if (loading || !oilData) {
    return (
      <NavigationStack>
        <List navigationTitle="油价详情">
          <Section>
            <Text font="body" foregroundStyle="secondaryLabel">
              正在加载数据...
            </Text>
          </Section>
        </List>
      </NavigationStack>
    )
  }

  const getTrendText = (direction: string) => {
    switch (direction) {
      case 'rising':
        return '上涨'
      case 'falling':
        return '下跌'
      case 'stranded':
        return '搁浅'
      default:
        return '未知'
    }
  }

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'rising':
        return 'systemRed'
      case 'falling':
        return 'systemGreen'
      case 'stranded':
        return 'systemGray'
      default:
        return 'systemGray'
    }
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="油价详情"
        navigationBarTitleDisplayMode="large"
        toolbar={{
          cancellationAction: <Button title="完成" action={dismiss} />,
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
        {/* 当前地区显示 */}
        <Section header={<Text font="headline">油价小组件</Text>}>
          <HStack alignment="center">
            <Text font="body" foregroundStyle="label">
              当前地区
            </Text>
            <Spacer />
            <Text foregroundStyle="label">{areaOptions.find(a => a.value === currentArea)?.label || '未知地区'}</Text>
          </HStack>
        </Section>

        <Section
          header={<Text font="headline">{oilData.region}油价</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              更新时间：{oilData.lastUpdated}
            </Text>
          }
        >
          <HStack alignment="center">
            <Text font="body" foregroundStyle="label">
              92#汽油
            </Text>
            <Spacer />
            <Text font="title3" foregroundStyle="label">
              {oilData.oil92}
            </Text>
          </HStack>

          <HStack alignment="center">
            <Text font="body" foregroundStyle="label">
              95#汽油
            </Text>
            <Spacer />
            <Text font="title3" foregroundStyle="label">
              {oilData.oil95}
            </Text>
          </HStack>

          <HStack alignment="center">
            <Text font="body" foregroundStyle="label">
              98#汽油
            </Text>
            <Spacer />
            <Text font="title3" foregroundStyle="label">
              {oilData.oil98}
            </Text>
          </HStack>

          <HStack alignment="center">
            <Text font="body" foregroundStyle="label">
              0#柴油
            </Text>
            <Spacer />
            <Text font="title3" foregroundStyle="label">
              {oilData.oil0}
            </Text>
          </HStack>
        </Section>

        {/* 预测信息 */}
        <Section
          header={<Text font="headline">价格预测</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              数据仅供参考，实际价格以加油站为准
            </Text>
          }
        >
          <HStack alignment="center">
            <VStack alignment="leading" spacing={4}>
              <Text font="body" foregroundStyle="label">
                预测日期
              </Text>
              <Text font="caption" foregroundStyle="secondaryLabel">
                {oilData.forecastDate}
              </Text>
            </VStack>
            <Spacer />
            <VStack alignment="trailing" spacing={4}>
              <Text font="title3" foregroundStyle={getTrendColor(oilData.priceDirection)}>
                {getTrendText(oilData.priceDirection)}
              </Text>
              <Text font="caption" foregroundStyle="secondaryLabel">
                {formatForecastPrice(oilData.forecastPrice)}
              </Text>
            </VStack>
          </HStack>
        </Section>

        {/* 操作按钮 */}
        <Section
          footer={
            <VStack spacing={10} alignment="leading">
              {bannerImageUrl ? <Image imageUrl={bannerImageUrl} resizable scaleToFit /> : null}
              <Text font="footnote" foregroundStyle="secondaryLabel">
                油价小组件 v{getCurrentVersion()}
                {'\n'}
                显示当前中国油价、预测油价信息
                {'\n'}
                淮城一只猫© - 更多小组件请关注微信公众号「组件派」
              </Text>
            </VStack>
          }
        >
          <Button
            title="更新日志"
            action={showChangelogAlert}
            sheet={{
              isPresented: showChangelogSheet,
              onChanged: setShowChangelogSheet,
              content: (
                <VStack presentationDragIndicator="visible" presentationDetents={['medium', 'large']} spacing={20} padding={20}>
                  <Text font="title2" foregroundStyle="label">
                    {updateTitle}
                  </Text>
                  <Text font="body" foregroundStyle="label" padding={10}>
                    {changelogContent}
                  </Text>
                  {updateTitle.includes('脚本更新') ? (
                    <Button title="我已知晓" action={handleUpdateDismiss} />
                  ) : (
                    <Button title="确定" action={() => setShowChangelogSheet(false)} />
                  )}
                </VStack>
              )
            }}
          />
          <Button
            title="刷新数据"
            action={async () => {
              await loadData()
            }}
          />
        </Section>
      </List>
    </NavigationStack>
  )
}

/**
 * 主函数
 */
const run = async (): Promise<void> => {
  await Navigation.present({
    element: <GasPriceDetail />,
    modalPresentationStyle: 'pageSheet'
  })
  Script.exit()
}

run()
