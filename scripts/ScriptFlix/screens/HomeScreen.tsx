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
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'scripting'
import { SettingsService } from '../services/settings'
import { fetchCategories, fetchVideoList } from '../services/api'
import { VideoCard } from '../components/VideoCard'
import { EmptySourcesState } from '../components/EmptySourcesState'
import { SettingsScreen } from './SettingsScreen'
import { PlayerScreen } from './PlayerScreen'
import { SearchScreen } from './SearchScreen'
import { HistoryScreen } from './HistoryScreen'
import type { Category, VideoItem } from '../types'

/**
 * 首页
 */
export const HomeScreen = () => {
  const [source, setSource] = useState(SettingsService.getCurrentSource())
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedMainType, setSelectedMainType] = useState<number | null>(null)
  const [selectedSubType, setSelectedSubType] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const dismiss = Navigation.useDismiss()

  // 使用 ref 存储最新状态，避免 useCallback 依赖过多
  const stateRef = useRef({ categories, selectedMainType, selectedSubType, page, hasMore, loadingMore })
  stateRef.current = { categories, selectedMainType, selectedSubType, page, hasMore, loadingMore }

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
      const currentSource = SettingsService.getCurrentSource()
      setSource(currentSource)

      if (!currentSource) {
        setVideos([])
        setHasMore(false)
        return
      }

      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }
      try {
        const typeIds = getFetchTypeIds()
        const res = await fetchVideoList(currentSource.url, targetPage, typeIds)
        setVideos(prev => (append ? [...prev, ...(res.list || [])] : res.list || []))
        setPage(targetPage)
        const totalPages = res.pagecount || targetPage
        setHasMore(targetPage < totalPages)
      } catch (e) {
        console.error(e)
      } finally {
        if (append) {
          setLoadingMore(false)
        } else {
          setLoading(false)
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
    if (source?.url) {
      setHasMore(true)
      setPage(1)
      loadData(1, false)
    }
  }, [source?.url, selectedMainType, selectedSubType, loadData])

  useEffect(() => {
    setSelectedSubType(null)
  }, [selectedMainType])

  useEffect(() => {
    const fetchAndSetCategories = async () => {
      if (!source?.url) {
        setCategories([])
        return
      }
      try {
        const result = await fetchCategories(source.url)
        setCategories(result.class || [])
      } catch (error) {
        console.error('Failed to fetch categories', error)
        setCategories([])
      }
    }

    fetchAndSetCategories()
  }, [source?.url])

  const handleLoadMore = useCallback(() => {
    const { page: currentPage, hasMore: more, loadingMore: isLoading } = stateRef.current
    if (!isLoading && more) {
      loadData(currentPage + 1, true)
    }
  }, [loadData])

  const handleGridItemAppear = useCallback(
    (index: number) => {
      const { hasMore: more, loadingMore: isLoading } = stateRef.current
      if (!more || isLoading) {
        return
      }
      if (index >= videos.length - 1) {
        handleLoadMore()
      }
    },
    [videos.length, handleLoadMore]
  )

  /**
   * 打开设置页并在关闭后刷新列表
   */
  const openSettings = useCallback(() => {
    Navigation.present({
      element: <SettingsScreen />
    }).then(() => loadData())
  }, [loadData])

  /**
   * 进入搜索页
   */
  const openSearch = useCallback(() => {
    Navigation.present({ element: <SearchScreen /> })
  }, [])

  /**
   * 查看历史观看记录
   */
  const openHistory = useCallback(() => {
    Navigation.present({ element: <HistoryScreen /> })
  }, [])

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

  /**
   * 渲染头部区域，包含搜索与设置入口
   */
  const renderHeader = () => (
    <HStack padding={{ horizontal: 16, top: 8, bottom: 8 }} alignment="center">
      <Text font="title" bold foregroundStyle="#e50914">
        ScriptFlix
      </Text>
      <Spacer />
      <Button systemImage="clock" foregroundStyle="#e50914" action={openHistory} title="" />
      <Button systemImage="magnifyingglass" foregroundStyle="#e50914" action={openSearch} title="" />
      <Button systemImage="gear" foregroundStyle="#e50914" action={openSettings} title="" />
      <Button systemImage="xmark.circle" foregroundStyle="#e50914" action={handleExit} title="" />
    </HStack>
  )

  if (!source) {
    return (
      <VStack>
        <HStack padding={16} alignment="center">
          <Text font="largeTitle" bold foregroundStyle="#e50914">
            ScriptFlix
          </Text>
          <Spacer />
          <Button systemImage="gear" title="" action={openSettings} />
        </HStack>
        <EmptySourcesState onOpenSettings={openSettings} onExit={handleExit} />
      </VStack>
    )
  }

  const renderFilterButton = (label: string, active: boolean, action: () => void, key?: string | number) => (
    <Button key={key} action={action}>
      <Text
        font="subheadline"
        foregroundStyle="white"
        padding={{ horizontal: 16, vertical: 8 }}
        background={<RoundedRectangle cornerRadius={16} style="continuous" fill={active ? '#e50914' : '#1c1c1e'} />}
      >
        {label}
      </Text>
    </Button>
  )

  return (
    <VStack spacing={16}>
      {renderHeader()}

      {/* Main Category Tabs */}
      <ScrollView axes="horizontal" scrollIndicator="hidden">
        <HStack spacing={8} padding={{ horizontal: 16 }}>
          {renderFilterButton('首页', selectedMainType === null, () => setSelectedMainType(null), 'main-all')}
          {mainCategories.map(cat => renderFilterButton(cat.type_name, selectedMainType === cat.type_id, () => setSelectedMainType(cat.type_id), cat.type_id))}
        </HStack>
      </ScrollView>

      {/* Sub Category Filters */}
      {selectedMainType !== null && subCategories.length > 0 && (
        <ScrollView axes="horizontal" scrollIndicator="hidden">
          <HStack spacing={8} padding={{ horizontal: 16 }}>
            {renderFilterButton('全部', selectedSubType === null, () => setSelectedSubType(null), 'sub-all')}
            {subCategories.map(cat => renderFilterButton(cat.type_name, selectedSubType === cat.type_id, () => setSelectedSubType(cat.type_id), cat.type_id))}
          </HStack>
        </ScrollView>
      )}

      <ScrollView scrollIndicator="hidden">
        {loading ? (
          <VStack padding={50} alignment="center">
            <Text foregroundStyle="gray">加载中...</Text>
          </VStack>
        ) : (
          <VStack spacing={12}>
            <VStack padding={{ horizontal: 16 }}>
              <LazyVGrid
                columns={[{ size: { type: 'flexible' }, spacing: 12 }, { size: { type: 'flexible' }, spacing: 12 }, { size: { type: 'flexible' } }]}
                spacing={16}
              >
                {videos.map((video, index) => (
                  <VStack key={video.vod_id} onAppear={() => handleGridItemAppear(index)}>
                    <VideoCard video={video} onTap={() => openPlayer(video)} />
                  </VStack>
                ))}
              </LazyVGrid>
              <VStack padding={{ top: 16 }} alignment="center">
                {hasMore ? (
                  <Text font="caption" foregroundStyle="secondaryLabel">
                    {loadingMore ? '加载中...' : '上拉加载更多'}
                  </Text>
                ) : (
                  <Text font="caption" foregroundStyle="secondaryLabel" multilineTextAlignment="center">
                    已经到底了
                  </Text>
                )}
              </VStack>
            </VStack>
          </VStack>
        )}
      </ScrollView>
    </VStack>
  )
}
