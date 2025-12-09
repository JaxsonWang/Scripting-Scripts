import { Button, ColorPicker, HStack, List, Navigation, NavigationStack, Section, Spacer, Text, TextField, VStack } from 'scripting'
import { useState } from 'scripting'
import type { Color } from 'scripting'
import { createStorageManager } from '../utils/storage'

/**
 * 设置数据类型
 */
export type SettingsData = {
  largeStatusText: string
  largeStatusColor: Color
  largeCarModel: string
  largeQuoteText: string
}

// 存储管理
const STORAGE_NAME = 'ScriptPie.CarWidgetSettings'
const storageManager = createStorageManager(STORAGE_NAME)

// 存储键
const STORAGE_KEYS = {
  LARGE_STATUS_TEXT: 'largeStatusText',
  LARGE_STATUS_COLOR: 'largeStatusColor',
  LARGE_CAR_MODEL: 'largeCarModel',
  LARGE_QUOTE_TEXT: 'largeQuoteText'
}

// 默认设置
const DEFAULT_SETTINGS: SettingsData = {
  largeStatusText: 'ALL|GOOD',
  largeStatusColor: '#ffffff',
  largeCarModel: 'Audi RS7 2024',
  largeQuoteText: '世间美好与你环环相扣'
}

/**
 * 获取当前大号组件设置
 */
export const getCurrentLargeWidgetSettings = () => {
  const largeStatusText = storageManager.storage.get<string>(STORAGE_KEYS.LARGE_STATUS_TEXT) ?? DEFAULT_SETTINGS.largeStatusText
  const largeStatusColor = storageManager.storage.get<string>(STORAGE_KEYS.LARGE_STATUS_COLOR) ?? DEFAULT_SETTINGS.largeStatusColor
  const largeCarModel = storageManager.storage.get<string>(STORAGE_KEYS.LARGE_CAR_MODEL) ?? DEFAULT_SETTINGS.largeCarModel
  const largeQuoteText = storageManager.storage.get<string>(STORAGE_KEYS.LARGE_QUOTE_TEXT) ?? DEFAULT_SETTINGS.largeQuoteText

  return {
    largeStatusText,
    largeStatusColor,
    largeCarModel,
    largeQuoteText
  } as SettingsData
}

/**
 * 获取原始大号组件设置（支持空值）
 */
const getRawLargeWidgetSettings = () => {
  const largeStatusText = storageManager.storage.get<string>(STORAGE_KEYS.LARGE_STATUS_TEXT) ?? ''
  const largeStatusColor = storageManager.storage.get<string>(STORAGE_KEYS.LARGE_STATUS_COLOR) ?? DEFAULT_SETTINGS.largeStatusColor
  const largeCarModel = storageManager.storage.get<string>(STORAGE_KEYS.LARGE_CAR_MODEL) ?? ''
  const largeQuoteText = storageManager.storage.get<string>(STORAGE_KEYS.LARGE_QUOTE_TEXT) ?? ''

  return {
    largeStatusText,
    largeStatusColor,
    largeCarModel,
    largeQuoteText
  } as SettingsData
}

/**
 * 大号组件设置页面
 */
export const LargeWidgetSettingsPage = () => {
  const dismiss = Navigation.useDismiss()
  const [settings, setSettings] = useState(getRawLargeWidgetSettings())

  // 更新设置（优化 TextField 用户体验）
  const updateSetting = (key: string, value: any) => {
    storageManager.storage.set(key, value)
    // 直接更新状态，不重新获取，避免空值被默认值覆盖
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="大号组件设置"
        navigationBarTitleDisplayMode="large"
        toolbar={{
          topBarLeading: <Button title="完成" action={dismiss} />
        }}
      >
        {/* 状态文本设置 */}
        <Section
          header={<Text font="headline">状态文本</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              设置大号组件左上角显示的状态文本，带“|”会自动换行
            </Text>
          }
        >
          <TextField
            title="状态文本"
            value={settings.largeStatusText}
            onChanged={value => updateSetting(STORAGE_KEYS.LARGE_STATUS_TEXT, value)}
            prompt="请输入状态文本"
          />
        </Section>

        {/* 状态文本颜色设置 */}
        <Section
          header={<Text font="headline">状态文本颜色</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              设置大号组件状态文本的显示颜色
            </Text>
          }
        >
          <ColorPicker
            title="状态文本颜色"
            value={settings.largeStatusColor as Color}
            onChanged={color => updateSetting(STORAGE_KEYS.LARGE_STATUS_COLOR, color)}
            supportsOpacity={false}
          />
        </Section>

        {/* 汽车型号设置 */}
        <Section
          header={<Text font="headline">汽车型号</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              设置大号组件显示的汽车型号，单行显示不换行
            </Text>
          }
        >
          <TextField
            title="汽车型号"
            value={settings.largeCarModel}
            onChanged={value => updateSetting(STORAGE_KEYS.LARGE_CAR_MODEL, value)}
            prompt="请输入汽车型号"
          />
        </Section>

        {/* 一言一句设置 */}
        <Section
          header={<Text font="headline">一言一句</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              设置大号组件底部显示的一言一句文本
            </Text>
          }
        >
          <TextField
            title="一言一句"
            value={settings.largeQuoteText}
            onChanged={value => updateSetting(STORAGE_KEYS.LARGE_QUOTE_TEXT, value)}
            prompt="请输入一言一句"
          />
        </Section>
      </List>
    </NavigationStack>
  )
}
