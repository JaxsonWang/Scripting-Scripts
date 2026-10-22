import {
  AVPlayerView,
  Button,
  EnvironmentValuesReader,
  HStack,
  LazyVGrid,
  Navigation,
  NavigationStack,
  Script,
  ScrollView,
  Spacer,
  Text,
  VStack,
  WebView,
  ZStack,
  useEffect,
  useObservable,
  useState
} from 'scripting'
import type { PIPStatus } from 'scripting'
import { fetchVideoDetail } from '../services/api'
import { HistoryService } from '../services/history'
import { createDiagnosticLogger, describeDiagnosticUrl, redactDiagnosticError } from '../utils/diagnostics'
import { LandscapeControls } from '../components/LandscapeControls'
import { ScreenBackground } from '../components/ScreenBackground'
import { EmptyView, LoadingView } from '../components/StateView'
import { FULL_SCREEN_FRAME, brandGradient, palette, radius } from '../theme'
import { usePlayerOrientation } from '../hooks/usePlayerOrientation'
import { usePreferredColorScheme } from '../hooks/useThemeMode'
import type { PlayEpisode, PlayGroup, PlayerScreenProps, VideoItem } from '../types'

type Playback = { kind: 'native'; player: AVPlayer } | { kind: 'web'; controller: WebViewController }

/** 竖屏播放器高度 */
const PORTRAIT_PLAYER_HEIGHT = 240

/** 横屏铺满整屏；竖屏用空边集合，修饰符始终存在，只改取值 */
const fullBleed = (landscape: boolean) => ({ edges: landscape ? ('all' as const) : [] })

/** 横竖屏布局切换的动画，与系统转屏同时进行 */
const ROTATE_ANIMATION = Animation.smooth({ duration: 0.3 })

// 固定列定义，避免每次渲染重新创建
const EPISODE_GRID_COLUMNS = [
  { size: { type: 'flexible' as const }, spacing: 8 },
  { size: { type: 'flexible' as const }, spacing: 8 },
  { size: { type: 'flexible' as const }, spacing: 8 },
  { size: { type: 'flexible' as const }, spacing: 8 }
]

const SourceButton = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <Button action={onPress} buttonStyle="plain">
    <Text
      font="subheadline"
      bold={active}
      foregroundStyle={active ? '#FFFFFF' : palette.textSecondary}
      padding={{ horizontal: 16, vertical: 9 }}
      background={active ? brandGradient : palette.card}
      clipShape="capsule"
    >
      {label}
    </Text>
  </Button>
)

const EpisodeButton = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <Button action={onPress} buttonStyle="plain">
    <Text
      font="caption"
      bold={active}
      lineLimit={1}
      foregroundStyle={active ? '#FFFFFF' : palette.textSecondary}
      frame={{ maxWidth: 'infinity' }}
      padding={{ vertical: 12, horizontal: 6 }}
      background={active ? brandGradient : palette.card}
      clipShape={{ type: 'rect', cornerRadius: radius.sm, style: 'continuous' }}
    >
      {label}
    </Text>
  </Button>
)

/**
 * 播放页共用分组和剧集逻辑，Pro 使用原生播放器，其他用户沿用 WebView。
 * @param id 视频 ID
 * @param sourceUrl CMS 接口地址
 */
export const PlayerScreen = ({ id, sourceUrl, sourceName }: PlayerScreenProps) => {
  const dismiss = Navigation.useDismiss()
  const colorScheme = usePreferredColorScheme()
  const [video, setVideo] = useState<VideoItem | null>(null)
  const [playGroups, setPlayGroups] = useState<PlayGroup[]>([])
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0)
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [playback] = useState<Playback>(() =>
    Script.hasFullAccess() ? { kind: 'native', player: new AVPlayer() } : { kind: 'web', controller: new WebViewController() }
  )
  const [log] = useState(() => createDiagnosticLogger('playback'))
  const pipStatus = useObservable<PIPStatus>(null)
  const [playError, setPlayError] = useState<string | null>(null)
  const [hasNativeSource, setHasNativeSource] = useState(false)
  // 横屏只服务原生播放器；WebView 播放器保持原有竖屏布局
  const orientation = usePlayerOrientation(playback.kind === 'native')

  useEffect(() => {
    log('open', { backend: playback.kind, source: describeDiagnosticUrl(sourceUrl) })
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
          log('detail.parsed', { groupCount: groups.length, episodeCount: groups.reduce((count, group) => count + group.episodes.length, 0) })
          setPlayGroups(groups)
        }
      })
      .catch(error => log('detail.error', { error: redactDiagnosticError(error) }))
      .finally(() => setLoading(false))
  }, [id, sourceUrl, sourceName])

  useEffect(() => {
    const currentEpisode = playGroups[currentGroupIndex]?.episodes[currentEpisodeIndex]
    if (!currentEpisode?.url) return

    setPlayError(null)
    let cancelled = false
    log('source.selected', {
      backend: playback.kind,
      groupIndex: currentGroupIndex,
      episodeIndex: currentEpisodeIndex,
      media: describeDiagnosticUrl(currentEpisode.url),
      hasWhitespace: /\s/.test(currentEpisode.url)
    })

    if (playback.kind === 'native') {
      const { player } = playback
      const loadNativeSource = async () => {
        log('audio.category.start')
        await SharedAudioSession.setCategory('playback', ['mixWithOthers'])
        log('audio.category.ok')
        if (cancelled) return
        log('audio.activate.start')
        await SharedAudioSession.setActive(true)
        log('audio.activate.ok')
        if (cancelled) return
        player.onReadyToPlay = () => {
          if (cancelled) return
          log('native.ready', { status: player.timeControlStatus, duration: player.duration })
          const started = player.play()
          log('native.play.result', { started, status: player.timeControlStatus, rate: player.rate })
          if (!started) setPlayError('无法开始原生播放，请切换播放源或剧集')
        }
        player.onError = message => {
          log('native.error', {
            error: redactDiagnosticError(message),
            status: player.timeControlStatus,
            duration: player.duration,
            currentTime: player.currentTime
          })
          if (!cancelled) setPlayError(`原生播放失败：${redactDiagnosticError(message)} 请切换播放源或剧集`)
        }
        player.onTimeControlStatusChanged = status => {
          if (!cancelled) log('native.status', { status, currentTime: player.currentTime, duration: player.duration, rate: player.rate })
        }
        log('native.setSource.start', { media: describeDiagnosticUrl(currentEpisode.url), headersProvided: false })
        const accepted = player.setSource(currentEpisode.url)
        log('native.setSource.result', { accepted, status: player.timeControlStatus })
        // setSource 后底层播放器才可供原生视图绑定，不能先挂载空播放器。
        setHasNativeSource(accepted)
        if (!accepted) setPlayError('播放链接加载失败，请切换播放源或剧集')
      }
      loadNativeSource().catch(error => {
        log('native.init.error', { error: redactDiagnosticError(error) })
        if (!cancelled) setPlayError('原生播放器初始化失败，请重新打开播放页')
      })

      return () => {
        cancelled = true
        player.onReadyToPlay = undefined
        player.onError = undefined
        player.onTimeControlStatusChanged = undefined
        log('native.pause', { groupIndex: currentGroupIndex, episodeIndex: currentEpisodeIndex })
        player.pause()
      }
    }

    // 非 Pro 继续使用原来的 WebView 加载方式。
    playback.controller
      .loadURL(currentEpisode.url)
      .then(loaded => {
        log('web.load.result', { loaded })
        if (!cancelled && !loaded) setPlayError('播放链接加载失败，请切换播放源或剧集')
      })
      .catch(error => {
        log('web.error', { error: redactDiagnosticError(error) })
        if (!cancelled) setPlayError('播放链接加载失败，请切换播放源或剧集')
      })
    return () => {
      cancelled = true
    }
  }, [playback, currentGroupIndex, currentEpisodeIndex, playGroups])

  useEffect(
    () => () => {
      log('dispose', { backend: playback.kind })
      if (playback.kind === 'native') playback.player.dispose()
      else playback.controller.dispose()
    },
    [playback]
  )

  if (loading || !video) {
    return (
      <NavigationStack preferredColorScheme={colorScheme} tint={palette.accent}>
        <VStack frame={FULL_SCREEN_FRAME} background={<ScreenBackground />} toolbar={{ cancellationAction: <Button title="返回" action={dismiss} /> }}>
          {loading ? <LoadingView /> : <EmptyView title="未找到视频" />}
        </VStack>
      </NavigationStack>
    )
  }

  const currentEpisode = playGroups[currentGroupIndex]?.episodes[currentEpisodeIndex]

  /**
   * 播放器：竖屏固定高度、使用系统播放控件；横屏为影院模式——黑底铺满整屏，系统控件关闭，换成 LandscapeControls，
   * 退出横屏按钮与暂停、快进快退、进度、静音一起显示和收起。
   * 横竖屏只改修饰符的取值，AVPlayerView 不会重建、播放不中断；横屏控件是它的兄弟视图，按需挂载。
   */
  const renderPlayer = (landscape: boolean) => (
    <ZStack
      frame={{
        maxWidth: 'infinity',
        minHeight: landscape ? 0 : PORTRAIT_PLAYER_HEIGHT,
        maxHeight: landscape ? 'infinity' : PORTRAIT_PLAYER_HEIGHT
      }}
    >
      <VStack
        frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}
        background="black"
        ignoresSafeArea={fullBleed(landscape)}
        onAppear={() => log('player.container.appear')}
      >
        {currentEpisode ? (
          playback.kind === 'native' ? (
            hasNativeSource ? (
              <AVPlayerView
                player={playback.player}
                frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}
                onAppear={() => log('native.view.appear')}
                showsPlaybackControls={!landscape}
                pipStatus={pipStatus}
                // 播放器随页面关闭而释放，不启用跨页面持有播放器的画中画。
                allowsPictureInPicturePlayback={false}
                updatesNowPlayingInfoCenter
                exitsFullScreenWhenPlaybackEnds
              />
            ) : (
              !playError && <LoadingView />
            )
          ) : (
            <WebView controller={playback.controller} />
          )
        ) : (
          <VStack alignment="center">
            <Text foregroundStyle="white">无可用播放源</Text>
          </VStack>
        )}
      </VStack>
      {landscape && playback.kind === 'native' && hasNativeSource && <LandscapeControls player={playback.player} onExit={orientation.exitLandscape} />}
    </ZStack>
  )

  return (
    <EnvironmentValuesReader keys={['verticalSizeClass']}>
      {({ verticalSizeClass }) => {
        // 按钮锁定方向时立即采用目标布局；随手机旋转时以尺寸类为准（iPhone 横屏为 compact）。
        // 横屏隐藏导航栏、状态栏和下方详情，播放器铺满全屏
        const landscape = orientation.canRotate && (orientation.locked ? orientation.locked === 'landscape' : verticalSizeClass === 'compact')
        return (
          <NavigationStack
            preferredColorScheme={colorScheme}
            tint={palette.accent}
            statusBarHidden={landscape}
            persistentSystemOverlays={landscape ? 'hidden' : 'automatic'}
          >
            <VStack
              spacing={0}
              frame={FULL_SCREEN_FRAME}
              navigationTitle={video.vod_name}
              navigationBarTitleDisplayMode="inline"
              background={<ScreenBackground />}
              animation={{ animation: ROTATE_ANIMATION, value: landscape }}
              toolbarVisibility={{ visibility: landscape ? 'hidden' : 'automatic', bars: ['navigationBar'] }}
              toolbarBackground={palette.bg}
              toolbarColorScheme={colorScheme}
              toolbar={{
                cancellationAction: <Button title="返回" action={dismiss} />,
                topBarTrailing:
                  orientation.canRotate && hasNativeSource ? (
                    <Button title="横屏播放" systemImage="arrow.up.left.and.arrow.down.right" action={orientation.enterLandscape} />
                  ) : undefined
              }}
            >
              {renderPlayer(landscape)}

              {/* 横屏时收起而不卸载：转回竖屏只需展开，滚动位置都在 */}
              <VStack
                spacing={0}
                frame={{ maxWidth: 'infinity', maxHeight: landscape ? 0 : 'infinity', alignment: 'topLeading' }}
                opacity={landscape ? 0 : 1}
                allowsHitTesting={!landscape}
                clipped
              >
                {!!playError && (
                  <Text font="footnote" foregroundStyle={palette.warning} padding={16}>
                    {playError}
                  </Text>
                )}
                <ScrollView scrollIndicator="hidden">
                  {/* 视频信息 */}
                  <VStack padding={16} spacing={20}>
                    <HStack alignment="center">
                      <VStack alignment="leading" spacing={4}>
                        <Text font="title2" bold foregroundStyle={palette.textPrimary}>
                          {video.vod_name}
                        </Text>
                        <Text font="subheadline" foregroundStyle={palette.textSecondary}>
                          {video.vod_sub || video.vod_en}
                        </Text>
                      </VStack>
                      <Spacer />
                    </HStack>

                    <ScrollView axes="horizontal" scrollIndicator="hidden">
                      <HStack spacing={8}>
                        {[video.vod_year, video.vod_area, video.type_name, video.vod_remarks]
                          .filter(value => !!value)
                          .map((value, index) => (
                            <Text
                              key={`${value}-${index}`}
                              font="caption"
                              foregroundStyle={palette.textSecondary}
                              padding={{ horizontal: 8, vertical: 4 }}
                              background={palette.card}
                              clipShape="capsule"
                            >
                              {value}
                            </Text>
                          ))}
                      </HStack>
                    </ScrollView>

                    {/* 播放源选择 */}
                    <VStack alignment="leading" spacing={8}>
                      <Text font="headline" foregroundStyle={palette.textPrimary}>
                        播放源
                      </Text>
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

                    {/* 剧集列表 */}
                    <VStack alignment="leading" spacing={8}>
                      <HStack alignment="center">
                        <Text font="headline" foregroundStyle={palette.textPrimary}>
                          选集
                        </Text>
                        <Spacer />
                        <Text font="subheadline" foregroundStyle={palette.textSecondary}>
                          {playGroups[currentGroupIndex]?.episodes.length} 集
                        </Text>
                      </HStack>

                      <LazyVGrid columns={EPISODE_GRID_COLUMNS} spacing={8}>
                        {playGroups[currentGroupIndex]?.episodes.map((ep: PlayEpisode, i: number) => (
                          <EpisodeButton key={`${ep.name}-${i}`} label={ep.name} active={i === currentEpisodeIndex} onPress={() => setCurrentEpisodeIndex(i)} />
                        ))}
                      </LazyVGrid>
                    </VStack>

                    {/* 简介 */}
                    <VStack alignment="leading" frame={{ maxWidth: 'infinity', alignment: 'leading' }} spacing={8}>
                      <Text font="headline" foregroundStyle={palette.textPrimary}>
                        简介
                      </Text>
                      <Text foregroundStyle={palette.textSecondary} font="body" lineSpacing={4}>
                        {video.vod_content.replace(/<[^>]+>/g, '').trim() || '暂无简介'}
                      </Text>
                    </VStack>
                  </VStack>
                </ScrollView>
              </VStack>
            </VStack>
          </NavigationStack>
        )
      }}
    </EnvironmentValuesReader>
  )
}
