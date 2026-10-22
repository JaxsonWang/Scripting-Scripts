import { Button, HStack, Image, List, Navigation, ProgressView, QRImage, Rectangle, Section, Spacer, Text, VStack, useEffect, useState } from 'scripting'
import type { BilibiliQRStatus } from '../core/sites/bilibili-account'
import { generateBilibiliQRCode, getBilibiliUserInfo, pollBilibiliQRCode } from '../core/sites/bilibili-account'
import { ScreenBackground } from '../components/ScreenBackground'
import { accountStore, setBilibiliAccount } from '../services/accounts'
import { useStore } from '../hooks/useStore'
import { brandGradient, palette, radius } from '../theme'
import { errorMessage } from '../utils/format'

type QRCodeState = { url: string; key: string }

const statusText: Record<BilibiliQRStatus['status'], string> = {
  unscanned: '未扫码',
  scanned: '已扫码，等待确认',
  expired: '二维码已过期',
  success: '登录成功，正在读取账号…'
}

const statusColor = (status: BilibiliQRStatus['status']) =>
  status === 'scanned' ? palette.warning : status === 'expired' ? palette.textTertiary : status === 'success' ? palette.success : palette.accent

const Step = ({ index, children }: { index: number; children: string }) => (
  <HStack alignment="center" spacing={10}>
    <Text font="caption" bold foregroundStyle="#FFFFFF" frame={{ width: 22, height: 22 }} background={palette.accent} clipShape="circle">
      {index}
    </Text>
    <Text font="subheadline" foregroundStyle={palette.textSecondary}>
      {children}
    </Text>
  </HStack>
)

const QRCard = ({ qrCode, loading }: { qrCode: QRCodeState | null; loading: boolean }) => (
  <VStack
    spacing={12}
    alignment="center"
    padding={20}
    background="#FFFFFF"
    clipShape={{ type: 'rect', cornerRadius: radius.lg, style: 'continuous' }}
    shadow={{ color: 'rgba(0,0,0,0.16)', radius: 14, y: 5 }}
  >
    {loading ? (
      <ProgressView progressViewStyle="circular" />
    ) : qrCode ? (
      <QRImage data={qrCode.url} size={220} />
    ) : (
      <Image systemName="qrcode" font={72} foregroundStyle="#A6A6A6" />
    )}
    <Text font="caption" foregroundStyle="#656565">
      {loading ? '正在生成二维码…' : qrCode ? '二维码有效期较短，请及时确认' : '二维码暂时不可用'}
    </Text>
  </VStack>
)

/** B站二维码登录；轮询只在页面存在时运行，离开页面即停止。 */
export const BilibiliLoginScreen = () => {
  const dismiss = Navigation.useDismiss()
  const account = useStore(accountStore)
  const [qrCode, setQrCode] = useState<QRCodeState | null>(null)
  const [status, setStatus] = useState<BilibiliQRStatus['status']>('unscanned')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    let disposed = false
    let timer: number | null = null

    const schedulePoll = (key: string) => {
      if (!disposed) timer = setTimeout(() => void poll(key), 2000)
    }

    const poll = async (key: string): Promise<void> => {
      try {
        const next = await pollBilibiliQRCode(key)
        if (disposed) return
        setStatus(next.status)
        if (next.status === 'success' && next.cookie) {
          try {
            const user = await getBilibiliUserInfo(next.cookie)
            if (disposed) return
            setBilibiliAccount(next.cookie, user)
            dismiss()
            return
          } catch (userError) {
            console.error('[ScriptLive] 读取 B站账号失败', userError)
            setError(errorMessage(userError))
            return
          }
        }
        if (next.status !== 'expired') schedulePoll(key)
      } catch (pollError) {
        if (disposed) return
        console.error('[ScriptLive] 查询 B站二维码失败', pollError)
        setError(errorMessage(pollError))
      }
    }

    const load = async () => {
      setLoading(true)
      setError('')
      setQrCode(null)
      try {
        const next = await generateBilibiliQRCode()
        if (disposed) return
        setQrCode(next)
        setStatus('unscanned')
        setLoading(false)
        schedulePoll(next.key)
      } catch (loadError) {
        if (disposed) return
        console.error('[ScriptLive] 生成 B站二维码失败', loadError)
        setError(errorMessage(loadError))
        setLoading(false)
      }
    }

    void load()
    return () => {
      disposed = true
      if (timer !== null) clearTimeout(timer)
    }
  }, [refreshToken])

  const refresh = () => setRefreshToken(value => value + 1)

  const handleManualCookie = async () => {
    const cookie = await Dialog.prompt({
      title: '手动填写 Cookie',
      message: '从 B站网页复制完整 Cookie 后粘贴到这里。Cookie 仅保存在本机，用于读取登录状态与请求直播数据。',
      placeholder: 'SESSDATA=…',
      selectAll: true,
      confirmLabel: '登录'
    })
    const value = cookie?.trim()
    if (!value) return
    try {
      setLoading(true)
      const user = await getBilibiliUserInfo(value)
      setBilibiliAccount(value, user)
      dismiss()
    } catch (manualError) {
      console.error('[ScriptLive] 手动登录 B站失败', manualError)
      setLoading(false)
      await Dialog.alert({ title: 'Cookie 无效', message: errorMessage(manualError) })
    }
  }

  const openBilibiliApp = () =>
    void (qrCode
      ? Safari.openURL(qrCode.url).catch(openError => {
          console.error('[ScriptLive] 打开 B站二维码链接失败', openError)
          void Dialog.alert({ title: '无法打开 B站 App', message: errorMessage(openError) })
        })
      : Promise.resolve())

  return (
    <List
      foregroundStyle={palette.textPrimary}
      background={<ScreenBackground />}
      scrollContentBackground="hidden"
      navigationTitle="B站登录"
      navigationBarTitleDisplayMode="inline"
    >
      {account.bilibiliUser ? (
        <Section header={<Text>当前账号</Text>} listRowBackground={<Rectangle fill={palette.card} />}>
          <HStack alignment="center" spacing={12} padding={{ vertical: 4 }}>
            <Image
              imageUrl={account.bilibiliUser.face}
              resizable
              scaleToFill
              frame={{ width: 44, height: 44 }}
              clipShape="circle"
              placeholder={<Image systemName="person.fill" foregroundStyle={palette.textTertiary} />}
            />
            <VStack alignment="leading" spacing={3}>
              <Text bold foregroundStyle={palette.textPrimary}>
                {account.bilibiliUser.uname}
              </Text>
              <Text font="caption" foregroundStyle={palette.textSecondary}>
                已登录
              </Text>
            </VStack>
            <Spacer />
            <Button title="退出" role="destructive" buttonStyle="borderless" action={() => setBilibiliAccount('', null)} />
          </HStack>
        </Section>
      ) : (
        <Section
          header={<Text>扫码登录</Text>}
          listRowBackground={<Rectangle fill={palette.card} />}
          footer={<Text font="footnote">B站登录用于读取账号状态和请求需要登录权限的直播数据。Cookie 只保存在本机。</Text>}
        >
          <VStack alignment="leading" spacing={18} padding={{ vertical: 4 }}>
            <HStack alignment="center">
              <Spacer />
              <QRCard qrCode={qrCode} loading={loading} />
              <Spacer />
            </HStack>
            <HStack alignment="center" spacing={8} padding={{ horizontal: 12, vertical: 7 }} background={palette.fillMuted} clipShape="capsule">
              <Text font="caption" bold foregroundStyle={statusColor(status)}>
                {statusText[status]}
              </Text>
              <Spacer />
              {!!error && (
                <Text font="caption2" foregroundStyle={palette.warning} lineLimit={1}>
                  {error}
                </Text>
              )}
            </HStack>
            <VStack alignment="leading" spacing={10}>
              <Step index={1}>打开 B站 App，扫描上方二维码</Step>
              <Step index={2}>在手机上确认登录授权</Step>
              <Step index={3}>回到这里，等待账号信息同步</Step>
            </VStack>
            <HStack alignment="center">
              <Spacer />
              <Button buttonStyle="plain" action={openBilibiliApp} disabled={!qrCode || loading}>
                <HStack alignment="center" spacing={7} padding={{ horizontal: 16, vertical: 10 }} background={brandGradient} clipShape="capsule" fixedSize>
                  <Image systemName="arrow.up.forward.app" font={13} foregroundStyle="#FFFFFF" />
                  <Text font="subheadline" bold foregroundStyle="#FFFFFF">
                    在 B站 App 中打开
                  </Text>
                </HStack>
              </Button>
              <Spacer />
            </HStack>
            <HStack alignment="center">
              <Spacer />
              <Button
                title={status === 'expired' || error ? '重新生成二维码' : '刷新二维码'}
                disabled={loading}
                action={refresh}
                buttonStyle="borderless"
                foregroundStyle={palette.accent}
              />
              <Spacer />
            </HStack>
          </VStack>
        </Section>
      )}
      <Section header={<Text>其他方式</Text>} listRowBackground={<Rectangle fill={palette.card} />}>
        <Button title="手动填写 Cookie" action={() => void handleManualCookie()} />
      </Section>
    </List>
  )
}
