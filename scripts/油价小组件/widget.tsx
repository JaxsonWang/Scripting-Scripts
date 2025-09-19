import { HStack, Image, Path, Spacer, Text, VStack, Widget } from 'scripting'
import type { CompleteOilData } from './utils/oil-price-service'
import {
  formatForecastPrice,
  getCompleteOilData,
  getCurrentSettings,
  getDynamicTextColor,
  getPriceByOilType,
  getSelectedOilType,
  getTrendColor,
  getTrendSymbol,
  oilTypeOptions
} from './utils/oil-price-service'

// 全局数据变量
let oilData: CompleteOilData | null = null

/**
 * 油价项目组件
 * @param props 组件属性
 * @param props.type 油品类型
 * @param props.price 当前价格
 * @param props.forecastPrice 预测价格
 * @param props.priceDirection 价格趋势
 */
const GasPriceItem = ({
  type,
  price,
  forecastPrice,
  priceDirection
}: {
  type: string
  price: string
  forecastPrice?: string
  priceDirection?: 'rising' | 'falling' | 'stranded'
}) => {
  // 获取动态字体颜色
  const textColor = getDynamicTextColor()

  return (
    <HStack alignment="center" spacing={8}>
      <Text font="title" fontWeight="bold" foregroundStyle="#EB604D">
        {type}
      </Text>
      <Spacer />
      <Text font="title2" foregroundStyle={textColor}>
        {price}
      </Text>
      {forecastPrice && priceDirection ? (
        <Text font="subheadline" foregroundStyle={getTrendColor(priceDirection)}>
          {getTrendSymbol(priceDirection)} {formatForecastPrice(forecastPrice)}
        </Text>
      ) : null}
    </HStack>
  )
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
        oil92: formatForecastPrice('0'),
        oil95: formatForecastPrice('0'),
        oil98: formatForecastPrice('0'),
        oil0: formatForecastPrice('0'),
        region: '未知地区',
        lastUpdated: new Date().toLocaleString(),
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
  const parameters = Widget.parameter
  // 获取动态字体颜色和背景图片设置
  const textColor = getDynamicTextColor()
  const oilSettings = getCurrentSettings()
  const getWidgetBg = oilSettings.bgPath && Widget.parameter ? Path.join(oilSettings.bgPath, Widget.parameter) : undefined

  switch (Widget.family) {
    case 'systemSmall': {
      const selectedOilType = getSelectedOilType()
      const selectedOilOption = oilTypeOptions.find(opt => opt.value === selectedOilType) || oilTypeOptions[0]
      const selectedPrice = getPriceByOilType(data, selectedOilType)

      return (
        <VStack
          spacing={6}
          padding={16}
          alignment="center"
          background={getWidgetBg ? <Image filePath={getWidgetBg} resizable={true} scaleToFill={true} /> : undefined}
        >
          <Image systemName="fuelpump.fill" font="title2" foregroundStyle="systemOrange" />
          <Spacer />
          <Text font="title" fontWeight="bold" foregroundStyle={textColor}>
            {selectedPrice}
          </Text>
          <Text font="caption" foregroundStyle="#EB604D">
            {selectedOilOption.label}
          </Text>
          <Spacer />
          <Text font="caption2" foregroundStyle={textColor}>
            {data.lastUpdated}
          </Text>
        </VStack>
      )
    }

    case 'systemMedium': {
      const getTrendStr = (direction: string) => {
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

      return (
        <VStack background={getWidgetBg ? <Image filePath={getWidgetBg} resizable={true} scaleToFill={true} /> : undefined}>
          <VStack padding={{ vertical: 14 }}>
            <HStack spacing={4} alignment="bottom" padding={{ horizontal: 16 }}>
              <Image systemName="fuelpump.fill" font="body" foregroundStyle="systemOrange" />
              <Text font="body" fontWeight="bold" foregroundStyle={textColor}>
                {data.region}油价
              </Text>
              <Spacer />
            </HStack>

            <Spacer />

            <HStack padding={{ horizontal: 32 }}>
              <VStack spacing={2} alignment="center">
                <Text font="title2" fontWeight="medium" foregroundStyle="#EB604D">
                  92#
                </Text>
                <Text font="title3" fontWeight="medium" foregroundStyle={textColor}>
                  {data.oil92}
                </Text>
                <Text font="caption2" foregroundStyle={getTrendColor(data.priceDirection)}>
                  {getTrendSymbol(data.priceDirection)} {formatForecastPrice(data.forecastPrice)}
                </Text>
              </VStack>

              <Spacer />

              <VStack spacing={2} alignment="center">
                <Text font="title2" fontWeight="medium" foregroundStyle="#EB604D">
                  95#
                </Text>
                <Text font="title3" fontWeight="medium" foregroundStyle={textColor}>
                  {data.oil95}
                </Text>
                <Text font="caption2" foregroundStyle={getTrendColor(data.priceDirection)}>
                  {getTrendSymbol(data.priceDirection)} {formatForecastPrice(data.forecastPrice)}
                </Text>
              </VStack>

              <Spacer />

              <VStack spacing={2} alignment="center">
                <Text font="title2" fontWeight="medium" foregroundStyle="#EB604D">
                  98#
                </Text>
                <Text font="title3" fontWeight="medium" foregroundStyle={textColor}>
                  {data.oil98}
                </Text>
                <Text font="caption2" foregroundStyle={getTrendColor(data.priceDirection)}>
                  {getTrendSymbol(data.priceDirection)} {formatForecastPrice(data.forecastPrice)}
                </Text>
              </VStack>

              <Spacer />

              <VStack spacing={2} alignment="center">
                <Text font="title2" fontWeight="medium" foregroundStyle="#EB604D">
                  0#
                </Text>
                <Text font="title3" fontWeight="medium" foregroundStyle={textColor}>
                  {data.oil0}
                </Text>
                <Text font="caption2" foregroundStyle={getTrendColor(data.priceDirection)}>
                  {getTrendSymbol(data.priceDirection)} {formatForecastPrice(data.forecastPrice)}
                </Text>
              </VStack>
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
                {data.forecastDate + getTrendStr(data.priceDirection)}调整
              </Text>
            </HStack>
          </VStack>
        </VStack>
      )
    }

    case 'systemLarge':
    case 'systemExtraLarge': {
      return (
        <VStack spacing={16} padding={16} background={getWidgetBg ? <Image filePath={getWidgetBg} resizable={true} scaleToFill={true} /> : undefined}>
          <HStack spacing={4} alignment="top">
            <Image systemName="fuelpump.fill" font="body" foregroundStyle="systemOrange" />
            <Text font="body" fontWeight="bold" foregroundStyle={textColor}>
              {data.region}油价
            </Text>
            <Spacer />
          </HStack>
          <Spacer />
          <VStack spacing={12} alignment="center">
            <GasPriceItem type="92#" price={data.oil92} forecastPrice={data.forecastPrice} priceDirection={data.priceDirection} />
            <GasPriceItem type="95#" price={data.oil95} forecastPrice={data.forecastPrice} priceDirection={data.priceDirection} />
            <GasPriceItem type="98#" price={data.oil98} forecastPrice={data.forecastPrice} priceDirection={data.priceDirection} />
            <GasPriceItem type="0#" price={data.oil0} forecastPrice={data.forecastPrice} priceDirection={data.priceDirection} />
          </VStack>
          <Spacer />
          <VStack spacing={4} alignment="center">
            <Text font="caption2" foregroundStyle={textColor}>
              预测{data.forecastDate}
              {data.priceDirection === 'rising' ? '上涨' : data.priceDirection === 'falling' ? '下跌' : '搁浅'} {formatForecastPrice(data.forecastPrice)}
            </Text>
            <Text font="caption2" foregroundStyle={textColor}>
              {data.lastUpdated}数据更新
            </Text>
          </VStack>
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
