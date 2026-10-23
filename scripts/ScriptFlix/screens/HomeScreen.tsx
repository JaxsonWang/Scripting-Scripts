import { Button, HStack, Image, LazyVGrid, Navigation, ScrollView, Spacer, Text, VStack, useCallback, useEffect, useMemo, useRef, useState } from 'scripting'
import { SettingsService } from '../services/settings'
import { fetchCategories, fetchVideoList } from '../services/api'
import { VideoCard } from '../components/VideoCard'
import { FilterChip } from '../components/FilterChip'
import { EmptySourcesState } from '../components/EmptySourcesState'
import { SettingsScreen } from './SettingsScreen'
import { PlayerScreen } from './PlayerScreen'
import { HeroCard } from '../components/HeroCard'
import { ScreenBackground } from '../components/ScreenBackground'
import { SectionHeader } from '../components/SectionHeader'
import { EmptyView, LoadingView } from '../components/StateView'
import { FULL_SCREEN_FRAME, brandGradient, palette } from '../theme'
import type { ApiSource, Category, VideoItem } from '../types'

// 固定列定义，避免每次渲染重新创建
const GRID_COLUMNS = [
  { size: { type: 'flexible' as const }, spacing: 12 },
  { size: { type: 'flexible' as const }, spacing: 12 },
  { size: { type: 'flexible' as const } }
]

/**
 * 首页
 */
export const HomeScreen = () => {
  const [source, setSource] = useState(SettingsService.getCurrentSource())
  const [sources, setSources] = useState<ApiSource[]>(() => SettingsService.getEnabledSources())
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMainType, setSelectedMainType] = useState<number | null>(null)
  const [selectedSubType, setSelectedSubType] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const activeRequestRef = useRef(0)
  /** 列表请求进行中（含首屏与翻页），同一帧内重复触发的翻页只发一次 */
  const busyRef = useRef(false)

  const dismiss = Navigation.useDismiss()

  // 使用 ref 存储最新状态，避免 useCallback 依赖过多
  const stateRef = useRef({ source, categories, selectedMainType, selectedSubType, page, hasMore, error })
  stateRef.current = { source, categories, selectedMainType, selectedSubType, page, hasMore, error }

  /**
   * 获取当前筛选的类型 ID
   */
  const getFetchTypeIds = useCallback((): number[] | undefined => {
    const { categories: cats, selectedMainType: mainType, selectedSubType: subType } = stateRef.current
    if (mainType === null) {
      return undefined
    }

    if (subType !== null) {
      return [subType]
    }

    const subs = cats.filter(cat => cat.type_pid === mainType).map(cat => cat.type_id)
    return subs.length > 0 ? subs : [mainType]
  }, [])

  /**
   * 拉取首页视频与分类数据
   */
  const loadData = useCallback(
    async (targetPage: number = 1, append = false) => {
      const currentSource = stateRef.current.source
      const requestId = ++activeRequestRef.current
      setError(null)

      if (!currentSource) {
        busyRef.current = false
        setVideos([])
        setHasMore(false)
        setLoading(false)
        setLoadingMore(false)
        return
      }

      busyRef.current = true
      if (append) {
        setLoadingMore(true)
      } else {
        setVideos([])
        setPage(1)
        setHasMore(false)
        setLoading(true)
        setLoadingMore(false)
      }
      try {
        const typeIds = getFetchTypeIds()
        const res = await fetchVideoList(currentSource.url, targetPage, typeIds)
        if (activeRequestRef.current !== requestId) return
        setVideos(prev => (append ? [...prev, ...(res.list || [])] : res.list || []))
        setPage(targetPage)
        const totalPages = res.pagecount || targetPage
        setHasMore(targetPage < totalPages)
      } catch (e) {
        console.error(e)
        if (activeRequestRef.current === requestId) {
          setError(e instanceof Error ? e.message : String(e))
        }
      } finally {
        if (activeRequestRef.current === requestId) {
          busyRef.current = false
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [getFetchTypeIds]
  )

  const mainCategories = useMemo(() => categories.filter(cat => cat.type_pid === 0), [categories])

  const subCategories = useMemo(() => {
    if (selectedMainType === null) return []
    return categories.filter(cat => cat.type_pid === selectedMainType)
  }, [categories, selectedMainType])

  useEffect(() => {
    void loadData(1, false)
    return () => {
      activeRequestRef.current += 1
    }
  }, [source?.url, selectedMainType, selectedSubType, loadData])

  useEffect(() => {
    let cancelled = false
    const fetchAndSetCategories = async () => {
      if (!source?.url) {
        setCategories([])
        return
      }
      try {
        const result = await fetchCategories(source.url)
        if (!cancelled && stateRef.current.source?.url === source.url) setCategories(result.class || [])
      } catch (error) {
        console.error('Failed to fetch categories', error)
        if (!cancelled && stateRef.current.source?.url === source.url) setCategories([])
      }
    }

    fetchAndSetCategories()
    return () => {
      cancelled = true
    }
  }, [source?.url])

  const handleLoadMore = useCallback(() => {
    const { page: currentPage, hasMore: more } = stateRef.current
    if (!busyRef.current && more) {
      loadData(currentPage + 1, true)
    }
  }, [loadData])

  const handleGridItemAppear = useCallback(
    (index: number) => {
      // 翻页失败后不自动重试，由底部「重试加载更多」发起
      if (index >= videos.length - 1 && !stateRef.current.error) {
        handleLoadMore()
      }
    },
    [videos.length, handleLoadMore]
  )

  /** 首页切换和设置返回共用同一次源切换，旧分类不能带入新源。 */
  const refreshSource = useCallback(() => {
    const next = SettingsService.getCurrentSource()
    const changed = next?.url !== stateRef.current.source?.url
    setSources(SettingsService.getEnabledSources())
    setSource(next)
    if (changed) {
      // 旧源的在途请求作废；新源列表由 source 变化触发的 effect 加载
      activeRequestRef.current += 1
      setCategories([])
      setSelectedMainType(null)
      setSelectedSubType(null)
      setVideos([])
      setPage(1)
      setHasMore(false)
      setLoading(!!next)
      setLoadingMore(false)
    }
    return changed
  }, [])

  /** 打开设置页并在关闭后刷新列表。 */
  const openSettings = useCallback(async () => {
    await Navigation.present({ element: <SettingsScreen /> })
    if (!refreshSource()) await loadData()
  }, [loadData, refreshSource])

  /**
   * 切换当前视频源
   */
  const handleSelectSource = useCallback(
    (next: ApiSource) => {
      if (next.url === stateRef.current.source?.url) {
        return
      }
      SettingsService.selectSourceByUrl(next.url)
      refreshSource()
    },
    [refreshSource]
  )

  const handleSelectMainType = (typeId: number | null) => {
    if (typeId === stateRef.current.selectedMainType) return
    activeRequestRef.current += 1
    setSelectedMainType(typeId)
    setSelectedSubType(null)
  }

  const handleSelectSubType = (typeId: number | null) => {
    if (typeId === stateRef.current.selectedSubType) return
    activeRequestRef.current += 1
    setSelectedSubType(typeId)
  }

  /**
   * 退出应用
   */
  const handleExit = useCallback(() => {
    dismiss()
  }, [dismiss])

  /**
   * 打开播放器并传入视频 ID
   */
  const openPlayer = useCallback(
    (video: VideoItem) => {
      if (source) {
        Navigation.present({ element: <PlayerScreen id={video.vod_id} sourceUrl={source.url} sourceName={source.name} /> })
      }
    },
    [source]
  )

  const renderHeader = () => (
    <HStack padding={{ horizontal: 16, top: 4, bottom: 4 }} alignment="center">
      <VStack alignment="leading" spacing={0}>
        <Text font="largeTitle" bold foregroundStyle={brandGradient}>
          ScriptFlix
        </Text>
        <Text font="caption" foregroundStyle={palette.textTertiary}>
          精选影像 · 随心畅看
        </Text>
      </VStack>
      <Spacer />
      <Button action={openSettings} accessibilityLabel="设置" buttonStyle="plain">
        <Image systemName="gearshape" font={16} foregroundStyle={palette.textSecondary} padding={10} background={palette.card} clipShape="circle" />
      </Button>
      <Button action={handleExit} accessibilityLabel="退出 ScriptFlix" buttonStyle="plain">
        <Image systemName="xmark" font={15} foregroundStyle={palette.textSecondary} padding={10} background={palette.card} clipShape="circle" />
      </Button>
    </HStack>
  )

  if (!source) {
    return (
      <VStack spacing={16} alignment="leading" frame={FULL_SCREEN_FRAME} background={<ScreenBackground />}>
        {renderHeader()}
        <EmptySourcesState onOpenSettings={openSettings} onExit={handleExit} />
      </VStack>
    )
  }

  return (
    <VStack spacing={16} alignment="leading" frame={FULL_SCREEN_FRAME} background={<ScreenBackground />}>
      {renderHeader()}
      <ScrollView axes="horizontal" scrollIndicator="hidden">
        <HStack spacing={8} padding={{ horizontal: 16 }}>
          {sources.map((item, index) => (
            <FilterChip key={`${item.url}-${index}`} label={item.name} active={source.url === item.url} onTap={() => handleSelectSource(item)} />
          ))}
        </HStack>
      </ScrollView>
      <ScrollView axes="horizontal" scrollIndicator="hidden">
        <HStack spacing={8} padding={{ horizontal: 16 }}>
          <FilterChip label="全部" active={selectedMainType === null} onTap={() => handleSelectMainType(null)} />
          {mainCategories.map(cat => (
            <FilterChip key={cat.type_id} label={cat.type_name} active={selectedMainType === cat.type_id} onTap={() => handleSelectMainType(cat.type_id)} />
          ))}
        </HStack>
      </ScrollView>
      {selectedMainType !== null && subCategories.length > 0 && (
        <ScrollView axes="horizontal" scrollIndicator="hidden">
          <HStack spacing={8} padding={{ horizontal: 16 }}>
            <FilterChip label="全部" active={selectedSubType === null} onTap={() => handleSelectSubType(null)} />
            {subCategories.map(cat => (
              <FilterChip key={cat.type_id} label={cat.type_name} active={selectedSubType === cat.type_id} onTap={() => handleSelectSubType(cat.type_id)} />
            ))}
          </HStack>
        </ScrollView>
      )}
      <ScrollView scrollIndicator="hidden">
        {loading ? (
          <LoadingView />
        ) : error && videos.length === 0 ? (
          <EmptyView title="加载失败" message={error} actionTitle="重试" onAction={() => void loadData()} />
        ) : videos.length === 0 ? (
          <EmptyView title="暂无内容" />
        ) : (
          <VStack spacing={24} padding={{ bottom: 24 }} alignment="leading">
            {selectedMainType === null && (
              <ScrollView axes="horizontal" scrollIndicator="hidden">
                <HStack spacing={14} padding={{ horizontal: 16 }}>
                  {videos.slice(0, 3).map(video => (
                    <HeroCard key={video.vod_id} video={video} width={Math.min(Device.screen.width - 32, 360)} onTap={openPlayer} />
                  ))}
                </HStack>
              </ScrollView>
            )}
            <SectionHeader title={mainCategories.find(cat => cat.type_id === selectedMainType)?.type_name || '发现好片'} subtitle={source.name} />
            <VStack spacing={16} padding={{ horizontal: 16 }}>
              <LazyVGrid columns={GRID_COLUMNS} spacing={18}>
                {videos.map((video, index) => (
                  <VStack key={video.vod_id} onAppear={() => handleGridItemAppear(index)}>
                    <VideoCard video={video} onTap={openPlayer} />
                  </VStack>
                ))}
              </LazyVGrid>
              {error ? (
                <VStack spacing={8}>
                  <Text font="footnote" foregroundStyle={palette.warning}>
                    {error}
                  </Text>
                  <Button title="重试加载更多" action={handleLoadMore} foregroundStyle={palette.accent} />
                </VStack>
              ) : (
                <Text font="caption" foregroundStyle={palette.textTertiary}>
                  {hasMore ? (loadingMore ? '加载中…' : '上拉加载更多') : '已经到底了'}
                </Text>
              )}
            </VStack>
          </VStack>
        )}
      </ScrollView>
    </VStack>
  )
}
