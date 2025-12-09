import { SVG, Script, Spacer, Text, VStack } from 'scripting'
import type { DirectoryEmptyStateProps } from '../types'

/**
 * 空目录占位视图
 * @param props 包含提示文案
 */
export const DirectoryEmptyState = ({ message }: DirectoryEmptyStateProps) => {
  return (
    <VStack frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} alignment="center">
      <Spacer />
      <SVG filePath={`${Script.directory}/assets/icon/folder.svg`} resizable frame={{ width: 128, height: 128 }} />
      <Text styledText={{ content: message, font: 16, fontWeight: 'bold', foregroundColor: '#8e8e93' }} />
      <Spacer />
    </VStack>
  )
}
