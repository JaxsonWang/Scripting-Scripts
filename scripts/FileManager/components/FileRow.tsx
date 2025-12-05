import { Button, Group, HStack, Image, Label, SVG, Script, Spacer, Text, VStack, useMemo } from 'scripting'

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
  onPress?: () => void
  onCopy: () => void
  onMove: () => void
  onInfo: () => void
  onRename: () => void
  onDuplicate: () => void
  onDelete: () => void
  labels: {
    copy: string
    move: string
    info: string
    rename: string
    duplicate: string
    delete: string
    items: (n: number) => string
  }
}

export function FileRow({ name, path, isDirectory, stat, onPress, onCopy, onMove, onInfo, onRename, onDuplicate, onDelete, labels }: FileRowProps) {
  const iconPath = useMemo(() => `${Script.directory}/assets/icon/${resolveIconName(name, isDirectory)}.svg`, [isDirectory, name])
  /**
   * 统计目录内的条目数量
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
  const detailText = stat && `${formatDate(stat.modificationDate)} - ${isDirectory ? labels.items(directoryItemCount ?? 0) : formatSize(stat.size)}`
  return (
    <HStack
      frame={{ height: 60 }}
      alignment="center"
      contentShape="rect"
      onTapGesture={() => {
        if (!onPress) return
        console.log('[FileRow] tap', path)
        onPress()
      }}
      contextMenu={{
        menuItems: (
          <Group>
            <VStack spacing={8}>
              <Button action={onCopy}>
                <HStack alignment="center" frame={{ maxWidth: 'infinity' }}>
                  <Text>{labels.copy}</Text>
                  <Spacer />
                  <Image systemName="doc.on.doc" frame={{ width: 16, height: 16 }} />
                </HStack>
              </Button>
              <Button action={onMove}>
                <HStack alignment="center" frame={{ maxWidth: 'infinity' }}>
                  <Text>{labels.move}</Text>
                  <Spacer />
                  <Image systemName="folder" frame={{ width: 16, height: 16 }} />
                </HStack>
              </Button>
              <Button action={onInfo}>
                <HStack alignment="center" frame={{ maxWidth: 'infinity' }}>
                  <Text>{labels.info}</Text>
                  <Spacer />
                  <Image systemName="info.circle" frame={{ width: 16, height: 16 }} />
                </HStack>
              </Button>
              <Button action={onRename}>
                <HStack alignment="center" frame={{ maxWidth: 'infinity' }}>
                  <Text>{labels.rename}</Text>
                  <Spacer />
                  <Image systemName="square.and.pencil" frame={{ width: 16, height: 16 }} />
                </HStack>
              </Button>
              <Button action={onDuplicate}>
                <HStack alignment="center" frame={{ maxWidth: 'infinity' }}>
                  <Text>{labels.duplicate}</Text>
                  <Spacer />
                  <Image systemName="plus.square.on.square" frame={{ width: 16, height: 16 }} />
                </HStack>
              </Button>
              <Button role="destructive" action={onDelete}>
                <HStack alignment="center" frame={{ maxWidth: 'infinity' }}>
                  <Text>{labels.delete}</Text>
                  <Spacer />
                  <Image systemName="trash" frame={{ width: 16, height: 16 }} />
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
      <SVG filePath={iconPath} resizable frame={{ width: 64, height: 64 }} />
      <VStack layoutPriority={1} alignment="leading">
        <Text styledText={{ content: name, font: 16 }} />
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
