import { Button, Form, Navigation, NavigationStack, Section, Text, Toggle } from 'scripting'

type PreferencesScreenProps = {
  showHidden: boolean
  onToggleHidden: (value: boolean) => void
  title: string
  doneLabel: string
  sectionTitle: string
  toggleLabel: string
}

export function PreferencesScreen({ showHidden, onToggleHidden, title, doneLabel, sectionTitle, toggleLabel }: PreferencesScreenProps) {
  const dismiss = Navigation.useDismiss()

  return (
    <NavigationStack>
      <Form
        navigationTitle={title}
        toolbar={{
          cancellationAction: <Button title={doneLabel} action={dismiss} />
        }}
      >
        <Section header={<Text>{sectionTitle}</Text>}>
          <Toggle title={toggleLabel} value={showHidden} onChanged={onToggleHidden} />
        </Section>
      </Form>
    </NavigationStack>
  )
}
