import { Button, HStack, List, Navigation, NavigationStack, Section, Spacer, Text, TextField, VStack, useMemo, useState } from 'scripting'
import { DanmuService } from '../services/danmu'
import type { DanmuBindScreenProps, DanmuBinding, DanmuMatchResult } from '../types'

export const DanmuBindScreen = ({ baseUrl, videoTitle, episodeName, defaultQuery, bindingKey, onBound }: DanmuBindScreenProps) => {
  const dismiss = Navigation.useDismiss()
  const [query, setQuery] = useState(defaultQuery)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<DanmuMatchResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const subtitle = useMemo(() => {
    const parts = [videoTitle, episodeName].filter(Boolean)
    return parts.join(' · ')
  }, [episodeName, videoTitle])

  const performSearch = async () => {
    const keyword = query.trim()
    if (!keyword) {
      setError('请输入关键词')
      return
    }
    Keyboard.hide()
    setLoading(true)
    setError(null)
    setResults([])
    try {
      const list = await DanmuService.match(baseUrl, keyword)
      setResults(list)
      if (list.length === 0) {
        setError('未匹配到结果')
      }
    } catch (e) {
      console.error('[DanmuBindScreen] match failed', e)
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const handleBind = async (item: DanmuMatchResult) => {
    const binding: DanmuBinding = { commentId: item.commentId, title: `${item.title}${item.episode ? ` - ${item.episode}` : ''}`, boundAt: Date.now() }
    onBound(binding)
    await Dialog.alert({ title: '已绑定', message: `commentId: ${item.commentId}` })
    dismiss()
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="绑定弹幕"
        toolbar={{
          cancellationAction: <Button title="关闭" action={dismiss} />
        }}
      >
        <Section
          header={<Text>当前视频</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              绑定键：{bindingKey}
            </Text>
          }
        >
          <Text>{subtitle}</Text>
        </Section>

        <Section
          header={<Text>搜索</Text>}
          footer={
            error ? (
              <Text font="footnote" foregroundStyle="secondaryLabel">
                {error}
              </Text>
            ) : undefined
          }
        >
          <TextField title="关键词" value={query} onChanged={setQuery} prompt="例如：番剧名 第12集 / 电影名" textFieldStyle="roundedBorder" />
          <Button title={loading ? '搜索中...' : '搜索'} disabled={loading} action={() => void performSearch()} />
        </Section>

        <Section header={<Text>结果</Text>}>
          {results.length === 0 ? (
            <VStack padding={{ vertical: 12 }} alignment="leading">
              <Text foregroundStyle="secondaryLabel">暂无结果</Text>
            </VStack>
          ) : (
            results.map(item => (
              <Button key={item.commentId} action={() => void handleBind(item)}>
                <HStack alignment="center">
                  <VStack alignment="leading" spacing={2}>
                    <Text foregroundStyle="#e50914">{item.title}</Text>
                    {item.episode || item.source ? (
                      <Text font="caption2" foregroundStyle="secondaryLabel">
                        {[item.episode, item.source].filter(Boolean).join(' · ')}
                      </Text>
                    ) : null}
                  </VStack>
                  <Spacer />
                </HStack>
              </Button>
            ))
          )}
        </Section>
      </List>
    </NavigationStack>
  )
}
