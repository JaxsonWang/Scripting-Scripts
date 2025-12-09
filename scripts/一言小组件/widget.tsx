import { HStack, Image, Path, Spacer, Text, VStack, Widget } from 'scripting'
import type { HitokotoData } from './utils/hitokoto-service'
import { fetchHitokoto, getCurrentSettings, getDynamicTextColor } from './utils/hitokoto-service'

// 无需全局缓存变量，每次都获取新数据

/**
 * 获取背景图片路径
 */
const getWidgetBackgroundImagePath = (settings: any) => {
  return settings.bgPath && Widget.parameter ? Path.join(settings.bgPath, Widget.parameter) : undefined
}

/**
 * 生成背景样式
 */
const generateWidgetBackground = (settings: any) => {
  // 如果开启了颜色背景，优先使用颜色背景
  if (settings.enableColorBackground && settings.backgroundColors && settings.backgroundColors.length > 0) {
    const colors = settings.backgroundColors

    if (colors.length === 1) {
      // 单个颜色，使用纯色背景
      return colors[0]
    } else {
      // 多个颜色，使用渐变背景
      return {
        gradient: colors.map((color: any, index: number) => ({
          color: color,
          location: index / (colors.length - 1)
        })),
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 1, y: 1 }
      }
    }
  }

  return undefined
}

/**
 * 加载数据的异步函数
 */
const loadHitokotoData = async (): Promise<HitokotoData> => {
  try {
    const data = await fetchHitokoto()
    console.log('获取一言数据成功:', data.hitokoto)
    return data
  } catch (error) {
    console.error('加载一言数据失败:', error)
    // 返回默认数据
    return {
      id: 0,
      uuid: '',
      hitokoto: '数据加载失败',
      type: 'a',
      from: '未知',
      from_who: null,
      creator: '',
      creator_uid: 0,
      reviewer: 0,
      commit_from: '',
      created_at: '',
      length: 0
    }
  }
}

/**
 * Widget视图 - 根据不同尺寸显示不同布局
 */
const WidgetView = ({ data }: { data: HitokotoData }) => {
  const settings = getCurrentSettings()

  // 获取背景图片路径和背景样式
  const getWidgetBg = getWidgetBackgroundImagePath(settings)
  const widgetBackground = generateWidgetBackground(settings)

  // 获取动态字体颜色（会自动适配系统的浅色/深色模式）
  const textColor = getDynamicTextColor()

  switch (Widget.family) {
    case 'systemSmall': {
      // 小尺寸小组件 - 显示一言内容和来源
      return (
        <VStack
          spacing={6}
          padding={16}
          alignment="center"
          background={!settings.enableColorBackground && getWidgetBg ? <Image filePath={getWidgetBg} resizable={true} scaleToFill={true} /> : undefined}
          widgetBackground={widgetBackground}
        >
          <Image systemName="quote.bubble.fill" font="title2" foregroundStyle="systemBlue" />
          <Text
            font="body"
            fontWeight="medium"
            foregroundStyle={textColor}
            frame={{
              maxWidth: 'infinity',
              minHeight: 40,
              maxHeight: 'infinity',
              alignment: 'center'
            }}
          >
            {data.hitokoto}
          </Text>
          <HStack spacing={2} alignment="center">
            <Text font="caption" foregroundStyle={textColor}>
              {data.from}
            </Text>
            {data.from_who ? (
              <>
                <Text font="caption" foregroundStyle={textColor}>
                  •
                </Text>
                <Text font="caption" foregroundStyle={textColor}>
                  {data.from_who}
                </Text>
              </>
            ) : null}
          </HStack>
        </VStack>
      )
    }

    case 'systemMedium': {
      // 中等尺寸小组件 - 显示完整信息
      return (
        <VStack
          spacing={10}
          padding={{ horizontal: 16, top: 16, bottom: 12 }}
          background={!settings.enableColorBackground && getWidgetBg ? <Image filePath={getWidgetBg} resizable={true} scaleToFill={true} /> : undefined}
          widgetBackground={widgetBackground}
        >
          <HStack spacing={4} alignment="center">
            <Image systemName="quote.bubble.fill" font="body" foregroundStyle="systemBlue" />
            <Text font="body" fontWeight="bold" foregroundStyle={textColor}>
              今日一言
            </Text>
            <Spacer />
            <Text font="caption2" foregroundStyle={textColor}>
              {data.creator}
            </Text>
          </HStack>

          <Spacer />

          <Text
            font="headline"
            fontWeight="medium"
            foregroundStyle={textColor}
            frame={{
              maxWidth: 'infinity',
              minHeight: 50,
              maxHeight: 'infinity',
              alignment: 'center'
            }}
          >
            {data.hitokoto}
          </Text>

          <Spacer />

          <HStack spacing={4} alignment="center">
            <Text font="caption2" foregroundStyle={textColor}>
              {data.from}
            </Text>
            {data.from_who ? (
              <>
                <Text font="caption2" foregroundStyle={textColor}>
                  •
                </Text>
                <Text font="caption2" foregroundStyle={textColor}>
                  {data.from_who}
                </Text>
              </>
            ) : null}
          </HStack>
        </VStack>
      )
    }

    case 'systemLarge':
    case 'systemExtraLarge': {
      // 大尺寸小组件 - 显示最完整信息
      return (
        <VStack
          spacing={16}
          padding={20}
          background={!settings.enableColorBackground && getWidgetBg ? <Image filePath={getWidgetBg} resizable={true} scaleToFill={true} /> : undefined}
          widgetBackground={widgetBackground}
        >
          <HStack spacing={4} alignment="center">
            <Image systemName="quote.bubble.fill" font="title2" foregroundStyle="systemBlue" />
            <Text font="title2" fontWeight="bold" foregroundStyle={textColor}>
              今日一言
            </Text>
            <Spacer />
            <Text font="caption" foregroundStyle={textColor}>
              {data.creator}
            </Text>
          </HStack>

          <Spacer />

          <Text
            font="title"
            fontWeight="medium"
            foregroundStyle={textColor}
            frame={{
              maxWidth: 'infinity',
              minHeight: 100,
              maxHeight: 'infinity',
              alignment: 'center'
            }}
          >
            {data.hitokoto}
          </Text>

          <Spacer />

          <HStack alignment="center">
            <Text font="caption" foregroundStyle={textColor}>
              {data.from}
            </Text>
            {data.from_who ? (
              <>
                <Text font="caption" foregroundStyle={textColor}>
                  •
                </Text>
                <Text font="caption" foregroundStyle={textColor}>
                  {data.from_who}
                </Text>
              </>
            ) : null}
          </HStack>
        </VStack>
      )
    }

    default:
      return (
        <VStack spacing={8} alignment="center" padding={16}>
          <Image systemName="quote.bubble.fill" font="title" foregroundStyle="systemBlue" />
          <Text font="body" foregroundStyle={textColor}>
            一言小组件
          </Text>
          <Text font="caption" foregroundStyle={textColor}>
            今日一言
          </Text>
        </VStack>
      )
  }
}

/**
 * 主函数 - 异步加载数据并呈现Widget
 */
const main = async (): Promise<void> => {
  try {
    const data = await loadHitokotoData()
    const settings = getCurrentSettings()

    if (settings.autoRefresh) {
      // 计算下次刷新时间
      const refreshIntervalMs = settings.refreshInterval * 60 * 1000 // 转换为毫秒
      const nextRefreshDate = new Date(Date.now() + refreshIntervalMs)

      console.log(`组件设置自动刷新，间隔: ${settings.refreshInterval}分钟，下次刷新: ${nextRefreshDate.toLocaleString()}`)

      // 使用定时刷新策略
      Widget.present(<WidgetView data={data} />, {
        policy: 'after',
        date: nextRefreshDate
      })
    } else {
      // 禁用自动刷新时使用默认策略
      console.log('组件禁用自动刷新，使用默认刷新策略')
      Widget.present(<WidgetView data={data} />)
    }
  } catch (error) {
    console.error('Widget加载失败:', error)

    // 获取动态字体颜色以便在错误显示时也能自动适配颜色模式
    const errorTextColor = getDynamicTextColor()

    // 显示错误信息
    Widget.present(
      <VStack spacing={8} alignment="center" padding={16}>
        <Image systemName="exclamationmark.triangle.fill" font="title" foregroundStyle="systemRed" />
        <Text font="body" foregroundStyle={errorTextColor}>
          数据加载失败
        </Text>
        <Text font="caption" foregroundStyle={errorTextColor}>
          请检查网络连接
        </Text>
      </VStack>
    )
  }
}

// 执行主函数
main()
