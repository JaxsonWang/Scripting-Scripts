import { HStack, Navigation, ScrollView, VStack, useState } from 'scripting'
import { SiteBar } from '../components/Chips'
import { CircleButton, PageHeader } from '../components/PageHeader'
import { LiveHeroCard } from '../components/RoomCard'
import { RoomGrid, roomKey } from '../components/RoomGrid'
import { ScreenBackground } from '../components/ScreenBackground'
import { SectionHeader } from '../components/SectionHeader'
import { presentSheet } from '../components/SheetScreen'
import type { LiveRoomItem, SiteId } from '../core/types'
import { usePaged } from '../hooks/usePaged'
import { useStore } from '../hooks/useStore'
import { settingsStore } from '../services/settings'
import { getSite } from '../services/sites'
import { FULL_FRAME, SITE_STYLE } from '../theme'
import { openRoom } from './open-room'
import { SearchScreen } from './SearchScreen'

/** 头图展示推荐里最热的前几个直播间，其余进入双列网格 */
const HERO_COUNT = 3

/** 首页：品牌标题 + 平台切换 + 热门头图 + 推荐网格 */
export const HomeScreen = () => {
  const dismiss = Navigation.useDismiss()
  const { siteOrder } = useStore(settingsStore)
  const [siteId, setSiteId] = useState<SiteId>(siteOrder[0])
  const paged = usePaged(page => getSite(siteId).getRecommendRooms(page), roomKey, [siteId])
  const style = SITE_STYLE[siteId]
  const open = (room: LiveRoomItem) => openRoom({ siteId, roomId: room.roomId })
  const heroWidth = Math.min(Device.screen.width - 32, 380)
  const heroes = paged.items.slice(0, HERO_COUNT)

  const lead = (
    <VStack spacing={16} alignment="leading">
      <ScrollView axes="horizontal" scrollIndicator="hidden">
        <HStack spacing={12} padding={{ horizontal: 16 }}>
          {heroes.map(room => (
            <LiveHeroCard key={room.roomId} room={room} width={heroWidth} siteName={style.short} onTap={open} />
          ))}
        </HStack>
      </ScrollView>
      <SectionHeader title="正在热播" subtitle={`${style.name} · 推荐`} />
    </VStack>
  )

  return (
    <VStack spacing={14} alignment="leading" frame={FULL_FRAME} background={<ScreenBackground />}>
      <PageHeader
        brand
        title="ScriptLive"
        subtitle="B站 · 斗鱼 · 虎牙 · 抖音 直播聚合"
        actions={
          <HStack spacing={8}>
            <CircleButton icon="magnifyingglass" label="搜索" onTap={() => presentSheet(<SearchScreen initialSite={siteId} />)} />
            <CircleButton icon="xmark" label="退出 ScriptLive" onTap={() => dismiss()} />
          </HStack>
        }
      />
      <SiteBar sites={siteOrder} value={siteId} onChange={setSiteId} />
      <ScrollView scrollIndicator="hidden" refreshable={paged.reload}>
        <RoomGrid paged={paged} onTap={open} lead={lead} skip={heroes.length} />
      </ScrollView>
    </VStack>
  )
}
