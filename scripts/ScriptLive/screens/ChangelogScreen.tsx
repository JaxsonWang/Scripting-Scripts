import { List, Path, ProgressView, Rectangle, Script, Section, Text, useEffect, useState } from 'scripting'
import { ScreenBackground } from '../components/ScreenBackground'
import { palette } from '../theme'
import { errorMessage } from '../utils/format'

/** 从脚本目录读取 Markdown 更新日志，沿用设置页的原生列表样式。 */
export const ChangelogScreen = () => {
  const [markdown, setMarkdown] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const version = Script.metadata?.version || '未知'

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const content = await FileManager.readAsString(Path.join(Script.directory, 'changelog.md'))
        if (!cancelled) setMarkdown(content)
      } catch (error) {
        console.error('[ScriptLive] 读取更新日志失败', error)
        if (!cancelled) {
          setError(errorMessage(error))
          await Dialog.alert({ title: '更新日志读取失败', message: `请确认脚本目录中包含 changelog.md。\n${errorMessage(error)}` })
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <List
      foregroundStyle={palette.textPrimary}
      background={<ScreenBackground />}
      scrollContentBackground="hidden"
      navigationTitle="更新日志"
      navigationBarTitleDisplayMode="inline"
    >
      <Section header={<Text>当前版本</Text>} listRowBackground={<Rectangle fill={palette.card} />}>
        <Text font="title3" bold>
          v{version}
        </Text>
      </Section>
      <Section header={<Text>更新内容</Text>} listRowBackground={<Rectangle fill={palette.card} />}>
        {error ? (
          <Text foregroundStyle={palette.warning}>更新日志未加载，请返回后重试。</Text>
        ) : markdown === null ? (
          <ProgressView progressViewStyle="circular" />
        ) : markdown.trim() ? (
          <Text attributedString={markdown} />
        ) : (
          <Text foregroundStyle={palette.textSecondary}>暂无更新记录</Text>
        )}
      </Section>
    </List>
  )
}
