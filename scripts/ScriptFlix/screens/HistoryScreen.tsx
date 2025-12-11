import { Button, HStack, LazyVGrid, Navigation, NavigationStack, ScrollView, Section, Spacer, Text, VStack, useMemo, useState } from 'scripting'
import { VideoCard } from '../components/VideoCard'
import { HistoryService } from '../services/history'
import { PlayerScreen } from './PlayerScreen'
import type { HistoryEntry } from '../types'

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  try {
    return date.toLocaleString()
  } catch {
    return date.toISOString()
  }
}

export const HistoryScreen = () => {
  const dismiss = Navigation.useDismiss()
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

  return (
    <NavigationStack>
      <ScrollView
        navigationTitle="观看历史"
        toolbar={{
          cancellationAction: <Button title="关闭" action={dismiss} />,
          primaryAction: <Button title="清空" role="destructive" foregroundStyle="systemRed" disabled={history.length === 0} action={handleClear} />
        }}
        scrollIndicator="hidden"
      >
        <VStack spacing={16} padding={16}>
          <Section
            header={
              <HStack>
                <Text font="headline" bold>
                  共 {history.length} 条记录
                </Text>
              </HStack>
            }
          >
            {history.length === 0 ? (
              <VStack padding={24} alignment="center">
                <Text font="subheadline" foregroundStyle="secondaryLabel">
                  暂无观看记录
                </Text>
              </VStack>
            ) : (
              <LazyVGrid
                columns={[{ size: { type: 'flexible' }, spacing: 12 }, { size: { type: 'flexible' }, spacing: 12 }, { size: { type: 'flexible' } }]}
                spacing={18}
              >
                {sortedHistory.map(entry => (
                  <VStack key={`${entry.sourceUrl}-${entry.video.vod_id}`} spacing={6}>
                    <VideoCard video={entry.video} onTap={() => handlePlay(entry)} />
                    <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={1}>
                      {entry.sourceName || '未知来源'}
                    </Text>
                    <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={1}>
                      {formatTime(entry.watchedAt)}
                    </Text>
                  </VStack>
                ))}
              </LazyVGrid>
            )}
          </Section>
        </VStack>
      </ScrollView>
    </NavigationStack>
  )
}
