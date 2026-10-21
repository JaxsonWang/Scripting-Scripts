import { Button, Form, Navigation, NavigationStack, Rectangle, Section, Text, TextField, useState } from 'scripting'
import { ScreenBackground } from '../components/ScreenBackground'
import { palette } from '../theme'
import { usePreferredColorScheme } from '../hooks/useThemeMode'
import type { SourceEditorProps } from '../types'

export const SourceEditor = ({ title, initialName, initialUrl, onSave }: SourceEditorProps) => {
  const dismiss = Navigation.useDismiss()
  const colorScheme = usePreferredColorScheme()
  const [name, setName] = useState(initialName)
  const [url, setUrl] = useState(initialUrl)
  const canSubmit = name.trim().length > 0 && url.trim().length > 0

  const handleSubmit = () => {
    if (!canSubmit) {
      return
    }
    onSave(name.trim(), url.trim())
    dismiss()
  }

  return (
    <NavigationStack preferredColorScheme={colorScheme} tint={palette.accent}>
      <Form
        foregroundStyle={palette.textPrimary}
        background={<ScreenBackground />}
        scrollContentBackground="hidden"
        toolbarBackground={palette.bg}
        toolbarColorScheme={colorScheme}
        navigationTitle={title}
        toolbar={{
          cancellationAction: <Button title="取消" action={dismiss} />,
          primaryAction: <Button title="保存" action={handleSubmit} disabled={!canSubmit} />
        }}
      >
        <Section listRowBackground={<Rectangle fill={palette.card} />} header={<Text>信息</Text>}>
          <TextField title="名称" value={name} onChanged={setName} />
          <TextField
            title="API 地址"
            prompt="https://example.com/api.php/provide/vod"
            value={url}
            onChanged={setUrl}
            keyboardType="URL"
            textInputAutocapitalization="never"
            autocorrectionDisabled
          />
        </Section>
      </Form>
    </NavigationStack>
  )
}
