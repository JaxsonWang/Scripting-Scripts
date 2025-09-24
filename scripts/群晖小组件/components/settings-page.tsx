import { Button, HStack, List, Navigation, NavigationStack, Section, SecureField, Spacer, Text, TextField, Toggle, VStack } from 'scripting'
import { useState } from 'scripting'
import {
  type SynologyConfig,
  getCurrentSynologyConfig,
  isSessionValid,
  loginToSynology,
  logoutFromSynology,
  saveSynologyConfig
} from '../utils/synology-service'

interface SettingsPageProps {
  onDismiss?: () => void
}

export function SettingsPage({ onDismiss }: SettingsPageProps) {
  // 获取当前配置
  const currentConfig = getCurrentSynologyConfig()

  // 状态管理
  const [nasIp, setNasIp] = useState<string>(currentConfig.nasIp)
  const [nasPort, setNasPort] = useState<string>(currentConfig.nasPort)
  const [useHttps, setUseHttps] = useState<boolean>(currentConfig.useHttps)
  const [username, setUsername] = useState<string>(currentConfig.username)
  const [password, setPassword] = useState<string>(currentConfig.password)
  const [isConnecting, setIsConnecting] = useState<boolean>(false)
  const [connectionStatus, setConnectionStatus] = useState<string>('')
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(isSessionValid())

  // 关闭页面
  const dismiss = Navigation.useDismiss()

  // 保存配置
  const saveConfig = () => {
    const config: SynologyConfig = {
      nasIp: nasIp.trim(),
      nasPort: nasPort.trim(),
      useHttps,
      username: username.trim(),
      password: password.trim()
    }

    const success = saveSynologyConfig(config)
    if (success) {
      setConnectionStatus('配置已保存')
      setTimeout(() => setConnectionStatus(''), 2000)
    } else {
      setConnectionStatus('保存配置失败')
      setTimeout(() => setConnectionStatus(''), 2000)
    }
  }

  // 测试连接
  const testConnection = async () => {
    if (!nasIp.trim() || !username.trim() || !password.trim()) {
      setConnectionStatus('请填写完整的连接信息')
      setTimeout(() => setConnectionStatus(''), 3000)
      return
    }

    setIsConnecting(true)
    setConnectionStatus('正在连接...')

    const config: SynologyConfig = {
      nasIp: nasIp.trim(),
      nasPort: nasPort.trim(),
      useHttps,
      username: username.trim(),
      password: password.trim()
    }

    try {
      console.log('🧪 开始测试连接:', config.nasIp + ':' + config.nasPort)
      const result = await loginToSynology(config)

      if (result.success) {
        console.log('✅ 连接测试成功')
        setConnectionStatus('连接成功！')
        setIsLoggedIn(true)
        // 保存配置
        saveSynologyConfig(config)
      } else {
        console.error('❌ 连接测试失败:', result.error)
        setConnectionStatus(result.error || '连接失败')
        setIsLoggedIn(false)
      }
    } catch (error) {
      setConnectionStatus('连接异常，请检查网络')
      setIsLoggedIn(false)
    } finally {
      setIsConnecting(false)
      setTimeout(() => setConnectionStatus(''), 5000)
    }
  }

  // 断开连接
  const disconnect = async () => {
    const config = getCurrentSynologyConfig()
    await logoutFromSynology(config)
    setIsLoggedIn(false)
    setConnectionStatus('已断开连接')
    setTimeout(() => setConnectionStatus(''), 2000)
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="群晖设置"
        navigationBarTitleDisplayMode="large"
        toolbar={{
          cancellationAction: (
            <Button
              title="保存退出"
              action={async () => {
                // 保存配置
                saveConfig()
                // 返回上一页
                dismiss()
              }}
            />
          )
        }}
      >
        {/* 连接状态 */}
        {connectionStatus ? (
          <Section>
            <HStack alignment="center" spacing={8}>
              <Text
                font="body"
                foregroundStyle={
                  connectionStatus.includes('成功')
                    ? 'systemGreen'
                    : connectionStatus.includes('失败') || connectionStatus.includes('异常')
                      ? 'systemRed'
                      : 'systemBlue'
                }
              >
                {connectionStatus}
              </Text>
              <Spacer />
              {isLoggedIn ? (
                <Text font="caption" foregroundStyle="systemGreen">
                  ● 已连接
                </Text>
              ) : null}
            </HStack>
          </Section>
        ) : null}

        {/* NAS 连接配置 */}
        <Section
          header={<Text font="headline">NAS 连接配置</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              请填写您的群晖 NAS 连接信息。建议使用内网 IP 地址以获得更好的性能。
            </Text>
          }
        >
          <TextField title="IP 地址" value={nasIp} onChanged={setNasIp} prompt="例如: 192.168.1.100" />

          <TextField title="端口号" value={nasPort} onChanged={setNasPort} prompt="例如: 5000 或 5001" />

          <Toggle title="使用 HTTPS" value={useHttps} onChanged={setUseHttps} />
        </Section>

        {/* 登录凭据 */}
        <Section
          header={<Text font="headline">登录凭据</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              请输入您的群晖 DSM 用户名和密码。建议创建专用的只读账户用于小组件。
            </Text>
          }
        >
          <TextField title="用户名" value={username} onChanged={setUsername} prompt="DSM 用户名" />

          <SecureField title="密码" value={password} onChanged={setPassword} prompt="DSM 密码" />
        </Section>

        {/* 操作按钮 */}
        <Section
          header={<Text font="headline">操作</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              保存配置后，可以测试连接以验证设置是否正确。
            </Text>
          }
        >
          <Button action={saveConfig}>
            <HStack alignment="center">
              <VStack alignment="leading" spacing={2}>
                <Text font="body" foregroundStyle="label">
                  保存配置
                </Text>
                <Text font="caption" foregroundStyle="secondaryLabel">
                  保存当前的连接设置
                </Text>
              </VStack>
              <Spacer />
            </HStack>
          </Button>

          <Button action={testConnection} disabled={isConnecting}>
            <HStack alignment="center">
              <VStack alignment="leading" spacing={2}>
                <Text font="body" foregroundStyle="label">
                  {isConnecting ? '连接中...' : '测试连接'}
                </Text>
                <Text font="caption" foregroundStyle="secondaryLabel">
                  验证连接设置是否正确
                </Text>
              </VStack>
              <Spacer />
            </HStack>
          </Button>

          {isLoggedIn ? (
            <Button action={disconnect}>
              <HStack alignment="center">
                <VStack alignment="leading" spacing={2}>
                  <Text font="body" foregroundStyle="systemRed">
                    断开连接
                  </Text>
                  <Text font="caption" foregroundStyle="secondaryLabel">
                    登出当前会话
                  </Text>
                </VStack>
                <Spacer />
              </HStack>
            </Button>
          ) : null}
        </Section>

        {/* 帮助信息 */}
        <Section header={<Text font="headline">帮助信息</Text>}>
          <VStack alignment="leading" spacing={8}>
            <Text font="footnote" foregroundStyle="secondaryLabel">
              端口说明：
              {'\n'}• HTTP: 通常为 5000
              {'\n'}• HTTPS: 通常为 5001
              {'\n'}
              {'\n'}安全建议：
              {'\n'}• 建议创建专用的只读用户账户
              {'\n'}• 在内网环境下使用以确保安全
              {'\n'}• 定期更换密码
              {'\n'}
              {'\n'}常见问题：
              {'\n'}• 连接失败：检查 IP 地址和端口是否正确
              {'\n'}• 登录失败：检查用户名和密码
              {'\n'}• 网络错误：确保设备在同一网络下
            </Text>
          </VStack>
        </Section>
      </List>
    </NavigationStack>
  )
}
