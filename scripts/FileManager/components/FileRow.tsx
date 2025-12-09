import { Button, Group, HStack, Image, Label, SVG, Script, Spacer, Text, VStack, useMemo } from 'scripting'

import { formatDate, formatSize } from '../utils/format'
import { resolveIconName } from '../utils/file_icon'

interface FileRowProps {
  name: string
  path: string
  isDirectory: boolean
  stat?: FileStat
  onPress?: () => void
  onCopy: () => void
  onMove: () => void
  onEdit?: () => void
  onInfo: () => void
  onRename: () => void
  onDuplicate: () => void
  onDelete: () => void
  labels: {
    copy: string
    move: string
    info: string
    edit: string
    rename: string
    duplicate: string
    delete: string
    items: (n: number) => string
  }
}

/**
 * 单行文件展示组件，包含点击和上下文菜单
 * @param props 文件行参数
 */
export const FileRow = ({ name, path, isDirectory, stat, onPress, onCopy, onMove, onEdit, onInfo, onRename, onDuplicate, onDelete, labels }: FileRowProps) => {
  const iconPath = useMemo(() => `${Script.directory}/assets/icon/${resolveIconName(name, isDirectory)}.svg`, [isDirectory, name])
  /**
   * 统计目录内的条目数量
   */
  const directoryItemCount = useMemo(() => {
    if (!isDirectory) return null
    try {
      return FileManager.readDirectorySync(path).length
    } catch (error) {
      console.error('[FileRow] readDirectorySync failed', path, error)
      return null
    }
  }, [isDirectory, path, stat])
  const detailText = useMemo(() => {
    if (!stat) return null
    const datePart = formatDate(stat.modificationDate)
    if (!isDirectory) {
      return `${datePart} - ${formatSize(stat.size)}`
    }
    if (directoryItemCount == null) {
      return datePart
    }
    return `${datePart} - ${labels.items(directoryItemCount)}`
  }, [stat, isDirectory, directoryItemCount, labels])
  return (
    <HStack
      frame={{ height: 60 }}
      alignment="center"
      contentShape="rect"
      onTapGesture={onPress}
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
              {onEdit ? (
                <Button action={onEdit}>
                  <HStack alignment="center" frame={{ maxWidth: 'infinity' }}>
                    <Text>{labels.edit}</Text>
                    <Spacer />
                    <Image systemName="pencil" frame={{ width: 16, height: 16 }} />
                  </HStack>
                </Button>
              ) : null}
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
            <Label title={labels.delete} systemImage="trash" />
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
