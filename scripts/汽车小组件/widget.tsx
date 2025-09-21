import { HStack, Image, Path, Script, Spacer, Text, VStack, Widget } from 'scripting'
import { DEFAULT_SETTINGS as DEFAULT_GLOBAL_SETTINGS, carFileName, carLogoName, getCurrentGlobalSettings } from './components/global-settings-page'
import { DEFAULT_SETTINGS as DEFAULT_SMALL_WIDGET_SETTINGS, getCurrentSmallWidgetSettings } from './components/small-widget-settings-page'
import { getCurrentMediumWidgetSettings } from './components/medium-widget-settings-page'
import { getCurrentLargeWidgetSettings } from './components/large-widget-settings-page'
import { ImageCacheManager } from './utils/image-cache'
import type { Color } from 'scripting'

let carImagePath = ''
let carLogoPath = ''
let fullLocationAddress = '' // 完整地址（大号组件用）
let shortLocationAddress = '' // 精简地址（中号组件用）

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
 * 获取当前位置信息
 */
const getCurrentLocationInfo = async (): Promise<{ full: string; short: string }> => {
  try {
    // 设置位置精度
    await Location.setAccuracy('hundredMeters')

    // 获取当前位置
    const location = await Location.requestCurrent()
    if (!location) {
      return {
        full: '无法获取位置信息',
        short: '位置未知'
      }
    }

    // 反向地理编码获取地址信息
    const placemarks = await Location.reverseGeocode({
      latitude: location.latitude,
      longitude: location.longitude,
      locale: 'zh-CN'
    })

    if (placemarks && placemarks.length > 0) {
      const place = placemarks[0]
      return {
        full: formatFullLocationAddress(place),
        short: formatShortLocationAddress(place)
      }
    }

    const coordinates = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
    return {
      full: coordinates,
      short: coordinates
    }
  } catch (error) {
    console.error('获取位置信息失败:', error)
    return {
      full: '',
      short: ''
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
  const { url: currentImageUrl, fileName, defaultUrl: defaultImageUrl, setPath } = config

  // 如果没有设置图片URL，使用默认图片
  if (!currentImageUrl) {
    setPath(defaultImageUrl)
    return defaultImageUrl
  }

  // 如果是本地路径（用户选择的图片），直接返回
  if (currentImageUrl.startsWith('/') || currentImageUrl.includes(fileName)) {
    console.log('使用本地图片路径:', currentImageUrl)
    setPath(currentImageUrl)
    return currentImageUrl
  }

  // 如果是网络URL，使用缓存管理器获取缓存路径
  try {
    const cachedPath = await ImageCacheManager.getCachedImagePath(currentImageUrl)
    const finalPath = cachedPath || currentImageUrl || defaultImageUrl

    setPath(finalPath)
    console.log('使用缓存图片路径:', finalPath)
    return finalPath
  } catch (error) {
    console.error('获取车辆图片失败:', error)
    const finalPath = currentImageUrl || defaultImageUrl

    setPath(finalPath)
    return finalPath
  }
}

/**
 * 小号组件视图
 */
const SmallWidgetView = () => {
  const settings = getCurrentSettings()
  const currentTime = formatCurrentTime('HH:mm:ss')

  // 获取背景图片路径和背景样式
  const getWidgetBg = getWidgetBackgroundImagePath(settings)
  const widgetBackground = generateWidgetBackground(settings)

  return (
    <VStack
      spacing={4}
      padding={16}
      background={!settings.enableColorBackground && getWidgetBg ? <Image filePath={getWidgetBg} resizable scaleToFit /> : undefined}
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
          content: <Image filePath={carLogoPath} resizable scaleToFit frame={{ height: settings.carLogoHeight }} />
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
          filePath={carImagePath}
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
  const widgetBackground = generateWidgetBackground(settings)

  return (
    <HStack
      spacing={20}
      padding={16}
      background={!settings.enableColorBackground && getWidgetBg ? <Image filePath={getWidgetBg} resizable scaleToFit /> : undefined}
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
          content: <Image filePath={carLogoPath} resizable scaleToFit frame={{ height: settings.carLogoHeight + 5 }} />
        }}
        alignment="center"
      >
        <Image
          filePath={carImagePath}
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
  const widgetBackground = generateWidgetBackground(settings)

  return (
    <VStack
      alignment="leading"
      spacing={10}
      padding={16}
      background={!settings.enableColorBackground && getWidgetBg ? <Image filePath={getWidgetBg} resizable scaleToFit /> : undefined}
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
            content: <Image filePath={carLogoPath} resizable scaleToFit frame={{ height: settings.carLogoHeight + 10 }} />
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
          filePath={carImagePath}
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
