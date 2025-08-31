import type { Config, WidgetPosition } from './typeof'
import { WIDGET_CONFIGS } from './typeof'
import { cropImageWeb } from './utils/cropImageWeb'
import { saveProcessedImage } from './saveProcessedImage'
import { getCache, setSavePath } from './storage'
import { Path } from 'scripting'

const getPos = (direction: WidgetPosition) => {
  const directionMap = getCache()?.dir
  if (!directionMap) {
    throw new Error('Direction map not available')
  }
  const [y, x = 'left'] = direction.split('-') as (keyof typeof directionMap)[]
  return [directionMap[x], directionMap[y]]
}

export const cropAllImages = async (config: Config, setConfig: (config: Config) => void) => {
  if (!getCache()) {
    await Dialog.alert({
      message: '先获取坐标',
      title: '温馨提醒'
    })
    return
  }

  if (!config.photo) {
    await Dialog.alert({
      message: '先选一张图片',
      title: '温馨提醒'
    })
    return
  }

  if (!config.path) {
    await Dialog.alert({
      message: '先选择保存路径',
      title: '温馨提醒'
    })
    return
  }

  const allConfigs = [...WIDGET_CONFIGS.small, ...WIDGET_CONFIGS.medium, ...WIDGET_CONFIGS.large]

  try {
    // 检查是否有文件冲突
    const existingFiles: string[] = []
    for (const widgetConfig of allConfigs) {
      const filePath = Path.join(config.path, widgetConfig.filename)
      if (await FileManager.exists(filePath)) {
        existingFiles.push(widgetConfig.filename)
      }
    }

    // 如果有文件冲突，询问用户处理方式
    let replaceMode = false
    if (existingFiles.length > 0) {
      const index = await Dialog.actionSheet({
        title: `发现 ${existingFiles.length} 个文件已存在`,
        message: '请选择处理方式',
        actions: [{ label: '替换现有文件', destructive: true }, { label: '保留两者（添加时间戳）' }]
      })

      replaceMode = index === 0 // 用户选择替换
    }

    console.log(`开始生成 ${allConfigs.length} 张图片...`)

    for (let i = 0; i < allConfigs.length; i++) {
      const widgetConfig = allConfigs[i]
      const { width, height } = getCache()!.size[widgetConfig.type] ?? {}

      if (!width || !height) {
        console.error(`获取 ${widgetConfig.type} 尺寸信息失败:`, width, height)
        continue
      }

      const [x, y] = getPos(widgetConfig.position)
      const cropPhoto = await cropImageWeb(config.photo, x, y, width * 3, height * 3)

      // 根据用户选择决定文件名
      let finalFilename = widgetConfig.filename
      if (!replaceMode && existingFiles.includes(widgetConfig.filename)) {
        const nameWithoutExt = widgetConfig.filename.replace(/\.[^/.]+$/, '')
        const ext = widgetConfig.filename.match(/\.[^/.]+$/)?.[0] || '.png'
        finalFilename = `${nameWithoutExt}_${Date.now()}${ext}`
      }

      // 保存图片
      await saveProcessedImage(cropPhoto, config.path, finalFilename)

      // 更新进度
      console.log(`已完成 ${i + 1}/${allConfigs.length}: ${finalFilename}`)
    }

    await Dialog.alert({
      message: `成功生成 ${allConfigs.length} 张图片！`,
      title: '完成'
    })

    // 保存路径到存储，方便其他组件调用
    setSavePath(config.path)

    setConfig({
      ...config,
      cropButton: config.cropButton + 1
    })
  } catch (error) {
    await Dialog.alert({
      message: `生成图片时出错: ${error}`,
      title: '错误'
    })
  }
}
