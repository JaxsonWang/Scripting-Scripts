import { Button, Form, HStack, Navigation, NavigationStack, SVG, Script, Section, Spacer, Text, VStack, useEffect, useMemo, useState } from 'scripting'
import type { FileInfoViewProps } from '../types'
import { resolveIconName } from '../utils/file_icon'
import { computeDirectorySize } from '../utils/file_size'

/**
 * 格式化文件大小
 * @param size 字节数
 */
const formatSize = (size: number): string => {
  if (size === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1)
  const value = size / Math.pow(1024, exponent)
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

/**
 * 文件信息视图，显示图标及基本元数据
 * @param props 信息视图参数
 */
export const FileInfoView = ({ name, path, stat, isDirectory, sizeOverride, autoComputeSize, l10n }: FileInfoViewProps) => {
  const dismiss = Navigation.useDismiss()
  const [size, setSize] = useState(sizeOverride ?? stat.size)
  const [sizeLoading, setSizeLoading] = useState<boolean>(Boolean(autoComputeSize && sizeOverride == null && isDirectory))

  useEffect(() => {
    let cancelled = false
    if (sizeLoading) {
      computeDirectorySize(path)
        .then(total => {
          if (!cancelled) {
            setSize(total)
            setSizeLoading(false)
          }
        })
        .catch(error => {
          console.error('[FileInfoView] computeDirectorySize failed', path, error)
          if (!cancelled) {
            setSizeLoading(false)
          }
        })
    }
    return () => {
      cancelled = true
    }
  }, [sizeLoading, path])

  const rows = useMemo(
    () => [
      { label: l10n.fileTypeLabel, value: stat.type },
      { label: l10n.fileSizeLabel, value: sizeLoading ? l10n.calculatingSize : formatSize(size) },
      { label: l10n.fileCreatedLabel, value: new Date(stat.creationDate).toLocaleString() },
      { label: l10n.fileModifiedLabel, value: new Date(stat.modificationDate).toLocaleString() },
      { label: l10n.fileLocationLabel, value: path }
    ],
    [stat, path, l10n, sizeLoading, size]
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
