import { AccessoryWidgetBackground, HStack, Image, Link, Rectangle, Spacer, Text, VStack, ZStack } from 'scripting'
import type { Color, ColorScheme, LinearGradient, VirtualNode, WidgetFamily } from 'scripting'
import { brandGradient, palette, paletteFor, pickTone } from '../theme'
import type { ThemePalette, Tone } from '../theme'
import type { DailyPick } from '../types'

type Size = { width: number; height: number }

/** 一张推荐海报：精简数据 + 已缩放的封面（加载失败为 null）+ 点击后打开播放页的链接 */
export type WidgetPoster = {
  pick: DailyPick
  image: UIImage | null
  url: string
}

export type WidgetEnvironment = {
  family: WidgetFamily
  size: Size
  /** ScriptFlix 外观设置；undefined 表示跟随系统 */
  scheme: ColorScheme | undefined
  /** 透明 / 模糊背景模式下由系统绘制背景，内容不能铺不透明底色 */
  showsBackground: boolean
  date: Date
}

const POSTER_RATIO = 1.5
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** 模糊海报背景上的遮罩：日间铺浅色，夜间压暗，保证文字可读 */
const VEIL: Tone<LinearGradient> = {
  light: { colors: ['rgba(244,242,249,0.62)', 'rgba(244,242,249,0.92)'], startPoint: 'topLeading', endPoint: 'bottomTrailing' },
  dark: { colors: ['rgba(7,6,12,0.52)', 'rgba(7,6,12,0.88)'], startPoint: 'topLeading', endPoint: 'bottomTrailing' }
}

/** 小号整幅海报的压暗：顶部托住角标，底部托住片名 */
const SMALL_SCRIM: LinearGradient = {
  stops: [
    { color: 'rgba(7,6,12,0.45)', location: 0 },
    { color: 'rgba(7,6,12,0)', location: 0.32 },
    { color: 'rgba(7,6,12,0.2)', location: 0.55 },
    { color: 'rgba(7,6,12,0.92)', location: 1 }
  ],
  startPoint: 'top',
  endPoint: 'bottom'
}

/** shadow 只接受固定色，跟随系统时取两种外观都自然的中性值 */
const shadowOf = (scheme: ColorScheme | undefined, radius: number) => ({
  color: (scheme === 'light' ? 'rgba(23,19,31,0.22)' : scheme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.32)') as Color,
  radius,
  y: Math.round(radius / 2)
})

const metaOf = (pick: DailyPick) => [pick.year, pick.area, pick.typeName].filter(Boolean).join(' · ')

const formatDay = (date: Date) => `${date.getMonth() + 1}月${date.getDate()}日 ${WEEKDAYS[date.getDay()]}`

/** 中号：海报高度贴合上下内边距，右侧信息区按剩余高度决定简介行数 */
export const mediumMetrics = (size: Size) => {
  const padding = 12
  const posterHeight = size.height - padding * 2
  return { padding, posterHeight, posterWidth: Math.round(posterHeight / POSTER_RATIO), blurbLines: posterHeight >= 130 ? 2 : 1 }
}

/** 大号：先按宽度排四列海报，主推海报吃掉剩余高度 */
export const largeMetrics = (size: Size) => {
  const padding = 14
  const gap = 10
  const gridWidth = Math.floor((size.width - padding * 2 - gap * 3) / 4)
  const gridHeight = Math.round(gridWidth * 1.42)
  // 标题行、主推与「更多推荐」之间至少约 20pt 的分组间距、「更多推荐」标题、海报下两行文字等固定高度
  const fixedHeight = 126
  const heroHeight = Math.max(110, Math.min(176, size.height - fixedHeight - gridHeight))
  return {
    padding,
    gap,
    gridWidth,
    gridHeight,
    heroHeight,
    heroWidth: Math.round(heroHeight / POSTER_RATIO),
    blurbLines: Math.max(1, Math.min(3, Math.floor((heroHeight - 122) / 14)))
  }
}

/**
 * 各尺寸需要的封面尺寸（pt），顺序与 posters 一致；widget.tsx 据此只加载并缩放用得到的图片
 * @param family 小组件尺寸
 * @param size 小组件显示尺寸
 */
export const posterTargets = (family: WidgetFamily, size: Size): Size[] => {
  switch (family) {
    case 'systemSmall':
      return [size]
    case 'systemMedium': {
      const { posterWidth, posterHeight } = mediumMetrics(size)
      return [{ width: posterWidth, height: posterHeight }]
    }
    case 'systemLarge':
    case 'systemExtraLarge':
    case 'systemExtraLargePortrait': {
      const { heroWidth, heroHeight, gridWidth, gridHeight } = largeMetrics(size)
      return [{ width: heroWidth, height: heroHeight }, ...Array.from({ length: 4 }, () => ({ width: gridWidth, height: gridHeight }))]
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
        <Image systemName="film" font={Math.max(16, Math.round((width ?? 120) * 0.28))} foregroundStyle="rgba(255,255,255,0.85)" />
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

/** 海报模糊放大作底，叠一层遮罩；中号、大号共用 */
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

const TodayBadge = ({ font = 10 }: { font?: number }) => (
  <HStack spacing={3} padding={{ horizontal: 7, vertical: 3 }} background={brandGradient} clipShape="capsule">
    <Image systemName="sparkles" font={font - 1} foregroundStyle="#FFFFFF" />
    <Text font={font} bold foregroundStyle="#FFFFFF">
      今日推荐
    </Text>
  </HStack>
)

const TodayTitle = ({ font }: { font: number }) => (
  <HStack spacing={4}>
    <Image systemName="sparkles" font={font} foregroundStyle={brandGradient} widgetAccentable />
    <Text font={font} bold foregroundStyle={brandGradient} widgetAccentable>
      今日推荐
    </Text>
  </HStack>
)

const RemarkChip = ({ text, font = 9 }: { text: string; font?: number }) => (
  <Text font={font} bold lineLimit={1} foregroundStyle="#FFFFFF" padding={{ horizontal: 6, vertical: 2 }} background={brandGradient} clipShape="capsule">
    {text}
  </Text>
)

const LaneChip = ({ text, colors, font = 9 }: { text: string; colors: ThemePalette; font?: number }) => (
  <Text
    font={font}
    bold
    lineLimit={1}
    foregroundStyle={colors.textSecondary}
    padding={{ horizontal: 6, vertical: 2 }}
    background={colors.fillMuted}
    clipShape="capsule"
  >
    {text}
  </Text>
)

const Score = ({ score, color, font = 10 }: { score: string; color: ThemePalette['warning']; font?: number }) => (
  <HStack spacing={2}>
    <Image systemName="star.fill" font={font - 2} foregroundStyle={color} />
    <Text font={font} bold monospacedDigit foregroundStyle={color}>
      {score}
    </Text>
  </HStack>
)

/** 小号：整幅海报 + 渐变压暗，片名压在底部 */
const SmallLayout = ({ hero }: { hero: WidgetPoster }) => {
  const { pick } = hero
  return (
    <ZStack frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} widgetURL={hero.url}>
      <Cover image={hero.image} cornerRadius={0} />
      <Rectangle fill={SMALL_SCRIM} />
      <VStack alignment="leading" spacing={3} padding={14} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
        <HStack>
          <TodayBadge />
          <Spacer />
          {pick.score ? (
            <HStack spacing={2} padding={{ horizontal: 6, vertical: 3 }} background="rgba(7,6,12,0.55)" clipShape="capsule">
              <Image systemName="star.fill" font={8} foregroundStyle={palette.gold} />
              <Text font={10} bold monospacedDigit foregroundStyle={palette.gold}>
                {pick.score}
              </Text>
            </HStack>
          ) : null}
        </HStack>
        <Spacer />
        <Text font={10} bold lineLimit={1} foregroundStyle="rgba(255,255,255,0.72)">
          {[pick.lane, pick.remarks].filter(Boolean).join(' · ')}
        </Text>
        <Text font={17} bold lineLimit={2} foregroundStyle="#FFFFFF">
          {pick.name}
        </Text>
      </VStack>
    </ZStack>
  )
}

/** 中号：左侧立体海报，右侧片名、信息、简介，底图为同一海报的模糊放大 */
const MediumLayout = ({ hero, sourceName, env }: { hero: WidgetPoster; sourceName: string; env: WidgetEnvironment }) => {
  const colors = paletteFor(env.scheme)
  const { padding, posterWidth, posterHeight, blurbLines } = mediumMetrics(env.size)
  const { pick } = hero
  return (
    <ZStack frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} widgetURL={hero.url}>
      {env.showsBackground ? <Backdrop image={hero.image} scheme={env.scheme} /> : null}
      <HStack spacing={14} padding={padding} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
        <VStack shadow={shadowOf(env.scheme, 8)}>
          <Cover image={hero.image} width={posterWidth} height={posterHeight} cornerRadius={12} />
        </VStack>
        <VStack alignment="leading" spacing={0} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
          <HStack spacing={6}>
            <TodayTitle font={11} />
            <Spacer />
            <Text font={10} lineLimit={1} foregroundStyle={colors.textTertiary}>
              {sourceName}
            </Text>
          </HStack>
          <Spacer />
          <Text font={18} bold lineLimit={2} foregroundStyle={colors.textPrimary}>
            {pick.name}
          </Text>
          {metaOf(pick) ? (
            <Text font={11} lineLimit={1} foregroundStyle={colors.textSecondary} padding={{ top: 3 }}>
              {metaOf(pick)}
            </Text>
          ) : null}
          <HStack spacing={5} padding={{ top: 7 }}>
            <LaneChip text={pick.lane} colors={colors} />
            {pick.remarks ? <RemarkChip text={pick.remarks} /> : null}
            {pick.score ? <Score score={pick.score} color={colors.warning} /> : null}
          </HStack>
          {pick.blurb ? (
            <Text font={11} lineLimit={blurbLines} foregroundStyle={colors.textTertiary} padding={{ top: 7 }}>
              {pick.blurb}
            </Text>
          ) : null}
          <Spacer />
        </VStack>
      </HStack>
    </ZStack>
  )
}

const GridItem = ({ poster, width, height, colors }: { poster: WidgetPoster; width: number; height: number; colors: ThemePalette }) => (
  <Link url={poster.url}>
    <VStack alignment="leading" spacing={0} frame={{ width }}>
      <Cover image={poster.image} width={width} height={height} cornerRadius={10} />
      <Text font={11} bold lineLimit={1} foregroundStyle={colors.textPrimary} padding={{ top: 4 }} frame={{ width, alignment: 'leading' }}>
        {poster.pick.name}
      </Text>
      <Text font={9} lineLimit={1} foregroundStyle={colors.textTertiary} padding={{ top: 1 }} frame={{ width, alignment: 'leading' }}>
        {poster.pick.remarks || poster.pick.typeName || poster.pick.lane}
      </Text>
    </VStack>
  </Link>
)

/** 大号：主推大卡 + 四张海报，每张海报单独可点 */
const LargeLayout = ({ posters, sourceName, env }: { posters: WidgetPoster[]; sourceName: string; env: WidgetEnvironment }) => {
  const colors = paletteFor(env.scheme)
  const metrics = largeMetrics(env.size)
  const [hero, ...rest] = posters
  const grid = rest.slice(0, 4)
  const lanes = Array.from(new Set(grid.map(poster => poster.pick.lane))).join(' · ')
  const { pick } = hero
  return (
    <ZStack frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} widgetURL={hero.url}>
      {env.showsBackground ? <Backdrop image={hero.image} scheme={env.scheme} /> : null}
      <VStack alignment="leading" spacing={0} padding={metrics.padding} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
        <HStack spacing={6}>
          <TodayTitle font={13} />
          <Text font={11} foregroundStyle={colors.textTertiary}>
            {formatDay(env.date)}
          </Text>
          <Spacer />
          <Text font={11} lineLimit={1} foregroundStyle={colors.textSecondary}>
            {sourceName}
          </Text>
        </HStack>
        <HStack spacing={14} alignment="top" padding={{ top: 12 }}>
          <VStack shadow={shadowOf(env.scheme, 10)}>
            <Cover image={hero.image} width={metrics.heroWidth} height={metrics.heroHeight} cornerRadius={14} />
          </VStack>
          <VStack alignment="leading" spacing={0} frame={{ maxWidth: 'infinity', height: metrics.heroHeight, alignment: 'topLeading' }}>
            <Text font={19} bold lineLimit={2} foregroundStyle={colors.textPrimary}>
              {pick.name}
            </Text>
            {metaOf(pick) ? (
              <Text font={11} lineLimit={1} foregroundStyle={colors.textSecondary} padding={{ top: 4 }}>
                {metaOf(pick)}
              </Text>
            ) : null}
            <HStack spacing={5} padding={{ top: 8 }}>
              <LaneChip text={pick.lane} colors={colors} />
              {pick.remarks ? <RemarkChip text={pick.remarks} /> : null}
              {pick.score ? <Score score={pick.score} color={colors.warning} /> : null}
            </HStack>
            {pick.blurb ? (
              <Text font={11} lineLimit={metrics.blurbLines} foregroundStyle={colors.textTertiary} padding={{ top: 8 }}>
                {pick.blurb}
              </Text>
            ) : null}
            <Spacer />
            <HStack spacing={4} padding={{ horizontal: 12, vertical: 6 }} background={brandGradient} clipShape="capsule">
              <Image systemName="play.fill" font={10} foregroundStyle="#FFFFFF" />
              <Text font={11} bold foregroundStyle="#FFFFFF">
                立即观看
              </Text>
            </HStack>
          </VStack>
        </HStack>
        <Spacer />
        {grid.length > 0 ? (
          <VStack alignment="leading" spacing={8}>
            <HStack>
              <Text font={13} bold foregroundStyle={colors.textPrimary}>
                更多推荐
              </Text>
              <Spacer />
              <Text font={10} foregroundStyle={colors.textTertiary}>
                {lanes}
              </Text>
            </HStack>
            <HStack spacing={metrics.gap} alignment="top">
              {grid.map(poster => (
                <GridItem key={`${poster.pick.id}`} poster={poster} width={metrics.gridWidth} height={metrics.gridHeight} colors={colors} />
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
const AccessoryLayout = ({ hero, family }: { hero: WidgetPoster; family: WidgetFamily }) => {
  if (family === 'accessoryInline') {
    return <Text widgetURL={hero.url}>{`今日推荐 · ${hero.pick.name}`}</Text>
  }
  if (family === 'accessoryCircular') {
    return (
      <ZStack widgetURL={hero.url}>
        <AccessoryWidgetBackground />
        <Image systemName="sparkles.tv" font={22} widgetAccentable />
      </ZStack>
    )
  }
  return (
    <VStack alignment="leading" spacing={1} frame={{ maxWidth: 'infinity', alignment: 'leading' }} widgetURL={hero.url}>
      <Text font={11} bold widgetAccentable>
        今日推荐
      </Text>
      <Text font={15} bold lineLimit={2}>
        {hero.pick.name}
      </Text>
    </VStack>
  )
}

type RecommendWidgetProps = {
  posters: WidgetPoster[]
  sourceName: string
  env: WidgetEnvironment
}

/** 每日推荐小组件：按尺寸选择布局，posters 至少包含一张主推 */
export const RecommendWidget = ({ posters, sourceName, env }: RecommendWidgetProps): VirtualNode => {
  const colors = paletteFor(env.scheme)
  const background = env.showsBackground ? colors.bg : undefined
  const [hero] = posters
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
          <MediumLayout hero={hero} sourceName={sourceName} env={env} />
        </VStack>
      )
    case 'systemLarge':
    case 'systemExtraLarge':
    case 'systemExtraLargePortrait':
      return (
        <VStack widgetBackground={background}>
          <LargeLayout posters={posters} sourceName={sourceName} env={env} />
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
  env: WidgetEnvironment
}

/** 未配置视频源、加载失败、暂无推荐等状态；轻点小组件打开 ScriptFlix */
export const WidgetMessage = ({ icon, title, message, env }: WidgetMessageProps): VirtualNode => {
  if (env.family.startsWith('accessory')) {
    return <Text font={12}>{`ScriptFlix · ${title}`}</Text>
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
