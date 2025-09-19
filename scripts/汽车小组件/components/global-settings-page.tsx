import { Button, ColorPicker, List, Navigation, NavigationStack, Section, Text, TextField } from 'scripting'
import { useState } from 'scripting'
import type { Color } from 'scripting'
import { createStorageManager } from '../utils/storage'
import { ImageCacheManager } from '../utils/image-cache'

// 存储管理
const STORAGE_NAME = 'ScriptPie.CarWidgetSettings'
const storageManager = createStorageManager(STORAGE_NAME)

// 存储键
const STORAGE_KEYS = {
  TRANSPARENT_BG: 'transparentBg',
  LIGHT_FONT_COLOR: 'lightFontColor',
  DARK_FONT_COLOR: 'darkFontColor',
  CAR_IMAGE_URL: 'carImageUrl'
}

// 默认设置
const DEFAULT_SETTINGS = {
  transparentBg: '',
  lightFontColor: '#000000',
  darkFontColor: '#FFFFFF',
  carImageUrl: 'https://img.alicdn.com/imgextra/i4/2038135983/O1CN01zEbwxy1u4Gkjp7IW3_!!2038135983.png'
}

// 固定车辆文件名
const carFileName = `car_image.png`

/**
 * 获取当前全局设置
 */
export const getCurrentGlobalSettings = () => {
  return {
    transparentBg: storageManager.storage.get<string>(STORAGE_KEYS.TRANSPARENT_BG) || DEFAULT_SETTINGS.transparentBg,
    lightFontColor: storageManager.storage.get<string>(STORAGE_KEYS.LIGHT_FONT_COLOR) || DEFAULT_SETTINGS.lightFontColor,
    darkFontColor: storageManager.storage.get<string>(STORAGE_KEYS.DARK_FONT_COLOR) || DEFAULT_SETTINGS.darkFontColor,
    carImageUrl: storageManager.storage.get<string>(STORAGE_KEYS.CAR_IMAGE_URL) || DEFAULT_SETTINGS.carImageUrl
  }
}

/**
 * 全局设置页面
 */
export const GlobalSettingsPage = () => {
  const dismiss = Navigation.useDismiss()
  const [settings, setSettings] = useState(getCurrentGlobalSettings())

  // 更新设置
  const updateSetting = (key: string, value: any) => {
    storageManager.storage.set(key, value)
    setSettings(getCurrentGlobalSettings())
  }

  // 选择车辆图片
  const selectCarImage = async () => {
    try {
      // 使用 Photos.pickPhotos(1) 选择图片
      const selectedPhotos = await Photos.pickPhotos(1)
      console.log('用户选择的图片:', selectedPhotos)

      if (selectedPhotos && selectedPhotos.length > 0) {
        const photo = selectedPhotos[0]
        console.log('选中的图片:', photo)

        try {
          // 使用 ImageCacheManager 缓存图片
          const savedPath = await ImageCacheManager.saveUIImageToCache(photo, carFileName)
          if (savedPath) {
            // 直接使用保存的路径
            updateSetting(STORAGE_KEYS.CAR_IMAGE_URL, savedPath)
            console.log('车辆图片已缓存:', savedPath)
          } else {
            console.error('保存图片失败: 无法获取保存路径')
          }
        } catch (saveError) {
          console.error('缓存图片失败:', saveError)
        }
      }
    } catch (error) {
      console.error('选择图片失败:', error)
    }
  }

  // 重置为默认图片
  const resetToDefaultImage = async () => {
    try {
      // 删除本地图片文件（如果存在）
      const currentImageUrl = settings.carImageUrl
      if (currentImageUrl && currentImageUrl.includes(carFileName)) {
        try {
          await FileManager.remove(currentImageUrl)
          console.log('已删除本地图片文件:', currentImageUrl)
        } catch (deleteError) {
          console.error('删除本地图片文件失败:', deleteError)
        }
      }

      // 重置为默认网络图片
      const defaultImageUrl = 'https://img.alicdn.com/imgextra/i4/2038135983/O1CN01zEbwxy1u4Gkjp7IW3_!!2038135983.png'
      updateSetting(STORAGE_KEYS.CAR_IMAGE_URL, defaultImageUrl)
      console.log('已重置为默认图片')
    } catch (error) {
      console.error('重置图片失败:', error)
    }
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
              选择自定义车辆图片
            </Text>
          }
        >
          <Button title="选择车辆图片" action={selectCarImage} />
          <Button title="重置为默认图片" action={resetToDefaultImage} />
          <Text font="caption2" foregroundStyle="tertiaryLabel">
            当前图片: {settings.carImageUrl.includes(carFileName) ? '本地自定义图片' : '默认网络图片'}
          </Text>
        </Section>
      </List>
    </NavigationStack>
  )
}
