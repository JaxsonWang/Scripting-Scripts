import { Button, HStack, Image, LazyVGrid, Rectangle, ScrollView, Text, VStack, useEffect, useState } from 'scripting'
import type { GridItem } from 'scripting'
import { Chip, SiteBar } from '../components/Chips'
import { PageHeader } from '../components/PageHeader'
import { RoomGrid, roomKey } from '../components/RoomGrid'
import { ScreenBackground } from '../components/ScreenBackground'
import { SheetScreen, presentSheet } from '../components/SheetScreen'
import { SiteLogo } from '../components/SiteLogo'
import { EmptyView, LoadingView } from '../components/StateView'
import type { LiveCategory, LiveSubCategory, SiteId } from '../core/types'
import { usePaged } from '../hooks/usePaged'
import { useStore } from '../hooks/useStore'
import { settingsStore } from '../services/settings'
import { getSite } from '../services/sites'
import { FULL_FRAME, SITE_STYLE, palette, radius } from '../theme'
import { errorMessage } from '../utils/format'
import { openRoom } from './open-room'

const COLUMNS: GridItem[] = Array.from({ length: 4 }, () => ({ size: { type: 'flexible' }, spacing: 10 }))

/** 某个子分类下的直播间列表，以弹出页承载分页与下拉刷新。 */
const CategoryRoomsSheet = ({ siteId, category }: { siteId: SiteId; category: LiveSubCategory }) => {
  const paged = usePaged(page => getSite(siteId).getCategoryRooms(category, page), roomKey, [siteId, category.id])
  return (
    <SheetScreen title={category.name}>
      <ScrollView scrollIndicator="hidden" refreshable={paged.reload}>
        <RoomGrid paged={paged} onTap={room => openRoom({ siteId, roomId: room.roomId })} emptyTitle="这个分类下暂时没有直播" />
      </ScrollView>
    </SheetScreen>
  )
}

/** 子分类图块：优先展示封面，没有封面时用平台图标做识别。 */
const SubCategoryTile = ({ siteId, category }: { siteId: SiteId; category: LiveSubCategory }) => (
  <Button action={() => presentSheet(<CategoryRoomsSheet siteId={siteId} category={category} />)} buttonStyle="plain">
    <VStack
      spacing={8}
      padding={{ horizontal: 6, vertical: 12 }}
      frame={{ maxWidth: 'infinity' }}
      background={palette.card}
      clipShape={{ type: 'rect', cornerRadius: radius.md, style: 'continuous' }}
    >
      <Rectangle
        fill={palette.cardHi}
        frame={{ width: 54, height: 54 }}
        overlay={
          category.pic ? (
            <Image imageUrl={category.pic} resizable scaleToFill placeholder={<Rectangle fill={palette.cardHi} />} />
          ) : (
            <SiteLogo siteId={siteId} size={30} />
          )
        }
        clipShape={{ type: 'rect', cornerRadius: radius.sm, style: 'continuous' }}
      />
      <Text
        font="caption"
        bold
        minScaleFactor={0.72}
        multilineTextAlignment="center"
        foregroundStyle={palette.textPrimary}
        frame={{ maxWidth: 'infinity', minHeight: 34, alignment: 'center' }}
      >
        {category.name}
      </Text>
    </VStack>
  </Button>
)

/** 分类：平台 → 一级分类 → 子分类图块 → 直播间列表。 */
export const CategoryScreen = () => {
  const { siteOrder } = useStore(settingsStore)
  const [siteId, setSiteId] = useState<SiteId>(siteOrder[0])
  const [categories, setCategories] = useState<LiveCategory[]>([])
  const [parentId, setParentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setCategories([])
    getSite(siteId)
      .getCategories()
      .then(list => {
        if (cancelled) return
        setCategories(list)
        setParentId(list[0]?.id ?? '')
      })
      .catch(failure => {
        if (cancelled) return
        console.error('[ScriptLive] 加载分类失败', failure)
        setError(errorMessage(failure))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [siteId, reloadKey])

  const parent = categories.find(item => item.id === parentId) ?? categories[0]

  return (
    <VStack spacing={14} alignment="leading" frame={FULL_FRAME} background={<ScreenBackground />}>
      <PageHeader title="分类" subtitle={SITE_STYLE[siteId].name} />
      <SiteBar sites={siteOrder} value={siteId} onChange={setSiteId} />
      {loading ? (
        <LoadingView />
      ) : error ? (
        <EmptyView icon="wifi.exclamationmark" title="分类加载失败" message={error} actionTitle="重试" onAction={() => setReloadKey(key => key + 1)} />
      ) : !parent ? (
        <EmptyView title="该平台没有分类" />
      ) : (
        <VStack spacing={10} alignment="leading" frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
          <ScrollView axes="horizontal" scrollIndicator="hidden">
            <HStack spacing={8} padding={{ horizontal: 16 }}>
              {categories.map(item => (
                <Chip key={item.id} label={item.name} active={item.id === parent.id} onTap={() => setParentId(item.id)} />
              ))}
            </HStack>
          </ScrollView>
          <ScrollView scrollIndicator="hidden" frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
            {parent.children.length ? (
              <LazyVGrid columns={COLUMNS} spacing={10} padding={{ horizontal: 16, vertical: 4 }}>
                {parent.children.map(child => (
                  <SubCategoryTile key={`${parent.id}-${child.id}`} siteId={siteId} category={child} />
                ))}
              </LazyVGrid>
            ) : (
              <EmptyView title="该分类暂无子分类" />
            )}
          </ScrollView>
        </VStack>
      )}
    </VStack>
  )
}
