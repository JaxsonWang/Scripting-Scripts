import {
  Button,
  Capsule,
  Circle,
  Divider,
  HStack,
  Image,
  Label,
  List,
  Menu,
  NamespaceReader,
  Navigation,
  NavigationStack,
  Rectangle,
  Section,
  Spacer,
  Text,
  VStack,
  ZStack,
  useEffect,
  useState
} from 'scripting'
import { SettingsService } from '../services/settings'
import { SourceEditor } from './SourceEditor'
import { ScreenBackground } from '../components/ScreenBackground'
import { EmptyView } from '../components/StateView'
import { accentGlow, brandGradient, palette } from '../theme'
import { usePreferredColorScheme } from '../hooks/useThemeMode'
import type { ApiSource, SourceManagementScreenProps, SourceRowProps } from '../types'

type SourceTab = 'enabled' | 'disabled'
type MonogramVariant = 'current' | 'enabled' | 'disabled'
type SourceMenuProps = Omit<SourceRowProps, 'source' | 'onSelect'> & { enabled: boolean; onSelect?: () => void }

const ROW_BACKGROUND = <Rectangle fill={palette.card} />
const CURRENT_BACKGROUND = (
  <ZStack>
    <Rectangle fill={palette.card} />
    <Rectangle fill={accentGlow} />
  </ZStack>
)

/** 首字图标配色：按域名固定取色，同一个源每次颜色一致，方便在长列表里扫读；日间用加深的同色相保证对比度 */
const MONOGRAM_TINTS = [
  { fg: { light: '#9333EA', dark: '#C084FC' }, bg: 'rgba(192,132,252,0.16)' },
  { fg: { light: '#DB2777', dark: '#F472B6' }, bg: 'rgba(244,114,182,0.16)' },
  { fg: { light: '#4F46E5', dark: '#818CF8' }, bg: 'rgba(129,140,248,0.16)' },
  { fg: { light: '#2563EB', dark: '#60A5FA' }, bg: 'rgba(96,165,250,0.16)' },
  { fg: { light: '#0D9488', dark: '#2DD4BF' }, bg: 'rgba(45,212,191,0.16)' },
  { fg: { light: '#D97706', dark: '#FBBF24' }, bg: 'rgba(251,191,36,0.16)' }
] as const

const TAB_LABELS: Record<SourceTab, string> = { enabled: '已启用', disabled: '已停用' }

/** 列表只展示域名：同类 CMS 接口路径相同，完整地址在编辑页查看 */
const getHost = (url: string) => url.replace(/^[a-z][a-z\d+.-]*:\/\//i, '').split(/[/?#]/)[0] || url

const getName = (source: ApiSource) => source.name || '未命名'

const tintFor = (key: string) => {
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  }
  return MONOGRAM_TINTS[hash % MONOGRAM_TINTS.length]
}

const SourceMonogram = ({ source, size, variant }: { source: ApiSource; size: number; variant: MonogramVariant }) => {
  const tint = tintFor(getHost(source.url))
  const foreground = variant === 'current' ? '#FFFFFF' : variant === 'disabled' ? palette.textTertiary : tint.fg
  const background = variant === 'current' ? brandGradient : variant === 'disabled' ? palette.fillMuted : tint.bg

  return (
    <Text
      font={variant === 'current' ? 'title2' : 'headline'}
      bold
      foregroundStyle={foreground}
      frame={{ width: size, height: size }}
      background={background}
      clipShape={{ type: 'rect', cornerRadius: Math.round(size * 0.28), style: 'continuous' }}
    >
      {Array.from(getName(source))[0].toUpperCase()}
    </Text>
  )
}

const SourceMenu = ({ enabled, onSelect, onToggle, onEdit, onDelete }: SourceMenuProps) => (
  <Menu
    label={
      <Image
        systemName="ellipsis"
        font={14}
        foregroundStyle={palette.textSecondary}
        frame={{ width: 32, height: 32 }}
        background={palette.cardHi}
        clipShape="circle"
        accessibilityLabel="更多操作"
      />
    }
  >
    {onSelect ? <Button title="设为当前" systemImage="checkmark.circle" action={onSelect} /> : null}
    <Button title={enabled ? '停用' : '启用'} systemImage={enabled ? 'pause.circle' : 'play.circle'} action={() => onToggle(!enabled)} />
    <Button title="编辑" systemImage="pencil" action={onEdit} />
    <Divider />
    <Button title="删除" systemImage="trash" role="destructive" action={onDelete} />
  </Menu>
)

/** 当前源：放在列表顶部单独展示，回答「我现在用的是哪个源」 */
const CurrentSourceCard = ({ source, onToggle, onEdit, onDelete }: Omit<SourceRowProps, 'onSelect'>) => (
  <HStack spacing={14} padding={{ vertical: 10 }} listRowBackground={CURRENT_BACKGROUND}>
    <SourceMonogram source={source} size={52} variant="current" />
    <VStack alignment="leading" spacing={3}>
      <HStack spacing={5}>
        <Circle fill={brandGradient} frame={{ width: 6, height: 6 }} />
        <Text font="caption" bold foregroundStyle={brandGradient}>
          正在使用
        </Text>
      </HStack>
      <Text font="title3" bold foregroundStyle={palette.textPrimary} lineLimit={1}>
        {getName(source)}
      </Text>
      <Text font="caption" foregroundStyle={palette.textSecondary} lineLimit={1}>
        {getHost(source.url)}
      </Text>
    </VStack>
    <Spacer />
    <SourceMenu enabled onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
  </HStack>
)

const SourceRow = ({ source, onSelect, onToggle, onEdit, onDelete }: SourceRowProps) => {
  const enabled = SettingsService.isSourceEnabled(source)

  return (
    <HStack
      spacing={12}
      padding={{ vertical: 4 }}
      contentShape="rect"
      onTapGesture={onSelect}
      listRowBackground={ROW_BACKGROUND}
      listRowSeparatorTint="rgba(128,128,140,0.16)"
      leadingSwipeActions={{
        allowsFullSwipe: true,
        actions: [
          <Button action={() => onToggle(!enabled)} tint={enabled ? '#52525B' : palette.accent}>
            <Label title={enabled ? '停用' : '启用'} systemImage={enabled ? 'pause.fill' : 'play.fill'} />
          </Button>
        ]
      }}
      trailingSwipeActions={{
        allowsFullSwipe: false,
        actions: [
          <Button role="destructive" action={onDelete}>
            <Label title="删除" systemImage="trash" />
          </Button>,
          <Button action={onEdit} tint={palette.accent}>
            <Label title="编辑" systemImage="pencil" />
          </Button>
        ]
      }}
    >
      <SourceMonogram source={source} size={40} variant={enabled ? 'enabled' : 'disabled'} />
      <VStack alignment="leading" spacing={2}>
        <Text font="headline" foregroundStyle={enabled ? palette.textPrimary : palette.textSecondary} lineLimit={1}>
          {getName(source)}
        </Text>
        <Text font="caption" foregroundStyle={palette.textSecondary} lineLimit={1}>
          {getHost(source.url)}
        </Text>
      </VStack>
      <Spacer />
      {enabled ? (
        <SourceMenu enabled onSelect={onSelect} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
      ) : (
        <Button buttonStyle="plain" action={() => onToggle(true)}>
          <Text
            font="subheadline"
            bold
            foregroundStyle={palette.accentInk}
            padding={{ horizontal: 14, vertical: 7 }}
            background="rgba(168,85,247,0.18)"
            clipShape="capsule"
          >
            启用
          </Text>
        </Button>
      )}
    </HStack>
  )
}

/** 通栏分段控件：选中态的渐变胶囊在两段之间滑动 */
const SourceTabs = ({ tab, counts, onChange }: { tab: SourceTab; counts: Record<SourceTab, number>; onChange: (tab: SourceTab) => void }) => (
  <NamespaceReader>
    {namespace => (
      <HStack spacing={4} padding={4} background={palette.card} clipShape="capsule">
        {(['enabled', 'disabled'] as const).map(key => {
          const active = tab === key
          return (
            <Button key={key} buttonStyle="plain" action={() => onChange(key)}>
              <HStack
                spacing={6}
                padding={{ vertical: 9 }}
                frame={{ maxWidth: 'infinity' }}
                contentShape="capsule"
                background={active ? <Capsule fill={brandGradient} matchedGeometryEffect={{ id: 'source-tab', namespace }} /> : undefined}
              >
                <Text font="subheadline" bold foregroundStyle={active ? '#FFFFFF' : palette.textSecondary}>
                  {TAB_LABELS[key]}
                </Text>
                <Text font="caption" monospacedDigit foregroundStyle={active ? 'rgba(255,255,255,0.78)' : palette.textTertiary}>
                  {counts[key]}
                </Text>
              </HStack>
            </Button>
          )
        })}
      </HStack>
    )}
  </NamespaceReader>
)

const SectionCaption = ({ title, hint }: { title: string; hint?: string }) => (
  <HStack>
    <Text font="footnote" bold foregroundStyle={palette.textSecondary}>
      {title}
    </Text>
    <Spacer />
    {hint ? (
      <Text font="caption" foregroundStyle={palette.textTertiary}>
        {hint}
      </Text>
    ) : null}
  </HStack>
)

export const SourceManagementScreen = ({ icloudSyncEnabled, onRequestSync, onSourcesChange }: SourceManagementScreenProps) => {
  const [sources, setSources] = useState<ApiSource[]>(() => SettingsService.getSources())
  const colorScheme = usePreferredColorScheme()
  const [storedIndex, setStoredIndex] = useState(() => SettingsService.getCurrentSourceIndex())
  const [tab, setTab] = useState<SourceTab>('enabled')
  const currentIndex = SettingsService.resolveCurrentIndex(sources, storedIndex)
  const current = currentIndex >= 0 ? sources[currentIndex] : null

  const indexed = sources.map((source, index) => ({ source, index }))
  const enabledRows = indexed.filter(item => SettingsService.isSourceEnabled(item.source))
  const disabledRows = indexed.filter(item => !SettingsService.isSourceEnabled(item.source))
  const otherEnabledRows = enabledRows.filter(item => item.index !== currentIndex)

  useEffect(() => {
    onSourcesChange?.(sources)
  }, [sources, onSourcesChange])

  /** 从存储重新读取并刷新列表；animated 用于行在当前卡片、两个 tab 之间移动或被删除时的动画 */
  const reload = (animated = false) => {
    const apply = () => {
      setSources(SettingsService.getSources())
      setStoredIndex(SettingsService.getCurrentSourceIndex())
    }
    if (animated) {
      void withAnimation(apply)
    } else {
      apply()
    }
    if (icloudSyncEnabled) {
      void onRequestSync()
    }
  }

  const handleSelect = (index: number) => {
    if (index === currentIndex || !SettingsService.isSourceEnabled(sources[index])) {
      return
    }
    SettingsService.saveCurrentSourceIndex(index)
    reload(true)
  }

  const handleToggle = (index: number, enabled: boolean) => {
    SettingsService.setSourceEnabled(index, enabled)
    reload(true)
  }

  const presentEditor = (title: string, defaults: ApiSource, onSave: (name: string, url: string) => void) => {
    void Navigation.present({
      element: <SourceEditor title={title} initialName={defaults.name} initialUrl={defaults.url} onSave={onSave} />
    })
  }

  const handleCreate = () => {
    presentEditor('添加视频源', { name: '', url: '' }, (name, url) => {
      SettingsService.addSource({ name, url })
      reload()
    })
  }

  const handleEdit = (index: number) => {
    presentEditor('编辑视频源', sources[index], (name, url) => {
      SettingsService.updateSource(index, { name, url })
      reload()
    })
  }

  const handleRemove = (index: number) => {
    SettingsService.removeSource(index)
    reload(true)
  }

  const renderRow = ({ source, index }: { source: ApiSource; index: number }) => (
    <SourceRow
      key={`${index}-${source.url}`}
      source={source}
      onSelect={() => handleSelect(index)}
      onToggle={enabled => handleToggle(index, enabled)}
      onEdit={() => handleEdit(index)}
      onDelete={() => handleRemove(index)}
    />
  )

  const renderEnabledTab = () => {
    if (!current) {
      return (
        <Section listRowBackground={<Rectangle fill="clear" />}>
          <EmptyView icon="pause.circle" title="没有启用的视频源" message="首页与搜索暂不可用，可在「已停用」中重新启用" />
        </Section>
      )
    }
    return (
      <>
        <Section>
          <CurrentSourceCard
            source={current}
            onToggle={enabled => handleToggle(currentIndex, enabled)}
            onEdit={() => handleEdit(currentIndex)}
            onDelete={() => handleRemove(currentIndex)}
          />
        </Section>
        {otherEnabledRows.length > 0 ? (
          <Section header={<SectionCaption title={`其他源 · ${otherEnabledRows.length}`} hint="点按切换 · 滑动管理" />}>
            {otherEnabledRows.map(renderRow)}
          </Section>
        ) : null}
      </>
    )
  }

  const renderDisabledTab = () =>
    disabledRows.length > 0 ? (
      <Section header={<SectionCaption title="不出现在首页，也不参与全源搜索" />}>{disabledRows.map(renderRow)}</Section>
    ) : (
      <Section listRowBackground={<Rectangle fill="clear" />}>
        <EmptyView icon="checkmark.circle" title="没有停用的视频源" message="右滑某个源，或在「⋯」菜单中停用" />
      </Section>
    )

  return (
    <NavigationStack preferredColorScheme={colorScheme} tint={palette.accent}>
      <List
        foregroundStyle={palette.textPrimary}
        background={<ScreenBackground />}
        scrollContentBackground="hidden"
        toolbarBackground={palette.bg}
        toolbarColorScheme={colorScheme}
        navigationTitle="视频源"
        navigationBarTitleDisplayMode="inline"
        listSectionSpacing="compact"
        contentMargins={{ edges: 'top', insets: 4, placement: 'scrollContent' }}
        toolbar={{
          primaryAction: <Button title="添加" systemImage="plus" action={handleCreate} />
        }}
        safeAreaInset={
          sources.length > 0
            ? {
                top: {
                  content: (
                    <VStack padding={{ horizontal: 16, top: 4, bottom: 8 }} background={palette.bg}>
                      <SourceTabs
                        tab={tab}
                        counts={{ enabled: enabledRows.length, disabled: disabledRows.length }}
                        onChange={next => void withAnimation(() => setTab(next))}
                      />
                    </VStack>
                  )
                }
              }
            : undefined
        }
      >
        {sources.length === 0 ? (
          <Section listRowBackground={<Rectangle fill="clear" />}>
            <EmptyView
              icon="antenna.radiowaves.left.and.right"
              title="还没有视频源"
              message="添加 CMS 接口地址后即可浏览和搜索"
              actionTitle="添加视频源"
              onAction={handleCreate}
            />
          </Section>
        ) : tab === 'enabled' ? (
          renderEnabledTab()
        ) : (
          renderDisabledTab()
        )}
      </List>
    </NavigationStack>
  )
}
