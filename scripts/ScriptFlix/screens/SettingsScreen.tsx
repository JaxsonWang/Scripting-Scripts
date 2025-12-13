import { Button, HStack, List, Navigation, NavigationLink, NavigationStack, Script, Section, Spacer, Text, Toggle, VStack, useState } from 'scripting'
import { HistoryService } from '../services/history'
import { SettingsService } from '../services/settings'
import { ChangelogScreen } from './ChangelogScreen'
import { SourceManagementScreen } from './SourceManagementScreen'
import type { CloudSnapshot } from '../types'

const AppStorage = Storage
const ICLOUD_SYNC_KEY = 'script_flix_icloud_sync_enabled'

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
  const [icloudSyncEnabled, setIcloudSyncEnabled] = useState<boolean>(() => AppStorage.get(ICLOUD_SYNC_KEY) ?? false)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const [sourceCount, setSourceCount] = useState(() => SettingsService.getSources().length)

  const getIcloudSettingsPath = () => {
    const icloudRoot = FileManager.iCloudDocumentsDirectory
    if (!icloudRoot) {
      throw new Error('未检测到 iCloud 云盘目录，请先在系统中启用 iCloud Drive')
    }
    const folder = `${icloudRoot}/${getScriptFolderRelativePath()}`
    const filePath = `${folder}/settings.json`
    return { icloudRoot, folder, filePath }
  }

  const applySnapshot = (snapshot: CloudSnapshot) => {
    if (Array.isArray(snapshot.sources)) {
      SettingsService.saveSources(snapshot.sources)
      setSourceCount(snapshot.sources.length)
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
        setSourceCount(SettingsService.getSources().length)
      }
      await syncSettingsToICloud()
    }
  }

  const syncStatusLabel = syncing
    ? '正在写入 iCloud...'
    : icloudSyncEnabled && lastSyncedAt
      ? `最近同步：${new Date(lastSyncedAt).toLocaleString()}`
      : `开启后将在 iCloud Drive/${getScriptFolderRelativePath()}/settings.json 生成设置备份`

  return (
    <NavigationStack>
      <List
        navigationTitle="设置"
        toolbar={{
          cancellationAction: <Button title="完成" action={dismiss} />
        }}
      >
        <Section header={<Text>视频源</Text>}>
          <NavigationLink
            destination={
              <SourceManagementScreen
                icloudSyncEnabled={icloudSyncEnabled}
                onRequestSync={syncSettingsToICloud}
                onSourcesChange={count => setSourceCount(count)}
              />
            }
          >
            <VStack alignment="leading" spacing={2}>
              <Text foregroundStyle="#e50914">视频源管理</Text>
              <Text font="caption2" foregroundStyle="secondaryLabel">
                共 {sourceCount} 个源
              </Text>
            </VStack>
          </NavigationLink>
        </Section>
        <Section
          header={<Text>云端同步</Text>}
          footer={
            <Text font="footnote" foregroundStyle="secondaryLabel">
              {syncStatusLabel}
            </Text>
          }
        >
          <Toggle title="iCloud 同步" foregroundStyle="#e50914" value={icloudSyncEnabled} onChanged={handleIcloudToggle} />
        </Section>
        <Section
          footer={
            <VStack spacing={10} alignment="leading">
              <Text font="footnote" foregroundStyle="secondaryLabel">
                ScriptFlix {'v' + Script.metadata?.version || '1.0.0'}
                {'\n'}
                淮城一只猫© - Power by Scripting
                {'\n'}
                更多脚本/小组件请关注微信公众号「组件派」
              </Text>
            </VStack>
          }
        >
          <NavigationLink
            destination={<ChangelogScreen title="最近更新" versionLabel="当前版本" version={Script.metadata?.version || '1.0.0'} emptyLabel="暂无更新记录" />}
          >
            <HStack>
              <Text foregroundStyle="#e50914">查看更新内容</Text>
              <Spacer />
            </HStack>
          </NavigationLink>
        </Section>
      </List>
    </NavigationStack>
  )
}
