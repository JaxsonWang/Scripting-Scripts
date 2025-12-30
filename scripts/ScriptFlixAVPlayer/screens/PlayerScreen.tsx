import {
  Button,
  HStack,
  Image,
  LazyVGrid,
  Navigation,
  RoundedRectangle,
  ScrollView,
  Spacer,
  Text,
  VStack,
  VideoPlayer,
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'scripting'
import { fetchVideoDetail } from '../services/api'
import { DanmuService } from '../services/danmu'
import { HistoryService } from '../services/history'
import { SettingsService } from '../services/settings'
import { DanmuOverlay } from '../components/danmu_overlay'
import { DanmuBindScreen } from './DanmuBindScreen'
import type { PlayEpisode, PlayGroup, PlayerScreenProps, VideoItem } from '../types'
import type { Color } from 'scripting'

// Move columns definition outside
const EPISODE_GRID_COLUMNS = [
  { size: { type: 'flexible' as const }, spacing: 8 },
  { size: { type: 'flexible' as const }, spacing: 8 },
  { size: { type: 'flexible' as const }, spacing: 8 },
  { size: { type: 'flexible' as const }, spacing: 8 }
]

const SourceButton = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <Button action={onPress}>
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

const EpisodeButton = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <Button action={onPress}>
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
  const player = useMemo(() => new AVPlayer(), [])
  const [danmuStatus, setDanmuStatus] = useState<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle')
  const [danmuMessage, setDanmuMessage] = useState<string | null>(null)
  const [danmuCount, setDanmuCount] = useState(0)
  const [danmuReloadVersion, setDanmuReloadVersion] = useState(0)
  const [danmuItems, setDanmuItems] = useState<Array<{ time: number; text: string; mode?: number; color?: Color }>>([])
  const [playerHasSource, setPlayerHasSource] = useState(false)

  const parseEpisodeNumber = (name: string | undefined, fallback: number) => {
    if (!name) return fallback
    const match = name.match(/(\d{1,4})/)
    if (match) {
      const n = Number(match[1])
      return Number.isFinite(n) ? n : fallback
    }
    return fallback
  }

  const buildDanmuQuery = (title: string, episodeName: string | undefined, episodeIndex: number) => {
    const ep = parseEpisodeNumber(episodeName, episodeIndex + 1)
    const likelyMovie = !episodeName || /正片|电影|全集|HD|1080|4K/i.test(episodeName)
    if (likelyMovie) {
      // 让 search/episodes 走 episode=movie 的分支，更容易拿到剧场版/电影弹幕
      return `${title} movie`
    }
    // match 接口的参数名是 fileName，服务端会从类似 S01E05 的命名中提取季/集信息
    return `${title}.S01E${String(ep).padStart(2, '0')}`
  }

  const buildBindingKey = (groupIndex: number, episodeIndex: number) => `${sourceUrl}|${id}|${groupIndex}|${episodeIndex}`

  const bindDanmu = useCallback((key: string, binding: { commentId: string; title: string; boundAt: number }) => {
    SettingsService.saveDanmuBinding(key, binding)
    setDanmuReloadVersion(v => v + 1)
  }, [])

  const openDanmuBinder = useCallback(
    (videoTitle: string, episodeName: string | undefined, defaultQuery: string, bindingKey: string) => {
      const config = DanmuService.applyDefaults(SettingsService.getDanmuConfig())
      if (!config.baseUrl.trim()) {
        void Dialog.alert({ title: '未配置弹幕服务', message: '请先在 设置 -> 弹幕 中填写 Base URL' })
        return
      }
      Navigation.present({
        element: (
          <DanmuBindScreen
            baseUrl={config.baseUrl}
            videoTitle={videoTitle}
            episodeName={episodeName}
            defaultQuery={defaultQuery}
            bindingKey={bindingKey}
            onBound={binding => {
              bindDanmu(bindingKey, binding)
            }}
          />
        )
      }).then(() => {
        // binder dismissed
      })
    },
    [bindDanmu]
  )

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
    if (!currentEpisode || !currentEpisode.url) {
      setPlayerHasSource(false)
      return
    }

    const config = DanmuService.applyDefaults(SettingsService.getDanmuConfig())
    const canUseDanmu = config.enabled && Boolean(config.baseUrl.trim())
    const episodeUrl = currentEpisode.url

    ;(async () => {
      try {
        // 永远使用原生 VideoPlayer 播放，只在 overlay 里渲染弹幕。
        player.onError = message => {
          console.error('[PlayerScreen] player error', message)
        }
        player.onReadyToPlay = () => {
          // 保持与之前行为一致：切换集数后自动播放
          player.play()
        }
        player.stop()
        const sourceOk = player.setSource(episodeUrl)
        setPlayerHasSource(sourceOk)
        if (!sourceOk) {
          setDanmuStatus('error')
          setDanmuMessage('播放器加载失败：无法设置视频源')
          setDanmuItems([])
          return
        }

        setDanmuCount(0)
        setDanmuMessage(null)

        if (!canUseDanmu) {
          setDanmuStatus('idle')
          return
        }

        setDanmuStatus('loading')

        const bindingKey = buildBindingKey(currentGroupIndex, currentEpisodeIndex)
        const bindings = SettingsService.getDanmuBindings()
        const bound = bindings[bindingKey]

        let commentId: string | null = bound?.commentId ? String(bound.commentId) : null
        if (!commentId && video) {
          const q1 = buildDanmuQuery(video.vod_name, currentEpisode.name, currentEpisodeIndex)
          const candidates = [q1, video.vod_name].filter((v, i, arr) => arr.indexOf(v) === i)
          for (const keyword of candidates) {
            const matches = await DanmuService.match(config.baseUrl, keyword)
            const first = matches[0]
            if (first?.commentId) {
              commentId = first.commentId
              break
            }
          }
        }

        if (!commentId) {
          setDanmuItems([])
          setDanmuStatus('empty')
          setDanmuMessage('未匹配到弹幕，可手动绑定')
          return
        }

        if (!/^\d+$/.test(commentId)) {
          setDanmuItems([])
          setDanmuStatus('empty')
          setDanmuMessage(`弹幕ID无效（必须为纯数字）：${commentId}`)
          return
        }

        let items: Awaited<ReturnType<typeof DanmuService.fetchComments>> = []
        try {
          items = await DanmuService.fetchComments(config.baseUrl, commentId)
        } catch (error) {
          const message = String(error)
          if (message.includes('comment failed: 404')) {
            // danmu_api: commentId 在服务端找不到对应 url（可能是缓存失效/ID不再可用/被清理）
            // 若这是手动绑定的结果，移除绑定让下次可重新匹配。
            SettingsService.removeDanmuBinding(bindingKey)

            setDanmuItems([])
            setDanmuCount(0)
            setDanmuStatus('empty')
            setDanmuMessage(`弹幕条目不存在（commentId=${commentId}），请重新手动绑定`)
            return
          }
          throw error
        }

        setDanmuCount(items.length)
        setDanmuItems(items.map(it => ({ ...it, color: it.color as Color | undefined })))

        if (items.length === 0) {
          setDanmuStatus('empty')
          setDanmuMessage('已匹配到条目，但弹幕为空')
        } else {
          setDanmuStatus('ready')
          setDanmuMessage(null)
        }
      } catch (error) {
        console.error('[PlayerScreen] danmu init failed', error)
        setDanmuStatus('error')
        setDanmuMessage(String(error))
        setDanmuItems([])
      }
    })()
  }, [currentEpisodeIndex, currentGroupIndex, danmuReloadVersion, playGroups, player, video])

  useEffect(() => {
    return () => {
      player.stop()
      player.dispose()
    }
  }, [player])

  if (loading || !video) {
    return (
      <VStack alignment="center" padding={50}>
        <Text foregroundStyle="gray">{loading ? '加载中...' : '未找到视频'}</Text>
      </VStack>
    )
  }

  const currentEpisode = playGroups[currentGroupIndex]?.episodes[currentEpisodeIndex]
  const bindingKey = buildBindingKey(currentGroupIndex, currentEpisodeIndex)
  const defaultDanmuQuery = buildDanmuQuery(video.vod_name, currentEpisode?.name, currentEpisodeIndex)

  return (
    <VStack navigationTitle={video.vod_name} spacing={0}>
      {/* Player Area - Sticky Top */}
      <VStack frame={{ height: 240 }} background="black">
        {currentEpisode ? (
          playerHasSource ? (
            <VideoPlayer
              player={player}
              overlay={
                danmuStatus === 'idle'
                  ? undefined
                  : (() => {
                      const config = DanmuService.applyDefaults(SettingsService.getDanmuConfig())
                      return <DanmuOverlay player={player} items={danmuItems} config={config} />
                    })()
              }
            />
          ) : (
            <VStack alignment="center">
              <Text foregroundStyle="white">视频加载中...</Text>
            </VStack>
          )
        ) : (
          <VStack alignment="center">
            <Text foregroundStyle="white">无可用播放源</Text>
          </VStack>
        )}
      </VStack>

      <ScrollView>
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
            <Button action={() => openDanmuBinder(video.vod_name, currentEpisode?.name, defaultDanmuQuery, bindingKey)}>
              <HStack alignment="center" spacing={6}>
                <Image systemName="message" imageScale="small" foregroundStyle={danmuStatus === 'ready' ? '#e50914' : 'secondaryLabel'} />
                <Text foregroundStyle={danmuStatus === 'ready' ? '#e50914' : 'secondaryLabel'}>弹幕</Text>
              </HStack>
            </Button>
            <Button action={dismiss}>
              <HStack alignment="center" spacing={6}>
                <Image systemName="chevron.backward" imageScale="small" foregroundStyle="#e50914" />
                <Text foregroundStyle="#e50914">返回</Text>
              </HStack>
            </Button>
          </HStack>
          {danmuMessage ? (
            <Text font="caption" foregroundStyle="secondaryLabel">
              {danmuMessage}
            </Text>
          ) : danmuStatus === 'ready' ? (
            <Text font="caption" foregroundStyle="secondaryLabel">
              已加载弹幕 {danmuCount} 条
            </Text>
          ) : null}

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
                {playGroups.map((g: PlayGroup, i: number) => (
                  <SourceButton
                    key={i}
                    label={g.name}
                    active={i === currentGroupIndex}
                    onPress={() => {
                      setCurrentGroupIndex(i)
                      setCurrentEpisodeIndex(0)
                    }}
                  />
                ))}
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

            <LazyVGrid columns={EPISODE_GRID_COLUMNS} spacing={8}>
              {playGroups[currentGroupIndex]?.episodes.map((ep: PlayEpisode, i: number) => (
                <EpisodeButton key={`${ep.name}-${i}`} label={ep.name} active={i === currentEpisodeIndex} onPress={() => setCurrentEpisodeIndex(i)} />
              ))}
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
      </ScrollView>
    </VStack>
  )
}
