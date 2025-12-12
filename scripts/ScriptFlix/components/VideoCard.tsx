import { Button, RoundedRectangle, Text, VStack, ZStack } from 'scripting'
import { RemoteImage } from './RemoteImage'
import type { VideoCardProps } from '../types'

/**
 * 展示单个视频的海报与关键信息，并在点击后触发播放回调
 * @param video 即将展示的视频条目
 * @param onTap 点击后触发的回调，传入视频 ID
 * @param width 可选的固定宽度，用于横向滚动场景
 */
export const VideoCard = ({ video, onTap, width }: VideoCardProps) => {
  const frameProps = width ? { width } : {}

  return (
    <Button action={onTap}>
      <VStack spacing={6} frame={frameProps}>
        {/* Poster Image */}
        <ZStack alignment="topTrailing">
          <VStack
            // 使用 RoundedRectangle 提供圆角背景
            background={<RoundedRectangle cornerRadius={8} style="continuous" fill="secondarySystemBackground" />}
            clipShape={{ type: 'rect', cornerRadius: 8, style: 'continuous' }}
            frame={{ height: 160 }}
          >
            <RemoteImage url={video.vod_pic} frame={{ height: 160 }} />
          </VStack>

          {/* Remarks Badge */}
          {!!video.vod_remarks && (
            <VStack padding={4}>
              <Text
                font={9}
                foregroundStyle="white"
                background={<RoundedRectangle cornerRadius={4} fill={{ color: 'black', opacity: 0.7 }} />}
                padding={{ horizontal: 6, vertical: 2 }}
              >
                {video.vod_remarks}
              </Text>
            </VStack>
          )}
        </ZStack>

        {/* Info */}
        <VStack spacing={2} alignment="center">
          <Text font="caption" lineLimit={1} bold foregroundStyle="#e50914">
            {video.vod_name}
          </Text>
          <Text font={10} foregroundStyle="gray" lineLimit={1}>
            {video.vod_year || '未知'}
          </Text>
        </VStack>
      </VStack>
    </Button>
  )
}
