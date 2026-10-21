import {
  Button,
  HStack,
  Image,
  List,
  Navigation,
  NavigationLink,
  NavigationStack,
  Path,
  Rectangle,
  Script,
  Section,
  Spacer,
  Text,
  Toggle,
  VStack,
  Widget,
  useState
} from 'scripting'
import type { WidgetFamily } from 'scripting'
import { HistoryService } from '../services/history'
import { SettingsService } from '../services/settings'
import { ChangelogScreen } from './ChangelogScreen'
import { SourceManagementScreen } from './SourceManagementScreen'
import { ScreenBackground } from '../components/ScreenBackground'
import { palette } from '../theme'
import { AppearancePicker } from '../components/AppearancePicker'
import { useThemeMode } from '../hooks/useThemeMode'
import { AppearanceService } from '../services/appearance'
import type { CloudSnapshot } from '../types'

const AppStorage = Storage
const ICLOUD_SYNC_KEY = 'script_flix_icloud_sync_enabled'
const BANNER_IMAGE_FILE_PATH = Path.join(Script.directory, 'assets', 'banner.webp')

const THEME_HINTS = {
  auto: '跟随系统外观，白天日间、夜晚夜间自动切换',
  light: '始终使用日间外观',
  dark: '始终使用夜间外观'
} as const

const WIDGET_PREVIEWS: { family: WidgetFamily; title: string }[] = [
  { family: 'systemSmall', title: '小号' },
  { family: 'systemMedium', title: '中号' },
  { family: 'systemLarge', title: '大号' }
]

const getScriptFolderRelativePath = () => {
  const scriptDir = Script.directory || ''
  const segments = scriptDir.split('/').filter(Boolean)
  if (segments.length >= 2) {
    return `${segments[segments.length - 2]}/${segments[segments.length - 1]}`
  }
  return 'scripts/ScriptFlix'
}

export const SettingsScreen = () => {
  const dismiss = Navigation.useDismiss()
  const themeMode = useThemeMode()
  const colorScheme = AppearanceService.colorSchemeOf(themeMode)
  const [icloudSyncEnabled, setIcloudSyncEnabled] = useState<boolean>(() => AppStorage.get(ICLOUD_SYNC_KEY) ?? false)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const [sources, setSources] = useState(() => SettingsService.getSources())
  const enabledSourceCount = sources.filter(SettingsService.isSourceEnabled).length

  const getIcloudSettingsPath = () => {
    if (!FileManager.isiCloudEnabled) {
      throw new Error('未检测到 iCloud 云盘目录，请先在系统中启用 iCloud Drive')
    }
    const icloudRoot = FileManager.iCloudDocumentsDirectory
    const folder = `${icloudRoot}/${getScriptFolderRelativePath()}`
    const filePath = `${folder}/settings.json`
    return { icloudRoot, folder, filePath }
  }

  const applySnapshot = (snapshot: CloudSnapshot) => {
    if (Array.isArray(snapshot.sources)) {
      SettingsService.saveSources(snapshot.sources)
      setSources(snapshot.sources)
    }
    if (typeof snapshot.currentSourceIndex === 'number') {
      SettingsService.saveCurrentSourceIndex(snapshot.currentSourceIndex)
    }
    if (Array.isArray(snapshot.history)) {
      HistoryService.setHistory(snapshot.history)
    }
  }

  const restoreSettingsFromICloud = async () => {
    try {
      const { filePath } = getIcloudSettingsPath()
      const exists = await FileManager.exists(filePath)
      if (!exists) {
        return false
      }
      const raw = await FileManager.readAsString(filePath)
      const snapshot = JSON.parse(raw) as CloudSnapshot
      applySnapshot(snapshot)
      return true
    } catch (error) {
      console.error('[SettingsScreen] restore iCloud settings failed', error)
      const message = error instanceof Error ? error.message : 'settings.json 解析失败'
      await Dialog.alert({ title: 'iCloud 同步失败', message })
      return false
    }
  }

  const syncSettingsToICloud = async () => {
    try {
      setSyncing(true)
      const snapshot = {
        sources: SettingsService.getSources(),
        currentSourceIndex: SettingsService.getCurrentSourceIndex(),
        history: HistoryService.getHistory()
      }
      const { folder, filePath } = getIcloudSettingsPath()
      await FileManager.createDirectory(folder, true)
      await FileManager.writeAsString(filePath, JSON.stringify(snapshot, null, 2))
      setLastSyncedAt(Date.now())
    } catch (error) {
      console.error('[SettingsScreen] iCloud sync failed', error)
      const message = error instanceof Error ? error.message : '未知错误'
      await Dialog.alert({ title: 'iCloud 同步失败', message })
    } finally {
      setSyncing(false)
    }
  }

  const handleIcloudToggle = async (value: boolean) => {
    setIcloudSyncEnabled(value)
    AppStorage.set(ICLOUD_SYNC_KEY, value)
    if (value) {
      const restored = await restoreSettingsFromICloud()
      if (restored) {
        setSources(SettingsService.getSources())
      }
      await syncSettingsToICloud()
    }
  }

  const previewWidget = async (family: WidgetFamily) => {
    try {
      await Widget.preview({ family })
    } catch (error) {
      console.error('[SettingsScreen] widget preview failed', error)
      const message = error instanceof Error ? error.message : '未知错误'
      await Dialog.alert({ title: '小组件预览失败', message })
    }
  }

  const syncStatusLabel = syncing
    ? '正在写入 iCloud...'
    : icloudSyncEnabled && lastSyncedAt
      ? `最近同步：${new Date(lastSyncedAt).toLocaleString()}`
      : `开启后将在 iCloud Drive/${getScriptFolderRelativePath()}/settings.json 生成设置备份`

  return (
    <NavigationStack preferredColorScheme={colorScheme} tint={palette.accent}>
      <List
        foregroundStyle={palette.textPrimary}
        background={<ScreenBackground />}
        scrollContentBackground="hidden"
        toolbarBackground={palette.bg}
        toolbarColorScheme={colorScheme}
        navigationTitle="设置"
        toolbar={{
          cancellationAction: <Button title="完成" action={dismiss} />
        }}
      >
        <Section listRowBackground={<Rectangle fill={palette.card} />} header={<Text>视频源</Text>}>
          <NavigationLink
            destination={<SourceManagementScreen icloudSyncEnabled={icloudSyncEnabled} onRequestSync={syncSettingsToICloud} onSourcesChange={setSources} />}
          >
            <VStack alignment="leading" spacing={2}>
              <Text foregroundStyle={palette.accent}>视频源管理</Text>
              <Text font="caption2" foregroundStyle={palette.textSecondary}>
                {`已启用 ${enabledSourceCount} 个 · 共 ${sources.length} 个`}
              </Text>
            </VStack>
          </NavigationLink>
        </Section>
        <Section
          listRowBackground={<Rectangle fill={palette.card} />}
          header={<Text>外观</Text>}
          footer={
            <Text font="footnote" foregroundStyle={palette.textSecondary}>
              {THEME_HINTS[themeMode]}
            </Text>
          }
        >
          <AppearancePicker mode={themeMode} onChange={AppearanceService.setThemeMode} />
        </Section>
        <Section
          listRowBackground={<Rectangle fill={palette.card} />}
          header={<Text>桌面小组件</Text>}
          footer={
            <Text font="footnote" foregroundStyle={palette.textSecondary}>
              每天按当前视频源推荐电影和剧集，配色跟随上方外观。在主屏幕添加 Scripting 小组件，长按选择「编辑小组件」，脚本选 ScriptFlix。
            </Text>
          }
        >
          <HStack spacing={8}>
            <VStack alignment="leading" spacing={2}>
              <Text foregroundStyle={palette.textPrimary}>每日推荐</Text>
              <Text font="caption2" foregroundStyle={palette.textSecondary}>
                预览各尺寸效果
              </Text>
            </VStack>
            <Spacer />
            {WIDGET_PREVIEWS.map(item => (
              <Button key={item.family} buttonStyle="plain" action={() => void previewWidget(item.family)}>
                <Text
                  font="subheadline"
                  foregroundStyle={palette.accent}
                  padding={{ horizontal: 12, vertical: 6 }}
                  background={palette.cardHi}
                  clipShape="capsule"
                >
                  {item.title}
                </Text>
              </Button>
            ))}
          </HStack>
        </Section>
        <Section
          listRowBackground={<Rectangle fill={palette.card} />}
          header={<Text>云端同步</Text>}
          footer={
            <Text font="footnote" foregroundStyle={palette.textSecondary}>
              {syncStatusLabel}
            </Text>
          }
        >
          <Toggle title="iCloud 同步" foregroundStyle={palette.accent} value={icloudSyncEnabled} onChanged={handleIcloudToggle} />
        </Section>
        <Section
          listRowBackground={<Rectangle fill={palette.card} />}
          footer={
            <VStack spacing={10} alignment="leading">
              <Text font="footnote" foregroundStyle={palette.textSecondary}>
                ScriptFlix {'v' + Script.metadata?.version || '1.0.0'}
                {'\n'}
                淮城一只猫© - 更多脚本/小组件请关注微信公众号「栈空间」
              </Text>
              <Image filePath={BANNER_IMAGE_FILE_PATH} resizable scaleToFit />
            </VStack>
          }
        >
          <NavigationLink
            destination={<ChangelogScreen title="最近更新" versionLabel="当前版本" version={Script.metadata?.version || '1.0.0'} emptyLabel="暂无更新记录" />}
          >
            <HStack>
              <Text foregroundStyle={palette.accent}>查看更新内容</Text>
              <Spacer />
            </HStack>
          </NavigationLink>
        </Section>
      </List>
    </NavigationStack>
  )
}
