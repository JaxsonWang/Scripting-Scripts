import { Button, HStack, Image, LazyVStack, Rectangle, ScrollView, Spacer, Text, TextField, VStack, useState } from 'scripting'
import { Chip, SiteBar } from '../components/Chips'
import { Avatar, LiveDot } from '../components/RoomCard'
import { PagedFooter, RoomGrid, roomKey } from '../components/RoomGrid'
import { SheetScreen } from '../components/SheetScreen'
import { EmptyView, LoadingView } from '../components/StateView'
import type { LiveAnchorItem, SiteId } from '../core/types'
import { usePaged } from '../hooks/usePaged'
import type { Paged } from '../hooks/usePaged'
import { useStore } from '../hooks/useStore'
import { settingsStore } from '../services/settings'
import { getSite } from '../services/sites'
import { FULL_FRAME, brandGradient, palette, radius } from '../theme'
import { openRoom } from './open-room'

type Mode = 'room' | 'anchor'

const AnchorList = ({ paged, siteId }: { paged: Paged<LiveAnchorItem>; siteId: SiteId }) => {
  if (paged.loading && !paged.items.length) return <LoadingView />
  if (paged.error && !paged.items.length) {
    return <EmptyView icon="exclamationmark.magnifyingglass" title="搜索失败" message={paged.error} actionTitle="重试" onAction={paged.reload} />
  }
  if (!paged.items.length) return <EmptyView icon="person.crop.circle.badge.questionmark" title="没有找到主播" />

  return (
    <LazyVStack spacing={0} padding={{ horizontal: 16 }}>
      <VStack spacing={0} background={palette.card} clipShape={{ type: 'rect', cornerRadius: radius.lg, style: 'continuous' }}>
        {paged.items.map((anchor, index) => (
          <VStack key={anchor.roomId} spacing={0} padding={{ horizontal: 14 }}>
            {index > 0 && <Rectangle fill={palette.separator} frame={{ maxWidth: 'infinity', height: 0.5 }} padding={{ leading: 56 }} />}
            <Button action={() => openRoom({ siteId, roomId: anchor.roomId })} buttonStyle="plain">
              <HStack spacing={12} padding={{ vertical: 13 }} frame={{ maxWidth: 'infinity', alignment: 'leading' }}>
                <Avatar url={anchor.avatar} size={44} live={anchor.liveStatus} />
                <VStack alignment="leading" spacing={4} frame={{ maxWidth: 'infinity', alignment: 'leading' }}>
                  <Text font="body" bold lineLimit={1} foregroundStyle={palette.textPrimary}>
                    {anchor.userName}
                  </Text>
                  <LiveDot state={anchor.liveStatus ? 2 : 1} />
                </VStack>
                <Spacer />
                <Image systemName="chevron.right" font={13} foregroundStyle={palette.textTertiary} />
              </HStack>
            </Button>
          </VStack>
        ))}
      </VStack>
      <PagedFooter paged={paged} />
    </LazyVStack>
  )
}

/**
 * 搜索：输入关键词后提交，可切换平台与「房间 / 主播」。
 * @param initialSite 从首页进入时默认选中的平台
 */
export const SearchScreen = ({ initialSite }: { initialSite: SiteId }) => {
  const { siteOrder } = useStore(settingsStore)
  const [siteId, setSiteId] = useState<SiteId>(initialSite)
  const [mode, setMode] = useState<Mode>('room')
  const [text, setText] = useState('')
  const [keyword, setKeyword] = useState('')

  const rooms = usePaged(keyword && mode === 'room' ? page => getSite(siteId).searchRooms(keyword, page) : null, roomKey, [siteId, keyword, mode])
  const anchors = usePaged(keyword && mode === 'anchor' ? page => getSite(siteId).searchAnchors(keyword, page) : null, anchor => anchor.roomId, [
    siteId,
    keyword,
    mode
  ])
  const submit = () => setKeyword(text.trim())

  return (
    <SheetScreen title="搜索">
      <VStack spacing={14} alignment="leading" frame={FULL_FRAME}>
        <HStack spacing={10} padding={{ horizontal: 16, top: 10 }}>
          <HStack spacing={8} padding={{ horizontal: 14, vertical: 11 }} frame={{ maxWidth: 'infinity' }} background={palette.card} clipShape="capsule">
            <Image systemName="magnifyingglass" font={15} foregroundStyle={palette.textTertiary} />
            <TextField
              title="搜索直播"
              prompt="房间号、主播或直播标题"
              value={text}
              onChanged={setText}
              submitLabel="search"
              onSubmit={submit}
              foregroundStyle={palette.textPrimary}
            />
          </HStack>
          <Button action={submit} disabled={!text.trim() || rooms.loading || anchors.loading} buttonStyle="plain">
            <Text font="subheadline" bold foregroundStyle="#FFFFFF" padding={{ horizontal: 16, vertical: 11 }} background={brandGradient} clipShape="capsule">
              搜索
            </Text>
          </Button>
        </HStack>
        <SiteBar sites={siteOrder} value={siteId} onChange={setSiteId} />
        <ScrollView axes="horizontal" scrollIndicator="hidden">
          <HStack spacing={8} padding={{ horizontal: 16 }}>
            <Chip label="直播间" icon="play.tv" active={mode === 'room'} onTap={() => setMode('room')} />
            <Chip label="主播" icon="person.fill" active={mode === 'anchor'} onTap={() => setMode('anchor')} />
          </HStack>
        </ScrollView>
        <ScrollView scrollIndicator="hidden" scrollDismissesKeyboard="immediately">
          {!keyword ? (
            <EmptyView icon="magnifyingglass" title="搜索直播" message="输入关键词后点按键盘上的「搜索」或右侧按钮" />
          ) : mode === 'room' ? (
            <RoomGrid paged={rooms} onTap={room => openRoom({ siteId, roomId: room.roomId })} emptyTitle="没有找到直播间" />
          ) : (
            <AnchorList paged={anchors} siteId={siteId} />
          )}
        </ScrollView>
      </VStack>
    </SheetScreen>
  )
}
