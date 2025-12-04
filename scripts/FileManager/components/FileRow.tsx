import { Button, HStack, Image, Label, Spacer, Text, VStack, useColorScheme } from 'scripting'

import { formatDate, formatSize } from '../utils/format'

interface FileRowProps {
  name: string
  path: string
  isDirectory: boolean
  stat?: FileStat
  onPress: () => void
  onInfo: () => void
  onRename: () => void
  onDuplicate: () => void
  onDelete: () => void
}

export function FileRow({ name, path, isDirectory, stat, onPress, onInfo, onRename, onDuplicate, onDelete }: FileRowProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const icon = UIImage.fromSFSymbol(isDirectory ? 'folder.fill' : 'doc.fill')!

  return (
    <HStack
      padding={12}
      background={isDark ? '#1c1c1e' : '#ffffff'}
      frame={{ height: 60 }}
      alignment="center"
      onTapGesture={onPress}
      leadingSwipeActions={{
        allowsFullSwipe: false,
        actions: [
          <Button action={onInfo} tint="systemBlue">
            <Label title="Info" systemImage="info.circle" />
          </Button>
        ]
      }}
      trailingSwipeActions={{
        allowsFullSwipe: false,
        actions: [
          <Button action={onRename} tint="systemBlue">
            <Label title="Rename" systemImage="square.and.pencil" />
          </Button>,
          <Button action={onDuplicate} tint="systemOrange">
            <Label title="Duplicate" systemImage="plus.square.on.square" />
          </Button>,
          <Button role="destructive" action={onDelete}>
            <Label title="Delete" systemImage="trash" />
          </Button>
        ]
      }}
    >
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
    </HStack>
  )
}
