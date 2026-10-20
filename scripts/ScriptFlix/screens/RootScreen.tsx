import { Tab, TabView, useObservable } from 'scripting'
import { HomeScreen } from './HomeScreen'
import { SearchScreen } from './SearchScreen'
import { HistoryScreen } from './HistoryScreen'
import { palette } from '../theme'

/** 只调整导航布局；各页仍使用 ScriptFlix 原有的数据和服务。 */
export const RootScreen = () => {
  const selection = useObservable(0)
  return (
    <TabView selection={selection} tint={palette.accent} preferredColorScheme="dark" toolbarBackground={palette.bg} toolbarColorScheme="dark">
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
