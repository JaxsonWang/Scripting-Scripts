import { Button, HStack, Image, List, Navigation, NavigationStack, Script, Section, Spacer, Text, VStack, Widget, useEffect, useState } from 'scripting'
import {
  type VersionInfo,
  fetchBannerImage,
  formatEventTime,
  getCalendarData,
  getChangelog,
  getCurrentVersion,
  getLocalVersionInfo,
  markUpdateLogDismissed,
  shouldShowUpdateLog
} from './utils/calendar-service'
import { getDaysLeftInYear, solarToLunar } from './utils/lunar-calendar'
import { SettingsPage, getCurrentSettings } from './components/settings-page'
import { getActualColor } from './components/settings-page'
import type { CalendarData } from './utils/calendar-service'
import type { LunarData } from './utils/lunar-calendar'
import type { SettingsData } from './components/settings-page'

/**
 * 挂历详情页面
 */
const CalendarDetail = () => {
  const dismiss = Navigation.useDismiss()
  const [loading, setLoading] = useState(true)
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null)
  const [lunarData, setLunarData] = useState<LunarData | null>(null)
  const [daysLeft, setDaysLeft] = useState(0)
  const [settings, setSettings] = useState<SettingsData>(() => getCurrentSettings())

  // 版本管理相关状态
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null)
  const [hasCheckedUpdate, setHasCheckedUpdate] = useState(false)
  const [showChangelogSheet, setShowChangelogSheet] = useState(false)
  const [changelogContent, setChangelogContent] = useState<string>('')
  const [updateTitle, setUpdateTitle] = useState<string>('')
  const [bannerImageUrl, setBannerImageUrl] = useState<string>('')

  // 加载数据
  const loadData = async () => {
    setLoading(true)
    try {
      const currentSettings = getCurrentSettings()
      setSettings(currentSettings)

      const now = new Date()
      const calendar = await getCalendarData()

      setCalendarData(calendar)
      setLunarData(solarToLunar(now))
      setDaysLeft(getDaysLeftInYear(now))
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

  if (loading) {
    return (
      <NavigationStack>
        <List navigationTitle="挂历小组件">
          <Section>
            <Text font="body" foregroundStyle="secondaryLabel">
              正在加载数据...
            </Text>
          </Section>
        </List>
      </NavigationStack>
    )
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="挂历小组件"
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
        {/* 当前日期信息 */}
        <Section header={<Text font="headline">今日信息</Text>}>
          <VStack spacing={15}>
            <HStack spacing={10}>
              <Image systemName="calendar.badge.clock" font="title" foregroundStyle={getActualColor(settings)} />
              <VStack alignment="leading" spacing={2}>
                <Text font="title2" fontWeight="bold" foregroundStyle="label">
                  {calendarData?.currentDate.toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                  }) || ''}
                </Text>
                {lunarData ? (
                  <Text font="body" foregroundStyle={getActualColor(settings)}>
                    {lunarData.formatted}
                  </Text>
                ) : null}
              </VStack>
              <Spacer />
            </HStack>

            <HStack padding={{ leading: 45 }}>
              <Text font="body" foregroundStyle="secondaryLabel">
                今年还剩
              </Text>
              <Text font="title3" fontWeight="bold" foregroundStyle="systemOrange">
                {daysLeft}
              </Text>
              <Text font="body" foregroundStyle="secondaryLabel">
                天
              </Text>
              <Spacer />
            </HStack>
          </VStack>
        </Section>

        {/* 宜忌信息 */}
        {lunarData ? (
          <Section header={<Text font="headline">今日宜忌</Text>}>
            <VStack spacing={8} alignment="leading">
              <HStack alignment="center">
                <Text font="body" foregroundStyle="systemGreen">
                  宜
                </Text>
                <Text font="body" foregroundStyle="label">
                  {lunarData.yi.join('、')}
                </Text>
              </HStack>
              <HStack alignment="center">
                <Text font="body" foregroundStyle="systemRed">
                  忌
                </Text>
                <Text font="body" foregroundStyle="label">
                  {lunarData.ji.join('、')}
                </Text>
              </HStack>
            </VStack>
          </Section>
        ) : null}

        {/* 即将到来的事件 */}
        {calendarData?.upcomingEvents && calendarData.upcomingEvents.length > 0 ? (
          <Section header={<Text font="headline">即将到来的事件</Text>}>
            {calendarData.upcomingEvents.map(event => (
              <VStack key={event.id} alignment="leading" spacing={4}>
                <Text font="body" fontWeight="medium" foregroundStyle="label">
                  {event.title}
                </Text>
                <HStack spacing={8} alignment="center">
                  <Text font="caption" foregroundStyle="systemBlue">
                    {formatEventTime(event)}
                  </Text>
                  {event.location ? (
                    <>
                      <Text font="caption" foregroundStyle="tertiaryLabel">
                        •
                      </Text>
                      <Text font="caption" foregroundStyle="tertiaryLabel">
                        📍 {event.location}
                      </Text>
                    </>
                  ) : null}
                </HStack>
                <Text font="caption2" foregroundStyle="tertiaryLabel">
                  来自 {event.calendar.title}
                </Text>
              </VStack>
            ))}
          </Section>
        ) : null}

        {/* 操作按钮 */}
        <Section
          footer={
            <VStack spacing={10} alignment="leading">
              {bannerImageUrl ? <Image imageUrl={bannerImageUrl} resizable scaleToFit /> : null}
              <Text font="footnote" foregroundStyle="secondaryLabel">
                挂历小组件 v{getCurrentVersion()}
                {'\n'}
                显示日历、农历、宜忌和事件信息
                {'\n'}
                淮城一只猫© - 更多小组件请关注微信公众号「组件派」
              </Text>
            </VStack>
          }
        >
          <Button
            title="更新日志"
            action={async () => {
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
            }}
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
    element: <CalendarDetail />,
    modalPresentationStyle: 'pageSheet'
  })
  Script.exit()
}

run()
