import type { Color } from 'scripting'
import { HStack, Image, Path, Script, Spacer, Text, VStack, Widget } from 'scripting'
import { getCurrentGlobalSettings } from './components/global-settings-page'
import { DEFAULT_SETTINGS, getCurrentSmallWidgetSettings } from './components/small-widget-settings-page'
import { ImageCacheManager } from './utils/image-cache'

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
  // 根据系统主题返回对应颜色
  // 这里简化处理，实际可以根据系统主题动态选择
  return (settings.lightFontColor || '#000000') as Color
}

/**
 * 格式化当前时间
 */
const formatCurrentTime = (format = 'yyyy-MM-dd HH:mm:ss'): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')

  return format.replace('yyyy', String(year)).replace('MM', month).replace('dd', day).replace('HH', hours).replace('mm', minutes).replace('ss', seconds)
}

/**
 * 获取车辆图片路径
 */
const getCarImagePath = async (): Promise<string> => {
  const settings = getCurrentSettings()
  const carImageUrl = settings.carImageUrl

  // 如果没有设置图片URL，返回默认图片URL
  if (!carImageUrl) {
    return 'https://img.alicdn.com/imgextra/i4/2038135983/O1CN01zEbwxy1u4Gkjp7IW3_!!2038135983.png'
  }

  // 如果是本地路径（用户选择的图片），直接返回
  if (carImageUrl.startsWith('/') || carImageUrl.includes('car_image.png')) {
    console.log('使用本地图片路径:', carImageUrl)
    return carImageUrl
  }

  // 如果是网络URL，使用缓存管理器获取缓存路径
  try {
    const cachedPath = await ImageCacheManager.getCachedImagePath(carImageUrl)
    console.log('使用缓存图片路径:', cachedPath)
    return cachedPath || carImageUrl // 如果缓存失败，返回原始URL
  } catch (error) {
    console.error('获取车辆图片失败:', error)
    return carImageUrl // 如果出错，返回原始URL
  }
}

/**
 * 小号组件视图
 */
const SmallWidgetView = ({ carImagePath }: { carImagePath: string }) => {
  const settings = getCurrentSettings()
  const smallSettings = getCurrentSmallWidgetSettings()
  const currentTime = formatCurrentTime('HH:mm:ss')

  const smallStatusText = smallSettings.smallStatusText || DEFAULT_SETTINGS.smallStatusText

  // 获取背景图片路径
  const getWidgetBg = settings.transparentBg && Widget.parameter ? Path.join(settings.transparentBg, Widget.parameter) : undefined

  // 生成背景样式
  const getWidgetBackground = () => {
    // 如果开启了颜色背景，优先使用颜色背景
    if (smallSettings.enableColorBackground && smallSettings.backgroundColors && smallSettings.backgroundColors.length > 0) {
      const colors = smallSettings.backgroundColors

      if (colors.length === 1) {
        // 单个颜色，使用纯色背景
        return colors[0]
      } else {
        // 多个颜色，使用渐变背景
        return {
          gradient: colors.map((color, index) => ({
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

  const widgetBackground = getWidgetBackground()

  return (
    <VStack
      spacing={4}
      padding={16}
      background={!smallSettings.enableColorBackground && getWidgetBg ? <Image filePath={getWidgetBg} resizable scaleToFit /> : undefined}
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
                <Text font={28} fontWeight="bold" foregroundStyle={settings.smallStatusColor}>
                  {smallStatusText.split(' ')[0]}
                </Text>
                <Text font={28} fontWeight="bold" foregroundStyle={settings.smallStatusColor}>
                  {smallStatusText.split(' ')[1]}
                </Text>
              </VStack>
              <Spacer />
            </HStack>
          )
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
const MediumWidgetView = ({ carImagePath }: { carImagePath: string | null }) => {
  return (
    <VStack spacing={20} padding={16}>
      <Image
        filePath={Path.join(Script.directory, 'assets', 'material-symbols-light--shield-locked-rounded.png')}
        resizable
        scaleToFit
        frame={{
          width: 129,
          height: 53
        }}
        foregroundStyle="systemRed"
      />
    </VStack>
  )
}

/**
 * 大号组件视图
 */
const LargeWidgetView = () => {
  return (
    <VStack spacing={20} padding={16}>
      <Text font="title" fontWeight="bold" foregroundStyle={getDynamicTextColor()}>
        大号组件
      </Text>
      <Text font="body" foregroundStyle={getDynamicTextColor()}>
        正在开发中...
      </Text>
    </VStack>
  )
}

/**
 * 主组件视图
 */
const WidgetView = ({ carImagePath }: { carImagePath: string }) => {
  switch (Widget.family) {
    case 'systemSmall':
      return <SmallWidgetView carImagePath={carImagePath} />
    case 'systemMedium':
      return <MediumWidgetView carImagePath={carImagePath} />
    case 'systemLarge':
      return <LargeWidgetView />
    default:
      return <SmallWidgetView carImagePath={carImagePath} />
  }
}

/**
 * 主函数
 */
const main = async () => {
  try {
    // 获取车辆图片路径
    const carImagePath = await getCarImagePath()
    console.log('车辆图片路径:', carImagePath)

    // 渲染组件
    Widget.present(<WidgetView carImagePath={carImagePath} />)
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
