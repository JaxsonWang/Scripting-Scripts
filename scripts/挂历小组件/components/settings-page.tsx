import {
  Button,
  ColorPicker,
  Form,
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
  useState
} from 'scripting'
import type { Color } from 'scripting'
import { createStorageManager } from '../utils/storage'
import { SettingsManager, getCurrentSettings as getCalendarSettings, saveSettings as saveCalendarSettings } from '../utils/calendar-service'
import type { FieldReplaceRule } from '../utils/calendar-service'

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

  // 获取字体颜色设置
  const calendarSettings = getCalendarSettings()
  const [bgPath, setBgPath] = useState<string>(() => calendarSettings.bgPath ?? '')
  const [lightModeColor, setLightModeColor] = useState<Color>(() => calendarSettings.lightModeColor || '#000000')
  const [darkModeColor, setDarkModeColor] = useState<Color>(() => calendarSettings.darkModeColor || '#FFFFFF')
  const [workColor, setWorkColor] = useState<Color>(() => calendarSettings.workColor || '#999999')
  const [haltColor, setHaltColor] = useState<Color>(() => calendarSettings.haltColor || '#00CC00')

  // 字段替换规则状态
  const [fieldReplaceRules, setFieldReplaceRules] = useState<FieldReplaceRule[]>(() => SettingsManager.getFieldReplaceRules())
  const [showAddRuleModal, setShowAddRuleModal] = useState<boolean>(false)
  const [newSearchText, setNewSearchText] = useState<string>('')
  const [newReplaceText, setNewReplaceText] = useState<string>('')

  // 颜色背景相关状态
  const [enableColorBackground, setEnableColorBackground] = useState<boolean>(() => calendarSettings.enableColorBackground ?? true)
  const [backgroundColors, setBackgroundColors] = useState<Color[]>(() => calendarSettings.backgroundColors ?? ['#999999', '#444444'])
  const [showAddColorModal, setShowAddColorModal] = useState(false)
  const [newColor, setNewColor] = useState<Color>('#007AFF')

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

  // 更新字体颜色设置的函数
  const updateCalendarSettings = (newSettings: any) => {
    saveCalendarSettings(newSettings)
  }

  // 处理背景图片路径变化
  const handleBgPathChange = (path: string) => {
    setBgPath(path)
    const newSettings = { ...calendarSettings, bgPath: path }
    updateCalendarSettings(newSettings)
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

  // 处理浅色模式颜色变化
  const handleLightModeColorChange = (color: Color) => {
    setLightModeColor(color)
    const newSettings = { ...calendarSettings, lightModeColor: color }
    updateCalendarSettings(newSettings)
  }

  // 处理深色模式颜色变化
  const handleDarkModeColorChange = (color: Color) => {
    setDarkModeColor(color)
    const newSettings = { ...calendarSettings, darkModeColor: color }
    updateCalendarSettings(newSettings)
  }

  // 处理法定工作颜色变化
  const handleWorkColorChange = (color: Color) => {
    setWorkColor(color)
    const newSettings = { ...calendarSettings, workColor: color }
    updateCalendarSettings(newSettings)
  }

  // 处理法定休假颜色变化
  const handleHaltColorChange = (color: Color) => {
    setHaltColor(color)
    const newSettings = { ...calendarSettings, haltColor: color }
    updateCalendarSettings(newSettings)
  }

  // 字段替换规则处理函数
  const handleAddFieldReplaceRule = () => {
    if (newSearchText.trim()) {
      SettingsManager.addFieldReplaceRule(newSearchText, newReplaceText)
      setFieldReplaceRules(SettingsManager.getFieldReplaceRules())
      setNewSearchText('')
      setNewReplaceText('')
      setShowAddRuleModal(false)
    }
  }

  const handleCancelAddRule = () => {
    setNewSearchText('')
    setNewReplaceText('')
    setShowAddRuleModal(false)
  }

  const handleRemoveFieldReplaceRule = (ruleId: string) => {
    SettingsManager.removeFieldReplaceRule(ruleId)
    setFieldReplaceRules(SettingsManager.getFieldReplaceRules())
  }

  // 颜色背景管理函数
  const handleEnableColorBackgroundChange = (value: boolean) => {
    setEnableColorBackground(value)
    const newSettings = { ...calendarSettings, enableColorBackground: value }
    updateCalendarSettings(newSettings)
  }

  const handleAddColor = () => {
    const updatedColors = [...backgroundColors, newColor]
    setBackgroundColors(updatedColors)
    const newSettings = { ...calendarSettings, backgroundColors: updatedColors }
    updateCalendarSettings(newSettings)
    setNewColor('#007AFF')
    setShowAddColorModal(false)
  }

  const handleRemoveColor = (index: number) => {
    const updatedColors = backgroundColors.filter((_, i) => i !== index)
    setBackgroundColors(updatedColors)
    const newSettings = { ...calendarSettings, backgroundColors: updatedColors }
    updateCalendarSettings(newSettings)
  }

  const handleCancelAddColor = () => {
    setNewColor('#007AFF')
    setShowAddColorModal(false)
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
              设置不同模式下的字体颜色，在各种背景下都清晰可见。
            </Text>
          }
        >
          <ColorPicker title="浅色模式" value={lightModeColor} onChanged={handleLightModeColorChange} supportsOpacity={false} />
          <ColorPicker title="深色模式" value={darkModeColor} onChanged={handleDarkModeColorChange} supportsOpacity={false} />
        </Section>

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

        {/* 班/休标识颜色设置 */}
        <Section
          header={<Text font="headline">班/休标识设置</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              在日历右上角小点颜色表示工作状态。
            </Text>
          }
        >
          <ColorPicker title="法定工作" value={workColor} onChanged={handleWorkColorChange} supportsOpacity={false} />
          <ColorPicker title="法定休假" value={haltColor} onChanged={handleHaltColorChange} supportsOpacity={false} />
        </Section>

        {/* 字段替换规则设置 */}
        <Section
          header={<Text font="headline">日历事件字段替换</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              设置字段替换规则，可以将日历事件标题中的特定文字替换为其他文字。{'\n'}
              例如：将"节"替换为空，"国庆节"会显示为"国庆"。
            </Text>
          }
        >
          {/* 添加规则按钮 */}
          <Button
            title="添加规则"
            action={() => setShowAddRuleModal(true)}
            sheet={{
              isPresented: showAddRuleModal,
              onChanged: setShowAddRuleModal,
              content: (
                <NavigationStack>
                  <Form
                    navigationTitle="添加规则"
                    navigationBarTitleDisplayMode="inline"
                    toolbar={{
                      topBarLeading: <Button title="取消" action={handleCancelAddRule} />,
                      topBarTrailing: <Button title="保存" action={handleAddFieldReplaceRule} fontWeight="medium" />
                    }}
                  >
                    <Section>
                      <TextField title="搜索文字" value={newSearchText} onChanged={setNewSearchText} prompt="输入要替换的文字（不能为空）" />
                    </Section>
                    <Section>
                      <TextField title="替换为" value={newReplaceText} onChanged={setNewReplaceText} prompt="输入替换后的文字（可以为空）" />
                    </Section>
                  </Form>
                </NavigationStack>
              )
            }}
          />

          {/* 显示现有规则列表 */}
          {fieldReplaceRules.length > 0 ? (
            fieldReplaceRules.map(rule => (
              <HStack key={rule.id}>
                <Text>
                  "{rule.searchText}" → "{rule.replaceText || '(删除)'}"
                </Text>
                <Spacer />
                <Button title="删除" action={() => handleRemoveFieldReplaceRule(rule.id)} role="destructive" controlSize="small" />
              </HStack>
            ))
          ) : (
            <VStack padding={{ top: 16 }}>
              <Text font="caption" foregroundStyle="secondaryLabel">
                暂无替换规则，点击"添加规则"开始设置
              </Text>
            </VStack>
          )}
        </Section>
      </List>
    </NavigationStack>
  )
}
