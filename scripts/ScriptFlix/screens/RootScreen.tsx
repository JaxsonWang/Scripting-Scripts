import { Label, Navigation, Tab, TabView, VStack, useEffect, useObservable } from 'scripting'
import { HomeScreen } from './HomeScreen'
import { SearchScreen } from './SearchScreen'
import { HistoryScreen } from './HistoryScreen'
import { PlayerScreen } from './PlayerScreen'
import { usePreferredColorScheme } from '../hooks/useThemeMode'
import { FULL_SCREEN_FRAME, palette } from '../theme'
import type { LaunchTarget } from '../types'

// Tab 仅支持 iOS 18+；iOS 17 使用 TabView 的 tabItem 与 tag。
const SUPPORTS_TAB = Number.parseInt(Device.systemVersion, 10) >= 18

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

  const tabs = [
    { title: '发现', systemImage: 'sparkles.tv', content: <HomeScreen /> },
    { title: '搜索', systemImage: 'magnifyingglass', content: <SearchScreen embedded /> },
    { title: '片库', systemImage: 'square.stack.fill', content: <HistoryScreen embedded /> }
  ]

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
      {tabs.map(({ title, systemImage, content }, index) =>
        SUPPORTS_TAB ? (
          <Tab key={index} title={title} systemImage={systemImage} value={index}>
            {content}
          </Tab>
        ) : (
          <VStack key={index} spacing={0} frame={FULL_SCREEN_FRAME} tag={index} tabItem={<Label title={title} systemImage={systemImage} />}>
            {content}
          </VStack>
        )
      )}
    </TabView>
  )
}
