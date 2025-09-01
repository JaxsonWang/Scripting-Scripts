import { Button, HStack, List, Navigation, NavigationStack, Picker, Section, Spacer, Text, TextField, Toggle, VStack } from 'scripting'
import { useState } from 'scripting'
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

  // 切换分类选择
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        // 如果已选中，则移除（但至少保留一个）
        return prev.length > 1 ? prev.filter(c => c !== category) : prev
      } else {
        // 如果未选中，则添加
        return [...prev, category]
      }
    })
  }

  // 处理刷新间隔选择
  const handleRefreshIntervalChange = (value: string) => {
    setRefreshInterval(parseInt(value))
  }

  // 处理自动刷新选择
  const handleAutoRefreshChange = (value: string) => {
    setAutoRefresh(value === 'true')
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
              启用该选项，需要安装 “透明背景”
            </Text>
          }
        >
          <VStack navigationTitle="背景图路径">
            <TextField title="背景图片路径" value={bgPath} onChanged={setBgPath} prompt="请输入背景图路径" />
          </VStack>
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
            <Button key={index} action={() => setSelectedApiIndex(index)}>
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
