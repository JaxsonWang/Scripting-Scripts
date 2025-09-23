import { HStack, Image, Link, Path, Spacer, Text, VStack, Widget } from 'scripting'
import type { NewsData, NewsItem } from './utils/news-service'
import { fetchCNRNews, getCurrentSettings, getDynamicTextColor } from './utils/news-service'

// 全局数据变量
let newsData: NewsData | null = null

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
 * 新闻项目组件
 * @param props 组件属性
 * @param props.key 索引下标
 * @param props.item 新闻项目
 * @param props.showTime 是否显示时间
 * @param props.size 组件尺寸，影响字体大小
 * @param props.alignment 文本对齐方式
 */
const NewsItemComponent = ({
  key,
  item,
  showTime = false,
  size = 'large',
  alignment = 'leading'
}: {
  key: number
  item: NewsItem
  showTime?: boolean
  size?: 'small' | 'medium' | 'large'
  alignment?: 'leading' | 'center'
}) => {
  // 获取动态字体颜色
  const textColor = getDynamicTextColor()

  // 根据尺寸选择字体大小
  const getTitleFont = () => {
    switch (size) {
      case 'small':
        return 14
      case 'medium':
        return 14
      case 'large':
      default:
        return 16
    }
  }

  const getTimeFont = (): 'caption2' => {
    return 'caption2' // 时间字体统一使用caption2
  }

  return (
    <Link url={item.url}>
      <VStack spacing={2} alignment={alignment}>
        <Text
          font={getTitleFont()}
          fontWeight="medium"
          foregroundStyle={textColor}
          frame={{
            maxWidth: 'infinity',
            alignment: alignment
          }}
        >
          {Number(key) + 1}. {item.title}
        </Text>
        {showTime && item.time ? (
          <Text font={getTimeFont()} foregroundStyle="secondaryLabel">
            {item.time}
          </Text>
        ) : null}
      </VStack>
    </Link>
  )
}

/**
 * 加载数据的异步函数
 * @returns 新闻数据Promise
 */
const loadNewsData = async (): Promise<NewsData> => {
  if (!newsData) {
    try {
      newsData = await fetchCNRNews()
    } catch (error) {
      console.error('加载新闻数据失败:', error)
      // 返回默认数据
      newsData = {
        items: [
          {
            title: '数据加载失败，请检查网络连接',
            url: 'https://www.cnr.cn/',
            time: new Date().toLocaleString()
          }
        ],
        lastUpdated: new Date().toLocaleString(),
        source: '央广头条'
      }
    }
  }
  return newsData
}

/**
 * Widget视图 - 根据不同尺寸显示不同布局
 * @param props 组件属性
 * @param props.data 新闻数据
 */
const WidgetView = ({ data }: { data: NewsData }) => {
  // 获取动态字体颜色和背景图片设置
  const textColor = getDynamicTextColor()
  const settings = getCurrentSettings()

  // 获取背景图片路径和背景样式
  const getWidgetBg = getWidgetBackgroundImagePath(settings)
  const widgetBackground = generateWidgetBackground(settings)

  switch (Widget.family) {
    case 'systemSmall': {
      // 小号小组件 - 显示1条新闻
      const newsToShow = data.items.slice(0, 2)

      return (
        <VStack
          padding={{ horizontal: 12, vertical: 10 }}
          background={!settings.enableColorBackground && getWidgetBg ? <Image filePath={getWidgetBg} resizable={true} scaleToFill={true} /> : undefined}
          widgetBackground={widgetBackground}
        >
          <HStack spacing={4}>
            <Image systemName="newspaper.fill" font={14} foregroundStyle="systemRed" />
            <Text font={14} fontWeight="bold" foregroundStyle={textColor}>
              央广头条
            </Text>
            <Spacer />
            <Text font={10} foregroundStyle="secondaryLabel">
              {data.source}
            </Text>
          </HStack>

          <Spacer />

          <VStack spacing={4} alignment="leading">
            {newsToShow.map((item, index) => (
              <NewsItemComponent key={index} item={item} size="small" />
            ))}
          </VStack>

          <Spacer />

          <Text font={10} foregroundStyle="secondaryLabel">
            {data.lastUpdated}
          </Text>
        </VStack>
      )
    }

    case 'systemMedium': {
      // 中号小组件 - 显示4条新闻
      const newsToShow = data.items.slice(0, 4)

      return (
        <VStack
          padding={{ horizontal: 12, vertical: 12 }}
          background={!settings.enableColorBackground && getWidgetBg ? <Image filePath={getWidgetBg} resizable={true} scaleToFill={true} /> : undefined}
          widgetBackground={widgetBackground}
        >
          <HStack spacing={4}>
            <Image systemName="newspaper.fill" font="body" foregroundStyle="systemRed" />
            <Text font="body" fontWeight="bold" foregroundStyle={textColor}>
              央广头条
            </Text>
            <Spacer />
            <Text font="caption2" foregroundStyle="secondaryLabel">
              {data.source}
            </Text>
          </HStack>

          <Spacer />

          <VStack spacing={1} alignment="leading">
            {newsToShow.map((item, index) => (
              <NewsItemComponent key={index} item={item} size="medium" />
            ))}
          </VStack>

          <Spacer />

          <Text font="caption2" foregroundStyle="secondaryLabel">
            {data.lastUpdated}更新
          </Text>
        </VStack>
      )
    }

    case 'systemLarge':
    case 'systemExtraLarge': {
      // 大号小组件 - 显示8条新闻
      const newsToShow = data.items.slice(0, 8)

      return (
        <VStack
          padding={{ horizontal: 12, vertical: 20 }}
          background={!settings.enableColorBackground && getWidgetBg ? <Image filePath={getWidgetBg} resizable={true} scaleToFill={true} /> : undefined}
          widgetBackground={widgetBackground}
        >
          <HStack spacing={4} alignment="center">
            <Image systemName="newspaper.fill" font="body" foregroundStyle="systemRed" />
            <Text font="body" fontWeight="bold" foregroundStyle={textColor}>
              央广头条
            </Text>
            <Spacer />
            <Text font="caption2" foregroundStyle="secondaryLabel">
              {data.source}
            </Text>
          </HStack>

          <Spacer />

          <VStack spacing={4} alignment="leading">
            {newsToShow.map((item, index) => (
              <NewsItemComponent key={index} item={item} showTime={false} size="large" />
            ))}
          </VStack>

          <Spacer />

          <HStack alignment="center">
            <Text font="caption2" foregroundStyle="secondaryLabel">
              最后更新: {data.lastUpdated}
            </Text>
          </HStack>
        </VStack>
      )
    }

    default:
      return (
        <VStack spacing={8} alignment="center" padding={16}>
          <Image systemName="newspaper.fill" font="title" foregroundStyle="systemRed" />
          <Text font="body" foregroundStyle={textColor}>
            央广头条小组件
          </Text>
          <Text font="caption" foregroundStyle={textColor}>
            {data.source}
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
    const data = await loadNewsData()
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
