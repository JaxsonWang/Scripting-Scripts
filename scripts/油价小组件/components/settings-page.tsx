import {
  Button,
  ColorPicker,
  HStack,
  List,
  Navigation,
  NavigationStack,
  Picker,
  Section,
  Spacer,
  Text,
  TextField,
  Toggle,
  VStack,
  useEffect,
  useState
} from 'scripting'
import type { Color } from 'scripting'
import {
  areaOptions,
  getAreaZoneOptions,
  getCurrentAreaSettings,
  getCurrentSettings,
  getSelectedOilType,
  oilTypeOptions,
  saveSettings,
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

  // 获取字体颜色设置
  const oilSettings = getCurrentSettings()
  const [bgPath, setBgPath] = useState<string>(() => oilSettings.bgPath ?? '')
  const [lightModeColor, setLightModeColor] = useState<Color>(() => oilSettings.lightModeColor || '#000000')
  const [darkModeColor, setDarkModeColor] = useState<Color>(() => oilSettings.darkModeColor || '#FFFFFF')

  // 颜色背景相关状态
  const [enableColorBackground, setEnableColorBackground] = useState<boolean>(() => oilSettings.enableColorBackground ?? true)
  const [backgroundColors, setBackgroundColors] = useState<Color[]>(() => oilSettings.backgroundColors ?? ['#999999', '#444444'])
  const [showAddColorModal, setShowAddColorModal] = useState(false)
  const [newColor, setNewColor] = useState<Color>('#007AFF')

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

  // 更新字体颜色设置的函数
  const updateOilSettings = (newSettings: any) => {
    saveSettings(newSettings)
  }

  // 处理背景图片路径变化
  const handleBgPathChange = (path: string) => {
    setBgPath(path)
    const newSettings = { ...oilSettings, bgPath: path }
    updateOilSettings(newSettings)
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

  return (
    <NavigationStack>
      <List
        navigationTitle="设置"
        navigationBarTitleDisplayMode="large"
        toolbar={{
          cancellationAction: <Button title="完成" action={dismiss} />
        }}
      >
        {/* 透明背景图片 - 填写图片地址 */}
        <Section
          header={<Text font="headline">透明背景图片</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              填空不开启，若要使用需要安装 "透明背景" 脚本组件。{'\n'}关注微信公众号「组件派」获取。
            </Text>
          }
        >
          <VStack>
            <TextField
              title="背景图片路径"
              value={bgPath}
              onChanged={handleBgPathChange}
              prompt="请输入背景图路径"
              axis="vertical"
              lineLimit={{ min: 2, max: 4 }}
            />
          </VStack>
        </Section>

        {/* 颜色背景设置 */}
        <Section
          header={<Text font="headline">颜色背景</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              开启后将强制显示颜色背景，即使设置了透明背景也会被覆盖
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
