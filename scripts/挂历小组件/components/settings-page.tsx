import { Button, ColorPicker, List, Navigation, NavigationStack, Picker, Section, Text, VStack, useState } from 'scripting'
import type { Color } from 'scripting'
import { createStorageManager } from '../utils/storage'

/**
 * 设置数据类型
 */
export type SettingsData = {
  primaryColor: Color | 'custom' // 主调色
  customColor: Color // 自定义颜色
}

/**
 * 获取实际使用的颜色值
 */
export function getActualColor(settings: SettingsData): Color {
  return settings.primaryColor === 'custom' ? settings.customColor : settings.primaryColor
}

// 储存键名 - 统一管理所有持久化数据
const STORAGE_NAME = 'ScriptPie.LunarCalendarSettings'

// 存储键 - 用于访问统一存储对象中的具体字段
const STORAGE_KEYS = {
  SETTINGS: 'settings'
}

// 创建存储管理器实例
const storageManager = createStorageManager(STORAGE_NAME)

/**
 * 默认设置
 */
const DEFAULT_SETTINGS: SettingsData = {
  primaryColor: 'systemGreen', // 默认绿色
  customColor: '#00C896' // 默认自定义颜色
}

/**
 * 获取当前设置
 */
export function getCurrentSettings(): SettingsData {
  try {
    const savedSettings = storageManager.storage.get<SettingsData>(STORAGE_KEYS.SETTINGS)
    if (savedSettings) {
      return { ...DEFAULT_SETTINGS, ...savedSettings }
    }
  } catch (error) {
    console.error('读取设置失败:', error)
  }
  return DEFAULT_SETTINGS
}

/**
 * 保存设置
 */
export function saveSettings(settings: SettingsData): boolean {
  try {
    storageManager.storage.set(STORAGE_KEYS.SETTINGS, settings)
    console.log('设置已保存:', settings)
    return true
  } catch (error) {
    console.error('保存设置失败:', error)
    return false
  }
}

/**
 * 设置页面组件
 */
export const SettingsPage = () => {
  const dismiss = Navigation.useDismiss()
  const [settings, setSettings] = useState<SettingsData>(() => getCurrentSettings())

  // 更新设置的通用函数
  const updateSetting = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    const success = saveSettings(newSettings)
    if (!success) {
      console.error('保存设置失败')
      // 如果保存失败，可以在这里显示错误提示给用户
    }
  }

  // 颜色选项配置
  const colorOptions = [
    { label: '绿色', value: 'systemGreen' },
    { label: '蓝色', value: 'systemBlue' },
    { label: '紫色', value: 'systemPurple' },
    { label: '橙色', value: 'systemOrange' },
    { label: '红色', value: 'systemRed' },
    { label: '黄色', value: 'systemYellow' },
    { label: '自定义', value: 'custom' }
  ]

  // 处理颜色选择变化
  const handleColorChange = (value: string) => {
    updateSetting('primaryColor', value as Color | 'custom')
  }

  // 处理自定义颜色变化
  const handleCustomColorChange = (color: Color) => {
    updateSetting('customColor', color)
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="挂历设置"
        navigationBarTitleDisplayMode="large"
        toolbar={{
          cancellationAction: <Button title="完成" action={dismiss} />
        }}
      >
        {/* 主调色设置 */}
        <Section header={<Text font="headline">主调色设置</Text>}>
          <Picker title="主调色" value={settings.primaryColor} onChanged={handleColorChange}>
            {colorOptions.map(color => (
              <Text key={color.value} tag={color.value} font="body" lineLimit={1}>
                {color.label}
              </Text>
            ))}
          </Picker>

          {/* 自定义颜色选择器 */}
          {settings.primaryColor === 'custom' ? (
            <VStack spacing={8} padding={{ top: 16 }}>
              <ColorPicker title="选择自定义颜色" value={settings.customColor} onChanged={handleCustomColorChange} supportsOpacity={false} />
            </VStack>
          ) : null}
        </Section>
      </List>
    </NavigationStack>
  )
}
