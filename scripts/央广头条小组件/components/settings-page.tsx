import { Button, ColorPicker, List, Navigation, NavigationStack, Picker, Section, Text, TextField, VStack } from 'scripting'
import { useState } from 'scripting'
import type { Color } from 'scripting'
import { getCurrentSettings, refreshIntervalOptions, saveSettings } from '../utils/news-service'

/**
 * 设置页面组件
 */
export const SettingsPage = () => {
  const dismiss = Navigation.useDismiss()
  const [currentSettings, setCurrentSettings] = useState(() => getCurrentSettings())
  const [autoRefresh, setAutoRefresh] = useState(currentSettings.autoRefresh ?? true)
  const [refreshInterval, setRefreshInterval] = useState(currentSettings.refreshInterval ?? 30)
  const [bgPath, setBgPath] = useState<string>(() => currentSettings.bgPath ?? '')
  const [lightModeColor, setLightModeColor] = useState<Color>(() => currentSettings.lightModeColor ?? '#000000')
  const [darkModeColor, setDarkModeColor] = useState<Color>(() => currentSettings.darkModeColor ?? '#FFFFFF')

  // 更新设置的通用函数
  const updateSettings = (newSettings: any) => {
    setCurrentSettings(newSettings)
    const success = saveSettings(newSettings)
    if (!success) {
      console.error('保存设置失败')
    }
  }

  // 处理背景图片路径变化
  const handleBgPathChange = (path: string) => {
    setBgPath(path)
    const newSettings = { ...currentSettings, bgPath: path }
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
        navigationTitle="央广头条设置"
        navigationBarTitleDisplayMode="large"
        toolbar={{
          cancellationAction: <Button title="完成" action={dismiss} />
        }}
      >
        {/* 透明背景图片 */}
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

        {/* 自动刷新设置 */}
        <Section
          header={<Text font="headline">自动刷新</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              开启自动刷新后，小组件会定期获取最新的央广网头条新闻
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
      </List>
    </NavigationStack>
  )
}
