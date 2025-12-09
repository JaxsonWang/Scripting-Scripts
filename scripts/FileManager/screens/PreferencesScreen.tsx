import { Button, Form, HStack, Navigation, NavigationLink, NavigationStack, Picker, Script, Section, Spacer, Text, Toggle, VStack } from 'scripting'
import type { Locale, PreferencesScreenProps } from '../types'
import { ChangelogScreen } from './ChangelogScreen'

/**
 * 偏好面板，控制显示隐藏项、语言与查看更新日志
 * @param props 偏好设置属性
 */

export const PreferencesScreen = ({
  showHidden,
  onToggleHidden,
  title,
  doneLabel,
  sectionTitle,
  toggleLabel,
  languageSectionTitle,
  languagePickerTitle,
  changelogSectionTitle,
  changelogButtonLabel,
  changelogTitle,
  changelogEmpty,
  versionLabel,
  locale,
  onLocaleChange,
  languageOptions,
  onLanguageChanged
}: PreferencesScreenProps) => {
  const dismiss = Navigation.useDismiss()
  const version = Script.metadata?.version ?? '1.0.0'

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
          <Picker
            title={languagePickerTitle}
            value={locale}
            onChanged={(value: string) => {
              onLocaleChange(value as Locale)
              dismiss()
              if (onLanguageChanged) {
                setTimeout(() => {
                  onLanguageChanged()
                }, 0)
              }
            }}
          >
            {languageOptions.map(option => (
              <Text key={option.value} tag={option.value}>
                {option.label}
              </Text>
            ))}
          </Picker>
        </Section>
        <Section
          header={<Text>{changelogSectionTitle}</Text>}
          footer={
            <VStack spacing={10} alignment="leading">
              <Text font="footnote" foregroundStyle="secondaryLabel">
                File Manager {'v' + version}
                {'\n'}
                淮城一只猫© - Power by Scripting
              </Text>
            </VStack>
          }
        >
          <NavigationLink destination={<ChangelogScreen title={changelogTitle} versionLabel={versionLabel} version={version} emptyLabel={changelogEmpty} />}>
            <HStack frame={{ maxWidth: 'infinity' }}>
              <Text>{changelogButtonLabel}</Text>
              <Spacer />
              <Text foregroundStyle="secondaryLabel">v{version}</Text>
            </HStack>
          </NavigationLink>
        </Section>
      </Form>
    </NavigationStack>
  )
}
