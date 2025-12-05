import { Button, Form, Navigation, NavigationStack, Section, Text, Toggle } from 'scripting'

type PreferencesScreenProps = {
  showHidden: boolean
  onToggleHidden: (value: boolean) => void
}

export function PreferencesScreen({ showHidden, onToggleHidden }: PreferencesScreenProps) {
  const dismiss = Navigation.useDismiss()

  return (
    <NavigationStack>
      <Form
        navigationTitle="偏好设置"
        toolbar={{
          cancellationAction: <Button title="完成" action={dismiss} />
        }}
      >
        <Section header={<Text>列表显示</Text>}>
          <Toggle title="显示隐藏文件" value={showHidden} onChanged={onToggleHidden} />
        </Section>
      </Form>
    </NavigationStack>
  )
}
