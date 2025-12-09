import { HStack, Image, Path, Spacer, Text, VStack, Widget } from 'scripting'
import { DEFAULT_SETTINGS as DEFAULT_GLOBAL_SETTINGS, carFileName, carLogoName, getCurrentGlobalSettings } from './components/global-settings-page'
import { getCurrentSmallWidgetSettings } from './components/small-widget-settings-page'
import { getCurrentMediumWidgetSettings } from './components/medium-widget-settings-page'
import { getCurrentLargeWidgetSettings } from './components/large-widget-settings-page'
import { createStorageManager } from './utils/storage'
import type { Color } from 'scripting'

let carImagePath = ''
let carLogoPath = ''
let fullLocationAddress = '暂无位置信息' // 完整地址（大号组件用）
let shortLocationAddress = '暂无位置信息' // 精简地址（中号组件用）

// 兼容网络 / 本地 / 对象格式的图片值
const normalizeImageValue = (value: any, fallback: string) => {
  if (!value) return fallback
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    const candidate = value.fileURL ?? value.filePath ?? value.path ?? value.url
    if (typeof candidate === 'string') return candidate
  }
  return fallback
}

type ImageSourceProps = { filePath: string } | { imageUrl: string }

// 根据路径返回 Image 组件需要的 props（网络图用 imageUrl，本地图用 filePath）
const buildImageProps = (path: string): ImageSourceProps => {
  return /^https?:\/\//.test(path) ? { imageUrl: path } : { filePath: path }
}

/**
 * 获取所有设置
 */
const getCurrentSettings = () => {
  const globalSettings = getCurrentGlobalSettings()
  const smallSettings = getCurrentSmallWidgetSettings()

  return {
    ...globalSettings,
    ...smallSettings
  }
}

/**
 * 获取动态文本颜色
 */
const getDynamicTextColor = () => {
  const settings = getCurrentSettings()
  return {
    light: settings.lightFontColor,
    dark: settings.darkFontColor
  }
}

/**
 * 格式化当前时间
 */
const formatCurrentTime = (format = 'YYYY-MM-dd HH:mm:ss'): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')

  return format.replace('YYYY', String(year)).replace('MM', month).replace('dd', day).replace('HH', hours).replace('mm', minutes).replace('ss', seconds)
}

/**
 * 获取背景图片路径
 */
const getWidgetBackgroundImagePath = (settings: any) => {
  return settings.transparentBg && Widget.parameter ? Path.join(settings.transparentBg, Widget.parameter) : undefined
}

/**
 * 生成背景样式
 */
const generateWidgetBackground = (settings: any) => {
  // 如果开启了颜色背景，优先使用颜色背景
  if (settings.enableColorBackground && settings.backgroundColors && settings.backgroundColors.length > 0) {
    const colors = settings.backgroundColors

    if (colors.length === 1) {
      // 单个颜色，使用纯色背景
      return colors[0]
    } else {
      // 多个颜色，使用渐变背景
      return {
        gradient: colors.map((color: any, index: number) => ({
          color: color,
          location: index / (colors.length - 1)
        })),
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 1, y: 1 }
      }
    }
  }

  return undefined
}

/**
 * 渲染里程信息
 */
const renderMileageInfo = (settings: any, fontSize: number) => {
  return (
    <HStack spacing={3}>
      <Image systemName="flag" font={fontSize} foregroundStyle={getDynamicTextColor()} />
      <Text font={fontSize} foregroundStyle={getDynamicTextColor()}>
        {settings.totalMileage}km
      </Text>
    </HStack>
  )
}

/**
 * 渲染时间信息
 */
const renderTimeInfo = (currentTime: string, fontSize: number) => {
  return (
    <HStack spacing={3}>
      <Image systemName="clock" font={fontSize} foregroundStyle={getDynamicTextColor()} />
      <Text font={fontSize} foregroundStyle={getDynamicTextColor()}>
        {currentTime}
      </Text>
    </HStack>
  )
}

/**
 * 渲染状态文本
 */
const renderStatusText = (statusText: string, statusColor: Color, fontSize: number, spacing: number) => {
  return (
    <VStack alignment="leading" spacing={spacing}>
      {statusText.split('|').map((line: string, index: number) => (
        <Text key={index} font={fontSize} fontWeight="bold" foregroundStyle={statusColor}>
          {line}
        </Text>
      ))}
    </VStack>
  )
}

/**
 * 获取位置信息
 */
const getLocation = async () => {
  let location: any
  const key = 'Location'
  const storageManager = createStorageManager('ScriptPie.CarWidgetSettings')

  location = await Location.requestCurrent()
  if (!location) {
    location = storageManager.storage.get(key)
    if (!location) throw new Error('请先授权定位')
  } else {
    storageManager.storage.set(key, location)
  }

  return {
    latitude: location?.latitude,
    longitude: location?.longitude
  }
}

/**
 * 获取当前位置信息并格式化地址
 */
const getCurrentLocationInfo = async (): Promise<{ full: string; short: string }> => {
  try {
    const { latitude, longitude } = await getLocation()

    if (!latitude || !longitude) {
      throw new Error('位置信息无效')
    }

    // 反向地理编码获取地址信息
    const placemarks = await Location.reverseGeocode({
      latitude,
      longitude,
      locale: 'zh-CN'
    })

    if (placemarks && placemarks.length > 0) {
      const place = placemarks[0]
      return {
        full: formatFullLocationAddress(place),
        short: formatShortLocationAddress(place)
      }
    }

    const coordinates = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
    return {
      full: coordinates,
      short: coordinates
    }
  } catch (error) {
    console.error('获取位置信息失败:', error)
    return {
      full: '暂无信息',
      short: '暂无信息'
    }
  }
}

/**
 * 格式化完整位置地址（大号组件用）
 */
const formatFullLocationAddress = (placemark: any): string => {
  const addressParts = [
    // placemark.country,
    placemark.administrativeArea,
    placemark.locality,
    placemark.subLocality,
    placemark.thoroughfare,
    placemark.subThoroughfare
  ].filter(Boolean)

  return addressParts.join('') || '位置信息不完整'
}

/**
 * 格式化精简位置地址（中号组件用）
 */
const formatShortLocationAddress = (placemark: any): string => {
  const addressParts = [
    placemark.locality, // 城市
    placemark.subLocality, // 区/县
    placemark.thoroughfare // 街道（不包含门牌号）
  ].filter(Boolean)

  return addressParts.join('') || '位置信息不完整'
}

/**
 * 初始化位置信息
 */
const initializeLocation = async () => {
  try {
    // 直接使用动态位置
    const locationInfo = await getCurrentLocationInfo()
    fullLocationAddress = locationInfo.full
    shortLocationAddress = locationInfo.short
  } catch (error) {
    console.error('初始化位置失败:', error)
    // 保持默认地址
  }
}

/**
 * 更新动态里程
 */
const updateDynamicMileage = () => {
  try {
    const globalSettings = getCurrentGlobalSettings()

    // 如果未启用动态里程，直接返回
    if (!globalSettings.enableDynamicMileage) {
      return
    }

    const today = new Date().toDateString() // 获取今天的日期字符串
    const lastUpdateDate = globalSettings.lastMileageUpdateDate

    // 如果今天已经更新过，直接返回
    if (lastUpdateDate === today) {
      return
    }

    // 计算随机增量（±10%范围）
    const baseIncrement = parseInt(globalSettings.dailyMileageIncrement) || Number(DEFAULT_GLOBAL_SETTINGS.dailyMileageIncrement)
    const variation = baseIncrement * 0.1 // 10%的变化范围
    const minIncrement = Math.max(1, baseIncrement - variation)
    const maxIncrement = baseIncrement + variation
    const randomIncrement = Math.floor(Math.random() * (maxIncrement - minIncrement + 1)) + minIncrement

    // 更新总里程
    const currentMileage = parseInt(globalSettings.totalMileage) || 0
    const newMileage = currentMileage + randomIncrement

    // 保存新的里程和更新日期
    const storageManager = createStorageManager('ScriptPie.CarWidgetSettings')
    storageManager.storage.set('totalMileage', newMileage.toString())
    storageManager.storage.set('lastMileageUpdateDate', today)

    console.log(`动态里程更新: ${currentMileage} -> ${newMileage} (+${randomIncrement})`)
  } catch (error) {
    console.error('动态里程更新失败:', error)
  }
}

/**
 * 获取图片路径
 */
const getImagePath = async (type: 'car' | 'logo') => {
  const settings = getCurrentSettings()

  const imageConfig = {
    car: {
      url: settings.carImageUrl,
      fileName: carFileName,
      defaultUrl: DEFAULT_GLOBAL_SETTINGS.carImageUrl,
      pathVar: () => carImagePath,
      setPath: (path: string) => {
        carImagePath = path
      }
    },
    logo: {
      url: settings.carLogoUrl,
      fileName: carLogoName,
      defaultUrl: DEFAULT_GLOBAL_SETTINGS.carLogoUrl,
      pathVar: () => carLogoPath,
      setPath: (path: string) => {
        carLogoPath = path
      }
    }
  }

  const config = imageConfig[type]
  const { url: currentImageUrl, defaultUrl: defaultImageUrl, setPath } = config
  const normalizedPath = normalizeImageValue(currentImageUrl, defaultImageUrl)

  // 如果没有配置，直接使用默认图片
  if (!normalizedPath) {
    setPath(defaultImageUrl)
    return defaultImageUrl
  }

  // 本地路径直接返回，网络路径留给 Image 组件处理
  setPath(normalizedPath)
  return normalizedPath
}

/**
 * 小号组件视图
 */
const SmallWidgetView = () => {
  const settings = getCurrentSettings()
  const currentTime = formatCurrentTime('HH:mm:ss')

  // 获取背景图片路径和背景样式
  const getWidgetBg = getWidgetBackgroundImagePath(settings)
  const widgetBgSource = getWidgetBg ? buildImageProps(getWidgetBg) : undefined
  const widgetBackground = generateWidgetBackground(settings)

  return (
    <VStack
      spacing={4}
      padding={16}
      background={!settings.enableColorBackground && widgetBgSource ? <Image {...widgetBgSource} resizable scaleToFit /> : undefined}
      widgetBackground={widgetBackground}
    >
      <VStack
        frame={{
          maxWidth: 'infinity',
          maxHeight: 'infinity'
        }}
        overlay={{
          alignment: 'topLeading',
          // 顶部状态文本
          content: (
            <HStack>
              <VStack alignment="leading" spacing={-8}>
                {renderStatusText(settings.smallStatusText, settings.smallStatusColor, 28, -8)}
              </VStack>
              <Spacer />
            </HStack>
          )
        }}
      />
      <VStack
        frame={{
          maxWidth: 'infinity',
          maxHeight: 'infinity'
        }}
        overlay={{
          alignment: 'topTrailing',
          content: <Image {...buildImageProps(carLogoPath)} resizable scaleToFit frame={{ height: settings.carLogoHeight }} />
        }}
      />
      <Spacer />
      {/* 车辆图片 */}
      <HStack
        offset={{
          x: 0,
          y: 20
        }}
      >
        <Image
          {...buildImageProps(carImagePath)}
          resizable
          scaleToFit
          frame={{
            idealWidth: 'infinity',
            height: 58
          }}
        />
      </HStack>

      <Spacer />

      {/* 底部信息 */}
      <VStack spacing={2} offset={{ x: 0, y: 0 }}>
        <Spacer />
        <Image systemName="lock.shield" imageScale="small" foregroundStyle={getDynamicTextColor()} />
        <Text font={10} foregroundStyle={getDynamicTextColor()}>
          {currentTime}
        </Text>
      </VStack>
    </VStack>
  )
}

/**
 * 中号组件视图
 */
const MediumWidgetView = () => {
  const settings = getCurrentSettings()
  const mediumSettings = getCurrentMediumWidgetSettings()
  const currentTime = formatCurrentTime('HH:mm:ss')

  // 获取背景图片路径和背景样式
  const getWidgetBg = getWidgetBackgroundImagePath(settings)
  const widgetBgSource = getWidgetBg ? buildImageProps(getWidgetBg) : undefined
  const widgetBackground = generateWidgetBackground(settings)

  return (
    <HStack
      spacing={20}
      padding={16}
      background={!settings.enableColorBackground && widgetBgSource ? <Image {...widgetBgSource} resizable scaleToFit /> : undefined}
      widgetBackground={widgetBackground}
      overlay={{
        alignment: 'topLeading',
        content: (
          <VStack alignment="leading" offset={{ x: 16, y: 16 }}>
            <VStack alignment="leading" spacing={-5}>
              {mediumSettings.mediumCarModel.split('|').map((line: string, index: number) => (
                <Text key={index} font={20} fontWeight="bold" foregroundStyle={getDynamicTextColor()}>
                  {line}
                </Text>
              ))}
            </VStack>
          </VStack>
        )
      }}
    >
      <VStack alignment="leading">
        <Spacer />
        {renderMileageInfo(settings, 14)}
        {renderTimeInfo(currentTime, 14)}
      </VStack>
      <VStack
        spacing={0}
        overlay={{
          alignment: 'topTrailing',
          content: <Image {...buildImageProps(carLogoPath)} resizable scaleToFit frame={{ height: settings.carLogoHeight + 5 }} />
        }}
        alignment="center"
      >
        <Image
          {...buildImageProps(carImagePath)}
          resizable
          scaleToFit
          frame={{
            idealWidth: 'infinity',
            maxHeight: 'infinity'
          }}
        />
        <HStack
          frame={{
            maxWidth: 'infinity'
          }}
          overlay={{
            alignment: 'bottom',
            content: (
              <HStack spacing={2}>
                <Image systemName="clock" font={11} foregroundStyle={getDynamicTextColor()} />
                <Text font={11} foregroundStyle={getDynamicTextColor()}>
                  {shortLocationAddress}
                </Text>
              </HStack>
            )
          }}
        />
      </VStack>
    </HStack>
  )
}

/**
 * 大号组件视图
 */
const LargeWidgetView = () => {
  const settings = getCurrentSettings()
  const largeSettings = getCurrentLargeWidgetSettings()
  const currentTime = formatCurrentTime('HH:mm:ss')

  // 获取背景图片路径和背景样式
  const getWidgetBg = getWidgetBackgroundImagePath(settings)
  const widgetBgSource = getWidgetBg ? buildImageProps(getWidgetBg) : undefined
  const widgetBackground = generateWidgetBackground(settings)

  return (
    <VStack
      alignment="leading"
      spacing={10}
      padding={16}
      background={!settings.enableColorBackground && widgetBgSource ? <Image {...widgetBgSource} resizable scaleToFit /> : undefined}
      widgetBackground={widgetBackground}
    >
      <HStack spacing={0} frame={{ maxWidth: 'infinity', maxHeight: 0 }}>
        <VStack
          frame={{
            maxWidth: 'infinity',
            maxHeight: 'infinity'
          }}
          overlay={{
            alignment: 'topLeading',
            // 顶部状态文本
            content: renderStatusText(largeSettings.largeStatusText, largeSettings.largeStatusColor, 48, -15)
          }}
        />
        <VStack
          frame={{
            maxWidth: 'infinity',
            maxHeight: 'infinity'
          }}
          overlay={{
            alignment: 'topTrailing',
            // 顶部状态文本
            content: <Image {...buildImageProps(carLogoPath)} resizable scaleToFit frame={{ height: settings.carLogoHeight + 10 }} />
          }}
        />
      </HStack>
      <VStack
        offset={{ x: 0, y: -25 }}
        overlay={{
          alignment: 'bottom',
          content: (
            <>
              <HStack offset={{ x: 0, y: -50 }} spacing={2}>
                <Image systemName="clock" font={11} foregroundStyle={getDynamicTextColor()} />
                <Text font={11} foregroundStyle={getDynamicTextColor()}>
                  {fullLocationAddress}
                </Text>
              </HStack>
              <Text offset={{ x: 0, y: -15 }} font={28} fontWeight="semibold" foregroundStyle={getDynamicTextColor()}>
                {largeSettings.largeCarModel}
              </Text>
            </>
          )
        }}
      >
        <Image
          {...buildImageProps(carImagePath)}
          resizable
          scaleToFit
          frame={{
            idealWidth: 'infinity',
            maxHeight: 'infinity'
          }}
        />
      </VStack>
      <HStack alignment="center">
        <Spacer />
        {renderMileageInfo(settings, 16)}
        <Spacer />
        {renderTimeInfo(currentTime, 16)}
        <Spacer />
      </HStack>
      <HStack alignment="center">
        <Spacer />
        <Text font={14} foregroundStyle={getDynamicTextColor()}>
          {largeSettings.largeQuoteText}
        </Text>
        <Spacer />
      </HStack>
    </VStack>
  )
}

/**
 * 主组件视图
 */
const WidgetView = () => {
  switch (Widget.family) {
    case 'systemSmall':
      return <SmallWidgetView />
    case 'systemMedium':
      return <MediumWidgetView />
    case 'systemLarge':
      return <LargeWidgetView />
    default:
      return <SmallWidgetView />
  }
}

/**
 * 主函数
 */
const main = async () => {
  try {
    await getImagePath('car')
    await getImagePath('logo')
    await initializeLocation()
    updateDynamicMileage()
    // 渲染组件
    Widget.present(<WidgetView />)
  } catch (error) {
    console.error('小组件渲染失败:', error)

    // 显示错误信息
    Widget.present(
      <VStack spacing={8} padding={16}>
        <Text font="caption" foregroundStyle="#FF0000">
          加载失败
        </Text>
        <Text font="caption2" foregroundStyle="#666666">
          {error?.toString() || '未知错误'}
        </Text>
      </VStack>
    )
  }
}

// 执行主函数
main()
