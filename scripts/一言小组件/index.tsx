import { Button, HStack, Image, List, Navigation, NavigationStack, Script, Section, Spacer, Text, VStack, Widget } from 'scripting'
import { useEffect, useState } from 'scripting'
import type { HitokotoData } from './utils/hitokoto-service'
import {
  fetchBannerImage,
  fetchHitokoto,
  getChangelog,
  getCurrentApiConfig,
  getCurrentVersion,
  getLocalVersionInfo,
  getTypeName,
  markUpdateLogDismissed,
  shouldShowUpdateLog
} from './utils/hitokoto-service'
import { SettingsPage } from './components/settings-page'

/**
 * 一言详情页面
 */
const HitokotoDetail = () => {
  const dismiss = Navigation.useDismiss()
  const [hitokotoData, setHitokotoData] = useState<HitokotoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentApiConfig, setCurrentApiConfig] = useState(() => getCurrentApiConfig())
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
      const data = await fetchHitokoto()
      setHitokotoData(data)
      // 更新当前API配置显示
      setCurrentApiConfig(getCurrentApiConfig())
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 刷新数据和设置
  const refreshData = async () => {
    await loadData()
    Widget.reloadAll()
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

  if (loading || !hitokotoData) {
    return (
      <NavigationStack>
        <List navigationTitle="一言">
          <Section>
            <Text font="body" foregroundStyle="secondaryLabel">
              正在加载一言...
            </Text>
          </Section>
        </List>
      </NavigationStack>
    )
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="一言"
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
        {/* 当前API配置显示 */}
        <Section header={<Text font="headline">一言小组件</Text>}>
          <HStack alignment="center">
            <Text font="body" foregroundStyle="label">
              当前接口
            </Text>
            <Spacer />
            <Text foregroundStyle="label">{currentApiConfig.name}</Text>
          </HStack>
        </Section>

        {/* 一言内容 */}
        <Section header={<Text font="headline">今日一言</Text>}>
          <VStack spacing={12} padding={16} alignment="center">
            <Spacer />
            <Text
              font="title2"
              fontWeight="medium"
              foregroundStyle="label"
              frame={{
                maxWidth: 'infinity',
                alignment: 'center'
              }}
            >
              {hitokotoData.hitokoto}
            </Text>
            <Spacer />
            <HStack spacing={2} alignment="center">
              <Text font="caption" foregroundStyle="tertiaryLabel">
                {hitokotoData.from}
              </Text>
              {hitokotoData.from_who ? (
                <>
                  <Text font="caption" foregroundStyle="tertiaryLabel">
                    •
                  </Text>
                  <Text font="caption" foregroundStyle="tertiaryLabel">
                    {hitokotoData.from_who}
                  </Text>
                </>
              ) : null}
            </HStack>
          </VStack>
        </Section>

        {/* 详细信息 */}
        <Section header={<Text font="headline">详细信息</Text>}>
          <HStack alignment="center">
            <Text font="body" foregroundStyle="label">
              类型
            </Text>
            <Spacer />
            <Text foregroundStyle="secondaryLabel">{getTypeName(hitokotoData.type)}</Text>
          </HStack>

          <HStack alignment="center">
            <Text font="body" foregroundStyle="label">
              来源
            </Text>
            <Spacer />
            <Text foregroundStyle="secondaryLabel">{hitokotoData.from}</Text>
          </HStack>

          {hitokotoData.from_who ? (
            <HStack alignment="center">
              <Text font="body" foregroundStyle="label">
                作者
              </Text>
              <Spacer />
              <Text foregroundStyle="secondaryLabel">{hitokotoData.from_who}</Text>
            </HStack>
          ) : null}

          <HStack alignment="center">
            <Text font="body" foregroundStyle="label">
              字数
            </Text>
            <Spacer />
            <Text foregroundStyle="secondaryLabel">{hitokotoData.length} 字</Text>
          </HStack>

          <HStack alignment="center">
            <Text font="body" foregroundStyle="label">
              ID
            </Text>
            <Spacer />
            <Text foregroundStyle="secondaryLabel">{hitokotoData.id}</Text>
          </HStack>
        </Section>

        {/* 操作按钮 */}
        <Section
          footer={
            <VStack spacing={10} alignment="leading">
              {bannerImageUrl ? <Image imageUrl={bannerImageUrl} resizable scaleToFit /> : null}
              <Text font="footnote" foregroundStyle="secondaryLabel">
                一言小组件 v{getCurrentVersion()}
                {'\n'}
                在桌面显示每日一言
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
          <Button title="刷新数据" action={refreshData} />
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
    element: <HitokotoDetail />,
    modalPresentationStyle: 'pageSheet'
  })
  Script.exit()
}

run()
