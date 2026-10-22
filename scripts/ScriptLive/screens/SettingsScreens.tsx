import {
  Button,
  EditButton,
  ForEach,
  HStack,
  Image,
  List,
  Picker,
  Rectangle,
  Section,
  Slider,
  Spacer,
  Text,
  TextField,
  Toggle,
  VStack,
  Widget,
  useEffect,
  useObservable,
  useState
} from 'scripting'
import type { WidgetFamily } from 'scripting'
import type { AppSettings, QualityLevel, WidgetSource } from '../services/settings'
import { AppearancePicker } from '../components/AppearancePicker'
import { IconTile } from '../components/IconTile'
import { ScreenBackground } from '../components/ScreenBackground'
import { SiteLogo } from '../components/SiteLogo'
import { useStore } from '../hooks/useStore'
import { scheduleAutoRefresh } from '../services/follows'
import { ALL_SITES, WIDGET_REFRESH_OPTIONS, settingsStore, updateSettings } from '../services/settings'
import { SITE_STYLE, TILE, palette, radius } from '../theme'
import { errorMessage, formatInterval } from '../utils/format'

const rowBackground = <Rectangle fill={palette.card} />

const themeDescription = {
  auto: '跟随系统外观，白天使用日间，夜晚使用夜间。',
  light: '始终使用日间外观。',
  dark: '始终使用夜间外观。'
} as const

const QualityPicker = ({ title, value, onChange }: { title: string; value: QualityLevel; onChange: (value: QualityLevel) => void }) => (
  <Picker title={title} value={value} onChanged={(next: number) => onChange(next as QualityLevel)}>
    <Text tag={0}>最低</Text>
    <Text tag={1}>中等</Text>
    <Text tag={2}>最高</Text>
  </Picker>
)

const SettingSlider = ({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format?: (value: number) => string
  onChange: (value: number) => void
}) => (
  <VStack alignment="leading" spacing={5} padding={{ vertical: 4 }}>
    <HStack alignment="center">
      <Text foregroundStyle={palette.textPrimary}>{label}</Text>
      <Spacer />
      <Text font="subheadline" monospacedDigit foregroundStyle={palette.accent}>
        {format ? format(value) : String(value)}
      </Text>
    </HStack>
    <Slider label={<Text>{label}</Text>} min={min} max={max} step={step} value={value} onChanged={onChange} />
  </VStack>
)

const ScreenList = ({ title, trailing, children }: { title: string; trailing?: JSX.Element; children: JSX.Element | JSX.Element[] }) => (
  <List
    foregroundStyle={palette.textPrimary}
    background={<ScreenBackground />}
    scrollContentBackground="hidden"
    navigationTitle={title}
    navigationBarTitleDisplayMode="inline"
    toolbar={{ topBarTrailing: trailing }}
  >
    {children}
  </List>
)

/** 外观：用共享的预览选择器展示自动、日间和夜间三种模式。 */
export const AppearanceSettingsScreen = () => {
  const settings = useStore(settingsStore)
  return (
    <ScreenList title="外观">
      <Section header={<Text>外观</Text>} listRowBackground={rowBackground} footer={<Text font="footnote">{themeDescription[settings.themeMode]}</Text>}>
        <AppearancePicker mode={settings.themeMode} onChange={themeMode => updateSettings({ themeMode })} />
      </Section>
    </ScreenList>
  )
}

/** 平台顺序影响首页、分类与搜索里的平台切换条。 */
export const SiteOrderSettingsScreen = () => {
  const sites = useObservable(() => settingsStore.get().siteOrder.map(id => ({ id })))

  useEffect(() => {
    const save = () => updateSettings({ siteOrder: sites.value.map(site => site.id) })
    sites.subscribe(save)
    return () => sites.unsubscribe(save)
  }, [sites])

  return (
    <ScreenList title="平台顺序" trailing={<EditButton />}>
      <Section header={<Text>平台顺序</Text>} listRowBackground={rowBackground} footer={<Text font="footnote">点按「编辑」，拖动右侧手柄调整平台顺序。</Text>}>
        <ForEach
          data={sites}
          editActions="move"
          builder={({ id }) => {
            const style = SITE_STYLE[id]
            return (
              <HStack key={id} alignment="center" spacing={10} padding={{ vertical: 3 }}>
                <SiteLogo siteId={id} size={30} />
                <Text foregroundStyle={palette.textPrimary}>{style.name}</Text>
                <Spacer />
              </HStack>
            )
          }}
        />
      </Section>
    </ScreenList>
  )
}

/** 直播间画质、协议、礼物与聊天字号。 */
export const PlayerSettingsScreen = () => {
  const settings = useStore(settingsStore)
  return (
    <ScreenList title="直播间">
      <Section header={<Text>画质</Text>} listRowBackground={rowBackground} footer={<Text font="footnote">清晰度越高，流量与耗电越多。</Text>}>
        <QualityPicker title="Wi-Fi 画质" value={settings.qualityLevel} onChange={qualityLevel => updateSettings({ qualityLevel })} />
        <QualityPicker title="蜂窝网络画质" value={settings.qualityLevelCellular} onChange={qualityLevelCellular => updateSettings({ qualityLevelCellular })} />
      </Section>
      <Section header={<Text>播放与聊天</Text>} listRowBackground={rowBackground}>
        <Toggle title="强制使用 HTTPS" value={settings.forceHttps} onChanged={forceHttps => updateSettings({ forceHttps })} />
        <Toggle title="显示醒目留言 / Super Chat" value={settings.showSuperChat} onChanged={showSuperChat => updateSettings({ showSuperChat })} />
        <SettingSlider
          label="聊天字号"
          value={settings.chatTextSize}
          min={12}
          max={20}
          step={1}
          format={value => `${value} pt`}
          onChange={chatTextSize => updateSettings({ chatTextSize })}
        />
      </Section>
    </ScreenList>
  )
}

const DanmakuPreview = ({ size, opacity, area }: { size: number; opacity: number; area: number }) => (
  <VStack
    alignment="leading"
    spacing={7}
    padding={{ horizontal: 14, top: Math.round((1 - area) * 42), bottom: 10 }}
    frame={{ maxWidth: 'infinity', height: 148, alignment: 'topLeading' }}
    background={palette.ink}
    clipShape={{ type: 'rect', cornerRadius: radius.md, style: 'continuous' }}
  >
    <Text font={size} opacity={opacity} foregroundStyle="#FFFFFF" lineLimit={1}>
      欢迎来到直播间
    </Text>
    <Text font={size} opacity={Math.max(0.35, opacity * 0.82)} foregroundStyle="#FFD166" lineLimit={1}>
      这个字号和透明度看起来怎么样？
    </Text>
    <Text font={size} opacity={Math.max(0.3, opacity * 0.68)} foregroundStyle="#8EE3EF" lineLimit={1}>
      弹幕区域会跟随上面的设置
    </Text>
  </VStack>
)

/** 弹幕开关、字号、速度、显示区域与透明度，并提供即时预览。 */
export const DanmakuSettingsScreen = () => {
  const settings = useStore(settingsStore)
  return (
    <ScreenList title="弹幕">
      <Section header={<Text>预览</Text>} listRowBackground={rowBackground} footer={<Text font="footnote">速度数值越小，弹幕横穿屏幕越快。</Text>}>
        <DanmakuPreview size={settings.danmakuSize} opacity={settings.danmakuOpacity} area={settings.danmakuArea} />
      </Section>
      <Section header={<Text>弹幕设置</Text>} listRowBackground={rowBackground}>
        <Toggle title="显示弹幕" value={settings.danmakuEnable} onChanged={danmakuEnable => updateSettings({ danmakuEnable })} />
        <SettingSlider
          label="字号"
          value={settings.danmakuSize}
          min={12}
          max={30}
          step={1}
          format={value => `${value} pt`}
          onChange={danmakuSize => updateSettings({ danmakuSize })}
        />
        <SettingSlider
          label="滚动速度"
          value={settings.danmakuSpeed}
          min={4}
          max={20}
          step={1}
          format={value => `${value} 秒`}
          onChange={danmakuSpeed => updateSettings({ danmakuSpeed })}
        />
        <SettingSlider
          label="显示区域"
          value={settings.danmakuArea}
          min={0.25}
          max={1}
          step={0.05}
          format={value => `${Math.round(value * 100)}%`}
          onChange={danmakuArea => updateSettings({ danmakuArea })}
        />
        <SettingSlider
          label="透明度"
          value={settings.danmakuOpacity}
          min={0.1}
          max={1}
          step={0.05}
          format={value => `${Math.round(value * 100)}%`}
          onChange={danmakuOpacity => updateSettings({ danmakuOpacity })}
        />
      </Section>
    </ScreenList>
  )
}

const isRegexWord = (word: string) => word.length > 2 && word.startsWith('/') && word.endsWith('/')

/** 屏蔽词支持普通包含匹配，也支持用 /…/ 包裹的正则匹配。 */
export const ShieldWordsSettingsScreen = () => {
  const settings = useStore(settingsStore)
  const [draft, setDraft] = useState('')

  const addWord = async () => {
    const word = draft.trim()
    if (!word) return
    if (isRegexWord(word)) {
      try {
        new RegExp(word.slice(1, -1))
      } catch (error) {
        console.error('[ScriptLive] 屏蔽词正则无效', error)
        await Dialog.alert({ title: '正则表达式无效', message: error instanceof Error ? error.message : String(error) })
        return
      }
    }
    if (!settings.shieldWords.includes(word)) updateSettings({ shieldWords: [...settings.shieldWords, word] })
    setDraft('')
  }

  const removeWord = (word: string) => updateSettings({ shieldWords: settings.shieldWords.filter(item => item !== word) })

  return (
    <ScreenList title="屏蔽词">
      <Section
        header={<Text>添加屏蔽词</Text>}
        listRowBackground={rowBackground}
        footer={<Text font="footnote">普通文字按包含匹配；以 /开头和结尾/ 包裹时按正则匹配。</Text>}
      >
        <HStack alignment="center" spacing={8}>
          <TextField title="屏蔽词" value={draft} onChanged={setDraft} prompt="例如：广告 或 /抽奖\\d+/" submitLabel="done" onSubmit={() => void addWord()} />
          <Button buttonStyle="borderless" action={() => void addWord()} accessibilityLabel="添加屏蔽词">
            <Image systemName="plus.circle.fill" font={24} foregroundStyle={palette.accent} />
          </Button>
        </HStack>
      </Section>
      <Section header={<Text>已添加</Text>} listRowBackground={rowBackground}>
        {settings.shieldWords.length === 0 ? (
          <Text foregroundStyle={palette.textTertiary}>暂未添加屏蔽词</Text>
        ) : (
          settings.shieldWords.map(word => (
            <HStack
              key={word}
              alignment="center"
              spacing={8}
              padding={{ vertical: 3 }}
              trailingSwipeActions={{ allowsFullSwipe: false, actions: [<Button title="删除" role="destructive" action={() => removeWord(word)} />] }}
            >
              <Text foregroundStyle={palette.textPrimary}>{word}</Text>
              <Spacer />
              {isRegexWord(word) && (
                <Text
                  font="caption2"
                  foregroundStyle={palette.accent}
                  padding={{ horizontal: 7, vertical: 3 }}
                  background={palette.fillMuted}
                  clipShape="capsule"
                >
                  正则
                </Text>
              )}
            </HStack>
          ))
        )}
      </Section>
    </ScreenList>
  )
}

/** 关注刷新频率与并发数；设置变更后立即重新调度自动刷新。 */
export const FollowSettingsScreen = () => {
  const settings = useStore(settingsStore)
  const change = (patch: Partial<AppSettings>) => {
    updateSettings(patch)
    scheduleAutoRefresh()
  }

  return (
    <ScreenList title="关注">
      <Section
        header={<Text>自动刷新</Text>}
        listRowBackground={rowBackground}
        footer={<Text font="footnote">自动刷新只查询关注列表中的直播状态，不会改变关注内容。</Text>}
      >
        <Toggle title="自动刷新关注状态" value={settings.followAutoRefresh} onChanged={followAutoRefresh => change({ followAutoRefresh })} />
        <SettingSlider
          label="刷新间隔"
          value={settings.followRefreshMinutes}
          min={1}
          max={60}
          step={1}
          format={value => `${value} 分钟`}
          onChange={followRefreshMinutes => change({ followRefreshMinutes })}
        />
        <SettingSlider
          label="请求并发数"
          value={settings.followConcurrency}
          min={1}
          max={20}
          step={1}
          format={value => String(value)}
          onChange={followConcurrency => change({ followConcurrency })}
        />
      </Section>
    </ScreenList>
  )
}

/** 直播间自动退出设置，倒计时由直播间页面消费。 */
export const AutoExitSettingsScreen = () => {
  const settings = useStore(settingsStore)
  return (
    <ScreenList title="定时关闭">
      <Section header={<Text>定时关闭</Text>} listRowBackground={rowBackground} footer={<Text font="footnote">进入直播间后开始计时，到时自动退出脚本。</Text>}>
        <Toggle title="启用定时关闭" value={settings.autoExitEnable} onChanged={autoExitEnable => updateSettings({ autoExitEnable })} />
        <SettingSlider
          label="关闭时间"
          value={settings.autoExitMinutes}
          min={5}
          max={180}
          step={5}
          format={value => `${value} 分钟`}
          onChange={autoExitMinutes => updateSettings({ autoExitMinutes })}
        />
      </Section>
    </ScreenList>
  )
}

const WIDGET_PREVIEWS: { family: WidgetFamily; title: string }[] = [
  { family: 'systemSmall', title: '小号' },
  { family: 'systemMedium', title: '中号' },
  { family: 'systemLarge', title: '大号' }
]

/** 推荐来源的一行：图标 + 名称 + 说明，选中项右侧打勾 */
const SourceRow = ({
  icon,
  title,
  subtitle,
  selected,
  onTap
}: {
  icon: JSX.Element
  title: string
  subtitle: string
  selected: boolean
  onTap: () => void
}) => (
  <Button action={onTap} buttonStyle="plain">
    <HStack spacing={12} padding={{ vertical: 2 }} contentShape="rect">
      {icon}
      <VStack alignment="leading" spacing={2}>
        <Text foregroundStyle={palette.textPrimary}>{title}</Text>
        <Text font="caption" foregroundStyle={palette.textTertiary}>
          {subtitle}
        </Text>
      </VStack>
      <Spacer />
      {selected && <Image systemName="checkmark" font={15} fontWeight="semibold" foregroundStyle={palette.accent} />}
    </HStack>
  </Button>
)

/** 桌面小组件：推荐来源、换一批的频率与各尺寸预览；改动后桌面小组件立即刷新。 */
export const WidgetSettingsScreen = () => {
  const settings = useStore(settingsStore)
  const select = (widgetSource: WidgetSource) => updateSettings({ widgetSource })

  const preview = async (family: WidgetFamily) => {
    try {
      await Widget.preview({ family })
    } catch (error) {
      console.error('[ScriptLive] 小组件预览失败', error)
      await Dialog.alert({ title: '小组件预览失败', message: errorMessage(error) })
    }
  }

  return (
    <ScreenList title="桌面小组件">
      <Section header={<Text>推荐来源</Text>} listRowBackground={rowBackground}>
        <SourceRow
          icon={<IconTile icon="sparkles" color={TILE.red} />}
          title="综合推荐"
          subtitle="四个平台轮流挑选"
          selected={settings.widgetSource === 'mix'}
          onTap={() => select('mix')}
        />
        {ALL_SITES.map(id => (
          <SourceRow
            key={id}
            icon={<SiteLogo siteId={id} size={30} />}
            title={SITE_STYLE[id].name}
            subtitle={`只推荐${SITE_STYLE[id].short}的热门直播`}
            selected={settings.widgetSource === id}
            onTap={() => select(id)}
          />
        ))}
      </Section>
      <Section header={<Text>换一批</Text>} listRowBackground={rowBackground}>
        <Picker
          title="更新频率"
          pickerStyle="menu"
          value={settings.widgetRefreshMinutes}
          onChanged={(widgetRefreshMinutes: number) => updateSettings({ widgetRefreshMinutes })}
        >
          {WIDGET_REFRESH_OPTIONS.map(minutes => (
            <Text key={minutes} tag={minutes}>
              {formatInterval(minutes)}
            </Text>
          ))}
        </Picker>
      </Section>
      <Section
        header={<Text>预览</Text>}
        listRowBackground={rowBackground}
        footer={<Text font="footnote">在主屏幕添加 Scripting 小组件，长按选择「编辑小组件」，脚本选 ScriptLive，点按直播间直接进入观看。</Text>}
      >
        <HStack spacing={8}>
          <Text foregroundStyle={palette.textPrimary}>直播推荐</Text>
          <Spacer />
          {WIDGET_PREVIEWS.map(item => (
            <Button key={item.family} buttonStyle="plain" action={() => void preview(item.family)}>
              <Text
                font="subheadline"
                foregroundStyle={palette.accent}
                padding={{ horizontal: 12, vertical: 6 }}
                background={palette.fillMuted}
                clipShape="capsule"
              >
                {item.title}
              </Text>
            </Button>
          ))}
        </HStack>
      </Section>
    </ScreenList>
  )
}
