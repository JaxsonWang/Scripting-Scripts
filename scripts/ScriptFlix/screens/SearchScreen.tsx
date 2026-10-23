import {
  Button,
  HStack,
  Image,
  LazyVGrid,
  Navigation,
  NavigationStack,
  ScrollView,
  Spacer,
  Text,
  TextField,
  VStack,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'scripting'
import { VideoCard } from '../components/VideoCard'
import { FilterChip } from '../components/FilterChip'
import { SettingsService } from '../services/settings'
import { fetchVideoList } from '../services/api'
import { PlayerScreen } from './PlayerScreen'
import { ScreenBackground } from '../components/ScreenBackground'
import { SectionHeader } from '../components/SectionHeader'
import { EmptyView, LoadingView } from '../components/StateView'
import { FULL_SCREEN_FRAME, brandGradient, palette } from '../theme'
import { usePreferredColorScheme } from '../hooks/useThemeMode'
import type { ApiSource, SearchResultItem, SourceSearchState, SourceStateMap } from '../types'

const SEARCH_TIMEOUT_MS = 30_000

// Define columns outside
const GRID_COLUMNS = [
  { size: { type: 'flexible' as const }, spacing: 12 },
  { size: { type: 'flexible' as const }, spacing: 12 },
  { size: { type: 'flexible' as const } }
]

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('timeout'))
    }, timeoutMs)

    promise
      .then(value => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch(error => {
        clearTimeout(timer)
        reject(error)
      })
  })

/**
 * 全源搜索页，联动所有已配置的视频源，并提供分源过滤
 */
export const SearchScreen = ({ embedded = false }: { embedded?: boolean }) => {
  const dismiss = Navigation.useDismiss()
  const colorScheme = usePreferredColorScheme()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sources, setSources] = useState<ApiSource[]>(() => SettingsService.getEnabledSources())
  const [sourceStates, setSourceStates] = useState<SourceStateMap>({})
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [lastKeyword, setLastKeyword] = useState('')
  const activeRequestRef = useRef(0)

  useEffect(() => {
    setSources(SettingsService.getEnabledSources())
  }, [])

  useEffect(() => {
    setSourceStates(prev => {
      const next: SourceStateMap = {}
      sources.forEach(source => {
        next[source.url] = prev[source.url] || { status: 'idle', count: 0 }
      })
      return next
    })

    if (selectedSource !== 'all' && !sources.some(src => src.url === selectedSource)) {
      setSelectedSource('all')
    }
  }, [sources, selectedSource])

  const resetSourceStates = () => {
    setSourceStates(prev => {
      const cleared: SourceStateMap = {}
      Object.keys(prev).forEach(url => {
        cleared[url] = { status: 'idle', count: 0 }
      })
      return cleared
    })
  }

  const clearSearch = () => {
    activeRequestRef.current += 1
    setLoading(false)
    setQuery('')
    setResults([])
    setError(null)
    setSelectedSource('all')
    setLastKeyword('')
    resetSourceStates()
  }
  const handleQueryChange = (value: string) => {
    setQuery(value)
    if (value.trim().length === 0) {
      clearSearch()
    }
  }

  const openPlayer = useCallback((item: SearchResultItem) => {
    Navigation.present({ element: <PlayerScreen id={item.vod_id} sourceUrl={item.sourceUrl} sourceName={item.sourceName} /> })
  }, [])

  const performSearch = async (keyword?: string) => {
    const trimmed = (keyword ?? query).trim()
    if (!trimmed) {
      setError('请输入关键词')
      return
    }

    const requestId = activeRequestRef.current + 1
    activeRequestRef.current = requestId
    const activeSources = SettingsService.getEnabledSources()
    setSources(activeSources)
    Keyboard.hide()

    setLoading(activeSources.length > 0)
    setError(null)
    setResults([])
    setSelectedSource('all')
    setLastKeyword(trimmed)

    const initialMap = activeSources.reduce((acc, source) => {
      acc[source.url] = { status: 'loading', count: 0 }
      return acc
    }, {} as SourceStateMap)
    setSourceStates(initialMap)

    if (activeSources.length === 0) {
      setError('请先在设置里添加或启用视频源')
      return
    }

    try {
      let hasError = false
      let hasResult = false

      await Promise.allSettled(
        activeSources.map(async source => {
          const updateSourceState = (nextState: SourceSearchState) => {
            setSourceStates(prev => {
              if (activeRequestRef.current !== requestId) {
                return prev
              }
              return {
                ...prev,
                [source.url]: nextState
              }
            })
          }

          const appendResults = (items: SearchResultItem[]) => {
            if (items.length === 0) {
              return
            }
            setResults(prev => {
              if (activeRequestRef.current !== requestId) {
                return prev
              }
              return [...prev, ...items]
            })
          }

          try {
            const response = await withTimeout(fetchVideoList(source.url, 1, undefined, trimmed), SEARCH_TIMEOUT_MS)
            const list = response.list || []
            const mapped = list.map(item => ({
              ...item,
              sourceName: source.name,
              sourceUrl: source.url
            }))

            if (list.length > 0) {
              hasResult = true
              appendResults(mapped)
            }

            updateSourceState({
              status: list.length === 0 ? 'empty' : 'success',
              count: list.length,
              message: list.length === 0 ? '暂无结果' : undefined
            })
          } catch (err) {
            hasError = true
            console.error(`搜索源 ${source.name} 失败`, err)

            const isTimeout = err instanceof Error && err.message === 'timeout'
            updateSourceState({
              status: 'error',
              count: 0,
              message: isTimeout ? '请求超时' : '请求失败'
            })
          }
        })
      )

      if (activeRequestRef.current !== requestId) {
        return
      }

      if (!hasResult) {
        setError(`未找到 “${trimmed}” 相关内容`)
      } else if (hasError) {
        setError('部分数据源暂不可用，已展示可用结果')
      } else {
        setError(null)
      }
    } catch (err) {
      console.error('performSearch error', err)
      if (activeRequestRef.current === requestId) {
        setError('搜索失败，请稍后再试')
      }
    } finally {
      if (activeRequestRef.current === requestId) {
        setLoading(false)
      }
    }
  }

  const sourceStateEntries = useMemo(
    () =>
      sources.map(source => ({
        source,
        state: sourceStates[source.url] || { status: 'idle', count: 0 }
      })),
    [sources, sourceStates]
  )

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      const left = b.vod_time_add ?? 0
      const right = a.vod_time_add ?? 0
      return left - right
    })
  }, [results])

  const filteredResults = useMemo(() => {
    if (selectedSource === 'all') {
      return sortedResults
    }
    return sortedResults.filter(item => item.sourceUrl === selectedSource)
  }, [sortedResults, selectedSource])

  const sourcesWithHits = useMemo(() => sourceStateEntries.filter(entry => entry.state.count > 0).length, [sourceStateEntries])
  const errorSourceCount = useMemo(() => sourceStateEntries.filter(entry => entry.state.status === 'error').length, [sourceStateEntries])

  const selectedSourceName = sources.find(source => source.url === selectedSource)?.name ?? ''

  const statusLabel = useMemo(() => {
    if (sources.length === 0) {
      return '请先配置至少一个数据源'
    }

    if (loading) {
      return lastKeyword ? `正在全源搜索 “${lastKeyword}”` : '正在全源搜索...'
    }

    if (error) {
      return error
    }

    if (!lastKeyword) {
      return '输入关键词并点击「全源搜索」即可联动所有视频源'
    }

    if (filteredResults.length === 0) {
      const scope = selectedSource === 'all' ? '任一源' : selectedSourceName
      return `未在${scope}中搜到 “${lastKeyword}”`
    }

    const scope = selectedSource === 'all' ? `${sourcesWithHits}/${sources.length} 个源` : selectedSourceName
    return `展示 ${filteredResults.length} 条结果 · 覆盖 ${scope}`
  }, [sources.length, loading, error, lastKeyword, filteredResults.length, selectedSource, selectedSourceName, sourcesWithHits])

  const filterItems = useMemo(
    () => [
      { key: 'all', label: '全部', count: results.length },
      ...sourceStateEntries
        .filter(entry => entry.state.count > 0)
        .map(entry => ({
          key: entry.source.url,
          label: entry.source.name,
          count: entry.state.count
        }))
    ],
    [results.length, sourceStateEntries]
  )

  const content = (
    <VStack spacing={16} alignment="leading" frame={FULL_SCREEN_FRAME} background={<ScreenBackground />}>
      <HStack padding={{ horizontal: 16, top: 8 }}>
        <Text font="title" bold foregroundStyle={palette.textPrimary}>
          搜索
        </Text>
        <Spacer />
        {!embedded && <Button title="关闭" action={dismiss} foregroundStyle={palette.accent} />}
      </HStack>
      <HStack spacing={10} padding={{ horizontal: 16 }}>
        <HStack spacing={8} padding={{ horizontal: 14, vertical: 11 }} frame={{ maxWidth: 'infinity' }} background={palette.card} clipShape="capsule">
          <Image systemName="magnifyingglass" font={15} foregroundStyle={palette.textTertiary} />
          <TextField
            title="搜索片名"
            prompt="输入关键词…"
            value={query}
            onChanged={handleQueryChange}
            submitLabel="search"
            onSubmit={() => performSearch()}
            foregroundStyle={palette.textPrimary}
          />
          {query.length > 0 && (
            <Button accessibilityLabel="清空关键词" action={clearSearch} buttonStyle="plain">
              <Image systemName="xmark.circle.fill" foregroundStyle={palette.textTertiary} />
            </Button>
          )}
        </HStack>
        <Button action={() => performSearch()} disabled={loading || query.trim().length === 0} buttonStyle="plain">
          <Text font="subheadline" bold foregroundStyle="#FFFFFF" padding={{ horizontal: 16, vertical: 11 }} background={brandGradient} clipShape="capsule">
            全源搜索
          </Text>
        </Button>
      </HStack>
      <ScrollView axes="horizontal" scrollIndicator="hidden">
        <HStack spacing={8} padding={{ horizontal: 16 }}>
          {filterItems.map(item => (
            <FilterChip key={item.key} label={item.label} active={selectedSource === item.key} count={item.count} onTap={() => setSelectedSource(item.key)} />
          ))}
        </HStack>
      </ScrollView>
      <SectionHeader title={selectedSource === 'all' ? '全部结果' : selectedSourceName} accessory={`${results.length} 条 · 异常源 ${errorSourceCount}`} />
      {filteredResults.length > 0 && (loading || !!error) && (
        <Text font="footnote" foregroundStyle={error ? palette.warning : palette.textSecondary} padding={{ horizontal: 16 }}>
          {statusLabel}
        </Text>
      )}
      {filteredResults.length === 0 ? (
        loading ? (
          <LoadingView label={statusLabel} />
        ) : (
          <EmptyView icon="magnifyingglass" title={lastKeyword ? '暂无匹配内容' : '找一部想看的'} message={statusLabel} />
        )
      ) : (
        <ScrollView scrollIndicator="hidden">
          <LazyVGrid columns={GRID_COLUMNS} spacing={18} padding={{ horizontal: 16, bottom: 24 }}>
            {filteredResults.map(item => (
              <VStack key={`${item.sourceUrl}-${item.vod_id}`} spacing={6} alignment="leading">
                <VideoCard video={item} onTap={openPlayer} />
                <Text font="caption2" foregroundStyle={palette.textTertiary} lineLimit={1}>
                  {item.sourceName}
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
