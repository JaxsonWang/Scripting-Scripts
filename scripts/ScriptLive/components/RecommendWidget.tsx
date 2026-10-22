import { AccessoryWidgetBackground, HStack, Image, Link, Rectangle, Spacer, Text, VStack, ZStack } from 'scripting'
import type { Color, ColorScheme, LinearGradient, VirtualNode, WidgetFamily } from 'scripting'
import type { WidgetSource } from '../services/settings'
import type { WidgetRoom } from '../services/widget-picks'
import { SITE_STYLE, brandGradient, heroScrim, palette, paletteFor, pickTone } from '../theme'
import type { Tone } from '../theme'
import { formatOnline } from '../utils/format'
import { LiveBadge } from './RoomCard'
import { SiteLogo } from './SiteLogo'

type Size = { width: number; height: number }

/** 一个推荐直播间：已缩放的封面（加载失败为 null）+ 点击后打开直播间的链接 */
export type WidgetCover = {
  room: WidgetRoom
  image: UIImage | null
  url: string
}

export type WidgetEnvironment = {
  family: WidgetFamily
  size: Size
  /** ScriptLive 外观设置；undefined 表示跟随系统 */
  scheme: ColorScheme | undefined
  /** 透明 / 模糊背景模式下由系统绘制背景，内容不能铺不透明底色 */
  showsBackground: boolean
  source: WidgetSource
  intervalMinutes: number
  /** 本轮推荐的开始时间 */
  slotStart: Date
}

/** 模糊封面底图上的遮罩：日间铺浅色，夜间压暗，保证文字可读 */
const VEIL: Tone<LinearGradient> = {
  light: { colors: ['rgba(246,243,242,0.66)', 'rgba(246,243,242,0.93)'], startPoint: 'topLeading', endPoint: 'bottomTrailing' },
  dark: { colors: ['rgba(8,7,10,0.5)', 'rgba(8,7,10,0.88)'], startPoint: 'topLeading', endPoint: 'bottomTrailing' }
}

/** 小号整幅封面的压暗：顶部托住角标，底部托住标题 */
const SMALL_SCRIM: LinearGradient = {
  stops: [
    { color: 'rgba(8,7,10,0.5)', location: 0 },
    { color: 'rgba(8,7,10,0)', location: 0.3 },
    { color: 'rgba(8,7,10,0.25)', location: 0.52 },
    { color: 'rgba(8,7,10,0.92)', location: 1 }
  ],
  startPoint: 'top',
  endPoint: 'bottom'
}

/** 小封面底部的压暗，托住热度 */
const THUMB_SCRIM: LinearGradient = { colors: ['rgba(8,7,10,0)', 'rgba(8,7,10,0.72)'], startPoint: 'top', endPoint: 'bottom' }

/** shadow 只接受固定色，跟随系统时取两种外观都自然的中性值 */
const shadowOf = (scheme: ColorScheme | undefined, radius: number) => ({
  color: (scheme === 'light' ? 'rgba(26,22,21,0.22)' : scheme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.32)') as Color,
  radius,
  y: Math.round(radius / 2)
})

const titleOf = (room: WidgetRoom) => room.title || `${room.userName}的直播间`

const pad = (value: number) => String(value).padStart(2, '0')

/** 每天换一批时显示日期，否则显示这一轮的开始时间 */
const slotLabel = (env: WidgetEnvironment) =>
  env.intervalMinutes >= 1440
    ? `${env.slotStart.getMonth() + 1}月${env.slotStart.getDate()}日`
    : `${pad(env.slotStart.getHours())}:${pad(env.slotStart.getMinutes())}`

const sourceLabel = (source: WidgetSource) => (source === 'mix' ? '四平台精选' : SITE_STYLE[source].name)

/** 中号：封面贴合上下内边距，宽度最多占一半略多，右侧留给标题 */
export const mediumMetrics = (size: Size) => {
  const padding = 12
  const coverHeight = size.height - padding * 2
  const coverWidth = Math.round(Math.min((coverHeight * 4) / 3, (size.width - padding * 2) * 0.54))
  return { padding, coverWidth, coverHeight, titleLines: size.height >= 150 ? 3 : 2 }
}

/** 大号：先按宽度排三列 16:9 小封面，主推大卡吃掉剩余高度（最高 16:9） */
export const largeMetrics = (size: Size) => {
  const padding = 14
  const gap = 10
  const innerWidth = size.width - padding * 2
  const gridWidth = Math.floor((innerWidth - gap * 2) / 3)
  const gridHeight = Math.round((gridWidth * 9) / 16)
  // 内边距、标题行、主推下方间距、「更多推荐」标题、小卡下方两行文字
  const fixedHeight = padding * 2 + 30 + 14 + 22 + 32
  const heroHeight = Math.round(Math.max(120, Math.min((innerWidth * 9) / 16, size.height - fixedHeight - gridHeight)))
  return { padding, gap, innerWidth, gridWidth, gridHeight, heroHeight }
}

/**
 * 各尺寸需要的封面尺寸（pt），顺序与 covers 一致；widget.tsx 据此只加载并缩放用得到的图片
 * @param family 小组件尺寸
 * @param size 小组件显示尺寸
 */
export const coverTargets = (family: WidgetFamily, size: Size): Size[] => {
  switch (family) {
    case 'systemSmall':
      return [size]
    case 'systemMedium': {
      const { coverWidth, coverHeight } = mediumMetrics(size)
      return [{ width: coverWidth, height: coverHeight }]
    }
    case 'systemLarge':
    case 'systemExtraLarge':
    case 'systemExtraLargePortrait': {
      const { innerWidth, heroHeight, gridWidth, gridHeight } = largeMetrics(size)
      return [{ width: innerWidth, height: heroHeight }, ...Array.from({ length: 3 }, () => ({ width: gridWidth, height: gridHeight }))]
    }
    default:
      return []
  }
}

/** 封面：容器约束填充，避免原图尺寸撑开布局；无图时用品牌渐变占位 */
const Cover = ({ image, width, height, cornerRadius }: { image: UIImage | null; width?: number; height?: number; cornerRadius: number }) => {
  const frame = width && height ? { width, height } : { maxWidth: 'infinity' as const, maxHeight: 'infinity' as const }
  const shape = { type: 'rect' as const, cornerRadius, style: 'continuous' as const }
  if (!image) {
    return (
      <ZStack frame={frame} background={brandGradient} clipShape={shape}>
        <Image systemName="play.tv" font={Math.max(14, Math.round((width ?? 120) * 0.2))} foregroundStyle="rgba(255,255,255,0.85)" />
      </ZStack>
    )
  }
  return (
    <Rectangle
      fill="rgba(127,127,127,0.2)"
      frame={frame}
      overlay={<Image image={image} resizable scaleToFill widgetAccentedRenderingMode="accentedDesaturated" />}
      clipShape={shape}
    />
  )
}

/**
 * 封面上的信息层：外层固定尺寸、铺压暗渐变并裁圆角，内层负责内边距。
 * 内边距与固定尺寸分在两层，修饰符的先后不会把卡片撑大。
 */
const CoverOverlay = ({
  width,
  height,
  cornerRadius,
  scrim,
  padding,
  alignment = 'topLeading',
  children
}: {
  width: number
  height: number
  cornerRadius: number
  scrim: LinearGradient
  padding: number | { horizontal: number; vertical: number }
  alignment?: 'topLeading' | 'bottomLeading'
  children: VirtualNode | VirtualNode[]
}) => (
  <VStack frame={{ width, height }} background={<Rectangle fill={scrim} />} clipShape={{ type: 'rect', cornerRadius, style: 'continuous' }}>
    <VStack alignment="leading" spacing={6} padding={padding} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment }}>
      {children}
    </VStack>
  </VStack>
)

/** 主推封面模糊放大作底，叠一层遮罩；中号、大号共用 */
const Backdrop = ({ image, scheme }: { image: UIImage | null; scheme: ColorScheme | undefined }) => (
  <ZStack frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
    {image ? (
      <Rectangle
        fill="clear"
        overlay={<Image image={image} resizable scaleToFill blur={{ radius: 30, opaque: true }} widgetAccentedRenderingMode="accentedDesaturated" />}
        clipShape="rect"
      />
    ) : null}
    <Rectangle fill={pickTone(VEIL, scheme)} />
  </ZStack>
)

/** 「直播推荐」标题：品牌渐变，iOS 着色模式下跟随强调色 */
const BrandTitle = ({ font }: { font: number }) => (
  <HStack spacing={4}>
    <Image systemName="sparkles" font={font} foregroundStyle={brandGradient} widgetAccentable />
    <Text font={font} bold foregroundStyle={brandGradient} widgetAccentable>
      直播推荐
    </Text>
  </HStack>
)

/** 封面上的热度：火焰 + 数字，白字压在暗处 */
const Heat = ({ online, font = 11 }: { online: number; font?: number }) => (
  <HStack spacing={3}>
    <Image systemName="flame.fill" font={font - 2} foregroundStyle="#FFFFFF" />
    <Text font={font} bold monospacedDigit foregroundStyle="#FFFFFF">
      {formatOnline(online)}
    </Text>
  </HStack>
)

/** 平台 Logo + 主播名 */
const Anchor = ({ room, color, font = 11, logo = 14 }: { room: WidgetRoom; color: Color | Tone; font?: number; logo?: number }) => (
  <HStack spacing={5}>
    <SiteLogo siteId={room.siteId} size={logo} />
    <Text font={font} lineLimit={1} foregroundStyle={color}>
      {room.userName}
    </Text>
  </HStack>
)

/** 小号：整幅封面 + 渐变压暗，标题压在底部 */
const SmallLayout = ({ hero }: { hero: WidgetCover }) => {
  const { room } = hero
  return (
    <ZStack frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} widgetURL={hero.url}>
      <Cover image={hero.image} cornerRadius={0} />
      <Rectangle fill={SMALL_SCRIM} />
      <VStack alignment="leading" spacing={4} padding={14} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
        <HStack>
          <LiveBadge />
          <Spacer />
          <Heat online={room.online} font={10} />
        </HStack>
        <Spacer />
        <Text font={15} bold lineLimit={2} foregroundStyle="#FFFFFF">
          {titleOf(room)}
        </Text>
        <Anchor room={room} color="rgba(255,255,255,0.78)" font={10} logo={13} />
      </VStack>
    </ZStack>
  )
}

/** 中号：左侧立体封面，右侧标题、主播与入口，底图为同一封面的模糊放大 */
const MediumLayout = ({ hero, env }: { hero: WidgetCover; env: WidgetEnvironment }) => {
  const colors = paletteFor(env.scheme)
  const { padding, coverWidth, coverHeight, titleLines } = mediumMetrics(env.size)
  const { room } = hero
  return (
    <ZStack frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} widgetURL={hero.url}>
      {env.showsBackground ? <Backdrop image={hero.image} scheme={env.scheme} /> : null}
      <HStack spacing={14} padding={padding} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
        <ZStack frame={{ width: coverWidth, height: coverHeight }}>
          <VStack shadow={shadowOf(env.scheme, 8)}>
            <Cover image={hero.image} width={coverWidth} height={coverHeight} cornerRadius={14} />
          </VStack>
          <CoverOverlay width={coverWidth} height={coverHeight} cornerRadius={14} scrim={THUMB_SCRIM} padding={9}>
            <LiveBadge />
            <Spacer />
            <Heat online={room.online} />
          </CoverOverlay>
        </ZStack>
        <VStack alignment="leading" spacing={0} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
          <HStack spacing={6}>
            <BrandTitle font={11} />
            <Spacer />
            <Text font={10} monospacedDigit lineLimit={1} foregroundStyle={colors.textTertiary}>
              {slotLabel(env)}
            </Text>
          </HStack>
          <Spacer />
          <Text font={15} bold lineLimit={titleLines} foregroundStyle={colors.textPrimary}>
            {titleOf(room)}
          </Text>
          <VStack padding={{ top: 6 }}>
            <Anchor room={room} color={colors.textSecondary} />
          </VStack>
          <Spacer />
          <HStack spacing={4} padding={{ horizontal: 11, vertical: 5 }} background={brandGradient} clipShape="capsule">
            <Image systemName="play.fill" font={9} foregroundStyle="#FFFFFF" />
            <Text font={10} bold foregroundStyle="#FFFFFF">
              进入直播间
            </Text>
          </HStack>
        </VStack>
      </HStack>
    </ZStack>
  )
}

/** 大号主推：横版大卡，信息压在封面底部，与首页头图一致 */
const HeroCard = ({ hero, width, height, scheme }: { hero: WidgetCover; width: number; height: number; scheme: ColorScheme | undefined }) => {
  const { room } = hero
  const style = SITE_STYLE[room.siteId]
  return (
    <ZStack frame={{ width, height }}>
      <VStack shadow={shadowOf(scheme, 10)}>
        <Cover image={hero.image} width={width} height={height} cornerRadius={18} />
      </VStack>
      <CoverOverlay width={width} height={height} cornerRadius={18} scrim={heroScrim} padding={14}>
        <HStack spacing={6}>
          <LiveBadge />
          <Spacer />
          <HStack spacing={4} padding={{ leading: 3, trailing: 8, vertical: 3 }} background="rgba(8,7,10,0.45)" clipShape="capsule">
            <SiteLogo siteId={room.siteId} size={15} />
            <Text font={10} bold foregroundStyle="#FFFFFF">
              {style.short}
            </Text>
          </HStack>
        </HStack>
        <Spacer />
        <Text font={17} bold lineLimit={2} foregroundStyle="#FFFFFF">
          {titleOf(room)}
        </Text>
        <HStack spacing={8}>
          <Text font={11} lineLimit={1} foregroundStyle="rgba(255,255,255,0.78)">
            {room.userName}
          </Text>
          <Heat online={room.online} />
          <Spacer />
          <HStack spacing={4} padding={{ horizontal: 12, vertical: 5 }} background="#FFFFFF" clipShape="capsule">
            <Image systemName="play.fill" font={9} foregroundStyle={palette.ink} />
            <Text font={11} bold foregroundStyle={palette.ink}>
              观看
            </Text>
          </HStack>
        </HStack>
      </CoverOverlay>
    </ZStack>
  )
}

/** 大号下方的小卡：16:9 封面 + 热度，下面是标题和主播 */
const GridItem = ({ cover, width, height, colors }: { cover: WidgetCover; width: number; height: number; colors: ReturnType<typeof paletteFor> }) => (
  <Link url={cover.url}>
    <VStack alignment="leading" spacing={0} frame={{ width }}>
      <ZStack frame={{ width, height }}>
        <Cover image={cover.image} width={width} height={height} cornerRadius={10} />
        <CoverOverlay width={width} height={height} cornerRadius={10} scrim={THUMB_SCRIM} padding={{ horizontal: 6, vertical: 4 }} alignment="bottomLeading">
          <Heat online={cover.room.online} font={9} />
        </CoverOverlay>
      </ZStack>
      <Text font={11} bold lineLimit={1} foregroundStyle={colors.textPrimary} padding={{ top: 5 }} frame={{ width, alignment: 'leading' }}>
        {titleOf(cover.room)}
      </Text>
      <HStack padding={{ top: 2 }} frame={{ width, alignment: 'leading' }}>
        <Anchor room={cover.room} color={colors.textTertiary} font={9} logo={11} />
      </HStack>
    </VStack>
  </Link>
)

/** 大号：标题行 + 主推大卡 + 三个直播间，每个都能单独点开 */
const LargeLayout = ({ covers, env }: { covers: WidgetCover[]; env: WidgetEnvironment }) => {
  const colors = paletteFor(env.scheme)
  const metrics = largeMetrics(env.size)
  const [hero, ...rest] = covers
  const grid = rest.slice(0, 3)
  return (
    <ZStack frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} widgetURL={hero.url}>
      {env.showsBackground ? <Backdrop image={hero.image} scheme={env.scheme} /> : null}
      <VStack alignment="leading" spacing={0} padding={metrics.padding} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
        <HStack spacing={6}>
          <BrandTitle font={13} />
          <Text font={11} monospacedDigit foregroundStyle={colors.textTertiary}>
            {slotLabel(env)}
          </Text>
          <Spacer />
          {env.source === 'mix' ? null : <SiteLogo siteId={env.source} size={14} />}
          <Text font={11} lineLimit={1} foregroundStyle={colors.textSecondary}>
            {sourceLabel(env.source)}
          </Text>
        </HStack>
        <VStack padding={{ top: 12 }}>
          <HeroCard hero={hero} width={metrics.innerWidth} height={metrics.heroHeight} scheme={env.scheme} />
        </VStack>
        <Spacer />
        {grid.length > 0 ? (
          <VStack alignment="leading" spacing={8}>
            <Text font={13} bold foregroundStyle={colors.textPrimary}>
              更多推荐
            </Text>
            <HStack spacing={metrics.gap} alignment="top">
              {grid.map(cover => (
                <GridItem
                  key={`${cover.room.siteId}_${cover.room.roomId}`}
                  cover={cover}
                  width={metrics.gridWidth}
                  height={metrics.gridHeight}
                  colors={colors}
                />
              ))}
              <Spacer minLength={0} />
            </HStack>
          </VStack>
        ) : null}
      </VStack>
    </ZStack>
  )
}

/** 锁屏尺寸只放文字，跟随系统的锁屏渲染 */
const AccessoryLayout = ({ hero, family }: { hero: WidgetCover; family: WidgetFamily }) => {
  if (family === 'accessoryInline') {
    return <Text widgetURL={hero.url}>{`正在直播 · ${hero.room.userName}`}</Text>
  }
  if (family === 'accessoryCircular') {
    return (
      <ZStack widgetURL={hero.url}>
        <AccessoryWidgetBackground />
        <Image systemName="dot.radiowaves.left.and.right" font={22} widgetAccentable />
      </ZStack>
    )
  }
  return (
    <VStack alignment="leading" spacing={1} frame={{ maxWidth: 'infinity', alignment: 'leading' }} widgetURL={hero.url}>
      <Text font={11} bold lineLimit={1} widgetAccentable>
        {`${SITE_STYLE[hero.room.siteId].short} · ${hero.room.userName}`}
      </Text>
      <Text font={14} bold lineLimit={2}>
        {titleOf(hero.room)}
      </Text>
    </VStack>
  )
}

/** 直播推荐小组件：按尺寸选择布局，covers 至少包含一个主推 */
export const RecommendWidget = ({ covers, env }: { covers: WidgetCover[]; env: WidgetEnvironment }): VirtualNode => {
  const background = env.showsBackground ? paletteFor(env.scheme).bg : undefined
  const [hero] = covers
  switch (env.family) {
    case 'systemSmall':
      return (
        <VStack widgetBackground={background}>
          <SmallLayout hero={hero} />
        </VStack>
      )
    case 'systemMedium':
      return (
        <VStack widgetBackground={background}>
          <MediumLayout hero={hero} env={env} />
        </VStack>
      )
    case 'systemLarge':
    case 'systemExtraLarge':
    case 'systemExtraLargePortrait':
      return (
        <VStack widgetBackground={background}>
          <LargeLayout covers={covers} env={env} />
        </VStack>
      )
    default:
      return <AccessoryLayout hero={hero} family={env.family} />
  }
}

type WidgetMessageProps = {
  icon: string
  title: string
  message: string
  env: Pick<WidgetEnvironment, 'family' | 'scheme' | 'showsBackground'>
}

/** 暂无推荐、加载失败等状态；轻点小组件打开 ScriptLive */
export const WidgetMessage = ({ icon, title, message, env }: WidgetMessageProps): VirtualNode => {
  if (env.family.startsWith('accessory')) {
    return <Text font={12}>{`ScriptLive · ${title}`}</Text>
  }
  const colors = paletteFor(env.scheme)
  const compact = env.family === 'systemSmall'
  return (
    <VStack spacing={6} padding={16} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} widgetBackground={env.showsBackground ? colors.bg : undefined}>
      <Image systemName={icon} font={compact ? 26 : 30} foregroundStyle={brandGradient} widgetAccentable />
      <Text font={compact ? 13 : 15} bold multilineTextAlignment="center" foregroundStyle={colors.textPrimary}>
        {title}
      </Text>
      <Text font={11} lineLimit={3} multilineTextAlignment="center" foregroundStyle={colors.textSecondary}>
        {message}
      </Text>
    </VStack>
  )
}
