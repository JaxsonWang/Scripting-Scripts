import { Button, HStack, List, Navigation, NavigationStack, Script, Section, SecureField, Spacer, Text, TextField, useMemo, useState } from 'scripting'
import { getOpenClawConfig, maskToken, resetOpenClawConfig, saveOpenClawConfig } from './config'

const SettingsPage = () => {
  const [savedConfig, setSavedConfig] = useState(() => getOpenClawConfig())

  const [baseUrl, setBaseUrl] = useState(savedConfig.baseUrl)
  const [authToken, setAuthToken] = useState(savedConfig.authToken)
  const [toolsInvokePath, setToolsInvokePath] = useState(savedConfig.toolsInvokePath)
  const [openaiChatPath, setOpenaiChatPath] = useState(savedConfig.openaiChatPath)
  const [defaultAgentId, setDefaultAgentId] = useState(savedConfig.defaultAgentId)
  const [defaultSessionKey, setDefaultSessionKey] = useState(savedConfig.defaultSessionKey)

  const isDirty = useMemo(() => {
    return (
      baseUrl.trim() !== savedConfig.baseUrl ||
      authToken.trim() !== savedConfig.authToken ||
      toolsInvokePath.trim() !== savedConfig.toolsInvokePath ||
      openaiChatPath.trim() !== savedConfig.openaiChatPath ||
      defaultAgentId.trim() !== savedConfig.defaultAgentId ||
      defaultSessionKey.trim() !== savedConfig.defaultSessionKey
    )
  }, [authToken, baseUrl, defaultAgentId, defaultSessionKey, openaiChatPath, savedConfig, toolsInvokePath])

  const saveSettings = async () => {
    if (!baseUrl.trim()) {
      await Dialog.alert({ title: '保存失败', message: 'Base URL 不能为空。' })
      return
    }
    if (!authToken.trim()) {
      await Dialog.alert({ title: '保存失败', message: 'Auth Token 不能为空。' })
      return
    }

    const next = saveOpenClawConfig({
      baseUrl,
      authToken,
      toolsInvokePath,
      openaiChatPath,
      defaultAgentId,
      defaultSessionKey
    })

    setSavedConfig(next)
    setBaseUrl(next.baseUrl)
    setAuthToken(next.authToken)
    setToolsInvokePath(next.toolsInvokePath)
    setOpenaiChatPath(next.openaiChatPath)
    setDefaultAgentId(next.defaultAgentId)
    setDefaultSessionKey(next.defaultSessionKey)

    await Dialog.alert({
      title: '保存成功',
      message: 'OpenClaw 配置已更新，助手工具下次调用会自动生效。'
    })
  }

  const resetSettings = async () => {
    const confirmed = await Dialog.confirm({
      title: '恢复默认配置',
      message: '确认恢复 ScriptClaw 的默认 OpenClaw 配置吗？'
    })
    if (!confirmed) return

    const next = resetOpenClawConfig()
    setSavedConfig(next)
    setBaseUrl(next.baseUrl)
    setAuthToken(next.authToken)
    setToolsInvokePath(next.toolsInvokePath)
    setOpenaiChatPath(next.openaiChatPath)
    setDefaultAgentId(next.defaultAgentId)
    setDefaultSessionKey(next.defaultSessionKey)

    await Dialog.alert({ title: '已恢复', message: '已恢复默认配置。' })
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="ScriptClaw 设置"
        toolbar={{
          cancellationAction: <Button title="完成" action={Navigation.useDismiss()} />
        }}
      >
        <Section title="网关配置">
          <TextField title="OpenClaw Base URL" value={baseUrl} onChanged={setBaseUrl} prompt="http://192.168.50.75:18789" />
          <SecureField title="OpenClaw Auth Token" value={authToken} onChanged={setAuthToken} prompt="输入网关认证 Token" />
          <TextField title="默认 Agent ID" value={defaultAgentId} onChanged={setDefaultAgentId} prompt="main" />
          <TextField title="默认 Session Key" value={defaultSessionKey} onChanged={setDefaultSessionKey} prompt="main" />
        </Section>

        <Section title="接口路径（一般无需修改）">
          <TextField title="Tools Invoke Path" value={toolsInvokePath} onChanged={setToolsInvokePath} prompt="/tools/invoke" />
          <TextField title="OpenAI Chat Path" value={openaiChatPath} onChanged={setOpenaiChatPath} prompt="/v1/chat/completions" />
        </Section>

        <Section title="当前状态">
          <HStack>
            <Text>配置变更</Text>
            <Spacer />
            <Text>{isDirty ? '未保存' : '已保存'}</Text>
          </HStack>
          <Text font="caption" foregroundStyle="secondaryLabel">
            当前 Token：{maskToken(authToken)}
          </Text>
        </Section>

        <Section>
          <Button title="保存配置" action={saveSettings} />
          <Button title="恢复默认配置" foregroundStyle="systemOrange" action={resetSettings} />
        </Section>
      </List>
    </NavigationStack>
  )
}

const run = async () => {
  await Navigation.present(<SettingsPage />)
  Script.exit()
}

void run()
