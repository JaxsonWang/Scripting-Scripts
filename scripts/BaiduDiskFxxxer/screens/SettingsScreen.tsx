import { Button, List, Navigation, NavigationStack, Section, Text, TextField, useState } from 'scripting'
import { storage } from '../utils/storage'

export const SettingsScreen = () => {
  const dismiss = Navigation.useDismiss()
  const [bduss, setBduss] = useState<string>(() => storage.get('bduss') || '')
  const [aria2Url, setAria2Url] = useState<string>(() => storage.get('aria2Url') || 'http://localhost:6800/jsonrpc')
  const [aria2Token, setAria2Token] = useState<string>(() => storage.get('aria2Token') || '')

  const handleSave = () => {
    storage.set('bduss', bduss)
    storage.set('aria2Url', aria2Url)
    storage.set('aria2Token', aria2Token)
    dismiss()
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="设置"
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          topBarLeading: <Button title="取消" action={dismiss} />,
          topBarTrailing: <Button title="保存" action={handleSave} fontWeight="bold" />
        }}
      >
        <Section header={<Text font="headline">百度账号 (BDUSS)</Text>} footer={<Text font="footnote">请填写您的百度网盘 BDUSS Cookie。</Text>}>
          <TextField title="BDUSS" value={bduss} prompt="BDUSS=..." onChanged={setBduss} />
        </Section>

        <Section header={<Text font="headline">Aria2 配置</Text>} footer={<Text font="footnote">配置本地 Aria2 RPC 服务，用于推送下载任务。</Text>}>
          <TextField title="RPC 地址" value={aria2Url} prompt="http://localhost:6800/jsonrpc" onChanged={setAria2Url} />
          <TextField title="Token" value={aria2Token} prompt="Token (可选)" onChanged={setAria2Token} />
        </Section>
      </List>
    </NavigationStack>
  )
}
