import { Label, List, NavigationStack, Section, Text, useObservable } from 'scripting'
import { DirectoryPage } from './DirectoryPage'
import type { RootTabProps } from '../types'

export const RootTab = ({ l10n, root, setTransfer, tabIndex, transfer }: RootTabProps) => {
  const navigationPath = useObservable<string[]>([])

  if (!root.path) {
    return (
      <NavigationStack tag={tabIndex} tabItem={<Label title={root.title} systemImage={root.icon} />}>
        <List navigationTitle={root.title} listStyle="inset">
          <Section title={l10n.unavailable}>
            <Text>{l10n.iCloudDisabledMessage}</Text>
          </Section>
        </List>
      </NavigationStack>
    )
  }

  return (
    <NavigationStack path={navigationPath} tag={tabIndex} tabItem={<Label title={root.title} systemImage={root.icon} />}>
      <DirectoryPage
        currentPath={root.path}
        l10n={l10n}
        navigationPath={navigationPath}
        rootPath={root.path}
        rootTitle={root.title}
        transfer={transfer}
        setTransfer={setTransfer}
      />
    </NavigationStack>
  )
}
