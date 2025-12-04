import { Button, HStack, Image, Spacer, Text, VStack, useColorScheme } from 'scripting'

import { formatDate, formatSize } from '../utils/format'

interface FileRowProps {
  name: string
  path: string
  isDirectory: boolean
  stat?: FileStat
  onPress: () => void
  onMore: () => void
}

export function FileRow({ name, path, isDirectory, stat, onPress, onMore }: FileRowProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const icon = UIImage.fromSFSymbol(isDirectory ? 'folder.fill' : 'doc.fill')!
  const moreIcon = UIImage.fromSFSymbol('ellipsis.circle')!

  return (
    <Button action={onPress}>
      <HStack padding={12} background={isDark ? '#1c1c1e' : '#ffffff'} frame={{ height: 60 }} alignment="center">
        <Image image={icon} frame={{ width: 24, height: 24 }} />
        <VStack padding={{ leading: 12 }} layoutPriority={1}>
          <Text styledText={{ content: name, font: 16, foregroundColor: isDark ? '#ffffff' : '#000000' }} />
          {stat && (
            <Text
              styledText={{
                content: `${formatDate(stat.modificationDate)} - ${isDirectory ? 'Item' : formatSize(stat.size)}`,
                font: 12,
                foregroundColor: '#8e8e93'
              }}
            />
          )}
        </VStack>
        <Spacer />
        <Button action={onMore}>
          <Image image={moreIcon} frame={{ width: 24, height: 24 }} />
        </Button>
      </HStack>
    </Button>
  )
}
