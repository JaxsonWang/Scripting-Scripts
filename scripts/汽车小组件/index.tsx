import { Button, HStack, Image, List, Navigation, NavigationStack, Script, Section, Spacer, Text, VStack, Widget } from 'scripting'
import { useEffect, useState } from 'scripting'
import { fetch } from 'scripting'
import { GlobalSettingsPage, getCurrentGlobalSettings } from './components/global-settings-page'
import { SmallWidgetSettingsPage, getCurrentSmallWidgetSettings } from './components/small-widget-settings-page'
import { MediumWidgetSettingsPage, getCurrentMediumWidgetSettings } from './components/medium-widget-settings-page'
import { LargeWidgetSettingsPage, getCurrentLargeWidgetSettings } from './components/large-widget-settings-page'
import pkg from './script.json'
import { getChangelog, getCurrentVersion, getLocalVersionInfo, markUpdateLogDismissed, shouldShowUpdateLog } from './utils/car-service'

/**
 * 获取远程横幅图片URL
 */
const fetchBannerImage = async (): Promise<string | null> => {
  try {
    const response = await fetch('https://joiner.i95.me/scripting/joiner.json')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = (await response.json()) as any
    return data.bannerImage || null
  } catch (error) {
    console.error('获取横幅图片失败:', error)
    return null
  }
}

/**
 * 主页面组件
 */
const MainPage = () => {
  const dismiss = Navigation.useDismiss()
  const [globalSettings, setGlobalSettings] = useState(getCurrentGlobalSettings())
  const [smallSettings, setSmallSettings] = useState(getCurrentSmallWidgetSettings())
  const [mediumSettings, setMediumSettings] = useState(getCurrentMediumWidgetSettings())
  const [largeSettings, setLargeSettings] = useState(getCurrentLargeWidgetSettings())
  const [versionInfo, setVersionInfo] = useState<any>(null)
  const [hasCheckedUpdate, setHasCheckedUpdate] = useState(false)
  const [showChangelogSheet, setShowChangelogSheet] = useState(false)
  const [changelogContent, setChangelogContent] = useState<string>('')
  const [updateTitle, setUpdateTitle] = useState<string>('')
  const [bannerImageUrl, setBannerImageUrl] = useState<string>('')

  // 加载 Banner 图片
  const loadBannerImage = async () => {
    try {
      const bannerUrl = await fetchBannerImage()
      if (bannerUrl) {
        setBannerImageUrl(bannerUrl)
        // console.log('获取到的横幅图片:', bannerUrl)
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
        setShowChangelogSheet(true)
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
  const showChangelogAlert = () => {
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

  // 刷新数据
  const refreshData = async () => {
    setGlobalSettings(getCurrentGlobalSettings())
    setSmallSettings(getCurrentSmallWidgetSettings())
    setMediumSettings(getCurrentMediumWidgetSettings())
    setLargeSettings(getCurrentLargeWidgetSettings())
    await loadBannerImage()
    Widget.reloadAll()
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

  // 组件挂载时加载数据
  useEffect(() => {
    const initializeApp = async () => {
      await loadBannerImage()

      // 延迟检查更新，确保组件已完全渲染
      setTimeout(() => {
        checkAndShowUpdateAlert()
      }, 1000)
    }

    initializeApp()
  }, [])

  return (
    <NavigationStack>
      <List
        navigationTitle="汽车小组件"
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          cancellationAction: <Button title="完成" action={dismiss} />
        }}
      >
        {/* 设置分类 */}
        <Section
          header={<Text font="headline">设置</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              点击进入对应的设置页面进行个性化配置
            </Text>
          }
        >
          {/* 全局设置 */}
          <Button
            action={async () => {
              await Navigation.present({
                element: <GlobalSettingsPage />,
                modalPresentationStyle: 'pageSheet'
              })
              await refreshData()
            }}
          >
            <HStack alignment="center">
              <VStack alignment="leading" spacing={2}>
                <Text font="body" foregroundStyle="label">
                  全局设置
                </Text>
              </VStack>
              <Spacer />
              <Image systemName="chevron.right" foregroundStyle="systemBlue" frame={{ width: 16, height: 16 }} />
            </HStack>
          </Button>

          {/* 小号组件设置 */}
          <Button
            action={async () => {
              await Navigation.present({
                element: <SmallWidgetSettingsPage />,
                modalPresentationStyle: 'pageSheet'
              })
              await refreshData()
            }}
          >
            <HStack alignment="center">
              <VStack alignment="leading" spacing={2}>
                <Text font="body" foregroundStyle="label">
                  小号组件设置
                </Text>
              </VStack>
              <Spacer />
              <Image systemName="chevron.right" foregroundStyle="systemBlue" frame={{ width: 16, height: 16 }} />
            </HStack>
          </Button>

          {/* 中号组件设置 */}
          <Button
            action={async () => {
              await Navigation.present({
                element: <MediumWidgetSettingsPage />,
                modalPresentationStyle: 'pageSheet'
              })
              await refreshData()
            }}
          >
            <HStack alignment="center">
              <VStack alignment="leading" spacing={2}>
                <Text font="body" foregroundStyle="label">
                  中号组件设置
                </Text>
              </VStack>
              <Spacer />
              <Image systemName="chevron.right" foregroundStyle="systemBlue" frame={{ width: 16, height: 16 }} />
            </HStack>
          </Button>

          {/* 大号组件设置 */}
          <Button
            action={async () => {
              await Navigation.present({
                element: <LargeWidgetSettingsPage />,
                modalPresentationStyle: 'pageSheet'
              })
              await refreshData()
            }}
          >
            <HStack alignment="center">
              <VStack alignment="leading" spacing={2}>
                <Text font="body" foregroundStyle="label">
                  大号组件设置
                </Text>
              </VStack>
              <Spacer />
              <Image systemName="chevron.right" foregroundStyle="systemBlue" frame={{ width: 16, height: 16 }} />
            </HStack>
          </Button>
        </Section>

        {/* 操作区域 */}
        <Section
          header={<Text font="headline">操作</Text>}
          footer={
            <VStack spacing={10} alignment="leading">
              {bannerImageUrl ? <Image imageUrl={bannerImageUrl} resizable scaleToFit /> : null}
              <Text font="footnote" foregroundStyle="secondaryLabel">
                汽车小组件 v{pkg.version}
                {'\n'}
                显示车辆信息的静态小组件，支持自定义车辆图片、状态文本和透明背景
                {'\n'}
                ScriptPie© - 更多小组件请关注微信公众号「组件派」
              </Text>
            </VStack>
          }
        >
          <Button action={previewWidget}>
            <HStack alignment="center">
              <VStack alignment="leading" spacing={2}>
                <Text font="body" foregroundStyle="label">
                  预览组件
                </Text>
                <Text font="caption" foregroundStyle="secondaryLabel">
                  查看组件效果
                </Text>
              </VStack>
              <Spacer />
              <Image systemName="chevron.right" foregroundStyle="systemBlue" frame={{ width: 16, height: 16 }} />
            </HStack>
          </Button>

          <Button action={refreshData}>
            <HStack alignment="center">
              <VStack alignment="leading" spacing={2}>
                <Text font="body" foregroundStyle="label">
                  刷新数据
                </Text>
              </VStack>
              <Spacer />
              <Image systemName="chevron.right" foregroundStyle="systemBlue" frame={{ width: 16, height: 16 }} />
            </HStack>
          </Button>

          <Button
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
          >
            <HStack alignment="center">
              <VStack alignment="leading" spacing={2}>
                <Text font="body" foregroundStyle="label">
                  更新日志
                </Text>
                <Text font="caption" foregroundStyle="secondaryLabel">
                  查看更新内容
                </Text>
              </VStack>
              <Spacer />
              <Image systemName="chevron.right" foregroundStyle="systemBlue" frame={{ width: 16, height: 16 }} />
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
  try {
    await Navigation.present({
      element: <MainPage />
    })
  } catch (error) {
    console.error('应用启动失败:', error)
  } finally {
    Script.exit()
  }
}

// 执行主函数
main()
