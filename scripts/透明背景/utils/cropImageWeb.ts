/**
 * 在浏览器环境中裁剪图片的内部函数
 * 注意：此函数将在 WebViewController 的浏览器环境中执行
 * @param base64Image - Base64 格式的图片数据
 * @param x - 裁剪起始 x 坐标
 * @param y - 裁剪起始 y 坐标
 * @param width - 裁剪宽度
 * @param height - 裁剪高度
 * @returns Promise<string> - 返回裁剪后的 Base64 图片数据
 */
const cropImage = (base64Image: string, x: number, y: number, width: number, height: number): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    // @ts-ignore - 在 WebViewController 的浏览器环境中执行，Image 可用
    const img = new Image()

    img.onload = (): void => {
      // @ts-ignore - 在 WebViewController 的浏览器环境中执行，document 可用
      const canvas = document.createElement('canvas')
      // @ts-ignore - 在 WebViewController 的浏览器环境中执行，canvas.getContext 可用
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('无法获取 Canvas 2D 上下文'))
        return
      }

      Object.assign(canvas, { width, height })
      ctx.drawImage(img, x, y, width, height, 0, 0, width, height)
      const base64Result = canvas.toDataURL('image/jpeg').replace(/^data:image\/jpeg;base64,/, '')
      resolve(base64Result)
    }

    img.onerror = (): void => reject(new Error('图片加载失败'))
    img.src = base64Image
  })
}

/**
 * 使用 WebViewController 在 Web 环境中裁剪图片
 * @param base64Image - Base64 格式的图片数据（包含 data:image 前缀）
 * @param x - 裁剪起始 x 坐标
 * @param y - 裁剪起始 y 坐标
 * @param width - 裁剪宽度
 * @param height - 裁剪高度
 * @returns Promise<string> - 返回裁剪后的 Base64 图片数据（不包含前缀）
 */
export const cropImageWeb = async (base64Image: string, x: number, y: number, width: number, height: number): Promise<string> => {
  const web = new WebViewController()

  try {
    return (await web.evaluateJavaScript(`return (${cropImage.toString()})("${base64Image}", ${x}, ${y}, ${width}, ${height})`)) as string
  } finally {
    web.dispose()
  }
}
