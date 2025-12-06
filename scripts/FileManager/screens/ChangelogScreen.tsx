import { Form, NavigationStack, Section, Text, VStack } from 'scripting'
import type { ChangelogScreenProps } from '../types'
import script from '../script.json'

/**
 * 展示脚本版本及更新内容
 * @param props 变更日志参数
 */
export const ChangelogScreen = ({ title, versionLabel, version, entries, emptyLabel }: ChangelogScreenProps) => {
  const list = entries ?? []

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
                File Manager {'v' + script.version}
                {'\n'}
                淮城一只猫© - Power by Scripting
              </Text>
            </VStack>
          }
        >
          {list.length === 0 ? (
            <Text foregroundStyle="secondaryLabel">{emptyLabel}</Text>
          ) : (
            <VStack alignment="leading" spacing={12}>
              {list.map((entry, index) => (
                <Text key={`${entry}-${index}`} styledText={{ content: `${index + 1}. ${entry}`, font: 14 }} />
              ))}
            </VStack>
          )}
        </Section>
      </Form>
    </NavigationStack>
  )
}
