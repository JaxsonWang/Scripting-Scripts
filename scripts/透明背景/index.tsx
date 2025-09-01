import { Button, HStack, Image, List, Navigation, NavigationStack, Path, Section, Spacer, Text, useEffect, useState, VStack } from 'scripting'
import { cropAllImages } from './cropImage'
import type { Config } from './typeof'
import { calculateCropCoordinates } from './utils/calculateCropCoordinates'
import { getCache, getSavePath, setCache, setSavePath } from './storage'
import { getCurrentVersion } from './utils'

const App = () => {
  const [config, setConfig] = useState<Config>({
    photo: undefined,
    path: getSavePath() || undefined, // 初始化时读取之前保存的路径
    cropButton: 0
  })

  const [imageCount, setImageCount] = useState<number>(0)

  // 计算保存目录下的图片数量
  const countImagesInDirectory = async (path: string): Promise<number> => {
    try {
      // 由于 FileManager 可能没有 listDirectory 方法，我们检查已知的文件名
      const expectedFiles = [
        'small-top-right.png',
        'small-top-left.png',
        'small-middle-left.png',
        'small-middle-right.png',
        'small-bottom-right.png',
        'small-bottom-left.png',
        'medium-top.png',
        'medium-middle.png',
        'medium-bottom.png',
        'large-top.png',
        'large-bottom.png'
      ]

      let count = 0
      for (const filename of expectedFiles) {
        const filePath = Path.join(path, filename)
        if (await FileManager.exists(filePath)) {
          count++
        }
      }

      return count
    } catch (error) {
      console.error('读取目录失败:', error)
      return 0
    }
  }

  // 更新图片数量
  const updateImageCount = async () => {
    if (config.path) {
      const count = await countImagesInDirectory(config.path)
      setImageCount(count)
    } else {
      setImageCount(0)
    }
  }

  // 初始化时和路径变化时更新图片数量
  useEffect(() => {
    updateImageCount()
  }, [config.path])
  return (
    <NavigationStack>
      <List
        toolbar={{
          cancellationAction: <Button title={'Close'} action={Navigation.useDismiss()} />
        }}
      >
        <Section listSectionSpacing={0} padding={{ top: -15, bottom: -5, leading: -15 }} header={<Text font="title">透明背景</Text>} />
        <Section title="SCREENSHOT">
          <Button
            action={async () => {
              const widgetPosition = await calculateCropCoordinates()
              setCache(JSON.parse(widgetPosition))
              setConfig({ ...config })
            }}
          >
            <HStack>
              <Text>获取组件坐标</Text>
              <Spacer />
              <Text>{getCache() ? '✅' : '❗️'}</Text>
            </HStack>
          </Button>

          <Button
            action={async () => {
              const [photo] = await Photos.pickPhotos(1)
              const base64 = Data.fromJPEG(photo, 0.5)?.toBase64String()
              setConfig({
                ...config,
                photo: `data:image/jpeg;base64,${base64}`
              })
            }}
          >
            <HStack>
              <Text>选择背景图片</Text>
              <Spacer />
              <Text>{config.photo ? '✅' : ''}</Text>
            </HStack>
          </Button>

          <Button
            action={async () => {
              const path = await DocumentPicker.pickDirectory()
              if (path == null) return
              setSavePath(path) // 保存路径到存储
              setConfig({ ...config, path })
            }}
          >
            <HStack>
              <Text>选择保存路径</Text>
              <Spacer />
              <Text>{config.path ? `已选择${imageCount > 0 ? ` (${imageCount}张图片)` : ''}` : ''}</Text>
            </HStack>
          </Button>

          {config.path && imageCount > 0 ? (
            <Text font="caption" foregroundStyle="gray" padding={{ leading: 8 }}>
              目录下已有 {imageCount} 张透明背景图片
            </Text>
          ) : null}
        </Section>

        <Section
          title="GENERATE ALL IMAGES"
          footer={
            <VStack spacing={10} alignment="leading">
              <Text font="footnote" foregroundStyle="secondaryLabel">
                透明背景 v{getCurrentVersion()}
                {'\n'}
                本组件来自@Scripting 开发者和@小白代码，本组件组合优化。
                {'\n'}
                淮城一只猫© - 更多小组件请关注微信公众号
              </Text>
            </VStack>
          }
        >
          <Button
            title="生成所有透明背景图片"
            action={async () => {
              await cropAllImages(config, setConfig)
              // 生成完成后更新图片数量
              await updateImageCount()
            }}
          />
          <Text font="caption" padding={{ top: 8 }}>
            将一次性生成以下图片：{'\n'}• Small: 6张 (top-right, top-left, middle-left, middle-right, bottom-right, bottom-left){'\n'}• Medium: 3张 (top,
            middle, bottom){'\n'}• Large: 2张 (top, bottom)
          </Text>
        </Section>
      </List>
    </NavigationStack>
  )
}
Navigation.present(<App />)
