import { Button, List, Navigation, NavigationStack, Section, Slider, Text, TextField, Toggle, VStack, useMemo, useState } from 'scripting'
import { DanmuService } from '../services/danmu'
import { SettingsService } from '../services/settings'

export const DanmuScreen = () => {
  const dismiss = Navigation.useDismiss()
  const initial = useMemo(() => DanmuService.applyDefaults(SettingsService.getDanmuConfig()), [])
  const [enabled, setEnabled] = useState(initial.enabled)
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl)
  const [opacity, setOpacity] = useState(initial.opacity)
  const [fontSize, setFontSize] = useState(initial.fontSize)
  const [modeScroll, setModeScroll] = useState(initial.modes.scroll)
  const [modeTop, setModeTop] = useState(initial.modes.top)
  const [modeBottom, setModeBottom] = useState(initial.modes.bottom)
  const [testing, setTesting] = useState(false)
  const [testKeyword, setTestKeyword] = useState('test')

  const save = async () => {
    const next = DanmuService.applyDefaults({
      enabled,
      baseUrl,
      opacity,
      fontSize,
      modes: { scroll: modeScroll, top: modeTop, bottom: modeBottom }
    })
    SettingsService.saveDanmuConfig(next)
    await Dialog.alert({ title: '已保存', message: '弹幕设置已更新' })
  }

  const testConnection = async () => {
    const url = baseUrl.trim()
    if (!url) {
      await Dialog.alert({ title: '请先填写 Base URL', message: '示例：http://192.168.1.7:9321/87654321' })
      return
    }
    const keyword = testKeyword.trim() || 'test'
    setTesting(true)
    try {
      const results = await DanmuService.match(url, keyword)
      await Dialog.alert({ title: '测试成功', message: `match 返回 ${results.length} 条结果` })
    } catch (error) {
      console.error('[DanmuScreen] testConnection failed', error)
      await Dialog.alert({ title: '测试失败', message: String(error) })
    } finally {
      setTesting(false)
    }
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="弹幕"
        toolbar={{
          cancellationAction: <Button title="关闭" action={dismiss} />,
          confirmationAction: <Button title="保存" action={() => void save()} />
        }}
      >
        <Section
          header={<Text>服务配置</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              Base URL 需要包含 token 路径段。
            </Text>
          }
        >
          <Toggle title="启用弹幕" value={enabled} onChanged={setEnabled} />
          <TextField title="Base URL" value={baseUrl} onChanged={setBaseUrl} prompt="http://192.168.1.7:9321/87654321" textFieldStyle="roundedBorder" />
          <VStack spacing={8} padding={{ vertical: 6 }}>
            <Text font="subheadline">测试关键词</Text>
            <TextField title="" value={testKeyword} onChanged={setTestKeyword} prompt="test" textFieldStyle="roundedBorder" />
            <Button title={testing ? '测试中...' : '测试连接'} disabled={testing} action={() => void testConnection()} />
          </VStack>
        </Section>

        <Section header={<Text>显示</Text>}>
          <Slider min={0.2} max={1} value={opacity} onChanged={setOpacity} step={0.05} label={<Text>透明度</Text>} />
          <Slider min={10} max={28} value={fontSize} onChanged={setFontSize} step={1} label={<Text>字号</Text>} />
          <Toggle title="滚动弹幕" value={modeScroll} onChanged={setModeScroll} />
          <Toggle title="顶部弹幕" value={modeTop} onChanged={setModeTop} />
          <Toggle title="底部弹幕" value={modeBottom} onChanged={setModeBottom} />
        </Section>
      </List>
    </NavigationStack>
  )
}
