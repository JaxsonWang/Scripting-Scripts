import { Button, HStack, LazyVGrid, Navigation, NavigationStack, ScrollView, Spacer, Text, VStack, useMemo, useState } from 'scripting'
import { VideoCard } from '../components/VideoCard'
import { HistoryService } from '../services/history'
import { PlayerScreen } from './PlayerScreen'
import { FilterChip } from '../components/FilterChip'
import { ScreenBackground } from '../components/ScreenBackground'
import { EmptyView } from '../components/StateView'
import { FULL_SCREEN_FRAME, palette } from '../theme'
import { usePreferredColorScheme } from '../hooks/useThemeMode'
import type { HistoryEntry } from '../types'

const GRID_COLUMNS = [
  { size: { type: 'flexible' as const }, spacing: 12 },
  { size: { type: 'flexible' as const }, spacing: 12 },
  { size: { type: 'flexible' as const } }
]

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  try {
    return date.toLocaleString()
  } catch {
    return date.toISOString()
  }
}

export const HistoryScreen = ({ embedded = false }: { embedded?: boolean }) => {
  const dismiss = Navigation.useDismiss()
  const colorScheme = usePreferredColorScheme()
  const [history, setHistory] = useState<HistoryEntry[]>(() => HistoryService.getHistory())

  const refreshHistory = () => {
    setHistory(HistoryService.getHistory())
  }

  const sortedHistory = useMemo(() => [...history].sort((a, b) => b.watchedAt - a.watchedAt), [history])

  const handlePlay = (entry: HistoryEntry) => {
    Navigation.present({ element: <PlayerScreen id={entry.video.vod_id} sourceUrl={entry.sourceUrl} sourceName={entry.sourceName} /> }).then(() =>
      refreshHistory()
    )
  }

  const handleClear = () => {
    HistoryService.clearHistory()
    refreshHistory()
  }

  const content = (
    <VStack spacing={14} alignment="leading" frame={FULL_SCREEN_FRAME} background={<ScreenBackground />} onAppear={refreshHistory}>
      <HStack alignment="center" padding={{ horizontal: 16, top: 8 }}>
        <Text font="title" bold foregroundStyle={palette.textPrimary}>
          {embedded ? '片库' : '观看历史'}
        </Text>
        <Spacer />
        {!embedded && <Button title="关闭" action={dismiss} foregroundStyle={palette.textSecondary} />}
        <Button title="清空" role="destructive" foregroundStyle={palette.accent} disabled={history.length === 0} action={handleClear} />
      </HStack>
      <HStack padding={{ horizontal: 16 }}>
        <FilterChip label="观看历史" active count={history.length} onTap={refreshHistory} />
      </HStack>
      {history.length === 0 ? (
        <EmptyView icon="clock.arrow.circlepath" title="还没有观看记录" message="去发现页挑一部开始观看吧" />
      ) : (
        <ScrollView scrollIndicator="hidden">
          <LazyVGrid columns={GRID_COLUMNS} spacing={18} padding={{ horizontal: 16, top: 4, bottom: 24 }}>
            {sortedHistory.map(entry => (
              <VStack key={`${entry.sourceUrl}-${entry.video.vod_id}`} spacing={6} alignment="leading">
                <VideoCard video={entry.video} onTap={() => handlePlay(entry)} />
                <Text font="caption2" foregroundStyle={palette.textTertiary} lineLimit={1}>
                  {entry.sourceName || '未知来源'}
                </Text>
                <Text font="caption2" foregroundStyle={palette.textTertiary} lineLimit={1}>
                  {formatTime(entry.watchedAt)}
                </Text>
              </VStack>
            ))}
          </LazyVGrid>
        </ScrollView>
      )}
    </VStack>
  )
  return embedded ? (
    content
  ) : (
    <NavigationStack preferredColorScheme={colorScheme} tint={palette.accent}>
      {content}
    </NavigationStack>
  )
}
