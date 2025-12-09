import { Button, Form, HStack, LazyVGrid, Navigation, NavigationStack, ScrollView, Section, Spacer, Text, TextField, VStack, useState } from 'scripting'
import { VideoCard } from '../components/VideoCard'
import { SettingsService } from '../services/settings'
import { fetchVideoList } from '../services/api'
import type { VideoItem } from '../types'
import { PlayerScreen } from './PlayerScreen'

/**
 * 搜索页，支持输入关键字并展示返回的视频列表。
 */
export const SearchScreen = () => {
  const dismiss = Navigation.useDismiss()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * 根据关键字调用 API，保持与 Web 端一致的搜索规则。
   */
  const performSearch = async (keyword?: string) => {
    const trimmed = (keyword ?? query).trim()
    if (!trimmed) return
    const source = SettingsService.getCurrentSource()
    if (!source) {
      setError('请先在设置里添加数据源')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetchVideoList(source.url, 1, undefined, trimmed)
      setResults(res.list || [])
    } catch (e) {
      console.error(e)
      setError('请求失败，请稍后再试')
    } finally {
      setLoading(false)
    }
  }

  /**
   * 打开播放器播放搜索结果。
   * @param id 视频 ID
   */
  const handleTap = (id: number) => {
    const source = SettingsService.getCurrentSource()
    if (source) {
      Navigation.present({ element: <PlayerScreen id={id} sourceUrl={source.url} /> })
    }
  }

  const source = SettingsService.getCurrentSource()
  const statusLabel = (() => {
    if (loading) return '搜索中...'
    if (error) return error
    if (results.length > 0) return `共 ${results.length} 条`
    if (query.trim().length === 0) return '请输入关键词'
    return `未找到 “${query}” 相关内容`
  })()

  return (
    <NavigationStack>
      <Form
        navigationTitle="内容搜索"
        toolbar={{
          cancellationAction: <Button title="关闭" action={dismiss} />,
          primaryAction: <Button title="搜索" action={() => performSearch()} disabled={loading || !query.trim()} />
        }}
      >
        <Section
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              当前数据源：{source ? source.name : '未配置'} · 支持影视名称、演员、年份和标签
            </Text>
          }
        >
          <TextField
            title="关键词"
            value={query}
            prompt="输入电影或电视剧名称"
            onChanged={setQuery}
            onSubmit={{ triggers: 'text', action: () => performSearch() }}
          />
          <HStack spacing={12}>
            <Button
              title="清空"
              action={() => {
                setQuery('')
                setResults([])
                setError(null)
              }}
              foregroundStyle="systemRed"
              disabled={!query && results.length === 0}
            />
          </HStack>
        </Section>

        <Section>
          {loading && (
            <VStack padding={12}>
              <Text font="footnote" foregroundStyle="secondaryLabel">
                搜索中...
              </Text>
            </VStack>
          )}
          {!loading && results.length === 0 && (
            <VStack padding={12}>
              <Text font="footnote" foregroundStyle="secondaryLabel">
                {statusLabel}
              </Text>
            </VStack>
          )}
          {results.length > 0 ? (
            <ScrollView>
              <LazyVGrid
                columns={[{ size: { type: 'flexible' }, spacing: 12 }, { size: { type: 'flexible' }, spacing: 12 }, { size: { type: 'flexible' } }]}
                spacing={16}
                padding={{ horizontal: 4, bottom: 16 }}
              >
                {results.map((item: VideoItem) => (
                  <VideoCard key={item.vod_id} video={item} onTap={handleTap} />
                ))}
              </LazyVGrid>
            </ScrollView>
          ) : null}
        </Section>
      </Form>
    </NavigationStack>
  )
}
