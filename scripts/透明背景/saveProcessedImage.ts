import { Notification, Path } from 'scripting'

export const saveProcessedImage = async (cropPhoto: string, path: string, filename?: string) => {
  if (!path) return

  const imageData = Data.fromBase64String(cropPhoto)
  if (!imageData) throw new Error('无法解析 Base64 字符串')

  const defaultFilename = filename || 'bg.jpg'
  let filePath = Path.join(path, defaultFilename)

  // 如果没有指定文件名，检查文件是否存在并询问用户
  if (!filename) {
    const fileExists = await FileManager.exists(filePath)
    if (fileExists) {
      const index = await Dialog.actionSheet({
        title: '文件已存在，请选择操作',
        actions: [{ label: '替换', destructive: true }, { label: '保留两者' }, { label: '退出' }]
      })

      if (index === 2) return
      if (index === 1) filePath = Path.join(path, `bg_${Date.now()}.jpg`)
    }
  }
  // 如果指定了文件名，直接使用（上层已经处理了冲突）

  await FileManager.writeAsData(filePath, imageData)

  if (!filename) {
    // 只有单个文件时才发送通知
    await Notification.schedule({
      title: '图片处理完成',
      body: '图片已成功裁剪并保存，点击查看按钮预览图片'
    })
  }
}
