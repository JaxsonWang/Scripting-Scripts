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
  VStack,
  useState
} from 'scripting'
import { SettingsService } from '../services/settings'
import type { ApiSource } from '../types'
import { ChangelogScreen } from './ChangelogScreen'

type SourceEditorProps = {
  title: string
  initialName: string
  initialUrl: string
  onSave: (name: string, url: string) => void
}

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
            <Text font="caption" foregroundStyle="tintColor" padding={{ horizontal: 6 }}>
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

/**
 * 视频源设置页，包含列表、快速设置和编辑操作。
 */
export const SettingsScreen = () => {
  const dismiss = Navigation.useDismiss()
  const [sources, setSources] = useState<ApiSource[]>(SettingsService.getSources())
  const [currentIndex, setCurrentIndex] = useState(SettingsService.getCurrentSourceIndex())

  const refreshSources = () => {
    setSources(SettingsService.getSources())
    setCurrentIndex(SettingsService.getCurrentSourceIndex())
  }

  const handleSelect = (index: number) => {
    SettingsService.saveCurrentSourceIndex(index)
    setCurrentIndex(index)
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
    })
  }

  const handleRemove = (index: number) => {
    SettingsService.removeSource(index)
    refreshSources()
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="数据源"
        navigationBarTitleDisplayMode="inline"
        listStyle="inset"
        toolbar={{
          cancellationAction: <Button title="完成" action={dismiss} />,
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
      <Section
        padding={{ horizontal: 32 }}
        frame={{ maxWidth: 'infinity', alignment: 'leading' }}
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
          destination={<ChangelogScreen title="最近更新" versionLabel="当前版本" version={Script.metadata?.version || '1.0.0'} emptyLabel="暂无更新记录。" />}
        >
          <HStack frame={{ maxWidth: 'infinity' }}>
            <Text>查看更新内容</Text>
            <Spacer />
          </HStack>
        </NavigationLink>
      </Section>
    </NavigationStack>
  )
}
