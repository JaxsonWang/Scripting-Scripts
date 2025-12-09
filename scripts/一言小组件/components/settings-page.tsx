import { Button, ColorPicker, HStack, List, Navigation, NavigationStack, Picker, Section, Spacer, Text, TextField, Toggle, VStack } from 'scripting'
import { useState } from 'scripting'
import type { Color } from 'scripting'
import { apiConfigs, categoryOptions, getCurrentSettings, refreshIntervalOptions, saveSettings } from '../utils/hitokoto-service'

/**
 * 设置页面组件
 */
export const SettingsPage = () => {
  const dismiss = Navigation.useDismiss()
  const [currentSettings, setCurrentSettings] = useState(() => getCurrentSettings())
  const [selectedApiIndex, setSelectedApiIndex] = useState(currentSettings.apiConfigIndex)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    currentSettings.categories || ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l']
  )
  const [autoRefresh, setAutoRefresh] = useState(currentSettings.autoRefresh ?? true)
  const [refreshInterval, setRefreshInterval] = useState(currentSettings.refreshInterval ?? 30)
  const [bgPath, setBgPath] = useState<string>(() => currentSettings.bgPath ?? '')
  const [lightModeColor, setLightModeColor] = useState<Color>(() => currentSettings.lightModeColor ?? '#000000')
  const [darkModeColor, setDarkModeColor] = useState<Color>(() => currentSettings.darkModeColor ?? '#FFFFFF')

  // 颜色背景相关状态
  const [enableColorBackground, setEnableColorBackground] = useState<boolean>(() => currentSettings.enableColorBackground ?? true)
  const [backgroundColors, setBackgroundColors] = useState<Color[]>(() => currentSettings.backgroundColors ?? ['#999999', '#444444'])
  const [showAddColorModal, setShowAddColorModal] = useState(false)
  const [newColor, setNewColor] = useState<Color>('#007AFF')

  // 更新设置的通用函数
  const updateSettings = (newSettings: any) => {
    setCurrentSettings(newSettings)
    const success = saveSettings(newSettings)
    if (!success) {
      console.error('保存设置失败')
      // 如果保存失败，可以在这里显示错误提示给用户
    }
  }

  // 颜色背景管理函数
  const handleEnableColorBackgroundChange = (value: boolean) => {
    setEnableColorBackground(value)
    updateSettings({ ...currentSettings, enableColorBackground: value })
  }

  const handleAddColor = () => {
    const updatedColors = [...backgroundColors, newColor]
    setBackgroundColors(updatedColors)
    updateSettings({ ...currentSettings, backgroundColors: updatedColors })
    setNewColor('#007AFF')
    setShowAddColorModal(false)
  }

  const handleRemoveColor = (index: number) => {
    const updatedColors = backgroundColors.filter((_, i) => i !== index)
    setBackgroundColors(updatedColors)
    updateSettings({ ...currentSettings, backgroundColors: updatedColors })
  }

  const handleCancelAddColor = () => {
    setNewColor('#007AFF')
    setShowAddColorModal(false)
  }

  // 处理API接口选择
  const handleApiIndexChange = (index: number) => {
    setSelectedApiIndex(index)
    const newSettings = { ...currentSettings, apiConfigIndex: index }
    updateSettings(newSettings)
  }

  // 处理背景图片路径变化
  const handleBgPathChange = (path: string) => {
    setBgPath(path)
    const newSettings = { ...currentSettings, bgPath: path }
    updateSettings(newSettings)
  }

  // 切换分类选择
  const toggleCategory = (category: string) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.length > 1
        ? selectedCategories.filter(c => c !== category)
        : selectedCategories
      : [...selectedCategories, category]

    setSelectedCategories(newCategories)
    const newSettings = { ...currentSettings, categories: newCategories }
    updateSettings(newSettings)
  }

  // 处理刷新间隔选择
  const handleRefreshIntervalChange = (value: string) => {
    const interval = parseInt(value)
    setRefreshInterval(interval)
    const newSettings = { ...currentSettings, refreshInterval: interval }
    updateSettings(newSettings)
  }

  // 处理自动刷新选择
  const handleAutoRefreshChange = (value: string) => {
    const autoRefreshValue = value === 'true'
    setAutoRefresh(autoRefreshValue)
    const newSettings = { ...currentSettings, autoRefresh: autoRefreshValue }
    updateSettings(newSettings)
  }

  // 处理浅色模式颜色变化
  const handleLightModeColorChange = (color: Color) => {
    setLightModeColor(color)
    const newSettings = { ...currentSettings, lightModeColor: color }
    updateSettings(newSettings)
  }

  // 处理深色模式颜色变化
  const handleDarkModeColorChange = (color: Color) => {
    setDarkModeColor(color)
    const newSettings = { ...currentSettings, darkModeColor: color }
    updateSettings(newSettings)
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="一言设置"
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
              填空不开启，若要使用需要安装 “透明背景” 脚本组件。{'\n'}关注微信公众号「组件派」获取。
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

        {/* 字体颜色优化 */}
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
        {/* API接口设置 */}
        <Section
          header={<Text font="headline">API接口</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              {apiConfigs[selectedApiIndex]?.description || '选择合适的接口以获得最佳体验'}
            </Text>
          }
        >
          {apiConfigs.map((config, index) => (
            <Button key={index} action={() => handleApiIndexChange(index)}>
              <HStack alignment="center">
                <VStack alignment="leading" spacing={2}>
                  <Text font="body" foregroundStyle="label">
                    {config.name}
                  </Text>
                  <Text font="caption" foregroundStyle="secondaryLabel">
                    {config.url}
                  </Text>
                </VStack>
                <Spacer />
                {selectedApiIndex === index ? (
                  <Text font="body" foregroundStyle="systemBlue">
                    ✓
                  </Text>
                ) : null}
              </HStack>
            </Button>
          ))}
        </Section>

        {/* 一言类型设置 */}
        <Section
          header={<Text font="headline">一言类型</Text>}
          footer={
            <VStack spacing={4} alignment="leading">
              <Text font="footnote" foregroundStyle="secondaryLabel">
                选择多个类型可获得更丰富的内容体验
              </Text>
              <Text font="footnote" foregroundStyle="tertiaryLabel">
                已选择: {selectedCategories.map(cat => categoryOptions.find(opt => opt.value === cat)?.label).join('、')}
              </Text>
            </VStack>
          }
        >
          <VStack spacing={12}>
            {/* 使用循环生成类型按钮，每行4个 */}
            {Array.from({ length: Math.ceil(categoryOptions.length / 4) }, (_, rowIndex) => (
              <HStack key={rowIndex}>
                {categoryOptions.slice(rowIndex * 4, (rowIndex + 1) * 4).map((option, colIndex) => (
                  <>
                    <Button
                      key={option.value}
                      title={option.label}
                      action={() => toggleCategory(option.value)}
                      buttonStyle={selectedCategories.includes(option.value) ? 'borderedProminent' : 'bordered'}
                    />
                    {colIndex < 3 && rowIndex * 4 + colIndex + 1 < categoryOptions.length ? <Spacer /> : null}
                  </>
                ))}
              </HStack>
            ))}
          </VStack>
        </Section>

        {/* 自动刷新设置 */}
        <Section
          header={<Text font="headline">自动刷新</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              中号和大号组件支持自动刷新，每次刷新会随机显示不同的一言
            </Text>
          }
        >
          <Picker title="自动刷新" value={autoRefresh.toString()} onChanged={handleAutoRefreshChange}>
            <Text tag="true" font="body">
              开启
            </Text>
            <Text tag="false" font="body">
              关闭
            </Text>
          </Picker>

          {autoRefresh ? (
            <Picker title="刷新间隔" value={refreshInterval.toString()} onChanged={handleRefreshIntervalChange}>
              {refreshIntervalOptions.map(option => (
                <Text key={option.value} tag={option.value.toString()} font="body">
                  {option.label}
                </Text>
              ))}
            </Picker>
          ) : null}
        </Section>

        {/* 使用说明 */}
        <Section
          header={<Text font="headline">使用说明</Text>}
          footer={
            <VStack spacing={8} alignment="leading">
              <Text font="footnote" foregroundStyle="secondaryLabel">
                • 国内接口速度较快
              </Text>
              <Text font="footnote" foregroundStyle="secondaryLabel">
                • 国际接口稳定性更好
              </Text>
              <Text font="footnote" foregroundStyle="secondaryLabel">
                • 自动刷新功能仅在桌面组件中生效
              </Text>
              <Text font="footnote" foregroundStyle="secondaryLabel">
                • 修改设置后，小组件将在下次刷新时生效
              </Text>
            </VStack>
          }
        ></Section>
      </List>
    </NavigationStack>
  )
}
