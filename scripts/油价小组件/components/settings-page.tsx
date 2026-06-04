import { Button, ColorPicker, HStack, List, Navigation, NavigationStack, Picker, Section, Spacer, Text, Toggle, VStack, useEffect, useState } from 'scripting'
import type { Color } from 'scripting'
import type { AreaZoneOption, OilTypeValue } from '../utils/oil-price-service'
import {
  MAX_DISPLAY_OIL_TYPES,
  areaOptions,
  getAreaMetadata,
  getAvailableOilTypes,
  getCurrentAreaSettings,
  getCurrentSettings,
  getSelectedOilTypes,
  getSmallWidgetOilType,
  oilTypeOptions,
  saveSettings,
  setArea,
  setSelectedOilTypes,
  setSmallWidgetOilType
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
  const [areaZoneOptions, setAreaZoneOptions] = useState<AreaZoneOption[]>(() => {
    const settings = getCurrentAreaSettings()
    return settings.areaZoneOptions
  })
  const [availableOilTypes, setAvailableOilTypes] = useState<OilTypeValue[]>(() => getAvailableOilTypes())
  const [selectedOilTypes, setSelectedOilTypesState] = useState<OilTypeValue[]>(() => getSelectedOilTypes(getAvailableOilTypes()))
  const [smallWidgetOilType, setSmallWidgetOilTypeState] = useState<OilTypeValue>(() => getSmallWidgetOilType(getAvailableOilTypes()))
  const [loading, setLoading] = useState(false)

  // 获取字体颜色设置
  const oilSettings = getCurrentSettings()
  const [lightModeColor, setLightModeColor] = useState<Color>(() => oilSettings.lightModeColor || '#000000')
  const [darkModeColor, setDarkModeColor] = useState<Color>(() => oilSettings.darkModeColor || '#FFFFFF')

  // 颜色背景相关状态
  const [enableColorBackground, setEnableColorBackground] = useState<boolean>(() => oilSettings.enableColorBackground ?? true)
  const [backgroundColors, setBackgroundColors] = useState<Color[]>(() => oilSettings.backgroundColors ?? ['#999999', '#444444'])
  const [showAddColorModal, setShowAddColorModal] = useState(false)
  const [newColor, setNewColor] = useState<Color>('#007AFF')

  // 加载价区和当前价区可用油标
  const loadAreaMetadata = async (areaType: string, areaZoneType: number) => {
    setLoading(true)
    try {
      const metadata = await getAreaMetadata(areaType, areaZoneType)
      const nextSelectedOilTypes = getSelectedOilTypes(metadata.availableOilTypes)
      const nextSmallWidgetOilType = getSmallWidgetOilType(metadata.availableOilTypes)

      setAreaZoneOptions(metadata.areaZoneOptions)
      setAvailableOilTypes(metadata.availableOilTypes)
      setSelectedOilTypesState(nextSelectedOilTypes)
      setSmallWidgetOilTypeState(nextSmallWidgetOilType)
    } catch (error) {
      console.error('加载地区元数据失败:', error)
      setAreaZoneOptions([])
      setAvailableOilTypes([])
      setSelectedOilTypesState([])
      setSmallWidgetOilTypeState(getSmallWidgetOilType([]))
    } finally {
      setLoading(false)
    }
  }

  // 初始加载当前地区的价区和油标选项
  useEffect(() => {
    loadAreaMetadata(currentAreaType, currentAreaZoneType)
  }, [currentAreaType])

  const handleAreaChange = async (newAreaType: string) => {
    setCurrentAreaType(newAreaType)
    setCurrentAreaZoneType(0) // 重置价区选择
    setArea(newAreaType, 0)
    await loadAreaMetadata(newAreaType, 0)
  }

  const handleAreaZoneChange = async (newAreaZoneType: string) => {
    const zoneIndex = parseInt(newAreaZoneType, 10)
    setCurrentAreaZoneType(zoneIndex)
    setArea(currentAreaType, zoneIndex)
    await loadAreaMetadata(currentAreaType, zoneIndex)
  }

  const handleOilTypeToggle = async (oilType: OilTypeValue, checked: boolean) => {
    const nextSelectedOilTypes = checked
      ? selectedOilTypes.includes(oilType)
        ? selectedOilTypes
        : [...selectedOilTypes, oilType]
      : selectedOilTypes.filter(item => item !== oilType)

    if (nextSelectedOilTypes.length === 0) {
      await Dialog.alert({
        title: '至少选择一个油标号',
        message: '中号组件需要至少展示一个油标号。'
      })
      return
    }

    setSelectedOilTypesState(nextSelectedOilTypes)
    setSelectedOilTypes(nextSelectedOilTypes)
  }

  const handleSmallWidgetOilTypeChange = (oilType: string) => {
    const nextOilType = oilType as OilTypeValue
    setSmallWidgetOilTypeState(nextOilType)
    setSmallWidgetOilType(nextOilType)
  }

  // 更新字体颜色设置的函数
  const updateOilSettings = (newSettings: any) => {
    saveSettings(newSettings)
  }

  // 处理浅色模式颜色变化
  const handleLightModeColorChange = (color: Color) => {
    setLightModeColor(color)
    const newSettings = { ...oilSettings, lightModeColor: color }
    updateOilSettings(newSettings)
  }

  // 处理深色模式颜色变化
  const handleDarkModeColorChange = (color: Color) => {
    setDarkModeColor(color)
    const newSettings = { ...oilSettings, darkModeColor: color }
    updateOilSettings(newSettings)
  }

  // 颜色背景管理函数
  const handleEnableColorBackgroundChange = (value: boolean) => {
    setEnableColorBackground(value)
    const newSettings = { ...oilSettings, enableColorBackground: value }
    updateOilSettings(newSettings)
  }

  const handleAddColor = () => {
    const updatedColors = [...backgroundColors, newColor]
    setBackgroundColors(updatedColors)
    const newSettings = { ...oilSettings, backgroundColors: updatedColors }
    updateOilSettings(newSettings)
    setNewColor('#007AFF')
    setShowAddColorModal(false)
  }

  const handleRemoveColor = (index: number) => {
    const updatedColors = backgroundColors.filter((_, i) => i !== index)
    setBackgroundColors(updatedColors)
    const newSettings = { ...oilSettings, backgroundColors: updatedColors }
    updateOilSettings(newSettings)
  }

  const handleCancelAddColor = () => {
    setNewColor('#007AFF')
    setShowAddColorModal(false)
  }

  const availableOilTypeOptions = oilTypeOptions.filter(oil => availableOilTypes.includes(oil.value))
  const mediumSelectionFull = selectedOilTypes.length >= MAX_DISPLAY_OIL_TYPES

  return (
    <NavigationStack>
      <List
        navigationTitle="设置"
        navigationBarTitleDisplayMode="large"
        toolbar={{
          cancellationAction: <Button title="完成" action={dismiss} />
        }}
      >
        {/* 颜色背景设置 */}
        <Section
          header={<Text font="headline">颜色背景</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              开启后显示纯色或渐变背景，关闭后使用系统默认背景
            </Text>
          }
        >
          <Toggle title="开启颜色背景" value={enableColorBackground} onChanged={handleEnableColorBackgroundChange} />
        </Section>

        {/* 背景颜色列表设置 */}
        {enableColorBackground ? (
          <Section
            header={<Text font="headline">背景颜色列表</Text>}
            footer={
              <Text font="footnote" foregroundStyle="secondaryLabel">
                单个颜色显示纯色背景，多个颜色显示渐变背景
              </Text>
            }
          >
            {/* 添加颜色按钮 */}
            <Button
              title="添加颜色"
              action={() => setShowAddColorModal(true)}
              sheet={{
                isPresented: showAddColorModal,
                onChanged: setShowAddColorModal,
                content: (
                  <NavigationStack>
                    <List
                      navigationTitle="添加颜色"
                      navigationBarTitleDisplayMode="inline"
                      toolbar={{
                        topBarLeading: <Button title="取消" action={handleCancelAddColor} />,
                        topBarTrailing: <Button title="保存" action={handleAddColor} fontWeight="medium" />
                      }}
                    >
                      <Section>
                        <ColorPicker title="选择颜色" value={newColor} onChanged={setNewColor} supportsOpacity={false} />
                      </Section>
                    </List>
                  </NavigationStack>
                )
              }}
            />

            {/* 显示现有颜色列表 */}
            {backgroundColors && backgroundColors.length > 0 ? (
              backgroundColors.map((color, index) => (
                <VStack key={index} spacing={8}>
                  {/* 颜色信息区域 - 只显示，不可点击 */}
                  <HStack>
                    <VStack spacing={4} alignment="leading">
                      <Text font="body">颜色 {index + 1}</Text>
                      <Text font="caption">{color}</Text>
                    </VStack>
                    <Spacer />
                    {/* 删除按钮区域 - 独立点击区域 */}
                    <Button title="删除" role="destructive" action={() => handleRemoveColor(index)} />
                  </HStack>
                </VStack>
              ))
            ) : (
              <Text font="footnote" foregroundStyle="secondaryLabel">
                暂无颜色，点击"添加颜色"开始设置
              </Text>
            )}
          </Section>
        ) : null}

        {/* 字体颜色设置 */}
        <Section
          header={<Text font="headline">字体个性化</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              设置不同模式下的字体颜色，在各种背景下都清晰可见
            </Text>
          }
        >
          <ColorPicker title="浅色模式" value={lightModeColor} onChanged={handleLightModeColorChange} supportsOpacity={false} />
          <ColorPicker title="深色模式" value={darkModeColor} onChanged={handleDarkModeColorChange} supportsOpacity={false} />
        </Section>

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

        {/* 小号组件油标选择 */}
        <Section header={<Text font="headline">小号组件展示油标号</Text>}>
          {availableOilTypeOptions.length > 0 ? (
            <Picker title="小号组件油标" value={smallWidgetOilType} onChanged={handleSmallWidgetOilTypeChange}>
              {availableOilTypeOptions.map(oil => (
                <Text key={oil.value} tag={oil.value} font="body" lineLimit={5}>
                  {oil.label}
                </Text>
              ))}
            </Picker>
          ) : (
            <Text font="footnote" foregroundStyle="secondaryLabel">
              当前地区暂无可用油标数据，请刷新后重试。
            </Text>
          )}
        </Section>

        {/* 中号组件油标选择 */}
        <Section header={<Text font="headline">中号组件展示油标号</Text>}>
          {availableOilTypeOptions.map(oil => {
            const checked = selectedOilTypes.includes(oil.value)

            return (
              <Toggle
                key={oil.value}
                title={oil.label}
                value={checked}
                onChanged={checked => handleOilTypeToggle(oil.value, checked)}
                disabled={!checked && mediumSelectionFull}
              />
            )
          })}
          {loading ? (
            <Text font="footnote" foregroundStyle="secondaryLabel">
              正在加载可用油标...
            </Text>
          ) : null}
          {!loading && availableOilTypes.length === 0 ? (
            <Text font="footnote" foregroundStyle="secondaryLabel">
              当前地区暂无可用油标数据，请刷新后重试。
            </Text>
          ) : null}
        </Section>
      </List>
    </NavigationStack>
  )
}
