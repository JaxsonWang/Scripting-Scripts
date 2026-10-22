import { Button, HStack, Image, List, ProgressView, Rectangle, ScrollView, Section, Spacer, Text, VStack, useState } from 'scripting'
import { Chip, SiteBadge } from '../components/Chips'
import { CircleButton, PageHeader } from '../components/PageHeader'
import { Avatar, LiveDot } from '../components/RoomCard'
import { ScreenBackground } from '../components/ScreenBackground'
import { SheetScreen, presentSheet } from '../components/SheetScreen'
import { SectionHeader } from '../components/SectionHeader'
import { EmptyView } from '../components/StateView'
import { useStore } from '../hooks/useStore'
import {
  DEFAULT_TAG,
  addTag,
  followStore,
  liveStateStore,
  refreshLiveStates,
  refreshingStore,
  removeFollow,
  removeTag,
  renameTag,
  setFollowTag,
  tagStore
} from '../services/follows'
import { FULL_FRAME, palette, radius } from '../theme'
import type { FollowTag, FollowUser, LiveState } from '../types'
import { openRoom } from './open-room'

/** 直播中排最前，查询中次之，未开播最后；同组保持关注顺序。 */
const STATE_ORDER: Record<LiveState, number> = { 2: 0, 0: 1, 1: 2 }

const askTagName = async (title: string, defaultValue = ''): Promise<string | null> => {
  const name = await Dialog.prompt({ title, defaultValue, placeholder: '标签名称', confirmLabel: '保存' })
  return name === null ? null : name.trim()
}

/** 标签管理：新增、重命名、删除；删除后其中的关注回到「全部」。 */
const TagManageScreen = () => {
  const tags = useStore(tagStore)
  const follows = useStore(followStore)

  const create = async () => {
    const name = await askTagName('新建标签')
    if (name && !addTag(name)) await Dialog.alert({ title: '无法创建', message: `「${name}」已存在或与「${DEFAULT_TAG}」重名` })
  }

  const rename = async (tag: FollowTag) => {
    const name = await askTagName('重命名标签', tag.tag)
    if (name && name !== tag.tag && !renameTag(tag.id, name))
      await Dialog.alert({ title: '无法重命名', message: `「${name}」已存在或与「${DEFAULT_TAG}」重名` })
  }

  const remove = async (tag: FollowTag) => {
    if (await Dialog.confirm({ title: `删除「${tag.tag}」？`, message: '标签内的关注不会被删除，会回到「全部」。', confirmLabel: '删除' })) removeTag(tag.id)
  }

  return (
    <SheetScreen title="标签管理" trailing={<Button title="新建" systemImage="plus" action={create} />}>
      <List listStyle="insetGroup" scrollContentBackground="hidden" background={palette.bg}>
        {tags.length === 0 ? (
          <EmptyView icon="tag" title="还没有标签" message="用标签把关注分组，例如「游戏」「聊天」" actionTitle="新建标签" onAction={create} />
        ) : (
          <Section footer={<Text>左滑可重命名或删除</Text>} listRowBackground={<Rectangle fill={palette.card} />}>
            {tags.map(tag => (
              <HStack
                key={tag.id}
                spacing={10}
                listRowBackground={<Rectangle fill={palette.card} />}
                trailingSwipeActions={{
                  allowsFullSwipe: false,
                  actions: [
                    <Button key="delete" title="删除" role="destructive" action={() => remove(tag)} />,
                    <Button key="rename" title="重命名" action={() => rename(tag)} />
                  ]
                }}
              >
                <Image systemName="tag.fill" foregroundStyle={palette.accent} />
                <Text foregroundStyle={palette.textPrimary}>{tag.tag}</Text>
                <Spacer />
                <Text font="footnote" monospacedDigit foregroundStyle={palette.textTertiary}>
                  {follows.filter(user => user.tag === tag.tag).length}
                </Text>
              </HStack>
            ))}
          </Section>
        )}
      </List>
    </SheetScreen>
  )
}

const FollowRow = ({ user, state, tags }: { user: FollowUser; state: LiveState; tags: FollowTag[] }) => {
  const chooseTag = async () => {
    const names = [DEFAULT_TAG, ...tags.map(tag => tag.tag)]
    const index = await Dialog.actionSheet({ title: `为「${user.userName}」设置标签`, actions: names.map(label => ({ label })), cancelButton: true })
    if (index !== null) setFollowTag(user.id, names[index])
  }

  const unfollow = async () => {
    if (await Dialog.confirm({ title: '取消关注', message: `确定不再关注「${user.userName}」吗？`, confirmLabel: '取消关注' })) removeFollow(user.id)
  }

  return (
    <Button
      action={() => openRoom({ siteId: user.siteId, roomId: user.roomId })}
      buttonStyle="plain"
      contextMenu={{
        menuItems: (
          <VStack>
            <Button title="设置标签" systemImage="tag" action={chooseTag} />
            <Button title="取消关注" systemImage="heart.slash" role="destructive" action={unfollow} />
          </VStack>
        )
      }}
    >
      <HStack spacing={12} padding={{ horizontal: 14, vertical: 13 }} frame={{ maxWidth: 'infinity', alignment: 'leading' }}>
        <Avatar url={user.face} size={44} live={state === 2} />
        <VStack alignment="leading" spacing={5} frame={{ maxWidth: 'infinity', alignment: 'leading' }}>
          <HStack spacing={6}>
            <Text font="body" bold lineLimit={1} foregroundStyle={palette.textPrimary}>
              {user.userName}
            </Text>
            <SiteBadge siteId={user.siteId} />
            <Spacer minLength={0} />
          </HStack>
          <HStack spacing={8}>
            <LiveDot state={state} />
            {user.tag !== DEFAULT_TAG && (
              <Text font="caption" foregroundStyle={palette.textTertiary}>
                #{user.tag}
              </Text>
            )}
          </HStack>
        </VStack>
        <Image systemName="chevron.right" font={13} foregroundStyle={palette.textTertiary} />
      </HStack>
    </Button>
  )
}

const FollowGroup = ({ title, users, stateOf, tags }: { title: string; users: FollowUser[]; stateOf: (user: FollowUser) => LiveState; tags: FollowTag[] }) => (
  <VStack spacing={10} alignment="leading" frame={{ maxWidth: 'infinity', alignment: 'leading' }}>
    <SectionHeader title={title} subtitle={`${users.length} 位`} />
    <VStack padding={{ horizontal: 16 }}>
      <VStack spacing={0} background={palette.card} clipShape={{ type: 'rect', cornerRadius: radius.lg, style: 'continuous' }}>
        {users.map((user, index) => (
          <VStack key={user.id} spacing={0}>
            {/* 分隔线从文字起点开始，与头像右侧对齐 */}
            {index > 0 && <Rectangle fill={palette.separator} frame={{ maxWidth: 'infinity', height: 0.5 }} padding={{ leading: 70 }} />}
            <FollowRow user={user} state={stateOf(user)} tags={tags} />
          </VStack>
        ))}
      </VStack>
    </VStack>
  </VStack>
)

/** 关注：按标签筛选，直播中排前，下拉或点按刷新直播状态。 */
export const FollowScreen = () => {
  const follows = useStore(followStore)
  const tags = useStore(tagStore)
  const states = useStore(liveStateStore)
  const refreshing = useStore(refreshingStore)
  const [tag, setTag] = useState(DEFAULT_TAG)
  const [liveOnly, setLiveOnly] = useState(false)

  const activeTag = tag === DEFAULT_TAG || tags.some(item => item.tag === tag) ? tag : DEFAULT_TAG
  const stateOf = (user: FollowUser): LiveState => states[user.id] ?? 0
  const visible = follows
    .filter(user => activeTag === DEFAULT_TAG || user.tag === activeTag)
    .filter(user => !liveOnly || stateOf(user) === 2)
    .map((user, index) => ({ user, index }))
    .sort((a, b) => STATE_ORDER[stateOf(a.user)] - STATE_ORDER[stateOf(b.user)] || a.index - b.index)
    .map(entry => entry.user)
  const liveUsers = visible.filter(user => stateOf(user) === 2)
  const offlineUsers = visible.filter(user => stateOf(user) !== 2)
  const liveCount = follows.filter(user => stateOf(user) === 2).length
  const subtitle = liveCount > 0 ? `${liveCount} 位正在直播` : `共 ${follows.length} 位`

  const tagsContent = (
    <ScrollView axes="horizontal" scrollIndicator="hidden">
      <HStack spacing={8} padding={{ horizontal: 16 }}>
        <Chip label={DEFAULT_TAG} count={follows.length} active={activeTag === DEFAULT_TAG} onTap={() => setTag(DEFAULT_TAG)} />
        {tags.map(item => (
          <Chip
            key={item.id}
            label={item.tag}
            count={follows.filter(user => user.tag === item.tag).length}
            active={item.tag === activeTag}
            onTap={() => setTag(item.tag)}
          />
        ))}
      </HStack>
    </ScrollView>
  )

  const emptyTitle = liveOnly ? '当前没有正在直播的关注' : '这个标签下还没有关注'

  return (
    <VStack spacing={14} alignment="leading" frame={FULL_FRAME} background={<ScreenBackground />}>
      <PageHeader
        title="关注"
        subtitle={subtitle}
        actions={
          <HStack spacing={8}>
            {refreshing ? (
              <ProgressView progressViewStyle="circular" frame={{ width: 38, height: 38 }} background={palette.card} clipShape="circle" />
            ) : (
              <CircleButton icon="arrow.clockwise" label="刷新" onTap={refreshLiveStates} />
            )}
            <CircleButton icon="line.3.horizontal.decrease" label="只看直播中" active={liveOnly} onTap={() => setLiveOnly(!liveOnly)} />
            <CircleButton icon="tag" label="标签管理" onTap={() => presentSheet(<TagManageScreen />)} />
          </HStack>
        }
      />
      <ScrollView scrollIndicator="hidden" refreshable={refreshLiveStates}>
        <VStack spacing={18} alignment="leading" frame={{ maxWidth: 'infinity', alignment: 'topLeading' }} padding={{ bottom: 24 }}>
          {follows.length > 0 && tagsContent}
          {follows.length === 0 ? (
            <EmptyView icon="heart" title="还没有关注" message="在直播间点「关注」，开播状态会显示在这里" />
          ) : visible.length === 0 ? (
            <EmptyView icon="heart" title={emptyTitle} />
          ) : (
            <VStack spacing={20} alignment="leading">
              {liveUsers.length > 0 && <FollowGroup title="正在直播" users={liveUsers} stateOf={stateOf} tags={tags} />}
              {offlineUsers.length > 0 && <FollowGroup title="未开播" users={offlineUsers} stateOf={stateOf} tags={tags} />}
            </VStack>
          )}
        </VStack>
      </ScrollView>
    </VStack>
  )
}
