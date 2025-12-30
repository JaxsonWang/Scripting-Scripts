import { Circle, Image, Text, VStack, useEffect, useState } from 'scripting'
import type { RemoteImageProps } from '../types'

/**
 * 加载远程图片并在加载完成后展示，常用于视频海报等体积较大的资源
 * @param url 需要请求的图片地址
 * @param frame 容器尺寸，便于在加载前占位
 */
export const RemoteImage = ({ url, frame }: RemoteImageProps) => {
  if (!url) {
    return (
      <VStack frame={frame} background="systemBackground" alignment="center">
        <Text font="caption" foregroundStyle="gray">
          Loading...
        </Text>
      </VStack>
    )
  }

  return <Image imageUrl={url} resizable scaleToFit frame={frame} />
}
