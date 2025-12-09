export const b64touiImageSafe = (input: string) => {
  const imageData = Data.fromBase64String(input)
  if (!imageData) throw '转图片失败'
  return UIImage.fromData(imageData)
}
