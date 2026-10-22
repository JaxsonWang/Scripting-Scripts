import { Button, HStack, Image, List, Rectangle, Section, Spacer, Text, VStack } from 'scripting'
import type { HistoryItem } from '../types'
import { SiteBadge } from '../components/Chips'
import { Avatar } from '../components/RoomCard'
import { ScreenBackground } from '../components/ScreenBackground'
import { EmptyView } from '../components/StateView'
import { useStore } from '../hooks/useStore'
import { clearHistory, historyStore, removeHistory } from '../services/history'
import { palette } from '../theme'
import { formatRelative, parseDateTime } from '../utils/format'
import { openRoom } from './open-room'

const rowBackground = <Rectangle fill={palette.card} />

const confirmRemove = async (item: HistoryItem) => {
  const confirmed = await Dialog.confirm({
    title: '删除记录',
    message: `确定删除「${item.userName || item.roomId}」的观看记录吗？`,
    confirmLabel: '删除',
    cancelLabel: '取消'
  })
  if (confirmed) removeHistory(item.id)
}

const HistoryRow = ({ item }: { item: HistoryItem }) => (
  <Button
    buttonStyle="plain"
    action={() => void openRoom({ siteId: item.siteId, roomId: item.roomId })}
    onLongPressGesture={() => void confirmRemove(item)}
    trailingSwipeActions={{ allowsFullSwipe: false, actions: [<Button title="删除" role="destructive" action={() => void confirmRemove(item)} />] }}
  >
    <HStack alignment="center" spacing={12} padding={{ vertical: 5 }} contentShape="rect">
      <Avatar url={item.face} size={46} />
      <VStack alignment="leading" spacing={5}>
        <Text font="body" bold lineLimit={1} foregroundStyle={palette.textPrimary}>
          {item.userName || item.roomId}
        </Text>
        <HStack alignment="center" spacing={8}>
          <SiteBadge siteId={item.siteId} />
          <Text font="caption" foregroundStyle={palette.textTertiary}>
            {formatRelative(parseDateTime(item.updateTime)) || '时间未知'}
          </Text>
        </HStack>
      </VStack>
      <Spacer />
      <Image systemName="chevron.right" font={13} foregroundStyle={palette.textTertiary} />
    </HStack>
  </Button>
)

/** 观看记录列表；点击重新进入直播间，左滑或长按删除记录。 */
export const HistoryScreen = () => {
  const history = useStore(historyStore)

  const handleClear = async () => {
    if (history.length === 0) return
    const confirmed = await Dialog.confirm({ title: '清空观看记录', message: '清空后无法恢复，确定继续吗？', confirmLabel: '清空', cancelLabel: '取消' })
    if (confirmed) clearHistory()
  }

  return (
    <List
      foregroundStyle={palette.textPrimary}
      background={<ScreenBackground />}
      scrollContentBackground="hidden"
      navigationTitle="观看记录"
      navigationBarTitleDisplayMode="inline"
      toolbar={{ topBarTrailing: <Button title="清空" role="destructive" disabled={history.length === 0} action={() => void handleClear()} /> }}
    >
      {history.length === 0 ? (
        <Section listRowBackground={rowBackground}>
          <EmptyView icon="clock.arrow.circlepath" title="还没有观看记录" message="去发现页挑一场直播开始观看吧" />
        </Section>
      ) : (
        <Section header={<Text>最近观看</Text>} listRowBackground={rowBackground}>
          {history.map(item => (
            <HistoryRow key={item.id} item={item} />
          ))}
        </Section>
      )}
    </List>
  )
}
