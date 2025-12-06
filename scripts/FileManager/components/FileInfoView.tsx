import { Button, Form, HStack, Navigation, NavigationStack, SVG, Script, Section, Spacer, Text, VStack, useMemo } from 'scripting'
import type { L10n } from '../types'
import { resolveIconName } from '../utils/file_icon'

type FileInfoViewProps = {
  name: string
  path: string
  stat: FileStat
  isDirectory: boolean
  sizeOverride?: number
  l10n: L10n
}

const formatSize = (size: number): string => {
  if (size === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1)
  const value = size / Math.pow(1024, exponent)
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

export function FileInfoView({ name, path, stat, isDirectory, sizeOverride, l10n }: FileInfoViewProps) {
  const dismiss = Navigation.useDismiss()

  const rows = useMemo(
    () => [
      { label: l10n.fileTypeLabel, value: stat.type },
      { label: l10n.fileSizeLabel, value: formatSize(sizeOverride ?? stat.size) },
      { label: l10n.fileCreatedLabel, value: new Date(stat.creationDate).toLocaleString() },
      { label: l10n.fileModifiedLabel, value: new Date(stat.modificationDate).toLocaleString() },
      { label: l10n.fileLocationLabel, value: path }
    ],
    [stat, path, l10n]
  )

  const iconPath = useMemo(() => `${Script.directory}/assets/icon/${resolveIconName(name, isDirectory)}.svg`, [name, isDirectory])

  return (
    <NavigationStack>
      <Form
        navigationTitle={l10n.fileInfoTitle}
        toolbar={{
          cancellationAction: <Button title={l10n.done} action={dismiss} />
        }}
      >
        <Section>
          <VStack spacing={12} alignment="center" frame={{ maxWidth: 'infinity' }}>
            <SVG filePath={iconPath} resizable frame={{ width: 112, height: 112 }} />
            <Text styledText={{ content: name, font: 20, fontWeight: 'bold' }} />
          </VStack>
        </Section>
        <Section header={<Text>{l10n.infoSectionTitle}</Text>}>
          {rows.map(row => (
            <HStack key={row.label} frame={{ maxWidth: 'infinity' }}>
              <Text styledText={{ content: row.label, font: 14, foregroundColor: '#8e8e93' }} />
              <Spacer />
              <Text styledText={{ content: row.value, font: 14 }} />
            </HStack>
          ))}
        </Section>
      </Form>
    </NavigationStack>
  )
}
