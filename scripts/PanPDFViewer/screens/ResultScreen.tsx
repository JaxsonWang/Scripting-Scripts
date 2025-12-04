import { Button, HStack, List, Navigation, Section, Spacer, Text, VStack } from 'scripting'
import { sendToAria2 } from '../utils/aria2-service'

interface ResultItem {
  path: string
  dlink: string
  size: number
  filename: string
  relativePath: string
}

interface ResultScreenProps {
  results: ResultItem[]
  errors: string[]
}

export const ResultScreen = ({ results, errors }: ResultScreenProps) => {
  const dismiss = Navigation.useDismiss()

  const handleCopy = async (link: string) => {
    await Pasteboard.setString(link)
    await Dialog.alert({ title: '已复制', message: '下载链接已复制到剪贴板' })
  }

  const handleDownload = (link: string) => {
    Safari.openURL(link)
  }

  const handleAria2 = async (item: ResultItem) => {
    try {
      await sendToAria2({
        url: item.dlink,
        outPath: item.relativePath || item.filename
      })
      Dialog.alert({ title: '成功', message: `已推送到 Aria2: ${item.filename}` })
    } catch (e: any) {
      Dialog.alert({ title: '推送失败', message: e.message })
    }
  }

  const handleBatchAria2 = async () => {
    let successCount = 0
    for (const item of results) {
      try {
        await sendToAria2({
          url: item.dlink,
          outPath: item.relativePath || item.filename
        })
        successCount++
      } catch (e) {
        console.error(e)
      }
    }
    Dialog.alert({ title: '批量推送完成', message: `成功发送 ${successCount} / ${results.length} 个任务` })
  }

  return (
    <List
      navigationTitle="解析结果"
      navigationBarTitleDisplayMode="inline"
      toolbar={{
        topBarLeading: <Button title="关闭" action={dismiss} />,
        topBarTrailing: results.length > 0 ? <Button title="全部推送到 Aria2" action={handleBatchAria2} /> : undefined
      }}
    >
      {errors.length > 0 && (
        <Section header={<Text font="headline">错误信息</Text>}>
          {errors.map((err, idx) => (
            <Text key={idx} foregroundStyle="systemRed" font="caption">
              {err}
            </Text>
          ))}
        </Section>
      )}

      {results.length > 0 ? (
        results.map((item, idx) => (
          <Section key={idx}>
            <VStack spacing={8}>
              <HStack>
                <Text font="headline" lineLimit={1}>
                  {item.filename}
                </Text>
                <Spacer />
                <Text font="caption" foregroundStyle="secondaryLabel">
                  {formatSize(item.size)}
                </Text>
              </HStack>
              <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={1}>
                {item.relativePath}
              </Text>

              <HStack spacing={10}>
                <Button title="复制链接" action={() => handleCopy(item.dlink)} />
                <Button title="直接下载" action={() => handleDownload(item.dlink)} />
                <Button title="Aria2" action={() => handleAria2(item)} />
              </HStack>
            </VStack>
          </Section>
        ))
      ) : (
        <Section>
          <Text foregroundStyle="secondaryLabel">无成功解析的文件</Text>
        </Section>
      )}
    </List>
  )
}

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
