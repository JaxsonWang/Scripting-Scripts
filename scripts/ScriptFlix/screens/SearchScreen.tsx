import {
  Button,
  Form,
  HStack,
  LazyVGrid,
  Navigation,
  NavigationStack,
  RoundedRectangle,
  ScrollView,
  Section,
  Spacer,
  Text,
  TextField,
  VStack,
  useEffect,
  useMemo,
  useState
} from 'scripting'
import { VideoCard } from '../components/VideoCard'
import { SettingsService } from '../services/settings'
import { fetchVideoList } from '../services/api'
import { PlayerScreen } from './PlayerScreen'
import type { ApiSource, SearchResultItem, SourceStateMap } from '../types'

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
    setQuery('')
    setResults([])
    setError(null)
    setSelectedSource('all')
    setLastKeyword('')
    resetSourceStates()
  }

  const handlePlay = (item: SearchResultItem) => {
    Navigation.present({ element: <PlayerScreen id={item.vod_id} sourceUrl={item.sourceUrl} sourceName={item.sourceName} /> })
  }

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

      const allResults = await Promise.all(
        activeSources.map(async source => {
          try {
            const response = await fetchVideoList(source.url, 1, undefined, trimmed)
            const list = response.list || []

            if (list.length > 0) {
              hasResult = true
            }

            setSourceStates(prev => ({
              ...prev,
              [source.name]: {
                status: list.length === 0 ? 'empty' : 'success',
                count: list.length,
                message: list.length === 0 ? '暂无结果' : undefined
              }
            }))

            return list.map(item => ({
              ...item,
              sourceName: source.name,
              sourceUrl: source.url
            }))
          } catch (err) {
            console.error(`搜索源 ${source.name} 失败`, err)
            hasError = true

            setSourceStates(prev => ({
              ...prev,
              [source.name]: {
                status: 'error',
                count: 0,
                message: '请求失败'
              }
            }))

            return []
          }
        })
      )

      const flattened = allResults.flat()
      setResults(flattened)

      if (!hasResult) {
        setError(`未找到 “${trimmed}” 相关内容`)
      } else if (hasError) {
        setError('部分数据源暂不可用，已展示可用结果')
      } else {
        setError(null)
      }
    } catch (err) {
      console.error('performSearch error', err)
      setError('搜索失败，请稍后再试')
    } finally {
      setLoading(false)
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
      ...sourceStateEntries.map(entry => ({
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
      <Form
        navigationTitle="内容搜索"
        toolbar={{
          cancellationAction: <Button title="关闭" action={dismiss} />,
          primaryAction: <Button title="搜索" action={() => performSearch()} disabled={loading || query.trim().length === 0} />
        }}
      >
        <Section
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              {statusLabel}
            </Text>
          }
        >
          <TextField title="关键词" value={query} prompt="输入关键词..." onChanged={setQuery} onSubmit={{ triggers: 'text', action: () => performSearch() }} />

          <HStack spacing={12}>
            <Button title="清空" action={clearSearch} foregroundStyle="systemRed" disabled={!query && results.length === 0} />
          </HStack>
        </Section>

        <VStack spacing={8}>
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
              <LazyVGrid
                columns={[{ size: { type: 'flexible' }, spacing: 12 }, { size: { type: 'flexible' }, spacing: 12 }, { size: { type: 'flexible' } }]}
                spacing={16}
                padding={{ horizontal: 4, bottom: 16 }}
              >
                {filteredResults.map(item => (
                  <VStack key={`${item.sourceName}-${item.vod_id}`} spacing={6}>
                    <VideoCard video={item} onTap={() => handlePlay(item)} />
                    <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={1}>
                      来自 · {item.sourceName}
                    </Text>
                  </VStack>
                ))}
              </LazyVGrid>
            )}
          </VStack>
        </VStack>
      </Form>
    </NavigationStack>
  )
}
