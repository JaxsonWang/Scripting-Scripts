import { Button, Markdown, Navigation, NavigationStack, ScrollView, Text } from 'scripting'
import type { MarkdownPreviewProps } from '../types'

/**
 * Markdown 预览组件，包装滚动视图以保持可滚动性
 * @param props Markdown 预览参数
 */
export const MarkdownPreviewView = ({ name, content, l10n }: MarkdownPreviewProps) => {
  const dismiss = Navigation.useDismiss()

  return (
    <NavigationStack
      toolbar={{
        topBarLeading: <Text styledText={{ content: name, font: 16, fontWeight: 'bold' }} />,
        topBarTrailing: <Button title={l10n.done} action={dismiss} />
      }}
      padding={{ horizontal: 20, top: 30 }}
    >
      <ScrollView>
        <Markdown content={content} theme="github" useDefaultHighlighterTheme scrollable={false} />
      </ScrollView>
    </NavigationStack>
  )
}
