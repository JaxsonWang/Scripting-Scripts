import { Button, Group, HStack, Image, Label, SVG, Spacer, Text, VStack, useColorScheme, useMemo, Script } from 'scripting'

import { formatDate, formatSize } from '../utils/format'

const extensionIconMap: Record<string, string> = {
  apk: 'apk',
  css: 'css',
  csv: 'file',
  doc: 'doc',
  docx: 'doc',
  exe: 'exe',
  gif: 'image-gif',
  heic: 'image',
  heif: 'image',
  html: 'code',
  ipa: 'ipa',
  jpeg: 'image-jpeg',
  jpg: 'image-jpeg',
  js: 'js',
  json: 'code',
  jsx: 'code',
  key: 'ppt',
  m4a: 'music',
  md: 'txt',
  mkv: 'video',
  mov: 'video',
  mp3: 'mp3',
  mp4: 'mp4',
  numbers: 'numbers',
  pdf: 'pdf',
  png: 'image-png',
  ppt: 'ppt',
  pptx: 'ppt',
  rar: 'rar',
  svg: 'image',
  ts: 'code',
  tsx: 'code',
  txt: 'txt',
  wav: 'music',
  webp: 'image',
  xls: 'els',
  xlsx: 'els',
  xt: 'xt',
  zip: 'zip'
}

/**
 * 根据文件名和目录标记解析出对应的 SVG 图标文件名，未知类型统一回退为 `untitled`.
 */
const resolveIconName = (fileName: string, isDirectory: boolean): string => {
  if (isDirectory) return 'folder'
  const extension = fileName.split('.').pop()?.toLowerCase()
  if (!extension || extension === fileName.toLowerCase()) return 'untitled'
  return extensionIconMap[extension] ?? 'untitled'
}

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

  const iconPath = useMemo(() => `${Script.directory}/assets/icon/${resolveIconName(name, isDirectory)}.svg`, [isDirectory, name])
  /**
   * 统计目录内的条目数量，用于替换“Item”文案，避免硬编码。
   */
  const directoryItemCount = useMemo(() => {
    if (!isDirectory) return null
    try {
      return FileManager.readDirectorySync(path).length
    } catch (error) {
      console.error(error)
      return null
    }
  }, [isDirectory, path])
  const detailText = stat && `${formatDate(stat.modificationDate)} - ${isDirectory ? `${directoryItemCount ?? 0} 项` : formatSize(stat.size)}`
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
              <Button action={onDuplicate}>
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
      <SVG filePath={iconPath} frame={{ width: 24, height: 24 }} />
      <VStack padding={{ leading: 12 }} layoutPriority={1} alignment="leading">
        <Text styledText={{ content: name, font: 16, foregroundColor: isDark ? '#ffffff' : '#000000' }} />
        {detailText ? (
          <Text
            styledText={{
              content: detailText,
              font: 12,
              foregroundColor: '#8e8e93'
            }}
          />
        ) : null}
      </VStack>
      <Spacer />
    </HStack>
  )
}
