import { Button, HStack, List, Navigation, NavigationStack, Path, Picker, Section, Spacer, Text, TextField, VStack, useEffect, useState } from 'scripting'
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
  const [subDirectory, setSubDirectory] = useState<string>('透明背景') // 子目录名称

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

  // 根据当前路径判断选中的保存位置（iCloud / 本地）
  const selectedLocation = (() => {
    if (config.path?.startsWith(FileManager.iCloudDocumentsDirectory)) return 'icloud'
    if (config.path?.startsWith(FileManager.appGroupDocumentsDirectory)) return 'local'
    return ''
  })()

  // 从当前路径中提取子目录名称
  const extractSubDirectory = () => {
    if (!config.path) return subDirectory
    if (config.path.startsWith(FileManager.iCloudDocumentsDirectory)) {
      const relative = config.path.replace(FileManager.iCloudDocumentsDirectory, '').replace(/^\//, '')
      return relative || subDirectory
    }
    if (config.path.startsWith(FileManager.appGroupDocumentsDirectory)) {
      const relative = config.path.replace(FileManager.appGroupDocumentsDirectory, '').replace(/^\//, '')
      return relative || subDirectory
    }
    return subDirectory
  }

  // 初始化时从路径中提取子目录
  useEffect(() => {
    const extracted = extractSubDirectory()
    if (extracted !== subDirectory) {
      setSubDirectory(extracted)
    }
  }, [config.path])

  const ensureDir = async (dir: string) => {
    try {
      await FileManager.createDirectory(dir, true)
    } catch (e) {
      // 目录已存在或创建失败时忽略，让后续写入报错更明确
      console.log(e)
    }
  }

  // 选择保存路径（iCloud 或 本地）- 只保存设置，不创建目录
  const handleSaveLocationChange = async (value: string) => {
    const base = value === 'icloud' ? FileManager.iCloudDocumentsDirectory : FileManager.appGroupDocumentsDirectory
    const newPath = Path.join(base, subDirectory)
    setSavePath(newPath)
    setConfig({ ...config, path: newPath })
    // 不在这里创建目录，避免生成垃圾目录
    await updateImageCount()
  }

  // 处理子目录名称变化（实时输入）
  const handleSubDirectoryChange = async (newSubDir: string) => {
    setSubDirectory(newSubDir)
  }

  // 复制当前保存路径到剪贴板
  const handleCopyPath = async () => {
    if (!config.path) {
      await Dialog.alert({ title: '提示', message: '请先选择保存路径' })
      return
    }
    try {
      await Clipboard.copyText(config.path)
      await Dialog.alert({ title: '已复制', message: config.path })
    } catch (error) {
      await Dialog.alert({ title: '复制失败', message: `${config.path}\n\n请手动复制上述路径。` })
    }
  }

  return (
    <NavigationStack>
      <List
        toolbar={{
          cancellationAction: <Button title="完成" action={Navigation.useDismiss()} />
        }}
      >
        <Section listSectionSpacing={0} padding={{ top: -15, bottom: -5, leading: -15 }} header={<Text font="title">透明背景</Text>} />
        <Section title="设置偏好">
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
              try {
                const photos = await Photos.pickPhotos(1)
                const photo = photos?.[0]

                if (photo !== null) {
                  const base64 = Data.fromJPEG(photo, 0.5)?.toBase64String()
                  if (base64) {
                    setConfig({
                      ...config,
                      photo: `data:image/jpeg;base64,${base64}`
                    })
                  }
                } else {
                  console.log('用户取消了选择图片')
                }
              } catch (error) {
                console.log('选择图片时发生错误:', error)
              }
            }}
          >
            <HStack>
              <Text>选择背景图片</Text>
              <Spacer />
              <Text>{config.photo ? '✅' : ''}</Text>
            </HStack>
          </Button>

          <Button action={() => void null}>
            <Picker title="选择保存路径" value={selectedLocation} onChanged={handleSaveLocationChange}>
              <Text tag="icloud">iCloud</Text>
              <Text tag="local">本地</Text>
            </Picker>
          </Button>

          <Button action={() => void null}>
            <TextField title="子目录名称" value={subDirectory} onChanged={handleSubDirectoryChange} prompt="输入子目录名称，如：透明背景" />
          </Button>

          <Button action={handleCopyPath}>
            <HStack>
              <Text>点击复制当前保存路径</Text>
              <Spacer />
              <Text>{config.path ? '已设置' : '未设置'}</Text>
            </HStack>
          </Button>

          {config.path && imageCount > 0 ? (
            <Text font="caption" foregroundStyle="gray" padding={{ leading: 8 }}>
              目录下已有 {imageCount} 张透明背景图片
            </Text>
          ) : (
            <Text font="caption" foregroundStyle="systemOrange" padding={{ leading: 8 }}>
              该目录没有透明背景图，请先生成
            </Text>
          )}
        </Section>

        {config.path ? (
          <Section>
            <Button
              title="删除当前图片目录"
              foregroundStyle="systemRed"
              action={async () => {
                if (!config.path) return

                try {
                  // 检查目录是否存在
                  const dirExists = await FileManager.exists(config.path)
                  if (!dirExists) {
                    await Dialog.alert({
                      title: '目录不存在',
                      message: '指定的目录不存在，无需删除。'
                    })
                    return
                  }

                  // 确认删除操作
                  const confirmed = await Dialog.confirm({
                    title: '确认删除',
                    message: `确定要删除目录 "${config.path}" 下的所有图片吗？此操作不可撤销。`
                  })

                  if (!confirmed) return

                  // 删除目录
                  await FileManager.remove(config.path)

                  // 重新创建空目录
                  // await FileManager.createDirectory(config.path, true)

                  // 更新图片数量
                  await updateImageCount()

                  await Dialog.alert({
                    title: '删除成功',
                    message: '目录下的所有图片已删除。'
                  })
                } catch (error) {
                  console.error('删除目录失败:', error)
                  await Dialog.alert({
                    title: '删除失败',
                    message: `删除操作失败：${error}`
                  })
                }
              }}
            />
            <Text
              styledText={{
                font: 'caption2',
                content: [
                  '本次操作会删除 ',
                  {
                    content: config.path,
                    foregroundColor: 'systemOrange',
                    bold: true
                  },
                  ' 目录下的所有图片'
                ]
              }}
            />
          </Section>
        ) : null}

        <Section
          footer={
            <VStack spacing={10} alignment="leading">
              <Text font="footnote" foregroundStyle="secondaryLabel">
                透明背景 v{getCurrentVersion()}
                {'\n'}
                本组件来自@Scripting 开发者和@小白代码，本组件组合优化。
                {'\n'}
                淮城一只猫© - 更多小组件请关注微信公众号「组件派」
              </Text>
            </VStack>
          }
        >
          <Button
            title="生成所有透明背景图片"
            action={async () => {
              // 判断生成目录是否为空，如果空则创建目录
              if (config.path != null) await ensureDir(config.path)
              await cropAllImages(config, setConfig)
              // 生成完成后更新图片数量
              await updateImageCount()
            }}
          />
          <Text font="caption">
            将一次性生成以下图片：{'\n'}• Small: 6张 (top-right, top-left, middle-left, middle-right, bottom-right, bottom-left){'\n'}• Medium: 3张 (top,
            middle, bottom){'\n'}• Large: 2张 (top, bottom)
          </Text>
        </Section>
      </List>
    </NavigationStack>
  )
}
Navigation.present(<App />)
