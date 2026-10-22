import { Button, HStack, Image, Spacer, Text, VStack } from 'scripting'
import type { VirtualNode } from 'scripting'
import { brandGradient, palette } from '../theme'

type CircleButtonProps = {
  icon: string
  label: string
  onTap: () => void
  /** 选中态（如筛选已开启）用品牌渐变填充 */
  active?: boolean
}

/** 标题栏右侧的圆形图标按钮 */
export const CircleButton = ({ icon, label, onTap, active }: CircleButtonProps) => (
  <Button action={onTap} accessibilityLabel={label} buttonStyle="plain">
    <Image
      systemName={icon}
      font={15}
      foregroundStyle={active ? '#FFFFFF' : palette.textSecondary}
      frame={{ width: 38, height: 38 }}
      background={active ? brandGradient : palette.card}
      clipShape="circle"
    />
  </Button>
)

type PageHeaderProps = {
  title: string
  subtitle?: string
  /** 首页使用品牌渐变大标题，其余页面使用普通标题 */
  brand?: boolean
  actions?: VirtualNode
}

/** 标签页顶部标题区：替代导航栏大标题，与 ScriptFlix 的页面版式一致 */
export const PageHeader = ({ title, subtitle, brand, actions }: PageHeaderProps) => (
  <HStack alignment="center" spacing={10} padding={{ horizontal: 16, top: 6 }}>
    <VStack alignment="leading" spacing={1}>
      <Text font={brand ? 'largeTitle' : 'title'} bold foregroundStyle={brand ? brandGradient : palette.textPrimary}>
        {title}
      </Text>
      {!!subtitle && (
        <Text font="caption" foregroundStyle={palette.textTertiary}>
          {subtitle}
        </Text>
      )}
    </VStack>
    <Spacer />
    {actions}
  </HStack>
)
