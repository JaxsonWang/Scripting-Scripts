import { Button, Form, Navigation, NavigationStack, Picker, Section, Text, Toggle } from 'scripting'

type PreferencesScreenProps = {
  showHidden: boolean
  onToggleHidden: (value: boolean) => void
  title: string
  doneLabel: string
  sectionTitle: string
  toggleLabel: string
  languageSectionTitle: string
  languagePickerTitle: string
  locale: string
  onLocaleChange: (value: string) => void
  languageOptions: { value: string; label: string }[]
}

export function PreferencesScreen({
  showHidden,
  onToggleHidden,
  title,
  doneLabel,
  sectionTitle,
  toggleLabel,
  languageSectionTitle,
  languagePickerTitle,
  locale,
  onLocaleChange,
  languageOptions
}: PreferencesScreenProps) {
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
        <Section header={<Text>{languageSectionTitle}</Text>}>
          <Picker title={languagePickerTitle} value={locale} onChanged={onLocaleChange as any}>
            {languageOptions.map(option => (
              <Text key={option.value} tag={option.value}>
                {option.label}
              </Text>
            ))}
          </Picker>
        </Section>
      </Form>
    </NavigationStack>
  )
}
