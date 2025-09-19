import { Button, ColorPicker, HStack, List, Navigation, NavigationStack, Section, Spacer, Text, TextField, Toggle, VStack } from 'scripting'
import { useState } from 'scripting'
import type { Color } from 'scripting'
import { createStorageManager } from '../utils/storage'

/**
 * 设置数据类型
 */
export type SettingsData = {
  smallStatusText: string
  smallStatusColor: Color
  enableColorBackground: boolean
  backgroundColors: Color[]
}

// 存储管理
const STORAGE_NAME = 'ScriptPie.CarWidgetSettings'
const storageManager = createStorageManager(STORAGE_NAME)

// 存储键
const STORAGE_KEYS = {
  SMALL_STATUS_TEXT: 'smallStatusText',
  SMALL_STATUS_COLOR: 'smallStatusColor',
  ENABLE_COLOR_BACKGROUND: 'enableColorBackground',
  BACKGROUND_COLORS: 'backgroundColors'
}

// 默认设置
export const DEFAULT_SETTINGS: SettingsData = {
  smallStatusText: 'ALL GOOD',
  smallStatusColor: '#ffffff',
  enableColorBackground: false,
  backgroundColors: ['#999999', '#444444'] // 默认灰色渐变
}

/**
 * 获取当前小号组件设置
 */
export const getCurrentSmallWidgetSettings = () => {
  return {
    smallStatusText: storageManager.storage.get<string>(STORAGE_KEYS.SMALL_STATUS_TEXT),
    smallStatusColor: storageManager.storage.get<string>(STORAGE_KEYS.SMALL_STATUS_COLOR) || DEFAULT_SETTINGS.smallStatusColor,
    enableColorBackground: storageManager.storage.get<boolean>(STORAGE_KEYS.ENABLE_COLOR_BACKGROUND) || DEFAULT_SETTINGS.enableColorBackground,
    backgroundColors: storageManager.storage.get<Color[]>(STORAGE_KEYS.BACKGROUND_COLORS) || DEFAULT_SETTINGS.backgroundColors
  } as SettingsData
}

/**
 * 小号组件设置页面
 */
export const SmallWidgetSettingsPage = () => {
  const dismiss = Navigation.useDismiss()
  const [settings, setSettings] = useState(getCurrentSmallWidgetSettings())

  // 颜色背景相关状态
  const [showAddColorModal, setShowAddColorModal] = useState(false)
  const [newColor, setNewColor] = useState<Color>('#007AFF')

  // 更新设置
  const updateSetting = (key: string, value: any) => {
    storageManager.storage.set(key, value)
    setSettings(getCurrentSmallWidgetSettings())
  }

  // 颜色管理函数
  const handleAddColor = () => {
    const currentColors = settings.backgroundColors || []
    const updatedColors = [...currentColors, newColor]
    updateSetting(STORAGE_KEYS.BACKGROUND_COLORS, updatedColors)
    setNewColor('#007AFF')
    setShowAddColorModal(false)
  }

  const handleRemoveColor = (index: number) => {
    const currentColors = settings.backgroundColors || []
    const updatedColors = currentColors.filter((_, i) => i !== index)
    updateSetting(STORAGE_KEYS.BACKGROUND_COLORS, updatedColors)
  }

  const handleCancelAddColor = () => {
    setNewColor('#007AFF')
    setShowAddColorModal(false)
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="小号组件设置"
        navigationBarTitleDisplayMode="large"
        toolbar={{
          cancellationAction: <Button title="完成" action={dismiss} />
        }}
      >
        {/* 状态文本设置 */}
        <Section
          header={<Text font="headline">状态文本</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              自定义小号汽车小组件显示的状态文本，如：“ALL GOOD”、“车况 良好”等 {'\n'}
              中间空格会换行，建议一个空格
            </Text>
          }
        >
          <TextField
            title="状态文本"
            value={settings.smallStatusText}
            onChanged={text => updateSetting(STORAGE_KEYS.SMALL_STATUS_TEXT, text)}
            prompt="输入状态文本，如：ALL GOOD"
          />
        </Section>

        {/* 状态文本颜色 */}
        <Section
          header={<Text font="headline">状态文本颜色</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              设置状态文本的显示颜色，建议选择与背景对比度高的颜色
            </Text>
          }
        >
          <ColorPicker
            title="状态文本颜色"
            value={settings.smallStatusColor as Color}
            onChanged={color => updateSetting(STORAGE_KEYS.SMALL_STATUS_COLOR, color)}
            supportsOpacity={false}
          />
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
          <Toggle title="开启颜色背景" value={settings.enableColorBackground} onChanged={value => updateSetting(STORAGE_KEYS.ENABLE_COLOR_BACKGROUND, value)} />
        </Section>

        {/* 颜色列表设置 */}
        {settings.enableColorBackground ? (
          <Section
            header={<Text font="headline">颜色列表</Text>}
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
            {settings.backgroundColors && settings.backgroundColors.length > 0 ? (
              settings.backgroundColors.map((color, index) => (
                <HStack key={index}>
                  <VStack spacing={4} alignment="leading">
                    <Text font="body">颜色 {index + 1}</Text>
                    <Text font="caption" foregroundStyle="secondaryLabel">
                      {color}
                    </Text>
                  </VStack>
                  <Spacer />
                  <Button title="删除" action={() => handleRemoveColor(index)} foregroundStyle="systemRed" />
                </HStack>
              ))
            ) : (
              <Text font="footnote" foregroundStyle="secondaryLabel">
                暂无颜色，点击"添加颜色"开始设置
              </Text>
            )}
          </Section>
        ) : null}
      </List>
    </NavigationStack>
  )
}
