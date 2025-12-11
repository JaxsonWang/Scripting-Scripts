import { Button, HStack, LazyVGrid, Navigation, RoundedRectangle, ScrollView, Spacer, Text, VStack, WebView, useEffect, useState } from 'scripting'
import { fetchVideoDetail } from '../services/api'
import { HistoryService } from '../services/history'
import type { PlayEpisode, PlayGroup, PlayerScreenProps, VideoItem } from '../types'

/**
 * 播放页，按分组/剧集解析播放链接，并内嵌 WebView 播放
 * @param id 视频 ID
 * @param sourceUrl CMS 接口地址
 */
export const PlayerScreen = ({ id, sourceUrl, sourceName }: PlayerScreenProps) => {
  const dismiss = Navigation.useDismiss()
  const [video, setVideo] = useState<VideoItem | null>(null)
  const [playGroups, setPlayGroups] = useState<PlayGroup[]>([])
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0)
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [controller] = useState(new WebViewController())

  useEffect(() => {
    fetchVideoDetail(sourceUrl, id)
      .then(res => {
        if (res.list && res.list.length > 0) {
          const v = res.list[0]
          setVideo(v)
          HistoryService.addHistory(v, sourceUrl, sourceName)
          const froms = v.vod_play_from.split('$$$')
          const urls = v.vod_play_url.split('$$$')
          const groups = froms
            .map((from: string, index: number): PlayGroup => {
              const urlGroup = urls[index] || ''
              const episodes = urlGroup
                .split('#')
                .map((ep: string): PlayEpisode => {
                  const parts = ep.split('$')
                  const name = parts.length > 1 ? parts[0] : '正片'
                  const url = parts.length > 1 ? parts[1] : parts[0]
                  return { name, url }
                })
                .filter((ep: PlayEpisode) => ep.url && (ep.url.includes('.m3u8') || ep.url.includes('.mp4')))
              return { name: from, episodes }
            })
            .filter((g: PlayGroup) => g.episodes.length > 0)
          setPlayGroups(groups)
        }
      })
      .catch(e => console.error(e))
      .finally(() => setLoading(false))
  }, [id, sourceUrl, sourceName])

  useEffect(() => {
    const currentEpisode = playGroups[currentGroupIndex]?.episodes[currentEpisodeIndex]
    if (currentEpisode && currentEpisode.url) {
      controller.loadURL(currentEpisode.url)
    }
  }, [controller, currentGroupIndex, currentEpisodeIndex, playGroups])

  if (loading || !video) {
    return (
      <VStack alignment="center" padding={50}>
        <Text foregroundStyle="gray">{loading ? '加载中...' : '未找到视频'}</Text>
      </VStack>
    )
  }

  const currentEpisode = playGroups[currentGroupIndex]?.episodes[currentEpisodeIndex]

  const renderSourceButton = (key: string | number, label: string, active: boolean, onPress: () => void) => (
    <Button key={key} action={onPress}>
      <Text
        font="subheadline"
        foregroundStyle={active ? 'white' : 'label'}
        padding={{ horizontal: 12, vertical: 6 }}
        background={<RoundedRectangle cornerRadius={8} style="continuous" fill={active ? '#e50914' : 'secondarySystemBackground'} />}
      >
        {label}
      </Text>
    </Button>
  )

  const renderEpisodeButton = (key: string | number, label: string, active: boolean, onPress: () => void) => (
    <Button key={key} action={onPress}>
      <Text
        font="caption"
        foregroundStyle={active ? 'white' : 'label'}
        padding={8}
        background={<RoundedRectangle cornerRadius={6} style="continuous" fill={active ? '#e50914' : 'secondarySystemBackground'} />}
      >
        {label}
      </Text>
    </Button>
  )

  return (
    <ScrollView navigationTitle={video.vod_name}>
      <VStack spacing={0}>
        {/* Player Area - Sticky Top */}
        <VStack frame={{ height: 240 }} background="black">
          {currentEpisode ? (
            <WebView controller={controller} />
          ) : (
            <VStack alignment="center">
              <Text foregroundStyle="white">无可用播放源</Text>
            </VStack>
          )}
        </VStack>

        {/* Info Section */}
        <VStack padding={16} spacing={20}>
          <HStack alignment="center">
            <VStack alignment="leading" spacing={4}>
              <Text font="title2" bold>
                {video.vod_name}
              </Text>
              <Text font="subheadline" foregroundStyle="secondaryLabel">
                {video.vod_sub || video.vod_en}
              </Text>
            </VStack>
            <Spacer />
            <Button title="返回" systemImage="chevron.backward" foregroundStyle="#e50914" action={dismiss} />
          </HStack>

          <ScrollView axes="horizontal" scrollIndicator="hidden">
            <HStack spacing={8}>
              {[video.vod_year, video.vod_area, video.type_name, video.vod_remarks]
                .filter(value => !!value)
                .map((value, index) => (
                  <Text
                    key={`${value}-${index}`}
                    font="caption"
                    foregroundStyle="secondaryLabel"
                    padding={{ horizontal: 8, vertical: 4 }}
                    background={<RoundedRectangle cornerRadius={10} style="continuous" fill="secondarySystemBackground" />}
                  >
                    {value}
                  </Text>
                ))}
            </HStack>
          </ScrollView>

          {/* Source Selector */}
          <VStack alignment="leading" spacing={8}>
            <Text font="headline">播放源</Text>
            <ScrollView axes="horizontal" scrollIndicator="hidden">
              <HStack spacing={8}>
                {playGroups.map((g: PlayGroup, i: number) =>
                  renderSourceButton(i, g.name, i === currentGroupIndex, () => {
                    setCurrentGroupIndex(i)
                    setCurrentEpisodeIndex(0)
                  })
                )}
              </HStack>
            </ScrollView>
          </VStack>

          {/* Episode List */}
          <VStack alignment="leading" spacing={8}>
            <HStack alignment="center">
              <Text font="headline">选集</Text>
              <Spacer />
              <Text font="subheadline" foregroundStyle="secondaryLabel">
                {playGroups[currentGroupIndex]?.episodes.length} 集
              </Text>
            </HStack>

            {/* Using Grid for episodes for better touch targets */}
            <LazyVGrid
              columns={[
                { size: { type: 'flexible' }, spacing: 8 },
                { size: { type: 'flexible' }, spacing: 8 },
                { size: { type: 'flexible' }, spacing: 8 },
                { size: { type: 'flexible' }, spacing: 8 }
              ]}
              spacing={8}
            >
              {playGroups[currentGroupIndex]?.episodes.map((ep: PlayEpisode, i: number) =>
                renderEpisodeButton(`${ep.name}-${i}`, ep.name, i === currentEpisodeIndex, () => setCurrentEpisodeIndex(i))
              )}
            </LazyVGrid>
          </VStack>

          {/* Description */}
          <VStack alignment="leading" frame={{ maxWidth: 'infinity', alignment: 'leading' }} spacing={8}>
            <Text font="headline">简介</Text>
            <Text foregroundStyle="secondaryLabel" font="body" lineSpacing={4}>
              {video.vod_content.replace(/<[^>]+>/g, '').trim() || '暂无简介'}
            </Text>
          </VStack>
        </VStack>
      </VStack>
    </ScrollView>
  )
}
