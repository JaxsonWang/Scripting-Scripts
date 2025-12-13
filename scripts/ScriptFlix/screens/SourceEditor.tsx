import { Button, Form, Navigation, NavigationStack, Section, Text, TextField, useState } from 'scripting'
import type { SourceEditorProps } from '../types'

export const SourceEditor = ({ title, initialName, initialUrl, onSave }: SourceEditorProps) => {
  const dismiss = Navigation.useDismiss()
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
    <NavigationStack>
      <Form
        navigationTitle={title}
        toolbar={{
          cancellationAction: <Button title="取消" action={dismiss} />,
          primaryAction: <Button title="保存" action={handleSubmit} disabled={!canSubmit} />
        }}
      >
        <Section header={<Text>信息</Text>}>
          <TextField title="名称" value={name} onChanged={setName} />
          <TextField title="API 地址" value={url} onChanged={setUrl} />
        </Section>
      </Form>
    </NavigationStack>
  )
}
