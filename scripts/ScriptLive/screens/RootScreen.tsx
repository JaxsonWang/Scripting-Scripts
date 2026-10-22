import { Label, Tab, TabView, VStack, useEffect, useObservable } from 'scripting'
import { useThemeScheme } from '../hooks/useThemeScheme'
import { refreshLiveStates, scheduleAutoRefresh } from '../services/follows'
import { settingsStore } from '../services/settings'
import { FULL_FRAME, palette } from '../theme'
import type { RoomTarget } from '../types'
import { CategoryScreen } from './CategoryScreen'
import { FollowScreen } from './FollowScreen'
import { HomeScreen } from './HomeScreen'
import { MineScreen } from './MineScreen'
import { openRoom } from './open-room'

// Tab 仅支持 iOS 18+；iOS 17 使用 TabView 的 tabItem 与 tag。
const SUPPORTS_TAB = Number.parseInt(Device.systemVersion, 10) >= 18

/**
 * 四个标签页：首页推荐、分类、关注、我的
 * @param launch 从桌面小组件点开的直播间
 */
export const RootScreen = ({ launch }: { launch: RoomTarget | null }) => {
  const selection = useObservable(0)
  const colorScheme = useThemeScheme()

  // 直播间叠在首页之上全屏打开（与首页点开一致），关闭后回到首页
  useEffect(() => {
    if (launch) openRoom(launch)
  }, [])

  const tabs = [
    { title: '首页', systemImage: 'play.tv', content: <HomeScreen /> },
    { title: '分类', systemImage: 'square.grid.2x2', content: <CategoryScreen /> },
    { title: '关注', systemImage: 'heart.text.square', content: <FollowScreen /> },
    { title: '我的', systemImage: 'person.crop.circle', content: <MineScreen /> }
  ]

  // 启动时刷新一次关注状态，并按设置开启定时刷新；设置变化后重新调度
  useEffect(() => {
    refreshLiveStates()
    scheduleAutoRefresh()
    let last = settingsStore.get()
    return settingsStore.subscribe(next => {
      if (next.followAutoRefresh !== last.followAutoRefresh || next.followRefreshMinutes !== last.followRefreshMinutes) scheduleAutoRefresh()
      last = next
    })
  }, [])

  // 全屏呈现的根页面不会响应 preferredColorScheme，需用 environments 覆盖子树外观
  return (
    <TabView
      selection={selection}
      tint={palette.accent}
      preferredColorScheme={colorScheme}
      environments={{ colorScheme }}
      toolbarBackground={palette.bg}
      toolbarColorScheme={colorScheme}
    >
      {tabs.map(({ title, systemImage, content }, index) =>
        SUPPORTS_TAB ? (
          <Tab key={index} title={title} systemImage={systemImage} value={index}>
            {content}
          </Tab>
        ) : (
          <VStack key={index} spacing={0} frame={FULL_FRAME} tag={index} tabItem={<Label title={title} systemImage={systemImage} />}>
            {content}
          </VStack>
        )
      )}
    </TabView>
  )
}
