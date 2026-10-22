import { Button, HStack, Image, ScrollView, Text } from 'scripting'
import type { Color } from 'scripting'
import type { SiteId } from '../core/types'
import { SITE_STYLE, brandGradient, palette } from '../theme'
import { SiteLogo } from './SiteLogo'

type ChipProps = {
  label: string
  active: boolean
  onTap: () => void
  count?: number
  icon?: string | JSX.Element
  /** 未选中时系统图标的颜色 */
  iconColor?: Color
}

/**
 * 胶囊筛选项：选中时品牌渐变填充。
 * 文字固定为理想宽度，横向滚动条里不会被压缩成省略号。
 */
export const Chip = ({ label, active, onTap, count, icon, iconColor }: ChipProps) => (
  <Button action={onTap} buttonStyle="plain">
    <HStack spacing={6} padding={{ horizontal: 15, vertical: 9 }} background={active ? brandGradient : palette.card} clipShape="capsule" fixedSize>
      {!!icon &&
        (typeof icon === 'string' ? <Image systemName={icon} font={12} foregroundStyle={active ? '#FFFFFF' : (iconColor ?? palette.textTertiary)} /> : icon)}
      <Text font="subheadline" bold={active} lineLimit={1} foregroundStyle={active ? '#FFFFFF' : palette.textSecondary}>
        {label}
      </Text>
      {count !== undefined && (
        <Text font="caption2" monospacedDigit foregroundStyle={active ? 'rgba(255,255,255,0.85)' : palette.textTertiary}>
          {count}
        </Text>
      )}
    </HStack>
  </Button>
)

/** 平台切换条：选中与未选中时均保留 Logo 原色。 */
export const SiteBar = ({ sites, value, onChange }: { sites: SiteId[]; value: SiteId; onChange: (id: SiteId) => void }) => (
  <ScrollView axes="horizontal" scrollIndicator="hidden">
    <HStack spacing={8} padding={{ horizontal: 16 }}>
      {sites.map(id => (
        <Chip key={id} label={SITE_STYLE[id].short} icon={<SiteLogo siteId={id} size={16} />} active={id === value} onTap={() => onChange(id)} />
      ))}
    </HStack>
  </ScrollView>
)

/** 平台小角标，用于关注、记录等混合列表 */
export const SiteBadge = ({ siteId }: { siteId: SiteId }) => (
  <Text
    font="caption2"
    bold
    lineLimit={1}
    fixedSize
    foregroundStyle="#FFFFFF"
    padding={{ horizontal: 6, vertical: 2 }}
    background={SITE_STYLE[siteId].color}
    clipShape="capsule"
  >
    {SITE_STYLE[siteId].short}
  </Text>
)
