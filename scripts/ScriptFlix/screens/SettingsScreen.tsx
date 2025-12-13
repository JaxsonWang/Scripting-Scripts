import {
  Button,
  Circle,
  Form,
  HStack,
  Label,
  List,
  Navigation,
  NavigationLink,
  NavigationStack,
  Script,
  Section,
  Spacer,
  Text,
  TextField,
  Toggle,
  VStack,
  useEffect,
  useState
} from 'scripting'
import { SettingsService } from '../services/settings'
import { HistoryService } from '../services/history'
import { ChangelogScreen } from './ChangelogScreen'
import type { ApiSource, SourceEditorProps } from '../types'

const AppStorage = Storage as any
const ICLOUD_SYNC_KEY = 'script_flix_icloud_sync_enabled'

const SourceEditor = ({ title, initialName, initialUrl, onSave }: SourceEditorProps) => {
  const dismiss = Navigation.useDismiss()
  const [name, setName] = useState(initialName)
  const [url, setUrl] = useState(initialUrl)
  const canSubmit = name.trim().length > 0 && url.trim().length > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    onSave(name.trim(), url.trim())
    dismiss()
  }

  return (
    <NavigationStack>
      <Form
        navigationTitle={title}
        toolbar={{
          cancellationAction: <Button title="取消" action={dismiss} />,
          primaryAction: <Button title="保存" action={handleSubmit} disabled={!canSubmit} />
        }}
      >
        <Section header={<Text>信息</Text>}>
          <TextField title="名称" value={name} onChanged={setName} />
          <TextField title="API 地址" value={url} onChanged={setUrl} />
        </Section>
      </Form>
    </NavigationStack>
  )
}

const SourceRow = ({
  source,
  active,
  onSelect,
  onEdit,
  onDelete
}: {
  source: ApiSource
  active: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}) => {
  return (
    <HStack
      padding={{ vertical: 6 }}
      onTapGesture={onSelect}
      spacing={12}
      trailingSwipeActions={{
        allowsFullSwipe: false,
        actions: [
          <Button action={onEdit}>
            <Label title="编辑" systemImage="pencil" />
          </Button>,
          <Button role="destructive" action={onDelete}>
            <Label title="删除" systemImage="trash" />
          </Button>
        ]
      }}
    >
      <Circle
        fill={active ? '#e50914' : 'clear'}
        stroke={
          active
            ? undefined
            : {
                shapeStyle: 'secondaryLabel',
                strokeStyle: { lineWidth: 1 }
              }
        }
        frame={{ width: 16, height: 16 }}
      />
      <VStack alignment="leading" spacing={2}>
        <HStack>
          <Text font="body" bold={active}>
            {source.name || '未命名'}
          </Text>
          {active ? (
            <Text font="caption" foregroundStyle="#e50914" padding={{ horizontal: 6 }}>
              当前
            </Text>
          ) : null}
        </HStack>
        <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={1}>
          {source.url}
        </Text>
      </VStack>
      <Spacer />
    </HStack>
  )
}

const SourceManagementScreen = ({
  icloudSyncEnabled,
  onRequestSync,
  onSourcesChange
}: {
  icloudSyncEnabled: boolean
  onRequestSync: () => Promise<void> | void
  onSourcesChange?: (count: number) => void
}) => {
  const [sources, setSources] = useState<ApiSource[]>(SettingsService.getSources())
  const [currentIndex, setCurrentIndex] = useState(SettingsService.getCurrentSourceIndex())

  useEffect(() => {
    emitCount(sources)
  }, [sources])

  const triggerSync = () => {
    if (icloudSyncEnabled) {
      void onRequestSync()
    }
  }

  const emitCount = (nextSources: ApiSource[]) => {
    onSourcesChange?.(nextSources.length)
  }

  const refreshSources = () => {
    const nextSources = SettingsService.getSources()
    setSources(nextSources)
    setCurrentIndex(SettingsService.getCurrentSourceIndex())
    triggerSync()
  }

  const handleSelect = (index: number) => {
    SettingsService.saveCurrentSourceIndex(index)
    setCurrentIndex(index)
    triggerSync()
  }

  const presentEditor = (title: string, defaults: ApiSource, onSave: (name: string, url: string) => void) => {
    Navigation.present({
      element: <SourceEditor title={title} initialName={defaults.name} initialUrl={defaults.url} onSave={onSave} />
    })
  }

  const handleCreate = () => {
    presentEditor('添加视频源', { name: '', url: '' }, (name, url) => {
      SettingsService.addSource({ name, url })
      refreshSources()
    })
  }

  const handleEdit = (index: number) => {
    const target = sources[index]
    presentEditor('编辑视频源', target, (name, url) => {
      const next = [...sources]
      next[index] = { name, url }
      SettingsService.saveSources(next)
      setSources(next)
      triggerSync()
    })
  }

  const handleRemove = (index: number) => {
    SettingsService.removeSource(index)
    refreshSources()
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="视频源"
        toolbar={{
          primaryAction: <Button title="添加" action={handleCreate} />
        }}
      >
        {sources.length > 0 ? (
          sources.map((source: ApiSource, index: number) => (
            <SourceRow
              key={index}
              source={source}
              active={index === currentIndex}
              onSelect={() => handleSelect(index)}
              onEdit={() => handleEdit(index)}
              onDelete={() => handleRemove(index)}
            />
          ))
        ) : (
          <Text foregroundStyle="secondaryLabel">暂无配置</Text>
        )}
      </List>
    </NavigationStack>
  )
}

/**
 * 视频源设置页，包含列表、快速设置和编辑操作
 */
export const SettingsScreen = () => {
  const dismiss = Navigation.useDismiss()
  const [icloudSyncEnabled, setIcloudSyncEnabled] = useState<boolean>(() => AppStorage.get(ICLOUD_SYNC_KEY) ?? false)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const [sourceCount, setSourceCount] = useState(() => SettingsService.getSources().length)

  const syncSettingsToICloud = async () => {
    try {
      setSyncing(true)
      const snapshot = {
        sources: SettingsService.getSources(),
        currentSourceIndex: SettingsService.getCurrentSourceIndex(),
        history: HistoryService.getHistory()
      }
      const icloudRoot = FileManager.iCloudDocumentsDirectory
      if (!icloudRoot) {
        throw new Error('未检测到 iCloud 云盘目录，请先在系统中启用 iCloud Drive')
      }
      const targetDir = `${icloudRoot}/scripts/ScriptFlix`
      await FileManager.createDirectory(targetDir, true)
      const targetPath = `${targetDir}/settings.json`
      await FileManager.writeAsString(targetPath, JSON.stringify(snapshot, null, 2))
      setLastSyncedAt(Date.now())
    } catch (error) {
      console.error('[SettingsScreen] iCloud sync failed', error)
      const message = error instanceof Error ? error.message : '未知错误'
      await Dialog.alert({ title: 'iCloud 同步失败', message })
    } finally {
      setSyncing(false)
    }
  }

  const handleIcloudToggle = (value: boolean) => {
    setIcloudSyncEnabled(value)
    AppStorage.set(ICLOUD_SYNC_KEY, value)
    if (value) {
      syncSettingsToICloud()
    }
  }

  const syncStatusLabel = syncing
    ? '正在写入 iCloud...'
    : icloudSyncEnabled && lastSyncedAt
      ? `最近同步：${new Date(lastSyncedAt).toLocaleString()}`
      : '开启后将在 iCloud Drive/scripts/ScriptFlix/settings.json 生成设置备份'

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
