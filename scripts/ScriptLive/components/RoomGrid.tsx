import { Button, LazyVGrid, ProgressView, Text, VStack } from 'scripting'
import type { GridItem, VirtualNode } from 'scripting'
import type { LiveRoomItem } from '../core/types'
import type { Paged } from '../hooks/usePaged'
import { palette } from '../theme'
import { RoomCard } from './RoomCard'
import { EmptyView, LoadingView } from './StateView'

const COLUMNS: GridItem[] = [{ size: { type: 'flexible' }, spacing: 12 }, { size: { type: 'flexible' } }]

export const roomKey = (room: LiveRoomItem) => room.roomId

/**
 * 列表底部：加载中 / 失败重试 / 没有更多。
 * key 随条数变化，追加后重新挂载，内容不足一屏时也能继续触发 onAppear 加载下一页。
 */
export function PagedFooter<T>({ paged }: { paged: Paged<T> }) {
  if (paged.error && paged.items.length) {
    return (
      <Button action={paged.loadMore} buttonStyle="plain">
        <Text font="footnote" foregroundStyle={palette.accent} padding={16} frame={{ maxWidth: 'infinity' }}>
          加载失败，点按重试
        </Text>
      </Button>
    )
  }
  if (paged.hasMore) {
    return (
      <VStack key={`more-${paged.items.length}`} padding={16} frame={{ maxWidth: 'infinity' }} onAppear={paged.loadMore}>
        <ProgressView progressViewStyle="circular" />
      </VStack>
    )
  }
  return paged.items.length ? (
    <Text font="caption" foregroundStyle={palette.textTertiary} padding={16} frame={{ maxWidth: 'infinity' }}>
      没有更多了
    </Text>
  ) : null
}

type RoomGridProps = {
  paged: Paged<LiveRoomItem>
  onTap: (room: LiveRoomItem) => void
  emptyTitle?: string
  /** 有内容时显示在网格上方，如首页头图与栏目标题 */
  lead?: VirtualNode
  /** 网格跳过前几项（已在 lead 中展示） */
  skip?: number
}

/** 双列直播间网格，处理首屏加载、错误、空态与翻页 */
export const RoomGrid = ({ paged, onTap, emptyTitle = '暂时没有直播间', lead, skip = 0 }: RoomGridProps) => {
  if (paged.loading && !paged.items.length) return <LoadingView />
  if (paged.error && !paged.items.length) {
    return <EmptyView icon="wifi.exclamationmark" title="加载失败" message={paged.error} actionTitle="重试" onAction={paged.reload} />
  }
  if (!paged.items.length) return <EmptyView title={emptyTitle} />
  return (
    <VStack spacing={16} alignment="leading" padding={{ top: 4, bottom: 16 }}>
      {lead}
      <LazyVGrid columns={COLUMNS} spacing={18} padding={{ horizontal: 16 }}>
        {paged.items.slice(skip).map(room => (
          <RoomCard key={room.roomId} room={room} onTap={onTap} />
        ))}
      </LazyVGrid>
      <PagedFooter paged={paged} />
    </VStack>
  )
}
