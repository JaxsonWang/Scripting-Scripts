import { Button, HStack, Image, List, NavigationLink, NavigationStack, Path, Rectangle, Script, Section, Spacer, Text, VStack, useState } from 'scripting'
import { SettingRow } from '../components/IconTile'
import { PageHeader } from '../components/PageHeader'
import { Avatar } from '../components/RoomCard'
import { ScreenBackground } from '../components/ScreenBackground'
import { SiteLogo } from '../components/SiteLogo'
import { useStore } from '../hooks/useStore'
import { useThemeScheme } from '../hooks/useThemeScheme'
import { accountStore, setBilibiliAccount } from '../services/accounts'
import { followStore, liveStateStore } from '../services/follows'
import { historyStore } from '../services/history'
import { parseRoomLink } from '../services/link-parser'
import { settingsStore } from '../services/settings'
import { FULL_FRAME, SITE_STYLE, TILE, accentGlow, brandGradient, palette } from '../theme'
import { errorMessage } from '../utils/format'
import { BilibiliLoginScreen } from './BilibiliLoginScreen'
import { ChangelogScreen } from './ChangelogScreen'
import { DouyinCookieScreen } from './DouyinCookieScreen'
import { HistoryScreen } from './HistoryScreen'
import { openRoom } from './open-room'
import {
  AppearanceSettingsScreen,
  AutoExitSettingsScreen,
  DanmakuSettingsScreen,
  FollowSettingsScreen,
  PlayerSettingsScreen,
  ShieldWordsSettingsScreen,
  SiteOrderSettingsScreen
} from './SettingsScreens'
import { SyncScreen } from './SyncScreen'

const BANNER_IMAGE_FILE_PATH = Path.join(Script.directory, 'assets', 'banner.webp')

const THEME_LABEL = { auto: '自动', light: '日间', dark: '夜间' } as const
const QUALITY_LABEL = ['最低画质', '中等画质', '最高画质'] as const

const rowBackground = <Rectangle fill={palette.card} />

/** 资料卡底色：卡片色上叠一层品牌色光晕 */
const profileBackground = <Rectangle fill={palette.card} overlay={<Rectangle fill={accentGlow} />} />

const Stat = ({ value, label }: { value: number; label: string }) => (
  <VStack spacing={2} frame={{ maxWidth: 'infinity' }}>
    <Text font="title3" bold monospacedDigit foregroundStyle={palette.textPrimary}>
      {value}
    </Text>
    <Text font="caption" foregroundStyle={palette.textTertiary}>
      {label}
    </Text>
  </VStack>
)

/** 胶囊按钮：主操作用品牌渐变，次要操作用浅色底 */
const PillButton = ({ title, primary, onTap }: { title: string; primary?: boolean; onTap: () => void }) => (
  <Button action={onTap} buttonStyle="borderless">
    <Text
      font="subheadline"
      bold
      fixedSize
      foregroundStyle={primary ? '#FFFFFF' : palette.textSecondary}
      padding={{ horizontal: 14, vertical: 7 }}
      background={primary ? brandGradient : palette.fillMuted}
      clipShape="capsule"
    >
      {title}
    </Text>
  </Button>
)

/** 「我的」：资料卡 + 常用入口 + 偏好设置 + 账号与数据 + 关于 */
export const MineScreen = () => {
  const colorScheme = useThemeScheme()
  const account = useStore(accountStore)
  const history = useStore(historyStore)
  const follows = useStore(followStore)
  const liveStates = useStore(liveStateStore)
  const settings = useStore(settingsStore)
  const [loginPresented, setLoginPresented] = useState(false)
  const version = Script.metadata?.version || '未知'
  const liveCount = follows.filter(user => liveStates[user.id] === 2).length
  const user = account.bilibiliUser

  const openParser = async () => {
    const input = await Dialog.prompt({
      title: '链接解析',
      message: '支持 B站、斗鱼、虎牙、抖音直播链接，也支持 b23.tv 与 v.douyin.com 短链。',
      placeholder: '粘贴直播间链接',
      confirmLabel: '打开直播间'
    })
    if (!input?.trim()) return
    try {
      const target = await parseRoomLink(input)
      if (!target) {
        await Dialog.alert({ title: '无法识别链接', message: '请粘贴 B站、斗鱼、虎牙或抖音直播间链接。' })
        return
      }
      await openRoom(target)
    } catch (error) {
      console.error('[ScriptLive] 链接解析失败', error)
      await Dialog.alert({ title: '链接解析失败', message: errorMessage(error) })
    }
  }

  const logoutBilibili = async () => {
    const confirmed = await Dialog.confirm({
      title: '退出 B站账号',
      message: '退出后需要重新扫码才能使用登录权限。确定退出吗？',
      confirmLabel: '退出',
      cancelLabel: '取消'
    })
    if (confirmed) setBilibiliAccount('', null)
  }

  const profile = (
    <VStack spacing={16} padding={{ vertical: 8 }}>
      <HStack spacing={14}>
        <Avatar url={user?.face} size={56} />
        <VStack alignment="leading" spacing={4}>
          <Text font="title3" bold lineLimit={1} foregroundStyle={palette.textPrimary}>
            {user ? user.uname : '未登录'}
          </Text>
          <Text font="caption" lineLimit={1} foregroundStyle={palette.textSecondary}>
            {user ? `B站 · UID ${user.uid}` : '登录 B站，观看更高画质'}
          </Text>
        </VStack>
        <Spacer />
        {user ? <PillButton title="退出" onTap={() => void logoutBilibili()} /> : <PillButton title="扫码登录" primary onTap={() => setLoginPresented(true)} />}
      </HStack>
      <Rectangle fill={palette.separator} frame={{ height: 0.5 }} />
      <HStack>
        <Stat value={follows.length} label="关注" />
        <Stat value={liveCount} label="直播中" />
        <Stat value={history.length} label="观看记录" />
      </HStack>
    </VStack>
  )

  return (
    <NavigationStack preferredColorScheme={colorScheme} tint={palette.accent}>
      <VStack
        spacing={6}
        alignment="leading"
        frame={FULL_FRAME}
        background={<ScreenBackground />}
        toolbarVisibility={{ visibility: 'hidden', bars: ['navigationBar'] }}
        navigationDestination={{ isPresented: loginPresented, onChanged: setLoginPresented, content: <BilibiliLoginScreen /> }}
      >
        <PageHeader title="我的" />
        <List
          listStyle="insetGroup"
          listSectionSpacing="compact"
          scrollContentBackground="hidden"
          foregroundStyle={palette.textPrimary}
          contentMargins={{ edges: 'top', insets: 8, placement: 'scrollContent' }}
        >
          <Section listRowBackground={profileBackground}>{profile}</Section>

          <Section header={<Text>常用</Text>} listRowBackground={rowBackground}>
            <Button action={() => void openParser()} buttonStyle="plain">
              <SettingRow icon="link" color={TILE.blue} title="链接解析" value="粘贴打开" />
            </Button>
            <NavigationLink destination={<HistoryScreen />}>
              <SettingRow icon="clock.arrow.circlepath" color={TILE.orange} title="观看记录" value={history.length ? `${history.length} 条` : '暂无'} />
            </NavigationLink>
          </Section>

          <Section header={<Text>偏好设置</Text>} listRowBackground={rowBackground}>
            <NavigationLink destination={<AppearanceSettingsScreen />}>
              <SettingRow icon="circle.lefthalf.filled" color={TILE.indigo} title="外观" value={THEME_LABEL[settings.themeMode]} />
            </NavigationLink>
            <NavigationLink destination={<SiteOrderSettingsScreen />}>
              <SettingRow icon="arrow.up.arrow.down" color={TILE.teal} title="平台顺序" value={`${SITE_STYLE[settings.siteOrder[0]].short}优先`} />
            </NavigationLink>
            <NavigationLink destination={<PlayerSettingsScreen />}>
              <SettingRow icon="play.rectangle.fill" color={TILE.red} title="直播间" value={QUALITY_LABEL[settings.qualityLevel]} />
            </NavigationLink>
            <NavigationLink destination={<DanmakuSettingsScreen />}>
              <SettingRow icon="text.bubble.fill" color={TILE.green} title="弹幕" value={settings.danmakuEnable ? '开启' : '关闭'} />
            </NavigationLink>
            <NavigationLink destination={<ShieldWordsSettingsScreen />}>
              <SettingRow icon="nosign" color={TILE.gray} title="屏蔽词" value={settings.shieldWords.length ? `${settings.shieldWords.length} 个` : '未设置'} />
            </NavigationLink>
            <NavigationLink destination={<FollowSettingsScreen />}>
              <SettingRow
                icon="arrow.clockwise"
                color={TILE.pink}
                title="关注刷新"
                value={settings.followAutoRefresh ? `每 ${settings.followRefreshMinutes} 分钟` : '手动'}
              />
            </NavigationLink>
            <NavigationLink destination={<AutoExitSettingsScreen />}>
              <SettingRow icon="timer" color={TILE.purple} title="定时关闭" value={settings.autoExitEnable ? `${settings.autoExitMinutes} 分钟` : '关闭'} />
            </NavigationLink>
          </Section>

          <Section header={<Text>账号与数据</Text>} listRowBackground={rowBackground}>
            <NavigationLink destination={<DouyinCookieScreen />}>
              <SettingRow
                icon={<SiteLogo siteId="douyin" size={30} />}
                color={SITE_STYLE.douyin.color}
                title="抖音 Cookie"
                value={account.douyinCookie ? '已设置' : '未设置'}
              />
            </NavigationLink>
            <NavigationLink destination={<SyncScreen />}>
              <SettingRow icon="arrow.triangle.2.circlepath" color={TILE.blue} title="数据同步" value="WebDAV · 备份" />
            </NavigationLink>
          </Section>

          <Section
            header={<Text>关于</Text>}
            listRowBackground={rowBackground}
            footer={
              <VStack spacing={10} alignment="leading">
                <Text font="footnote" foregroundStyle={palette.textTertiary}>
                  淮城一只猫© - 更多脚本/小组件请关注微信公众号「栈空间」
                </Text>
                <Image filePath={BANNER_IMAGE_FILE_PATH} resizable scaleToFit />
              </VStack>
            }
          >
            <SettingRow icon="info.circle.fill" color={TILE.gray} title="版本" value={version} />
            <NavigationLink destination={<ChangelogScreen />}>
              <SettingRow icon="doc.text.fill" color={TILE.blue} title="更新日志" />
            </NavigationLink>
          </Section>
        </List>
      </VStack>
    </NavigationStack>
  )
}
