import { Button, Circle, HStack, Image, Rectangle, Spacer, Text, VStack, ZStack } from 'scripting'
import type { LiveRoomItem } from '../core/types'
import { brandGradient, coverScrim, heroScrim, palette, radius } from '../theme'
import { formatOnline } from '../utils/format'

/** 封面图：容器约束尺寸并按比例填充，加载前显示占位色 */
const Cover = ({ url, height }: { url: string; height?: number }) => (
  <Rectangle
    fill={palette.cardHi}
    frame={height ? { maxWidth: 'infinity', height } : { maxWidth: 'infinity' }}
    aspectRatio={height ? undefined : { value: 16 / 9, contentMode: 'fit' }}
    overlay={
      url ? (
        <Image imageUrl={url} resizable scaleToFill placeholder={<Rectangle fill={palette.cardHi} />} />
      ) : (
        <Image systemName="play.tv" font={22} foregroundStyle={palette.textTertiary} />
      )
    }
    clipShape={{ type: 'rect', cornerRadius: radius.md, style: 'continuous' }}
  />
)

/** 「直播中」角标：品牌渐变胶囊 + 白点 */
export const LiveBadge = ({ label = '直播中' }: { label?: string }) => (
  <HStack spacing={4} padding={{ horizontal: 7, vertical: 3 }} background={brandGradient} clipShape="capsule" fixedSize>
    <Circle fill="#FFFFFF" frame={{ width: 5, height: 5 }} />
    <Text font={10} bold foregroundStyle="#FFFFFF">
      {label}
    </Text>
  </HStack>
)

/** 双列网格里的直播间卡片：16:9 封面 + 人气 + 标题 + 主播 */
export const RoomCard = ({ room, onTap }: { room: LiveRoomItem; onTap: (room: LiveRoomItem) => void }) => (
  <Button action={() => onTap(room)} buttonStyle="plain">
    <VStack alignment="leading" spacing={7}>
      <ZStack alignment="bottomLeading">
        <Cover url={room.cover} />
        <VStack
          frame={{ maxWidth: 'infinity', height: 40 }}
          background={coverScrim}
          clipShape={{ type: 'rect', cornerRadius: radius.md, style: 'continuous' }}
        />
        <HStack spacing={3} padding={{ horizontal: 8, vertical: 6 }}>
          <Image systemName="flame.fill" font={9} foregroundStyle="#FFFFFF" />
          <Text font={11} bold monospacedDigit foregroundStyle="#FFFFFF">
            {formatOnline(room.online)}
          </Text>
        </HStack>
      </ZStack>
      <VStack alignment="leading" spacing={2} frame={{ maxWidth: 'infinity', alignment: 'leading' }}>
        <Text font="footnote" bold lineLimit={1} foregroundStyle={palette.textPrimary}>
          {room.title || '未命名直播间'}
        </Text>
        <Text font="caption" lineLimit={1} foregroundStyle={palette.textTertiary}>
          {room.userName}
        </Text>
      </VStack>
    </VStack>
  </Button>
)

/** 首页头图大卡：横版封面 + 压暗渐变 + 直播角标 + 标题 / 主播 / 观看按钮 */
export const LiveHeroCard = ({
  room,
  width,
  siteName,
  onTap
}: {
  room: LiveRoomItem
  width: number
  siteName: string
  onTap: (room: LiveRoomItem) => void
}) => {
  const frame = { width, height: width * 0.56 }
  return (
    <Button action={() => onTap(room)} buttonStyle="plain">
      <ZStack alignment="bottomLeading" frame={frame} clipShape={{ type: 'rect', cornerRadius: radius.lg, style: 'continuous' }}>
        <Rectangle
          fill={palette.cardHi}
          frame={frame}
          overlay={room.cover ? <Image imageUrl={room.cover} resizable scaleToFill placeholder={<Rectangle fill={palette.cardHi} />} /> : undefined}
        />
        <VStack frame={frame} background={heroScrim} />
        <VStack alignment="leading" spacing={8} padding={16} frame={{ width }}>
          <HStack spacing={6}>
            <LiveBadge />
            <Text font={10} bold foregroundStyle="#FFFFFF" padding={{ horizontal: 7, vertical: 3 }} background="rgba(255,255,255,0.2)" clipShape="capsule">
              {siteName}
            </Text>
          </HStack>
          <Text font="title3" bold lineLimit={2} foregroundStyle="#FFFFFF">
            {room.title || '未命名直播间'}
          </Text>
          <HStack alignment="center" spacing={8}>
            <Text font="caption" lineLimit={1} foregroundStyle="rgba(255,255,255,0.78)">
              {`${room.userName} · ${formatOnline(room.online)} 热度`}
            </Text>
            <Spacer />
            <HStack spacing={5} padding={{ horizontal: 14, vertical: 7 }} background="#FFFFFF" clipShape="capsule">
              <Image systemName="play.fill" font={11} foregroundStyle={palette.ink} />
              <Text font="caption" bold foregroundStyle={palette.ink}>
                观看
              </Text>
            </HStack>
          </HStack>
        </VStack>
      </ZStack>
    </Button>
  )
}

/** 头像：网络图片裁成圆形；live 为真时外圈描品牌渐变 */
export const Avatar = ({ url, size = 40, live }: { url?: string; size?: number; live?: boolean }) => {
  const image = (
    <Rectangle
      fill={palette.cardHi}
      frame={{ width: size, height: size }}
      overlay={
        url ? (
          <Image imageUrl={url} resizable scaleToFill placeholder={<Image systemName="person.fill" foregroundStyle={palette.textTertiary} />} />
        ) : (
          <Image systemName="person.fill" font={size * 0.45} foregroundStyle={palette.textTertiary} />
        )
      }
      clipShape="circle"
    />
  )
  if (!live) return image
  return (
    <ZStack frame={{ width: size + 6, height: size + 6 }}>
      <Circle stroke={{ shapeStyle: brandGradient, strokeStyle: { lineWidth: 2 } }} frame={{ width: size + 5, height: size + 5 }} />
      {image}
    </ZStack>
  )
}

/** 「直播中 / 未开播 / 查询中」状态文字 */
export const LiveDot = ({ state }: { state: 0 | 1 | 2 }) =>
  state === 2 ? (
    <HStack spacing={4}>
      <Circle fill={palette.live} frame={{ width: 6, height: 6 }} />
      <Text font="caption" bold foregroundStyle={palette.live}>
        直播中
      </Text>
    </HStack>
  ) : (
    <Text font="caption" foregroundStyle={palette.textTertiary}>
      {state === 1 ? '未开播' : '查询中…'}
    </Text>
  )
