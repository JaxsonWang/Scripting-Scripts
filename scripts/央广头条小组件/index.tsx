import { Button, HStack, Image, Link, List, Navigation, NavigationStack, Script, Section, Spacer, Text, VStack, Widget } from 'scripting'
import { useEffect, useState } from 'scripting'
import type { NewsData } from './utils/news-service'
import {
  fetchBannerImage,
  fetchCNRNews,
  getChangelog,
  getCurrentVersion,
  getLocalVersionInfo,
  markUpdateLogDismissed,
  shouldShowUpdateLog
} from './utils/news-service'
import { SettingsPage } from './components/settings-page'

/**
 * 央广头条详情页面
 */
const CNRNewsDetail = () => {
  const dismiss = Navigation.useDismiss()
  const [newsData, setNewsData] = useState<NewsData | null>(null)
  const [loading, setLoading] = useState(true)
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
      const data = await fetchCNRNews()
      setNewsData(data)
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
      // console.log('获取到的本地版本信息:', info)
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

  // 初始加载
  useEffect(() => {
    const initializeApp = async () => {
      await loadData()
      loadVersionInfo()
      await loadBannerImage() // 加载横幅图片

      // 延迟检查更新，确保组件已完全渲染
      setTimeout(() => {
        checkAndShowUpdateAlert()
      }, 1000)
    }
    initializeApp()
  }, [])

  if (loading || !newsData) {
    return (
      <NavigationStack>
        <List navigationTitle="央广头条">
          <Section>
            <Text font="body" foregroundStyle="secondaryLabel">
              正在加载新闻...
            </Text>
          </Section>
        </List>
      </NavigationStack>
    )
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="央广头条"
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
        {/* 新闻来源显示 */}
        <Section header={<Text font="headline">央广头条小组件</Text>}>
          <HStack alignment="center">
            <Text font="body" foregroundStyle="label">
              新闻来源
            </Text>
            <Spacer />
            <Text foregroundStyle="label">{newsData.source}</Text>
          </HStack>
          <HStack alignment="center">
            <Text font="body" foregroundStyle="label">
              最后更新
            </Text>
            <Spacer />
            <Text foregroundStyle="secondaryLabel">{newsData.lastUpdated}</Text>
          </HStack>
        </Section>

        {/* 头条新闻列表 */}
        <Section header={<Text font="headline">今日头条</Text>}>
          {newsData.items.slice(0, 8).map((item, index) => (
            <Link key={index} url={item.url}>
              <VStack spacing={8} padding={{ horizontal: 12, vertical: 0 }} alignment="leading">
                <Text
                  font="body"
                  fontWeight="medium"
                  foregroundStyle="label"
                  frame={{
                    maxWidth: 'infinity',
                    alignment: 'leading'
                  }}
                  lineLimit={3}
                >
                  {item.title}
                </Text>
                {item.time ? (
                  <Text font="caption2" foregroundStyle="tertiaryLabel">
                    {item.time}
                  </Text>
                ) : null}
              </VStack>
            </Link>
          ))}
        </Section>

        {/* 操作按钮 */}
        <Section
          footer={
            <VStack spacing={10} alignment="leading">
              {bannerImageUrl ? <Image imageUrl={bannerImageUrl} resizable scaleToFit /> : null}
              <Text font="footnote" foregroundStyle="secondaryLabel">
                央广头条小组件 v{getCurrentVersion()}
                {'\n'}
                在桌面随时了解央广最新头条新闻
                {'\n'}
                数据来源：央广 (www.cnr.cn)
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
    element: <CNRNewsDetail />,
    modalPresentationStyle: 'pageSheet'
  })
  Script.exit()
}

run()
