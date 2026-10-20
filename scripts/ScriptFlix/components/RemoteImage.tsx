import { Image, Rectangle, Text, VStack } from 'scripting'
import { palette, radius } from '../theme'
import type { RemoteImageProps } from '../types'

/** 用容器约束填充图片，避免海报原始尺寸撑大网格。 */
export const RemoteImage = ({ url, frame }: RemoteImageProps) => {
  const placeholder = (
    <VStack frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} background={palette.cardHi}>
      <Text font={24} foregroundStyle={palette.textTertiary}>
        🎬
      </Text>
    </VStack>
  )
  return (
    <Rectangle
      fill={palette.cardHi}
      frame={{ width: frame?.width, maxWidth: frame?.width ?? 'infinity', height: frame?.height }}
      overlay={url ? <Image imageUrl={url} resizable scaleToFill placeholder={placeholder} /> : placeholder}
      clipShape={{ type: 'rect', cornerRadius: radius.md, style: 'continuous' }}
    />
  )
}
