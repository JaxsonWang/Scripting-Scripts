import { HStack, Image, Spacer, Text, VStack, Widget } from 'scripting'
import type { CompleteOilData } from './utils/oil-price-service'
import {
  formatForecastPrice,
  getCompleteOilData,
  getCurrentSettings,
  getDynamicTextColor,
  getMediumWidgetOilPriceItems,
  getSmallWidgetOilPriceItem,
  getTrendColor,
  getTrendSymbol
} from './utils/oil-price-service'

// 全局数据变量
let oilData: CompleteOilData | null = null

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
 * 油价项目组件
 * @param props 组件属性
 * @param props.type 油品类型
 * @param props.price 当前价格
 * @param props.forecastPrice 预测价格
 * @param props.priceDirection 价格趋势
 */
const GasPriceItem = ({
  label,
  price,
  forecastPrice,
  priceDirection,
  forecastFontSize,
  labelFontSize,
  priceFontSize
}: {
  label: string
  price: string
  forecastPrice?: string
  forecastFontSize: number
  labelFontSize: number
  priceDirection?: 'rising' | 'falling' | 'stranded'
  priceFontSize: number
}) => {
  // 获取动态字体颜色
  const textColor = getDynamicTextColor()

  return (
    <HStack alignment="center" spacing={8}>
      <Text font={labelFontSize} fontWeight="bold" foregroundStyle="#EB604D" lineLimit={1} minScaleFactor={0.8}>
        {label}
      </Text>
      <Spacer />
      <Text font={priceFontSize} foregroundStyle={textColor} lineLimit={1} minScaleFactor={0.8}>
        {price}
      </Text>
      {forecastPrice && priceDirection ? (
        <Text font={forecastFontSize} foregroundStyle={getTrendColor(priceDirection)} lineLimit={1} minScaleFactor={0.75}>
          {getTrendSymbol(priceDirection)} {formatForecastPrice(forecastPrice)}
        </Text>
      ) : null}
    </HStack>
  )
}

const getTrendText = (direction: string): string => {
  switch (direction) {
    case 'rising':
      return '上涨'
    case 'falling':
      return '下跌'
    case 'stranded':
      return '搁浅'
    default:
      return '搁浅'
  }
}

const getLargeWidgetLayout = (itemCount: number) => {
  if (itemCount >= 7) {
    return {
      footerFontSize: 11,
      forecastFontSize: 12,
      labelFontSize: 26,
      priceFontSize: 21,
      rowSpacing: 5,
      sectionSpacing: 8,
      verticalPadding: 14
    }
  }

  if (itemCount >= 6) {
    return {
      footerFontSize: 11,
      forecastFontSize: 13,
      labelFontSize: 28,
      priceFontSize: 22,
      rowSpacing: 7,
      sectionSpacing: 9,
      verticalPadding: 15
    }
  }

  if (itemCount >= 5) {
    return {
      footerFontSize: 11,
      forecastFontSize: 14,
      labelFontSize: 30,
      priceFontSize: 23,
      rowSpacing: 9,
      sectionSpacing: 10,
      verticalPadding: 16
    }
  }

  return {
    footerFontSize: 12,
    forecastFontSize: 15,
    labelFontSize: 32,
    priceFontSize: 24,
    rowSpacing: 12,
    sectionSpacing: 12,
    verticalPadding: 16
  }
}

/**
 * 加载数据的异步函数
 * @returns 完整油价数据Promise
 */
const loadOilData = async (): Promise<CompleteOilData> => {
  if (!oilData) {
    try {
      oilData = await getCompleteOilData()
    } catch (error) {
      console.error('加载油价数据失败:', error)
      // 返回默认数据
      oilData = {
        startDate: '数据加载失败',
        region: '未知地区',
        areaZoneName: '',
        lastUpdated: new Date().toLocaleString(),
        prices: [],
        availableOilTypes: [],
        priceDirection: 'stranded',
        forecastDate: '未知',
        forecastPrice: '0.00'
      }
    }
  }
  return oilData
}

/**
 * Widget视图 - 根据不同尺寸显示不同布局
 * @param props 组件属性
 * @param props.data 完整油价数据
 */
const WidgetView = ({ data }: { data: CompleteOilData }) => {
  // 获取动态字体颜色和背景图片设置
  const textColor = getDynamicTextColor()
  const oilSettings = getCurrentSettings()
  const title = data.areaZoneName ? `${data.region}${data.areaZoneName}油价` : `${data.region}油价`

  const widgetBackground = generateWidgetBackground(oilSettings)

  switch (Widget.family) {
    case 'systemSmall': {
      const selectedItem = getSmallWidgetOilPriceItem(data)

      return (
        <VStack spacing={6} padding={16} alignment="center" widgetBackground={widgetBackground}>
          <Image systemName="fuelpump.fill" font="title2" foregroundStyle="systemOrange" />
          <Spacer />
          <Text font="title" fontWeight="bold" foregroundStyle={textColor}>
            {selectedItem?.price || '未开放'}
          </Text>
          <Text font="caption" foregroundStyle="#EB604D">
            {selectedItem?.label || '油价'}
          </Text>
          <Spacer />
          <Text font="caption2" foregroundStyle={textColor}>
            {data.lastUpdated}
          </Text>
        </VStack>
      )
    }

    case 'systemMedium': {
      const mediumOilPriceItems = getMediumWidgetOilPriceItems(data)

      return (
        <VStack widgetBackground={widgetBackground}>
          <VStack padding={{ vertical: 14 }}>
            <HStack spacing={4} alignment="bottom" padding={{ horizontal: 16 }}>
              <Image systemName="fuelpump.fill" font="body" foregroundStyle="systemOrange" />
              <Text font="body" fontWeight="bold" foregroundStyle={textColor}>
                {title}
              </Text>
              <Spacer />
            </HStack>

            <Spacer />

            <HStack spacing={16} padding={{ horizontal: 24 }}>
              {mediumOilPriceItems.map(item => (
                <VStack key={item.type} spacing={2} alignment="center">
                  <Text font="title2" fontWeight="medium" foregroundStyle="#EB604D">
                    {item.shortLabel}
                  </Text>
                  <Text font="title3" fontWeight="medium" foregroundStyle={textColor}>
                    {item.price}
                  </Text>
                  <Text font="caption2" foregroundStyle={getTrendColor(data.priceDirection)}>
                    {getTrendSymbol(data.priceDirection)} {formatForecastPrice(data.forecastPrice)}
                  </Text>
                </VStack>
              ))}
            </HStack>

            <Spacer />

            <HStack spacing={2} alignment="center">
              <Text font={10} foregroundStyle={textColor}>
                {data.lastUpdated}刷新
              </Text>
              <Text font={10} foregroundStyle={textColor}>
                •
              </Text>
              <Text font={10} foregroundStyle={textColor}>
                {data.forecastDate + getTrendText(data.priceDirection)}调整
              </Text>
            </HStack>
          </VStack>
        </VStack>
      )
    }

    case 'systemLarge':
    case 'systemExtraLarge': {
      const layout = getLargeWidgetLayout(data.prices.length)

      return (
        <VStack spacing={layout.sectionSpacing} padding={{ horizontal: 16, vertical: layout.verticalPadding }} widgetBackground={widgetBackground}>
          <HStack spacing={4} alignment="top">
            <Image systemName="fuelpump.fill" font="title3" foregroundStyle="systemOrange" />
            <Text font="title3" fontWeight="bold" foregroundStyle={textColor} lineLimit={1} minScaleFactor={0.8}>
              {title}
            </Text>
            <Spacer />
          </HStack>
          <Spacer />
          <VStack spacing={layout.rowSpacing} alignment="center">
            {data.prices.map(item => (
              <GasPriceItem
                key={item.type}
                label={item.shortLabel}
                price={item.price}
                forecastPrice={data.forecastPrice}
                forecastFontSize={layout.forecastFontSize}
                labelFontSize={layout.labelFontSize}
                priceDirection={data.priceDirection}
                priceFontSize={layout.priceFontSize}
              />
            ))}
          </VStack>
          <Spacer />
          <HStack spacing={2} alignment="center">
            <Text font={layout.footerFontSize} foregroundStyle={textColor} lineLimit={1} minScaleFactor={0.8}>
              {data.lastUpdated}刷新
            </Text>
            <Text font={layout.footerFontSize} foregroundStyle={textColor}>
              •
            </Text>
            <Text font={layout.footerFontSize} foregroundStyle={textColor} lineLimit={1} minScaleFactor={0.8}>
              {data.forecastDate + getTrendText(data.priceDirection)}调整
            </Text>
          </HStack>
        </VStack>
      )
    }

    default:
      return (
        <VStack spacing={8} alignment="center">
          <Image systemName="fuelpump.fill" font="title" foregroundStyle="systemOrange" />
          <Text font="body" foregroundStyle={textColor}>
            油价小组件
          </Text>
          <Text font="caption" foregroundStyle={textColor}>
            {data.region}
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
    const data = await loadOilData()
    Widget.present(<WidgetView data={data} />)
  } catch (error) {
    console.error('Widget加载失败:', error)

    // 获取动态字体颜色和背景图片设置用于错误显示
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
