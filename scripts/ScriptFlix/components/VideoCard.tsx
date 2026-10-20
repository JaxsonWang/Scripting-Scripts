import { Button, HStack, Image, Spacer, Text, VStack, ZStack } from 'scripting'
import { RemoteImage } from './RemoteImage'
import { brandGradient, palette, posterScrim, radius } from '../theme'
import type { VideoCardProps, VideoItem } from '../types'

/**
 * 竖版海报卡：封面 + 底部压暗渐变 + 角标 + 评分，点击进入详情。
 */
export const VideoCard = <T extends VideoItem>({ video, onTap, width }: VideoCardProps<T>) => {
  const posterHeight = 168
  const posterFrame = { width, height: posterHeight }
  const fluidFrame = { width, maxWidth: width ?? ('infinity' as const), height: posterHeight }
  const columnFrame = { width, maxWidth: width ?? ('infinity' as const), alignment: 'leading' as const }
  const scoreValue = Number(video.vod_score)
  const score = Number.isFinite(scoreValue) && scoreValue > 0 ? scoreValue.toFixed(1) : ''

  return (
    <Button action={() => onTap(video)} buttonStyle="plain">
      <VStack spacing={8} frame={columnFrame} alignment="leading">
        <ZStack alignment="bottom" frame={fluidFrame}>
          <RemoteImage url={video.vod_pic} frame={posterFrame} />

          {/* 底部压暗，保证角标文字清晰 */}
          <VStack
            frame={{ maxWidth: 'infinity', height: 56 }}
            background={posterScrim}
            clipShape={{ type: 'rect', cornerRadius: radius.md, style: 'continuous' }}
          />

          {/* 顶部角标 + 评分 */}
          <VStack frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'top' }} padding={8}>
            <HStack>
              {!!video.vod_remarks && (
                <Text
                  font={10}
                  bold
                  lineLimit={1}
                  foregroundStyle="#FFFFFF"
                  padding={{ horizontal: 7, vertical: 3 }}
                  background={brandGradient}
                  clipShape="capsule"
                >
                  {video.vod_remarks}
                </Text>
              )}
              <Spacer />
              {!!score && (
                <HStack spacing={2} padding={{ horizontal: 6, vertical: 3 }} background="rgba(7,6,12,0.55)" clipShape="capsule">
                  <Image systemName="star.fill" font={8} foregroundStyle={palette.gold} />
                  <Text font={10} bold foregroundStyle={palette.gold}>
                    {score}
                  </Text>
                </HStack>
              )}
            </HStack>
          </VStack>

          {/* 底部播放时长 */}
          {!!video.vod_duration && (
            <VStack frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'bottomTrailing' }} padding={8}>
              <Text font={10} foregroundStyle="#FFFFFF">
                {video.vod_duration}
              </Text>
            </VStack>
          )}
        </ZStack>

        <VStack alignment="leading" spacing={2} frame={columnFrame}>
          <Text font="footnote" bold lineLimit={1} foregroundStyle={palette.textPrimary}>
            {video.vod_name}
          </Text>
          <Text font={10} lineLimit={1} foregroundStyle={palette.textTertiary}>
            {[video.vod_year, video.type_name].filter(Boolean).join(' · ')}
          </Text>
        </VStack>
      </VStack>
    </Button>
  )
}
