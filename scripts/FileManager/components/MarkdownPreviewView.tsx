import { Button, Markdown, Navigation, NavigationStack, ScrollView, Text } from 'scripting'
import type { MarkdownPreviewProps } from '../types'

export function MarkdownPreviewView({ name, content, l10n }: MarkdownPreviewProps) {
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
