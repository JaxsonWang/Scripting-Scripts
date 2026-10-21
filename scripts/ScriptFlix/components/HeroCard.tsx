import { Button, HStack, Image, Spacer, Text, VStack, ZStack } from 'scripting'
import { RemoteImage } from './RemoteImage'
import { brandGradient, heroScrim, palette, radius } from '../theme'
import type { VideoItem } from '../types'

type HeroCardProps = {
  video: VideoItem
  width: number
  onTap: (video: VideoItem) => void
}

/**
 * 首页 Hero 大卡：横版大图 + 压暗渐变 + 标题/标签/播放按钮。
 */
export const HeroCard = ({ video, width, onTap }: HeroCardProps) => {
  const frame = { width, height: 200 }
  return (
    <Button action={() => onTap(video)} buttonStyle="plain">
      <ZStack alignment="bottomLeading" frame={frame} clipShape={{ type: 'rect', cornerRadius: radius.lg, style: 'continuous' }}>
        <RemoteImage url={video.vod_pic_slide || video.vod_pic} frame={frame} />
        <VStack frame={{ width, height: 200 }} background={heroScrim} />
        <VStack alignment="leading" spacing={8} padding={16} frame={{ width }}>
          <HStack spacing={6}>
            {!!video.vod_remarks && (
              <Text
                font={10}
                bold
                lineLimit={1}
                foregroundStyle="#FFFFFF"
                padding={{ horizontal: 8, vertical: 3 }}
                background={brandGradient}
                clipShape="capsule"
              >
                {video.vod_remarks}
              </Text>
            )}
            {!!video.vod_area && (
              <Text font={10} foregroundStyle="#FFFFFF" padding={{ horizontal: 8, vertical: 3 }} background="rgba(255,255,255,0.18)" clipShape="capsule">
                {video.vod_area}
              </Text>
            )}
          </HStack>
          <Text font="title2" bold lineLimit={1} foregroundStyle="#FFFFFF">
            {video.vod_name}
          </Text>
          <HStack alignment="center">
            <Text font="caption" lineLimit={1} foregroundStyle="rgba(255,255,255,0.75)">
              {video.vod_sub || [video.vod_year, video.type_name].filter(Boolean).join(' · ')}
            </Text>
            <Spacer />
            <HStack spacing={5} alignment="center" padding={{ horizontal: 14, vertical: 7 }} background="#FFFFFF" clipShape="capsule">
              <Image systemName="play.fill" font={11} foregroundStyle={palette.ink} />
              <Text font="caption" bold foregroundStyle={palette.ink}>
                播放
              </Text>
            </HStack>
          </HStack>
        </VStack>
      </ZStack>
    </Button>
  )
}
