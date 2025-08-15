import { Button, HStack, List, Navigation, NavigationStack, Script, Section, Spacer, Text, VStack, Widget, useEffect, useState } from 'scripting'
import type { CompleteOilData } from './utils/oil-price-service'
import { areaOptions, formatForecastPrice, getCompleteOilData, getCurrentAreaSettings } from './utils/oil-price-service'
import { SettingsPage } from './components/settings-page'

/**
 * 油价详情页面
 */
const GasPriceDetail = () => {
  const dismiss = Navigation.useDismiss()
  const [oilData, setOilData] = useState<CompleteOilData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentArea, setCurrentArea] = useState(() => {
    const settings = getCurrentAreaSettings()
    return settings.areaType
  })

  // 加载数据
  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getCompleteOilData()
      setOilData(data)
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 刷新当前地区设置和数据
  const refreshData = async () => {
    const settings = getCurrentAreaSettings()
    setCurrentArea(settings.areaType)
    await loadData()
  }

  // 初始加载
  useEffect(() => {
    loadData()
  }, [])

  if (loading || !oilData) {
    return (
      <NavigationStack>
        <List navigationTitle="油价详情">
          <Section>
            <Text font="body" foregroundStyle="secondaryLabel">
              正在加载数据...
            </Text>
          </Section>
        </List>
      </NavigationStack>
    )
  }

  const getTrendText = (direction: string) => {
    switch (direction) {
      case 'rising':
        return '上涨'
      case 'falling':
        return '下跌'
      case 'stranded':
        return '搁浅'
      default:
        return '未知'
    }
  }

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'rising':
        return 'systemRed'
      case 'falling':
        return 'systemGreen'
      case 'stranded':
        return 'systemGray'
      default:
        return 'systemGray'
    }
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="油价详情"
        navigationBarTitleDisplayMode="large"
        toolbar={{
          cancellationAction: <Button title="完成" action={dismiss} />,
          primaryAction: (
            <Button
              title="设置"
              action={async () => {
                await Navigation.present({
                  element: <SettingsPage />,
                  modalPresentationStyle: 'pageSheet'
                })
                // 设置页面关闭后刷新数据
                await refreshData()
              }}
            />
          )
        }}
      >
        {/* 当前地区显示 */}
        <Section header={<Text font="headline">油价小组件</Text>}>
          <HStack alignment="center">
            <Text font="body" foregroundStyle="label">
              当前地区
            </Text>
            <Spacer />
            <Text foregroundStyle="label">{areaOptions.find(a => a.value === currentArea)?.label || '未知地区'}</Text>
          </HStack>
        </Section>

        <Section
          header={<Text font="headline">{oilData.region}油价</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              更新时间：{oilData.lastUpdated}
            </Text>
          }
        >
          <HStack alignment="center">
            <Text font="body" foregroundStyle="label">
              92#汽油
            </Text>
            <Spacer />
            <Text font="title3" foregroundStyle="label">
              {oilData.oil92}
            </Text>
          </HStack>

          <HStack alignment="center">
            <Text font="body" foregroundStyle="label">
              95#汽油
            </Text>
            <Spacer />
            <Text font="title3" foregroundStyle="label">
              {oilData.oil95}
            </Text>
          </HStack>

          <HStack alignment="center">
            <Text font="body" foregroundStyle="label">
              98#汽油
            </Text>
            <Spacer />
            <Text font="title3" foregroundStyle="label">
              {oilData.oil98}
            </Text>
          </HStack>

          <HStack alignment="center">
            <Text font="body" foregroundStyle="label">
              0#柴油
            </Text>
            <Spacer />
            <Text font="title3" foregroundStyle="label">
              {oilData.oil0}
            </Text>
          </HStack>
        </Section>

        {/* 预测信息 */}
        <Section
          header={<Text font="headline">价格预测</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              数据仅供参考，实际价格以加油站为准
            </Text>
          }
        >
          <HStack alignment="center">
            <VStack alignment="leading" spacing={4}>
              <Text font="body" foregroundStyle="label">
                预测日期
              </Text>
              <Text font="caption" foregroundStyle="secondaryLabel">
                {oilData.forecastDate}
              </Text>
            </VStack>
            <Spacer />
            <VStack alignment="trailing" spacing={4}>
              <Text font="title3" foregroundStyle={getTrendColor(oilData.priceDirection)}>
                {getTrendText(oilData.priceDirection)}
              </Text>
              <Text font="caption" foregroundStyle="secondaryLabel">
                {formatForecastPrice(oilData.forecastPrice)}
              </Text>
            </VStack>
          </HStack>
        </Section>

        {/* 操作按钮 */}
        <Section>
          <Button
            title="刷新数据"
            action={async () => {
              await loadData()
              Widget.reloadAll()
            }}
          />
        </Section>
      </List>
    </NavigationStack>
  )
}

/**
 * 主函数
 */
const run = async (): Promise<void> => {
  await Navigation.present({
    element: <GasPriceDetail />,
    modalPresentationStyle: 'pageSheet'
  })
  Script.exit()
}

run()
