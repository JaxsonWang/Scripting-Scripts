import { Button, HStack, List, Navigation, NavigationStack, Section, Spacer, Text, TextField, VStack } from 'scripting'
import { useState } from 'scripting'
import { createStorageManager } from '../utils/storage'

/**
 * 设置数据类型
 */
export type SettingsData = {
  mediumCarModel: string
}

// 存储管理
const STORAGE_NAME = 'ScriptPie.CarWidgetSettings'
const storageManager = createStorageManager(STORAGE_NAME)

// 存储键
const STORAGE_KEYS = {
  MEDIUM_CAR_MODEL: 'mediumCarModel'
}

// 默认设置
const DEFAULT_SETTINGS: SettingsData = {
  mediumCarModel: 'Audi RS7|你好，座驾'
}

/**
 * 获取当前中号组件设置
 */
export const getCurrentMediumWidgetSettings = () => {
  const mediumCarModel = storageManager.storage.get<string>(STORAGE_KEYS.MEDIUM_CAR_MODEL) ?? DEFAULT_SETTINGS.mediumCarModel

  return {
    mediumCarModel
  } as SettingsData
}

/**
 * 获取原始中号组件设置（支持空值）
 */
const getRawMediumWidgetSettings = () => {
  const mediumCarModel = storageManager.storage.get<string>(STORAGE_KEYS.MEDIUM_CAR_MODEL) ?? ''

  return {
    mediumCarModel
  } as SettingsData
}

/**
 * 中号组件设置页面
 */
export const MediumWidgetSettingsPage = () => {
  const dismiss = Navigation.useDismiss()
  const [settings, setSettings] = useState(getRawMediumWidgetSettings())

  // 更新设置（优化 TextField 用户体验）
  const updateSetting = (key: string, value: any) => {
    storageManager.storage.set(key, value)
    // 直接更新状态，不重新获取，避免空值被默认值覆盖
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="中号组件设置"
        navigationBarTitleDisplayMode="large"
        toolbar={{
          topBarLeading: <Button title="完成" action={dismiss} />
        }}
      >
        {/* 汽车型号设置 */}
        <Section
          header={<Text font="headline">汽车型号</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              设置中号组件显示的汽车型号文本，带“|”会自动换行
            </Text>
          }
        >
          <TextField
            title="汽车型号"
            value={settings.mediumCarModel}
            onChanged={value => updateSetting(STORAGE_KEYS.MEDIUM_CAR_MODEL, value)}
            prompt="请输入汽车型号"
          />
        </Section>
      </List>
    </NavigationStack>
  )
}
