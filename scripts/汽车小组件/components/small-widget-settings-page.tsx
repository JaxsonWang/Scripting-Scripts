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
}

// 存储管理
const STORAGE_NAME = 'ScriptPie.CarWidgetSettings'
const storageManager = createStorageManager(STORAGE_NAME)

// 存储键
const STORAGE_KEYS = {
  SMALL_STATUS_TEXT: 'smallStatusText',
  SMALL_STATUS_COLOR: 'smallStatusColor'
}

// 默认设置
export const DEFAULT_SETTINGS: SettingsData = {
  smallStatusText: 'ALL|GOOD',
  smallStatusColor: '#ffffff'
}

/**
 * 获取当前小号组件设置
 */
export const getCurrentSmallWidgetSettings = () => {
  return {
    smallStatusText: storageManager.storage.get<string>(STORAGE_KEYS.SMALL_STATUS_TEXT) ?? DEFAULT_SETTINGS.smallStatusText,
    smallStatusColor: storageManager.storage.get<string>(STORAGE_KEYS.SMALL_STATUS_COLOR) ?? DEFAULT_SETTINGS.smallStatusColor
  } as SettingsData
}

/**
 * 获取原始小号组件设置（支持空值）
 */
const getRawSmallWidgetSettings = () => {
  return {
    smallStatusText: storageManager.storage.get<string>(STORAGE_KEYS.SMALL_STATUS_TEXT) ?? '',
    smallStatusColor: storageManager.storage.get<string>(STORAGE_KEYS.SMALL_STATUS_COLOR) ?? DEFAULT_SETTINGS.smallStatusColor
  } as SettingsData
}

/**
 * 小号组件设置页面
 */
export const SmallWidgetSettingsPage = () => {
  const dismiss = Navigation.useDismiss()
  const [settings, setSettings] = useState(getRawSmallWidgetSettings())

  // 更新设置（优化 TextField 用户体验）
  const updateSetting = (key: string, value: any) => {
    storageManager.storage.set(key, value)
    // 直接更新状态，不重新获取，避免空值被默认值覆盖
    setSettings(prev => ({ ...prev, [key]: value }))
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
              自定义小号汽车小组件显示的状态文本{'\n'}
              带“|”会自动换行
            </Text>
          }
        >
          <TextField
            title="状态文本"
            value={settings.smallStatusText}
            onChanged={text => updateSetting(STORAGE_KEYS.SMALL_STATUS_TEXT, text)}
            prompt="输入状态文本，如：ALL|GOOD"
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
      </List>
    </NavigationStack>
  )
}
