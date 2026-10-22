import { Tab, TabView, useEffect, useObservable } from 'scripting'
import { useThemeScheme } from '../hooks/useThemeScheme'
import { refreshLiveStates, scheduleAutoRefresh } from '../services/follows'
import { settingsStore } from '../services/settings'
import { palette } from '../theme'
import { CategoryScreen } from './CategoryScreen'
import { FollowScreen } from './FollowScreen'
import { HomeScreen } from './HomeScreen'
import { MineScreen } from './MineScreen'

/** 四个标签页：首页推荐、分类、关注、我的 */
export const RootScreen = () => {
  const selection = useObservable(0)
  const colorScheme = useThemeScheme()

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
      <Tab title="首页" systemImage="play.tv" value={0}>
        <HomeScreen />
      </Tab>
      <Tab title="分类" systemImage="square.grid.2x2" value={1}>
        <CategoryScreen />
      </Tab>
      <Tab title="关注" systemImage="heart.text.square" value={2}>
        <FollowScreen />
      </Tab>
      <Tab title="我的" systemImage="person.crop.circle" value={3}>
        <MineScreen />
      </Tab>
    </TabView>
  )
}
