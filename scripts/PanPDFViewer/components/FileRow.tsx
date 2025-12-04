import { Button, HStack, Image, Spacer, Text } from 'scripting'
import type { BaiduFile } from '../utils/baidu-client'

interface FileRowProps {
  file: BaiduFile
  isSupported: boolean
  isSelected: boolean
  onToggle: (file: BaiduFile) => void
  onEnterFolder: (file: BaiduFile) => void
}

export const FileRow = (props: FileRowProps) => {
  const { file, isSupported, isSelected, onToggle, onEnterFolder } = props

  const getIconName = (filename: string, isdir: number) => {
    if (isdir === 1) return 'folder.fill'
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    if (['zip', 'rar', '7z'].includes(ext)) return 'doc.zipper'
    if (ext === 'pdf') return 'doc.text.fill'
    if (['mp4', 'mov', 'avi'].includes(ext)) return 'film'
    if (['jpg', 'png', 'jpeg'].includes(ext)) return 'photo'
    return 'doc'
  }

  const iconName = getIconName(file.server_filename, file.isdir)
  const iconColor = file.isdir === 1 ? 'systemYellow' : 'systemGray'

  const formatSize = (bytes: number) => {
    if (file.isdir === 1) return ''
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Button
      action={() => {
        if (file.isdir === 1) {
          onEnterFolder(file)
        } else if (isSupported) {
          onToggle(file)
        }
      }}
    >
      <HStack spacing={12} padding={10}>
        {/* Selection Checkbox/Circle */}
        {file.isdir === 0 && (
          <Image
            systemName={isSelected ? 'checkmark.circle.fill' : 'circle'}
            font="headline"
            foregroundStyle={isSelected && isSupported ? 'systemBlue' : isSupported ? 'systemGray' : 'systemGray4'}
          />
        )}

        {/* File Icon */}
        <Image systemName={iconName} font="title3" foregroundStyle={iconColor} />

        {/* Filename and Size */}
        <HStack>
          <Text font="body" lineLimit={1} foregroundStyle={isSupported ? 'label' : 'secondaryLabel'}>
            {file.server_filename}
          </Text>
          <Spacer />
          <Text font="caption" foregroundStyle="secondaryLabel">
            {formatSize(file.size)}
          </Text>
        </HStack>

        {!isSupported && file.isdir === 0 && (
          <Text font="caption2" foregroundStyle="systemRed">
            {'>150MB'}
          </Text>
        )}
      </HStack>
    </Button>
  )
}
