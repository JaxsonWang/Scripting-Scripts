import {
  Button,
  HStack,
  LazyVGrid,
  Navigation,
  NavigationStack,
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
import { VideoCard } from '../components/VideoCard'
import { SettingsService } from '../services/settings'
import { fetchVideoList } from '../services/api'
import { PlayerScreen } from './PlayerScreen'
import type { ApiSource, SearchResultItem, SourceSearchState, SourceStateMap } from '../types'

const SEARCH_TIMEOUT_MS = 30_000

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
export const SearchScreen = () => {
  const dismiss = Navigation.useDismiss()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sources, setSources] = useState<ApiSource[]>(() => SettingsService.getSources())
  const [sourceStates, setSourceStates] = useState<SourceStateMap>({})
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [lastKeyword, setLastKeyword] = useState('')
  const activeRequestRef = useRef(0)

  useEffect(() => {
    setSources(SettingsService.getSources())
  }, [])

  useEffect(() => {
    setSourceStates(prev => {
      const next: SourceStateMap = {}
      sources.forEach(source => {
        next[source.name] = prev[source.name] || { status: 'idle', count: 0 }
      })
      return next
    })

    if (selectedSource !== 'all' && !sources.some(src => src.name === selectedSource)) {
      setSelectedSource('all')
    }
  }, [sources, selectedSource])

  const resetSourceStates = () => {
    setSourceStates(prev => {
      const cleared: SourceStateMap = {}
      Object.keys(prev).forEach(name => {
        cleared[name] = { status: 'idle', count: 0 }
      })
      return cleared
    })
  }

  const clearSearch = () => {
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

    const activeSources = SettingsService.getSources()
    setSources(activeSources)

    if (activeSources.length === 0) {
      setError('请先在设置里添加数据源')
      return
    }

    Keyboard.hide()

    const requestId = activeRequestRef.current + 1
    activeRequestRef.current = requestId

    setLoading(true)
    setError(null)
    setResults([])
    setSelectedSource('all')
    setLastKeyword(trimmed)

    const initialMap = activeSources.reduce((acc, source) => {
      acc[source.name] = { status: 'loading', count: 0 }
      return acc
    }, {} as SourceStateMap)
    setSourceStates(initialMap)

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
                [source.name]: nextState
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
        state: sourceStates[source.name] || { status: 'idle', count: 0 }
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
    return sortedResults.filter(item => item.sourceName === selectedSource)
  }, [sortedResults, selectedSource])

  const sourcesWithHits = useMemo(() => sourceStateEntries.filter(entry => entry.state.count > 0).length, [sourceStateEntries])
  const errorSourceCount = useMemo(() => sourceStateEntries.filter(entry => entry.state.status === 'error').length, [sourceStateEntries])

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
      const scope = selectedSource === 'all' ? '任一源' : selectedSource
      return `未在${scope}中搜到 “${lastKeyword}”`
    }

    const scope = selectedSource === 'all' ? `${sourcesWithHits}/${sources.length} 个源` : selectedSource
    return `展示 ${filteredResults.length} 条结果 · 覆盖 ${scope}`
  }, [sources.length, loading, error, lastKeyword, filteredResults.length, selectedSource, sourcesWithHits])

  const filterItems = useMemo(
    () => [
      { key: 'all', label: '全部', count: results.length },
      ...sourceStateEntries
        .filter(entry => entry.state.count > 0)
        .map(entry => ({
          key: entry.source.name,
          label: entry.source.name,
          count: entry.state.count
        }))
    ],
    [results.length, sourceStateEntries]
  )

  const renderFilterChip = (itemKey: string, label: string, count: number) => {
    const active = selectedSource === itemKey
    return (
      <Button key={itemKey} action={() => setSelectedSource(itemKey)}>
        <HStack
          spacing={6}
          padding={{ horizontal: 14, vertical: 8 }}
          background={<RoundedRectangle cornerRadius={16} style="continuous" fill={active ? '#e50914' : '#1c1c1e'} />}
        >
          <Text font="subheadline" foregroundStyle="white">
            {label}
          </Text>
          <Text font="caption2" foregroundStyle={active ? 'white' : '#a0a0a0'}>
            {count}
          </Text>
        </HStack>
      </Button>
    )
  }

  return (
    <NavigationStack>
      <VStack
        spacing={16}
        padding={{ horizontal: 16 }}
        navigationTitle="内容搜索"
        toolbar={{
          cancellationAction: <Button title="关闭" action={dismiss} />,
          primaryAction: <Button title="搜索" action={() => performSearch()} disabled={loading || query.trim().length === 0} />
        }}
        searchable={{
          value: query,
          onChanged: handleQueryChange,
          placement: 'navigationBarDrawer',
          prompt: '输入关键词...'
        }}
        onSubmit={{ triggers: 'search', action: () => performSearch() }}
      >
        <VStack spacing={8}>
          <ScrollView axes="horizontal" scrollIndicator="hidden">
            <HStack spacing={12}>{filterItems.map(item => renderFilterChip(item.key, item.label, item.count))}</HStack>
          </ScrollView>

          <HStack>
            <Text font="caption2" foregroundStyle="secondaryLabel">
              共 {results.length} 条结果 · 异常源 {errorSourceCount}
            </Text>
            <Spacer />
          </HStack>
        </VStack>

        <VStack spacing={8}>
          <HStack>
            <Text font="headline" bold>
              {selectedSource === 'all' ? '全部结果' : `${selectedSource} 的结果`}
            </Text>
            <Spacer />
          </HStack>

          {loading && (
            <VStack alignment="center">
              <Text font="subheadline" foregroundStyle="secondaryLabel">
                正在联动所有源，请稍候...
              </Text>
            </VStack>
          )}

          {!loading && filteredResults.length === 0 && (
            <VStack alignment="leading">
              <Text font="subheadline" foregroundStyle="secondaryLabel">
                {statusLabel}
              </Text>
            </VStack>
          )}

          {filteredResults.length > 0 && (
            <ScrollView scrollIndicator="hidden">
              <LazyVGrid
                columns={[{ size: { type: 'flexible' }, spacing: 12 }, { size: { type: 'flexible' }, spacing: 12 }, { size: { type: 'flexible' } }]}
                spacing={16}
                padding={{ horizontal: 4, bottom: 16 }}
              >
                {filteredResults.map(item => (
                  <VStack key={`${item.sourceName}-${item.vod_id}`} spacing={6}>
                    <VideoCard video={item} onTap={() => openPlayer(item)} />
                    <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={1}>
                      来自 · {item.sourceName}
                    </Text>
                  </VStack>
                ))}
              </LazyVGrid>
            </ScrollView>
          )}
        </VStack>
        <Spacer />
      </VStack>
    </NavigationStack>
  )
}
