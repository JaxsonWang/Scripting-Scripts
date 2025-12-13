import { Button, Circle, HStack, Label, List, Navigation, NavigationStack, Spacer, Text, VStack, useEffect, useState } from 'scripting'
import { SettingsService } from '../services/settings'
import { SourceEditor } from './SourceEditor'
import type { ApiSource, SourceManagementScreenProps, SourceRowProps } from '../types'

const SourceRow = ({ source, active, onSelect, onEdit, onDelete }: SourceRowProps) => (
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

export const SourceManagementScreen = ({ icloudSyncEnabled, onRequestSync, onSourcesChange }: SourceManagementScreenProps) => {
  const [sources, setSources] = useState<ApiSource[]>(SettingsService.getSources())
  const [currentIndex, setCurrentIndex] = useState(SettingsService.getCurrentSourceIndex())

  useEffect(() => {
    onSourcesChange?.(sources.length)
  }, [sources, onSourcesChange])

  const triggerSync = () => {
    if (icloudSyncEnabled) {
      void onRequestSync()
    }
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
        navigationBarTitleDisplayMode="inline"
        listStyle="inset"
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
