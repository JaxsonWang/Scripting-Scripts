import { Form, NavigationStack, Script, Section, Text, VStack, useEffect, useState } from 'scripting'
import type { ChangelogScreenProps } from '../types'

/**
 * 展示脚本版本及更新内容
 * @param props 变更日志参数
 */
export const ChangelogScreen = ({ title, versionLabel, version, emptyLabel }: ChangelogScreenProps) => {
  const [markdown, setMarkdown] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const changelogPath = `${Script.directory}/changelog.md`
        let content = ''
        try {
          content = await FileManager.readAsString(changelogPath)
        } catch (error) {
          console.error('[ChangelogScreen] failed to read changelog.md', error)
          content = ''
        }
        if (!cancelled) {
          setMarkdown(content)
        }
      } catch (error) {
        console.error('[ChangelogScreen] unexpected error', error)
        if (!cancelled) {
          setMarkdown('')
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <NavigationStack>
      <Form navigationTitle={title}>
        <Section header={<Text>{versionLabel}</Text>}>
          <Text styledText={{ content: `v${version}`, font: 18, fontWeight: 'bold' }} />
        </Section>
        <Section
          header={<Text>{title}</Text>}
          footer={
            <VStack spacing={10} alignment="leading">
              <Text font="footnote" foregroundStyle="secondaryLabel">
                ScriptFlix {'v' + Script.metadata?.version || '1.0.0'}
                {'\n'}
                淮城一只猫© - Power by Scripting
                {'\n'}
                更多脚本/小组件请关注微信公众号「组件派」
              </Text>
            </VStack>
          }
        >
          {markdown && markdown.trim().length > 0 ? <Text attributedString={markdown} /> : <Text foregroundStyle="secondaryLabel">{emptyLabel}</Text>}
        </Section>
      </Form>
    </NavigationStack>
  )
}
