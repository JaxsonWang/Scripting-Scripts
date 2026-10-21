import { Navigation, Tab, TabView, useEffect, useObservable } from 'scripting'
import { HomeScreen } from './HomeScreen'
import { SearchScreen } from './SearchScreen'
import { HistoryScreen } from './HistoryScreen'
import { PlayerScreen } from './PlayerScreen'
import { usePreferredColorScheme } from '../hooks/useThemeMode'
import { palette } from '../theme'
import type { LaunchTarget } from '../types'

/**
 * 只调整导航布局；各页仍使用 ScriptFlix 原有的数据和服务。
 * @param launch 从小组件点开的作品
 */
export const RootScreen = ({ launch }: { launch: LaunchTarget | null }) => {
  const selection = useObservable(0)
  const colorScheme = usePreferredColorScheme()

  // 播放页叠在首页之上呈现（与首页点开作品一致），关闭后自然回到首页
  useEffect(() => {
    if (launch) {
      Navigation.present({ element: <PlayerScreen {...launch} /> })
    }
  }, [])

  // 全屏呈现的根页面不会响应 preferredColorScheme，需用 environments 覆盖子树外观，日间 / 夜间才能即时生效
  return (
    <TabView
      selection={selection}
      tint={palette.accent}
      preferredColorScheme={colorScheme}
      environments={{ colorScheme }}
      toolbarBackground={palette.bg}
      toolbarColorScheme={colorScheme}
    >
      <Tab title="发现" systemImage="sparkles.tv" value={0}>
        <HomeScreen />
      </Tab>
      <Tab title="搜索" systemImage="magnifyingglass" value={1}>
        <SearchScreen embedded />
      </Tab>
      <Tab title="片库" systemImage="square.stack.fill" value={2}>
        <HistoryScreen embedded />
      </Tab>
    </TabView>
  )
}
