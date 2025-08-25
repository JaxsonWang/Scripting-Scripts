import { Button, List, Navigation, NavigationStack, Picker, Section, Text, useEffect, useState } from 'scripting'
import {
  areaOptions,
  getAreaZoneOptions,
  getCurrentAreaSettings,
  getSelectedOilType,
  oilTypeOptions,
  setArea,
  setSelectedOilType
} from '../utils/oil-price-service'

/**
 * 设置页面
 */
export const SettingsPage = () => {
  const dismiss = Navigation.useDismiss()
  const [currentAreaType, setCurrentAreaType] = useState<string>(() => {
    const settings = getCurrentAreaSettings()
    return settings.areaType
  })
  const [currentAreaZoneType, setCurrentAreaZoneType] = useState<number>(() => {
    const settings = getCurrentAreaSettings()
    return settings.areaZoneType
  })
  const [areaZoneOptions, setAreaZoneOptions] = useState<any[]>(() => {
    const settings = getCurrentAreaSettings()
    return settings.areaZoneOptions
  })
  const [selectedOilType, setSelectedOilTypeState] = useState<string>(() => getSelectedOilType())
  const [loading, setLoading] = useState(false)

  // 加载价区选项
  const loadAreaZoneOptions = async (areaType: string) => {
    setLoading(true)
    try {
      const options = await getAreaZoneOptions(areaType)
      setAreaZoneOptions(options)
    } catch (error) {
      console.error('加载价区选项失败:', error)
      setAreaZoneOptions([])
    } finally {
      setLoading(false)
    }
  }

  // 初始加载当前地区的价区选项
  useEffect(() => {
    loadAreaZoneOptions(currentAreaType)
  }, [currentAreaType])

  const handleAreaChange = async (newAreaType: string) => {
    setCurrentAreaType(newAreaType)
    setCurrentAreaZoneType(0) // 重置价区选择
    await loadAreaZoneOptions(newAreaType)
    setArea(newAreaType, 0)
  }

  const handleAreaZoneChange = async (newAreaZoneType: string) => {
    const zoneIndex = parseInt(newAreaZoneType, 10)
    setCurrentAreaZoneType(zoneIndex)
    setArea(currentAreaType, zoneIndex)
  }

  const handleOilTypeChange = async (newOilType: string) => {
    setSelectedOilTypeState(newOilType)
    setSelectedOilType(newOilType)
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="设置"
        navigationBarTitleDisplayMode="large"
        toolbar={{
          cancellationAction: <Button title="完成" action={dismiss} />
        }}
      >
        {/* 地区选择 */}
        <Section header={<Text font="headline">地区选择</Text>}>
          <Picker title="当前地区" value={currentAreaType} onChanged={handleAreaChange}>
            {areaOptions.map(area => (
              <Text key={area.value} tag={area.value} font="body" lineLimit={5}>
                {area.label}
              </Text>
            ))}
          </Picker>
        </Section>

        {/* 价区选择 - 仅在有价区选项时显示 */}
        {areaZoneOptions.length > 0 ? (
          <Section
            header={<Text font="headline">省份价区</Text>}
            footer={
              <Text font="footnote" foregroundStyle="secondaryLabel">
                {loading ? '正在加载价区选项...' : '不同价区的油价可能有所差异'}
              </Text>
            }
          >
            <Picker title="价区选择" value={currentAreaZoneType.toString()} onChanged={handleAreaZoneChange}>
              {areaZoneOptions.map((zone: any) => (
                <Text key={zone.value} tag={zone.value.toString()} lineLimit={10} font="body">
                  {zone.label}
                </Text>
              ))}
            </Picker>
          </Section>
        ) : null}

        {/* 油号选择（仅小号Widget使用） */}
        <Section
          header={<Text font="headline">优先展示油号</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              此设置仅影响优先显示的油号的规格组件
            </Text>
          }
        >
          <Picker title="显示油号" value={selectedOilType} onChanged={handleOilTypeChange}>
            {oilTypeOptions.map(oil => (
              <Text key={oil.value} tag={oil.value} font="body">
                {oil.label}
              </Text>
            ))}
          </Picker>
        </Section>
      </List>
    </NavigationStack>
  )
}
