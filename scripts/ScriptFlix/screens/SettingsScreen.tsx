import {
  Button,
  HStack,
  Image,
  List,
  Navigation,
  NavigationLink,
  NavigationStack,
  Path,
  Picker,
  Rectangle,
  Script,
  Section,
  Spacer,
  Text,
  Toggle,
  VStack,
  Widget,
  useEffect,
  useRef,
  useState
} from 'scripting'
import type { WidgetFamily } from 'scripting'
import { HistoryService } from '../services/history'
import { SettingsService, WIDGET_REFRESH_OPTIONS } from '../services/settings'
import { ChangelogScreen } from './ChangelogScreen'
import { SourceManagementScreen } from './SourceManagementScreen'
import { ScreenBackground } from '../components/ScreenBackground'
import { palette } from '../theme'
import { AppearancePicker } from '../components/AppearancePicker'
import { useThemeMode } from '../hooks/useThemeMode'
import { AppearanceService } from '../services/appearance'
import { parseSourceImport } from '../utils/source-import'
import type { CloudSnapshot } from '../types'

const AppStorage = Storage
const ICLOUD_SYNC_KEY = 'script_flix_icloud_sync_enabled'
const BANNER_IMAGE_FILE_PATH = Path.join(Script.directory, 'assets', 'banner.webp')
// 同一个备份文件按调用顺序写入；关闭再打开设置页也共用这条队列。
let cloudSyncQueue: Promise<unknown> = Promise.resolve()

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
  /** 开启同步时正在读取并应用云端备份；期间不能关闭页面或改动视频源，避免恢复结果与首页、源列表错位 */
  const [restoring, setRestoring] = useState(false)
  const [importing, setImporting] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const [sources, setSources] = useState(() => SettingsService.getSources())
  const [widgetRefreshMinutes, setWidgetRefreshMinutes] = useState(SettingsService.getWidgetRefreshMinutes)
  const mountedRef = useRef(true)
  const importingRef = useRef(false)
  const updatingSettings = restoring || importing
  const enabledSourceCount = sources.filter(SettingsService.isSourceEnabled).length

  useEffect(
    () => () => {
      mountedRef.current = false
    },
    []
  )

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

  /** 读取云端备份；文件不存在时返回 undefined */
  const readICloudSnapshot = async () => {
    const { filePath } = getIcloudSettingsPath()
    if (!(await FileManager.exists(filePath))) return
    return JSON.parse(await FileManager.readAsString(filePath)) as CloudSnapshot
  }

  /** 写入云端备份，失败时返回原因；默认直接弹窗，导入流程把结果并入自己的提示 */
  const syncSettingsToICloud = (alertOnError = true): Promise<string | null> => {
    setSyncing(true)
    const task = cloudSyncQueue.then(async () => {
      try {
        const snapshot = {
          sources: SettingsService.getSources(),
          currentSourceIndex: SettingsService.getCurrentSourceIndex(),
          history: HistoryService.getHistory()
        }
        const { folder, filePath } = getIcloudSettingsPath()
        await FileManager.createDirectory(folder, true)
        await FileManager.writeAsString(filePath, JSON.stringify(snapshot, null, 2))
        if (mountedRef.current) setLastSyncedAt(Date.now())
        return null
      } catch (error) {
        console.error('[SettingsScreen] iCloud sync failed', error)
        const message = error instanceof Error ? error.message : '未知错误'
        if (alertOnError && mountedRef.current) await Dialog.alert({ title: 'iCloud 同步失败', message })
        return message
      }
    })
    cloudSyncQueue = task
    return task.then(error => {
      // 队尾写完才结束同步状态；还有排队的写入时保持进行中
      if (mountedRef.current && cloudSyncQueue === task) setSyncing(false)
      return error
    })
  }

  const handleIcloudToggle = async (value: boolean) => {
    if (!value) {
      setIcloudSyncEnabled(false)
      AppStorage.set(ICLOUD_SYNC_KEY, false)
      return
    }

    setRestoring(true)
    try {
      const snapshot = await readICloudSnapshot()
      if (!mountedRef.current) return
      if (snapshot !== undefined) applySnapshot(snapshot)
      setIcloudSyncEnabled(true)
      AppStorage.set(ICLOUD_SYNC_KEY, true)
      void syncSettingsToICloud()
    } catch (error) {
      console.error('[SettingsScreen] restore iCloud settings failed', error)
      const message = error instanceof Error ? error.message : 'settings.json 解析失败'
      if (mountedRef.current) await Dialog.alert({ title: 'iCloud 同步失败', message })
    } finally {
      if (mountedRef.current) setRestoring(false)
    }
  }

  const importSources = async () => {
    if (restoring || syncing || importingRef.current) return
    importingRef.current = true
    setImporting(true)
    try {
      const [path] = await DocumentPicker.pickFiles({ types: ['public.json'], allowsMultipleSelection: false })
      if (!path || !mountedRef.current) return
      const imported = parseSourceImport(await FileManager.readAsString(path))
      if (!mountedRef.current) return
      const count = imported.sources.length
      const nextIndex = SettingsService.resolveImportedIndex(imported.sources, imported.currentSourceIndex)
      const nextCurrent = imported.sources[SettingsService.resolveCurrentIndex(imported.sources, nextIndex)]
      const lines =
        count === 0
          ? ['文件中没有视频源，强制覆盖将清空当前全部视频源。']
          : [
              `将用文件中的 ${count} 个视频源强制覆盖当前全部视频源，原列表不会保留。`,
              nextCurrent ? `当前视频源：${nextCurrent.name}` : '文件中的视频源均已停用，首页与搜索将暂不可用。'
            ]
      if (icloudSyncEnabled) lines.push('导入后会更新 iCloud 云端备份。')
      const confirmed = await Dialog.confirm({
        title: '确认覆盖视频源？',
        message: lines.join('\n'),
        confirmLabel: '强制覆盖',
        cancelLabel: '取消'
      })
      if (!confirmed || !mountedRef.current) return
      // 本地列表始终整体覆盖，iCloud 开关只决定是否更新云端备份。
      SettingsService.replaceSources(imported.sources, nextIndex)
      setSources(imported.sources)
      const syncError = icloudSyncEnabled ? await syncSettingsToICloud(false) : null
      if (!mountedRef.current) return
      await Dialog.alert(
        syncError
          ? { title: '导入完成，iCloud 同步失败', message: `已导入 ${count} 个视频源，云端备份未更新：${syncError}` }
          : { title: '导入完成', message: `已导入 ${count} 个视频源` }
      )
    } catch (error) {
      console.error('[SettingsScreen] import sources failed', error)
      if (mountedRef.current) {
        // 下标写入失败时视频源可能已替换，列表按实际存储刷新
        setSources(SettingsService.getSources())
        await Dialog.alert({ title: '导入失败', message: error instanceof Error ? error.message : '无法读取文件，请重新选择 JSON 文件' })
      }
    } finally {
      importingRef.current = false
      if (mountedRef.current) setImporting(false)
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

  const changeWidgetRefreshMinutes = async (minutes: number) => {
    try {
      SettingsService.setWidgetRefreshMinutes(minutes)
      setWidgetRefreshMinutes(minutes)
    } catch (error) {
      console.error('[SettingsScreen] 小组件刷新频率保存失败', error)
      await Dialog.alert({ title: '保存失败', message: error instanceof Error ? error.message : '请重试' })
    }
  }

  const syncStatusLabel =
    restoring || syncing
      ? '正在同步 iCloud...'
      : icloudSyncEnabled && lastSyncedAt
        ? `最近同步：${new Date(lastSyncedAt).toLocaleString()}`
        : `开启后将在 iCloud Drive/${getScriptFolderRelativePath()}/settings.json 生成设置备份`

  return (
    <NavigationStack preferredColorScheme={colorScheme} tint={palette.accent} interactiveDismissDisabled={updatingSettings}>
      <List
        foregroundStyle={palette.textPrimary}
        background={<ScreenBackground />}
        scrollContentBackground="hidden"
        toolbarBackground={palette.bg}
        toolbarColorScheme={colorScheme}
        navigationTitle="设置"
        toolbar={{
          cancellationAction: <Button title="完成" action={dismiss} disabled={updatingSettings} />
        }}
      >
        <Section listRowBackground={<Rectangle fill={palette.card} />} header={<Text>视频源</Text>}>
          <NavigationLink
            disabled={updatingSettings}
            destination={
              <SourceManagementScreen icloudSyncEnabled={icloudSyncEnabled} onRequestSync={() => void syncSettingsToICloud()} onSourcesChange={setSources} />
            }
          >
            <VStack alignment="leading" spacing={2}>
              <Text foregroundStyle={palette.accent}>视频源管理</Text>
              <Text font="caption2" foregroundStyle={palette.textSecondary}>
                {`已启用 ${enabledSourceCount} 个 · 共 ${sources.length} 个`}
              </Text>
            </VStack>
          </NavigationLink>
          <Button
            title={importing ? '正在导入…' : '导入视频源'}
            foregroundStyle={palette.accent}
            action={importSources}
            disabled={updatingSettings || syncing}
          />
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
              按所选频率重新挑选电影和剧集，实际刷新时间由系统调度。在主屏幕添加 Scripting 小组件，长按选择「编辑小组件」，脚本选 ScriptFlix。
            </Text>
          }
        >
          <Picker title="刷新频率" pickerStyle="menu" value={widgetRefreshMinutes} onChanged={changeWidgetRefreshMinutes}>
            {WIDGET_REFRESH_OPTIONS.map(minutes => (
              <Text key={minutes} tag={minutes}>
                {minutes === 1440 ? '每天' : minutes === 60 ? '每小时' : minutes % 60 === 0 ? `每 ${minutes / 60} 小时` : `每 ${minutes} 分钟`}
              </Text>
            ))}
          </Picker>
          <HStack spacing={8}>
            <VStack alignment="leading" spacing={2}>
              <Text foregroundStyle={palette.textPrimary}>影视推荐</Text>
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
          <Toggle
            title="iCloud 同步"
            foregroundStyle={palette.accent}
            value={icloudSyncEnabled || restoring}
            onChanged={handleIcloudToggle}
            disabled={updatingSettings}
          />
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
