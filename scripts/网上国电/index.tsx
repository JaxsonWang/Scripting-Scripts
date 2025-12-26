// index.tsx（网上国网 / WSGW）

import { Button, HStack, List, Navigation, NavigationStack, Picker, Script, Section, SecureField, Spacer, Text, TextField, Toggle, useState } from 'scripting'

import {
  SETTINGS_KEY,
  type SGCCSettings,
  SGCC_BARCOUNT_OPTIONS,
  SGCC_REFRESH_OPTIONS,
  SGCC_WIDGET_STYLE_OPTIONS,
  defaultSGCCSettings,
  loadSGCCSettings,
  readFullscreenPrefForRun,
  saveSGCCSettings,
  writeSGCCFullscreenPref
} from './settings'

import type { SGCCWidgetStyleKey } from './styles/registry'

import { useFullscreenPref } from './shared/ui-kit/useFullscreenPref'

import { fetchWsgwAccounts } from './services/wsgw_client'

// ✅ 新增：通用缓存 Section
import { type CacheConfig, CacheSection } from './shared/ui-kit/cacheSection'
import { formatDuration } from './shared/utils/time'

declare const Dialog: any

const VERSION = '1.0.0'
const BUILD_DATE = '2025-12-12'

const FULLSCREEN_KEY = `${SETTINGS_KEY}:ui:fullscreenPref`

function SettingsView() {
  const dismiss = Navigation.useDismiss()
  const { fullscreenPref, toggleFullscreen } = useFullscreenPref(FULLSCREEN_KEY)

  const initial = loadSGCCSettings()

  const [serverHost, setServerHost] = useState(String((initial as any).serverHost ?? defaultSGCCSettings.serverHost ?? ''))
  const [username, setUsername] = useState(initial.username ?? '')
  const [password, setPassword] = useState(initial.password ?? '')
  const [logDebug, setLogDebug] = useState<boolean>(initial.logDebug ?? false)
  const [accountIndex, setAccountIndex] = useState(String(initial.accountIndex ?? 0))
  const [cacheScopeKey, setCacheScopeKey] = useState(String(initial.cacheScopeKey ?? ''))

  const [widgetStyle, setWidgetStyle] = useState<SGCCWidgetStyleKey>(
    ((initial as any).widgetStyle ?? defaultSGCCSettings.widgetStyle ?? 'classic') as SGCCWidgetStyleKey
  )

  const [dimension, setDimension] = useState<'daily' | 'monthly'>(initial.dimension ?? 'daily')
  const [barCount, setBarCount] = useState<number>(initial.barCount ?? defaultSGCCSettings.barCount)

  const [oneLevelPq, setOneLevelPq] = useState(String(initial.oneLevelPq ?? defaultSGCCSettings.oneLevelPq))
  const [twoLevelPq, setTwoLevelPq] = useState(String(initial.twoLevelPq ?? defaultSGCCSettings.twoLevelPq))

  const [refreshInterval, setRefreshInterval] = useState<number>(initial.refreshInterval ?? defaultSGCCSettings.refreshInterval)

  // ✅ 缓存：直接用 CacheSection 即时落盘
  const [cacheDraft, setCacheDraft] = useState<CacheConfig>(initial.cache ?? defaultSGCCSettings.cache)

  // 登录 + 授权测试状态
  const [testingLogin, setTestingLogin] = useState(false)
  const [testMessage, setTestMessage] = useState<string>('')

  const cacheStore = {
    title: '启用缓存',
    load: () => loadSGCCSettings(),
    save: (next: SGCCSettings) => saveSGCCSettings(next),
    getCache: (s: SGCCSettings) => s.cache ?? defaultSGCCSettings.cache,
    setCache: (s: SGCCSettings, cache: CacheConfig) => ({ ...s, cache })
  }

  const handleAbout = async () => {
    await Dialog?.alert?.({
      title: '网上国网组件',
      message: `作者：©ByteValley\n` + `版本：v${VERSION}（${BUILD_DATE}）\n` + `说明：改自群友无名大佬，侵删。\n`,
      buttonLabel: '关闭'
    })
  }

  const handleSave = () => {
    const next: SGCCSettings = {
      serverHost: serverHost.trim(),
      username: username.trim(),
      password,
      logDebug,
      accountIndex: parseInt(accountIndex, 10) || 0,
      cacheScopeKey: cacheScopeKey.trim(),
      dimension,
      barCount: Number(barCount) || defaultSGCCSettings.barCount,
      oneLevelPq: Number(oneLevelPq) || defaultSGCCSettings.oneLevelPq,
      twoLevelPq: Number(twoLevelPq) || defaultSGCCSettings.twoLevelPq,
      refreshInterval: Number(refreshInterval) || defaultSGCCSettings.refreshInterval,
      widgetStyle,
      cache: cacheDraft
    }

    if (next.twoLevelPq < next.oneLevelPq) {
      Dialog?.alert?.({
        title: '阶梯阈值不合法',
        message: '二阶电量上限不能小于一阶电量上限。',
        buttonLabel: '好的'
      })
      return
    }

    saveSGCCSettings(next)
    dismiss()
  }

  const handleResetAll = async () => {
    const confirmed = await Dialog?.confirm?.({
      title: '重置设置',
      message: '确定要恢复默认设置吗？'
    })
    if (!confirmed) return

    setUsername(defaultSGCCSettings.username)
    setPassword(defaultSGCCSettings.password)
    setLogDebug(defaultSGCCSettings.logDebug)
    setAccountIndex(String(defaultSGCCSettings.accountIndex))
    setCacheScopeKey(defaultSGCCSettings.cacheScopeKey ?? '')
    setServerHost(String((defaultSGCCSettings as any).serverHost ?? ''))
    setWidgetStyle((defaultSGCCSettings.widgetStyle ?? 'classic') as SGCCWidgetStyleKey)
    setDimension(defaultSGCCSettings.dimension)
    setBarCount(defaultSGCCSettings.barCount)
    setOneLevelPq(String(defaultSGCCSettings.oneLevelPq))
    setTwoLevelPq(String(defaultSGCCSettings.twoLevelPq))
    setRefreshInterval(defaultSGCCSettings.refreshInterval)
    setCacheDraft(defaultSGCCSettings.cache)
  }

  const handleTestLogin = async () => {
    // 防止重复点击
    if (testingLogin) return

    const trimmedUsername = username.trim()
    const trimmedServerHost = serverHost.trim()

    if (!trimmedUsername || !password) {
      await Dialog?.alert?.({
        title: '请输入账号与密码',
        message: '请先填写“手机号 / 账号”和“密码”。',
        buttonLabel: '好的'
      })
      return
    }

    try {
      setTestingLogin(true)
      setTestMessage('')

      const effectiveServerHost = trimmedServerHost || defaultSGCCSettings.serverHost

      const accounts = await fetchWsgwAccounts({
        username: trimmedUsername,
        password,
        logDebug,
        serverHost: effectiveServerHost
      })

      const count = Array.isArray(accounts) ? accounts.length : 0
      if (count > 0) {
        setTestMessage(`登录 + 授权成功，返回 ${count} 个户号。`)
      } else {
        setTestMessage('登录 + 授权成功，但未返回任何户号。')
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      setTestMessage(`登录 / 授权失败：${msg}`)
    } finally {
      setTestingLogin(false)
    }
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="网上国网组件"
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          topBarLeading: [<Button title="关闭" action={dismiss} />],
          topBarTrailing: [
            <Button
              title={fullscreenPref ? '页面' : '弹层'}
              systemImage={fullscreenPref ? 'rectangle.arrowtriangle.2.outward' : 'rectangle'}
              action={async () => {
                await toggleFullscreen()
                writeSGCCFullscreenPref(!fullscreenPref)
              }}
            />,
            <Button title="完成" action={handleSave} />
          ],
          bottomBar: [<Button systemImage="info.circle" title="关于本组件" action={handleAbout} foregroundStyle="secondaryLabel" />]
        }}
      >
        <Section
          header={
            <Text font="body" fontWeight="semibold">
              登录凭据
            </Text>
          }
          footer={
            <Text font="caption2" foregroundStyle="secondaryLabel">
              账号与密码仅存储在本机 Storage，用于直连网上国网接口获取数据。
            </Text>
          }
        >
          <TextField title="中转服务（serverHost）" value={serverHost} onChanged={setServerHost} prompt="https://api.120399.xyz" />
          <TextField title="手机号 / 账号" value={username} onChanged={setUsername} prompt="必填" />
          <SecureField title="密码" value={password} onChanged={setPassword} prompt="必填" />
          <Toggle title="调试日志" value={logDebug} onChanged={setLogDebug} />
          <HStack alignment="center">
            <Button title={testingLogin ? '测试中…' : '测试登录与授权'} action={handleTestLogin} />
            <Spacer />
            {testMessage ? (
              <Text font="caption2" foregroundStyle="secondaryLabel">
                {testMessage}
              </Text>
            ) : null}
          </HStack>
        </Section>

        <Section
          header={
            <Text font="body" fontWeight="semibold">
              账号
            </Text>
          }
          footer={
            <Text font="caption2" foregroundStyle="secondaryLabel">
              绑定多个户号时：0 为第一个，1 为第二个，以此类推。
            </Text>
          }
        >
          <HStack alignment="center">
            <Text>户号索引</Text>
            <Spacer />
            <Button title="重置" action={() => setAccountIndex(String(defaultSGCCSettings.accountIndex))} />
          </HStack>
          <TextField title="" value={accountIndex} prompt="0" keyboardType="numberPad" onChanged={setAccountIndex} />
        </Section>

        <Section
          header={
            <Text font="body" fontWeight="semibold">
              缓存指纹
            </Text>
          }
          footer={
            <Text font="caption2" foregroundStyle="secondaryLabel">
              用于隔离缓存命中。例如切换不同户号/家庭时，可输入“家庭A-主户号”等稳定标识，避免串读。
            </Text>
          }
        >
          <HStack alignment="center">
            <Text>指纹标识</Text>
            <Spacer />
            <Button title="清空" action={() => setCacheScopeKey('')} />
          </HStack>
          <TextField title="" value={cacheScopeKey} prompt="示例：家A-户号1" onChanged={setCacheScopeKey} />
        </Section>

        <Section
          header={
            <Text font="body" fontWeight="semibold">
              外观
            </Text>
          }
          footer={
            <Text font="caption2" foregroundStyle="secondaryLabel">
              新增样式：只需新增 styles/*.tsx，并在 registry/settings 注册即可。
            </Text>
          }
        >
          <Picker title="组件样式" value={widgetStyle} onChanged={(v: any) => setWidgetStyle(v)} pickerStyle="menu">
            {SGCC_WIDGET_STYLE_OPTIONS.map(opt => (
              <Text key={opt.value} tag={opt.value as any}>
                {opt.label}
              </Text>
            ))}
          </Picker>
        </Section>

        <Section
          header={
            <Text font="body" fontWeight="semibold">
              数据展示
            </Text>
          }
        >
          <Picker title="统计维度" value={dimension} onChanged={(v: any) => setDimension(v)} pickerStyle="menu">
            <Text tag="daily">每日用电</Text>
            <Text tag="monthly">每月用电</Text>
          </Picker>

          <Picker title="图表条数" value={barCount} onChanged={(v: number) => setBarCount(v)} pickerStyle="menu">
            {SGCC_BARCOUNT_OPTIONS.map(opt => (
              <Text key={opt.value} tag={opt.value as any}>
                {opt.label}
              </Text>
            ))}
          </Picker>
        </Section>

        <Section
          header={
            <Text font="body" fontWeight="semibold">
              阶梯阈值
            </Text>
          }
          footer={
            <Text font="caption2" foregroundStyle="secondaryLabel">
              用于计算阶梯电价进度条颜色。
            </Text>
          }
        >
          <HStack alignment="center">
            <Text>一阶电量上限</Text>
            <Spacer />
            <Button title="重置" action={() => setOneLevelPq(String(defaultSGCCSettings.oneLevelPq))} />
          </HStack>
          <TextField title="" value={oneLevelPq} prompt={String(defaultSGCCSettings.oneLevelPq)} keyboardType="numberPad" onChanged={setOneLevelPq} />

          <HStack alignment="center">
            <Text>二阶电量上限</Text>
            <Spacer />
            <Button title="重置" action={() => setTwoLevelPq(String(defaultSGCCSettings.twoLevelPq))} />
          </HStack>
          <TextField title="" value={twoLevelPq} prompt={String(defaultSGCCSettings.twoLevelPq)} keyboardType="numberPad" onChanged={setTwoLevelPq} />
        </Section>

        {/* ✅ 缓存策略（统一 CacheSection） */}
        <CacheSection
          store={cacheStore as any}
          refreshKey={refreshInterval}
          draft={cacheDraft}
          onDraftChange={next => {
            setCacheDraft(next)
          }}
          deferPersist={true}
        />
        <Section
          footer={
            <Text font="caption2" foregroundStyle="secondaryLabel">
              当前生效示例：refresh={refreshInterval} 分钟，TTL 自动为 max(4 小时, refresh)； 固定 TTL 则为 max(4 小时, 固定值)。
              {'\n'}提示：你设置的“兜底旧缓存最长允许”会被自动纠偏为 ≥ TTL（避免反直觉）。
              {'\n'}（用于说明：{formatDuration(Math.max(240, Number(refreshInterval) || 0), { includeSeconds: false })}）
            </Text>
          }
        />

        <Section
          header={
            <Text font="body" fontWeight="semibold">
              系统
            </Text>
          }
          footer={
            <Text font="caption2" foregroundStyle="secondaryLabel">
              刷新间隔仅作为系统刷新建议，实际以系统调度为准。
            </Text>
          }
        >
          <Picker title="自动刷新间隔" value={refreshInterval} onChanged={(v: number) => setRefreshInterval(v)} pickerStyle="menu">
            {SGCC_REFRESH_OPTIONS.map(opt => (
              <Text key={opt.value} tag={opt.value as any}>
                {opt.label}
              </Text>
            ))}
          </Picker>

          <Button title="恢复默认设置" role="destructive" action={handleResetAll} frame={{ maxWidth: 'infinity', alignment: 'center' }} />
        </Section>
      </List>
    </NavigationStack>
  )
}

type AppProps = { interactiveDismissDisabled?: boolean }
function App(_props: AppProps) {
  return <SettingsView />
}

async function main() {
  try {
    const fullscreen = readFullscreenPrefForRun()
    await Navigation.present({
      element: <App interactiveDismissDisabled />,
      ...(fullscreen ? { modalPresentationStyle: 'fullScreen' } : {})
    })
    Script.exit()
  } catch (e: any) {
    const msg = e && (e.stack || e.message) ? String(e.stack || e.message) : String(e)
    try {
      await Dialog?.alert?.({
        title: '脚本执行失败',
        message: msg,
        buttonLabel: '知道了'
      })
    } catch (error) {
      console.error('Dialog.alert error', error)
    }
    Script.exit()
  }
}

main()
