import { Button, ColorPicker, HStack, List, Navigation, NavigationStack, Path, Section, Spacer, Text, TextField, Toggle, VStack } from 'scripting'
import { useState } from 'scripting'
import type { Color } from 'scripting'
import { createStorageManager } from '../utils/storage'

// 存储管理
const STORAGE_NAME = 'ScriptPie.CarWidgetSettings'
const storageManager = createStorageManager(STORAGE_NAME)

export type SettingsData = {
  transparentBg: string
  lightFontColor: Color
  darkFontColor: Color
  carImageUrl: string
  carLogoUrl: string
  carLogoHeight: number
  enableColorBackground: boolean
  backgroundColors: Color[]
  totalMileage: string
  enableDynamicMileage: boolean
  dailyMileageIncrement: string
  lastMileageUpdateDate: string
}

// 存储键
const STORAGE_KEYS = {
  TRANSPARENT_BG: 'transparentBg',
  LIGHT_FONT_COLOR: 'lightFontColor',
  DARK_FONT_COLOR: 'darkFontColor',
  CAR_IMAGE_URL: 'carImageUrl',
  CAR_LOGO_URL: 'carLogoUrl',
  CAR_LOGO_HEIGHT: 'carLogoHeight',
  ENABLE_COLOR_BACKGROUND: 'enableColorBackground',
  BACKGROUND_COLORS: 'backgroundColors',
  TOTAL_MILEAGE: 'totalMileage',
  ENABLE_DYNAMIC_MILEAGE: 'enableDynamicMileage',
  DAILY_MILEAGE_INCREMENT: 'dailyMileageIncrement',
  LAST_MILEAGE_UPDATE_DATE: 'lastMileageUpdateDate'
}

// 默认设置
export const DEFAULT_SETTINGS = {
  transparentBg: '',
  lightFontColor: '#000000',
  darkFontColor: '#FFFFFF',
  carImageUrl: 'https://img.alicdn.com/imgextra/i4/2038135983/O1CN01zEbwxy1u4Gkjp7IW3_!!2038135983.png',
  carLogoUrl: 'https://img.alicdn.com/imgextra/i1/2038135983/O1CN01vwxt9y1u4Gkmj3KOx_!!2038135983.png',
  carLogoHeight: 15,
  enableColorBackground: true,
  backgroundColors: ['#999999', '#444444'], // 默认灰色渐变
  totalMileage: '0',
  enableDynamicMileage: false,
  dailyMileageIncrement: '50',
  lastMileageUpdateDate: ''
}

// 固定车辆文件名
export const carFileName = `car_image.png`
export const carLogoName = `car_logo.png`

/**
 * 获取当前全局设置
 */
export const getCurrentGlobalSettings = () => {
  const normalizeStoredPath = (value: any, defaultValue: string) => {
    if (!value) return defaultValue
    if (typeof value === 'string') return value
    const candidate = value.filePath ?? value.fileURL ?? value.path ?? value.url
    return typeof candidate === 'string' ? candidate : defaultValue
  }

  return {
    transparentBg: storageManager.storage.get<string>(STORAGE_KEYS.TRANSPARENT_BG) ?? DEFAULT_SETTINGS.transparentBg,
    lightFontColor: storageManager.storage.get<string>(STORAGE_KEYS.LIGHT_FONT_COLOR) ?? DEFAULT_SETTINGS.lightFontColor,
    darkFontColor: storageManager.storage.get<string>(STORAGE_KEYS.DARK_FONT_COLOR) ?? DEFAULT_SETTINGS.darkFontColor,
    carImageUrl: normalizeStoredPath(storageManager.storage.get(STORAGE_KEYS.CAR_IMAGE_URL), DEFAULT_SETTINGS.carImageUrl),
    carLogoUrl: normalizeStoredPath(storageManager.storage.get(STORAGE_KEYS.CAR_LOGO_URL), DEFAULT_SETTINGS.carLogoUrl),
    carLogoHeight: storageManager.storage.get<number>(STORAGE_KEYS.CAR_LOGO_HEIGHT) ?? DEFAULT_SETTINGS.carLogoHeight,
    enableColorBackground: storageManager.storage.get<boolean>(STORAGE_KEYS.ENABLE_COLOR_BACKGROUND) ?? DEFAULT_SETTINGS.enableColorBackground,
    backgroundColors: storageManager.storage.get<Color[]>(STORAGE_KEYS.BACKGROUND_COLORS) ?? DEFAULT_SETTINGS.backgroundColors,
    totalMileage: storageManager.storage.get<string>(STORAGE_KEYS.TOTAL_MILEAGE) ?? DEFAULT_SETTINGS.totalMileage,
    enableDynamicMileage: storageManager.storage.get<boolean>(STORAGE_KEYS.ENABLE_DYNAMIC_MILEAGE) ?? DEFAULT_SETTINGS.enableDynamicMileage,
    dailyMileageIncrement: storageManager.storage.get<string>(STORAGE_KEYS.DAILY_MILEAGE_INCREMENT) ?? DEFAULT_SETTINGS.dailyMileageIncrement,
    lastMileageUpdateDate: storageManager.storage.get<string>(STORAGE_KEYS.LAST_MILEAGE_UPDATE_DATE) ?? DEFAULT_SETTINGS.lastMileageUpdateDate
  } as SettingsData
}

/**
 * 获取原始设置值
 */
const getRawGlobalSettings = () => {
  const normalizeStoredPath = (value: any, defaultValue: string) => {
    if (!value) return defaultValue
    if (typeof value === 'string') return value
    const candidate = value.filePath ?? value.fileURL ?? value.path ?? value.url
    return typeof candidate === 'string' ? candidate : defaultValue
  }

  return {
    transparentBg: storageManager.storage.get<string>(STORAGE_KEYS.TRANSPARENT_BG) ?? '',
    lightFontColor: storageManager.storage.get<string>(STORAGE_KEYS.LIGHT_FONT_COLOR) ?? DEFAULT_SETTINGS.lightFontColor,
    darkFontColor: storageManager.storage.get<string>(STORAGE_KEYS.DARK_FONT_COLOR) ?? DEFAULT_SETTINGS.darkFontColor,
    carImageUrl: normalizeStoredPath(storageManager.storage.get(STORAGE_KEYS.CAR_IMAGE_URL), DEFAULT_SETTINGS.carImageUrl),
    carLogoUrl: normalizeStoredPath(storageManager.storage.get(STORAGE_KEYS.CAR_LOGO_URL), DEFAULT_SETTINGS.carLogoUrl),
    carLogoHeight: storageManager.storage.get<number>(STORAGE_KEYS.CAR_LOGO_HEIGHT) ?? DEFAULT_SETTINGS.carLogoHeight,
    enableColorBackground: storageManager.storage.get<boolean>(STORAGE_KEYS.ENABLE_COLOR_BACKGROUND) ?? DEFAULT_SETTINGS.enableColorBackground,
    backgroundColors: storageManager.storage.get<Color[]>(STORAGE_KEYS.BACKGROUND_COLORS) ?? DEFAULT_SETTINGS.backgroundColors,
    totalMileage: storageManager.storage.get<string>(STORAGE_KEYS.TOTAL_MILEAGE) ?? '',
    enableDynamicMileage: storageManager.storage.get<boolean>(STORAGE_KEYS.ENABLE_DYNAMIC_MILEAGE) ?? DEFAULT_SETTINGS.enableDynamicMileage,
    dailyMileageIncrement: storageManager.storage.get<string>(STORAGE_KEYS.DAILY_MILEAGE_INCREMENT) ?? '',
    lastMileageUpdateDate: storageManager.storage.get<string>(STORAGE_KEYS.LAST_MILEAGE_UPDATE_DATE) ?? DEFAULT_SETTINGS.lastMileageUpdateDate
  } as SettingsData
}

// 判断当前配置是否指向本地文件（用于展示文案）
const isLocalImage = (value: any, fileName: string) => {
  const path = typeof value === 'string' ? value : (value?.filePath ?? value?.fileURL ?? value?.path ?? value?.url)
  return typeof path === 'string' && path.includes(fileName)
}

/**
 * 全局设置页面
 */
export const GlobalSettingsPage = () => {
  const dismiss = Navigation.useDismiss()
  const [settings, setSettings] = useState(getRawGlobalSettings())

  // 颜色背景相关状态
  const [showAddColorModal, setShowAddColorModal] = useState(false)
  const [newColor, setNewColor] = useState<Color>('#007AFF')

  // 更新设置
  const updateSetting = (key: string, value: any) => {
    storageManager.storage.set(key, value)
    // 直接更新状态，不重新获取，避免空值被默认值覆盖
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  // 清除位置缓存（使用封装的持久化库）
  const clearLocationCache = () => {
    storageManager.storage.remove('Location')
    console.log('位置缓存已清除')
  }

  // 获取经纬度
  const getLocationCoordinates = async () => {
    let location = await Location.pickFromMap()

    const key = 'Location'
    if (location) {
      storageManager.storage.set(key, location)
    } else {
      location = await Location.requestCurrent()
      storageManager.storage.set(key, location)
    }
  }

  // 选择车辆图片
  const selectImage = async (type: 'car' | 'logo') => {
    try {
      // 使用 Photos.pickPhotos(1) 选择图片
      const selectedPhotos = await Photos.pickPhotos(1)
      console.log('用户选择的图片:', selectedPhotos)

      if (selectedPhotos && selectedPhotos.length > 0) {
        const photo = selectedPhotos[0]
        console.log('选中的图片:', photo)

        const typeList = {
          car: carFileName,
          logo: carLogoName
        }

        const key = {
          car: STORAGE_KEYS.CAR_IMAGE_URL,
          logo: STORAGE_KEYS.CAR_LOGO_URL
        }

        // 优先保留 PNG 透明通道，若失败再降级为 JPEG
        const imageData = Data.fromPNG(photo) ?? Data.fromJPEG(photo, 1)
        if (!imageData) throw new Error('无法读取所选图片数据')

        const baseDir = FileManager.appGroupDocumentsDirectory
        const filePath = Path.join(baseDir, typeList[type])
        await FileManager.createDirectory(baseDir, true)
        await FileManager.writeAsData(filePath, imageData)

        updateSetting(key[type], filePath)
        console.log('车辆图片已保存到本地路径:', filePath)
      }
    } catch (error) {
      console.error('选择图片失败:', error)
    }
  }

  // 重置为默认图片
  const resetToDefaultImage = async (type: 'car' | 'logo') => {
    try {
      const key = {
        car: STORAGE_KEYS.CAR_IMAGE_URL,
        logo: STORAGE_KEYS.CAR_LOGO_URL
      }

      const currentImage = {
        car: settings.carImageUrl,
        logo: settings.carLogoUrl
      }

      const typeList = {
        car: carFileName,
        logo: carLogoName
      }
      // 删除本地图片文件（如果存在）
      const currentImageUrl = currentImage[type]
      if (currentImageUrl && currentImageUrl.includes(typeList[type])) {
        try {
          await FileManager.remove(currentImageUrl)
          console.log('已删除本地图片文件:', currentImageUrl)
        } catch (deleteError) {
          console.error('删除本地图片文件失败:', deleteError)
        }
      }

      // 重置为默认网络图片
      const defaultImage = {
        car: DEFAULT_SETTINGS.carImageUrl,
        logo: DEFAULT_SETTINGS.carLogoUrl
      }
      const defaultImageUrl = defaultImage[type]
      updateSetting(key[type], defaultImageUrl)
      console.log('已重置为默认图片')
    } catch (error) {
      console.error('重置图片失败:', error)
    }
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
        navigationTitle="全局设置"
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
          <TextField
            title="背景图片路径"
            value={settings.transparentBg}
            onChanged={text => updateSetting(STORAGE_KEYS.TRANSPARENT_BG, text)}
            prompt="请输入背景图路径"
            axis="vertical"
            lineLimit={{ min: 2, max: 4 }}
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

        {/* 背景颜色列表设置 */}
        {settings.enableColorBackground ? (
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
            {settings.backgroundColors && settings.backgroundColors.length > 0 ? (
              settings.backgroundColors.map((color, index) => (
                <HStack key={index}>
                  <VStack spacing={4} alignment="leading">
                    <Text font="body" foregroundStyle={{ primary: color, secondary: 'white' }}>
                      颜色 {index + 1}
                    </Text>
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

        {/* 字体个性化 */}
        <Section
          header={<Text font="headline">字体个性化</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              设置不同模式下的字体颜色，在各种背景下都清晰可见
            </Text>
          }
        >
          <ColorPicker
            title="浅色模式字体颜色"
            value={settings.lightFontColor as Color}
            onChanged={color => updateSetting(STORAGE_KEYS.LIGHT_FONT_COLOR, color)}
            supportsOpacity={false}
          />
          <ColorPicker
            title="深色模式字体颜色"
            value={settings.darkFontColor as Color}
            onChanged={color => updateSetting(STORAGE_KEYS.DARK_FONT_COLOR, color)}
            supportsOpacity={false}
          />
        </Section>

        {/* 车辆图片 */}
        <Section
          header={<Text font="headline">车辆图片</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              选择自定义车辆 png 图片
            </Text>
          }
        >
          <Button title="选择车辆图片" action={() => selectImage('car')} />
          <Button title="重置为默认图片" action={() => resetToDefaultImage('car')} />
          <Text font="caption2" foregroundStyle="tertiaryLabel">
            当前图片: {isLocalImage(settings.carImageUrl, carFileName) ? '本地自定义图片' : '默认网络图片'}
          </Text>
        </Section>

        {/* 车辆 Logo 图片 */}
        <Section
          header={<Text font="headline">车辆 Logo</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              选择自定义车辆 Logo，建议 png 格式
            </Text>
          }
        >
          <Button title="选择车辆 Logo" action={() => selectImage('logo')} />
          <Button title="重置为默认 Logo" action={() => resetToDefaultImage('logo')} />
          <Text font="caption2" foregroundStyle="tertiaryLabel">
            当前图片: {isLocalImage(settings.carLogoUrl, carLogoName) ? '本地自定义 Logo' : '默认网络 Logo'}
          </Text>
          <Button
            action={async () => {
              const newHeight = await Dialog.prompt({
                title: '设置 Logo 高度',
                placeholder: '请输入 Logo 高度',
                defaultValue: settings.carLogoHeight.toString()
              })
              if (newHeight != null) {
                updateSetting(STORAGE_KEYS.CAR_LOGO_HEIGHT, parseInt(newHeight))
              }
            }}
          >
            <HStack alignment="center">
              <VStack alignment="leading" spacing={2}>
                <Text font="body" foregroundStyle="systemBlue">
                  Logo 高度
                </Text>
              </VStack>
              <Spacer />
              <Text foregroundStyle="label">{settings.carLogoHeight}</Text>
            </HStack>
          </Button>
        </Section>

        {/* 总里程设置 */}
        <Section
          header={<Text font="headline">总里程</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              设置车辆的总里程数值（纯数字），将显示在中号和大号组件中
            </Text>
          }
        >
          <TextField
            title="总里程"
            value={settings.totalMileage}
            onChanged={value => updateSetting(STORAGE_KEYS.TOTAL_MILEAGE, value)}
            prompt="请输入里程数值"
          />
        </Section>

        {/* 动态里程设置 */}
        <Section
          header={<Text font="headline">动态里程</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              开启后每天自动增加里程数值。增加的数值在设定值的±10%范围内随机变化，让里程增长更加真实
            </Text>
          }
        >
          <Toggle title="动态里程" value={settings.enableDynamicMileage} onChanged={value => updateSetting(STORAGE_KEYS.ENABLE_DYNAMIC_MILEAGE, value)} />

          {settings.enableDynamicMileage ? (
            <TextField
              title="增加里程值"
              value={settings.dailyMileageIncrement}
              onChanged={value => updateSetting(STORAGE_KEYS.DAILY_MILEAGE_INCREMENT, value)}
              prompt="请输入每日增加的里程数值"
            />
          ) : null}
        </Section>

        {/* 位置管理 */}
        <Section
          header={<Text font="headline">位置管理</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              获取经纬度后可填入桌面小组件参数栏，为小组件设定固定位置。
            </Text>
          }
        >
          <Button title="获取经纬度" action={getLocationCoordinates} />
          <Button title="清除位置缓存" action={clearLocationCache} />
        </Section>
      </List>
    </NavigationStack>
  )
}
