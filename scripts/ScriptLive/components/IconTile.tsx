import { HStack, Image, Spacer, Text } from 'scripting'
import type { Color, VirtualNode } from 'scripting'
import { palette } from '../theme'

/** 设置项左侧的圆角色块图标 */
export const IconTile = ({ icon, color, size = 30 }: { icon: string; color: Color; size?: number }) => (
  <Image
    systemName={icon}
    font={size * 0.5}
    foregroundStyle="#FFFFFF"
    frame={{ width: size, height: size }}
    background={color}
    clipShape={{ type: 'rect', cornerRadius: size * 0.26, style: 'continuous' }}
  />
)

type SettingRowProps = {
  icon: string | JSX.Element
  color: Color
  title: string
  /** 右侧显示的当前值 */
  value?: string
  /** 右侧附加内容，如进度圈或外跳箭头 */
  trailing?: VirtualNode
  destructive?: boolean
}

/**
 * 列表行：图标 + 标题 + 右侧当前值。
 * 放在 NavigationLink 里时系统自动补右侧箭头；作为按钮使用时整行可点。
 */
export const SettingRow = ({ icon, color, title, value, trailing, destructive }: SettingRowProps) => (
  <HStack spacing={12} padding={{ vertical: 2 }} contentShape="rect">
    {typeof icon === 'string' ? <IconTile icon={icon} color={color} /> : icon}
    <Text foregroundStyle={destructive ? palette.accent : palette.textPrimary}>{title}</Text>
    <Spacer />
    {!!value && (
      <Text font="subheadline" lineLimit={1} foregroundStyle={palette.textTertiary}>
        {value}
      </Text>
    )}
    {trailing}
  </HStack>
)
