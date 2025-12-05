import { Button, Group, HStack, Image, Label, Spacer, Text, VStack, useColorScheme } from 'scripting'

import { formatDate, formatSize } from '../utils/format'

interface FileRowProps {
  name: string
  path: string
  isDirectory: boolean
  stat?: FileStat
  onPress: () => void
  onCopy: () => void
  onMove: () => void
  onInfo: () => void
  onRename: () => void
  onDuplicate: () => void
  onDelete: () => void
}

export function FileRow({ name, path, isDirectory, stat, onPress, onCopy, onMove, onInfo, onRename, onDuplicate, onDelete }: FileRowProps) {
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
      contextMenu={{
        menuItems: (
          <Group>
            <VStack spacing={8}>
              <HStack spacing={8}>
                <Button title="拷贝" action={onCopy} />
                <Button title="移动" action={onMove} />
              </HStack>
              <Button action={onInfo}>
                <HStack alignment="center" frame={{ maxWidth: 'infinity' }}>
                  <Text>显示简介</Text>
                  <Spacer />
                  <Image image={UIImage.fromSFSymbol('info.circle')!} frame={{ width: 16, height: 16 }} />
                </HStack>
              </Button>
              <Button action={onRename}>
                <HStack alignment="center" frame={{ maxWidth: 'infinity' }}>
                  <Text>重新命名</Text>
                  <Spacer />
                  <Image image={UIImage.fromSFSymbol('square.and.pencil')!} frame={{ width: 16, height: 16 }} />
                </HStack>
              </Button>
              <Button action={onDuplicate} tint="systemOrange">
                <HStack alignment="center" frame={{ maxWidth: 'infinity' }}>
                  <Text>复制</Text>
                  <Spacer />
                  <Image image={UIImage.fromSFSymbol('plus.square.on.square')!} frame={{ width: 16, height: 16 }} />
                </HStack>
              </Button>
              <Button role="destructive" action={onDelete}>
                <HStack alignment="center" frame={{ maxWidth: 'infinity' }}>
                  <Text>删除</Text>
                  <Spacer />
                  <Image image={UIImage.fromSFSymbol('trash')!} frame={{ width: 16, height: 16 }} />
                </HStack>
              </Button>
            </VStack>
          </Group>
        )
      }}
      trailingSwipeActions={{
        actions: [
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
