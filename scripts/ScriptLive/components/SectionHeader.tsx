import { HStack, Rectangle, Spacer, Text, VStack } from 'scripting'
import { brandGradient, palette } from '../theme'

type SectionHeaderProps = {
  title: string
  subtitle?: string
  accessory?: string
}

/** 栏目标题：左侧品牌渐变竖条 + 主副标题，右侧可选说明 */
export const SectionHeader = ({ title, subtitle, accessory }: SectionHeaderProps) => (
  <HStack alignment="center" spacing={10} padding={{ horizontal: 16 }}>
    <Rectangle fill={brandGradient} frame={{ width: 4, height: 20 }} clipShape="capsule" />
    <VStack alignment="leading" spacing={1}>
      <Text font="title3" bold foregroundStyle={palette.textPrimary}>
        {title}
      </Text>
      {!!subtitle && (
        <Text font="caption" foregroundStyle={palette.textTertiary}>
          {subtitle}
        </Text>
      )}
    </VStack>
    <Spacer />
    {!!accessory && (
      <Text font="caption" foregroundStyle={palette.textTertiary}>
        {accessory}
      </Text>
    )}
  </HStack>
)
