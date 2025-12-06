import { Button, Form, Navigation, NavigationStack, Picker, Section, Text, Toggle, VStack } from 'scripting'
import script from '../script.json'

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
        <Section
          header={<Text>{languageSectionTitle}</Text>}
          footer={
            <VStack spacing={10} alignment="leading">
              <Text font="footnote" foregroundStyle="secondaryLabel">
                File Manager {'v' + script.version}
                {'\n'}
                淮城一只猫© - Power by Scripting
              </Text>
            </VStack>
          }
        >
          <Picker title={languagePickerTitle} value={locale} onChanged={onLocaleChange}>
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
