import { Button, Capsule, HStack, Image, RoundedRectangle, Text, VStack } from 'scripting'
import { brandGradient, palette, paletteFor } from '../theme'
import type { ThemeMode } from '../services/appearance'

const TILE = { width: 84, height: 58 }

const OPTIONS: { mode: ThemeMode; title: string }[] = [
  { mode: 'auto', title: '自动' },
  { mode: 'light', title: '日间' },
  { mode: 'dark', title: '夜间' }
]

/** 迷你界面缩略图：品牌标题条 + 文字行 + 三张海报 */
const MiniScreen = ({ scheme }: { scheme: 'light' | 'dark' }) => {
  const colors = paletteFor(scheme)
  return (
    <VStack alignment="leading" spacing={4} padding={8} frame={{ width: TILE.width, height: TILE.height, alignment: 'topLeading' }} background={colors.bg}>
      <Capsule fill={brandGradient} frame={{ width: 24, height: 5 }} />
      <Capsule fill={colors.textTertiary} frame={{ width: 34, height: 3 }} />
      <HStack spacing={4} padding={{ top: 2 }}>
        <RoundedRectangle cornerRadius={3} fill={brandGradient} frame={{ width: 14, height: 20 }} />
        <RoundedRectangle cornerRadius={3} fill={colors.cardHi} frame={{ width: 14, height: 20 }} />
        <RoundedRectangle cornerRadius={3} fill={colors.cardHi} frame={{ width: 14, height: 20 }} />
      </HStack>
    </VStack>
  )
}

/** 自动模式：左半日间、右半夜间 */
const Preview = ({ mode }: { mode: ThemeMode }) => {
  if (mode !== 'auto') {
    return <MiniScreen scheme={mode} />
  }
  const half = { width: TILE.width / 2, height: TILE.height }
  return (
    <HStack spacing={0}>
      <VStack frame={{ ...half, alignment: 'leading' }} clipped>
        <MiniScreen scheme="light" />
      </VStack>
      <VStack frame={{ ...half, alignment: 'trailing' }} clipped>
        <MiniScreen scheme="dark" />
      </VStack>
    </HStack>
  )
}

type AppearancePickerProps = {
  mode: ThemeMode
  onChange: (mode: ThemeMode) => void
}

/** 外观选择：三张预览卡等分一行，选中项描品牌渐变边 */
export const AppearancePicker = ({ mode, onChange }: AppearancePickerProps) => (
  <HStack spacing={0} padding={{ vertical: 8 }}>
    {OPTIONS.map(option => {
      const active = option.mode === mode
      return (
        <Button key={option.mode} buttonStyle="plain" action={() => onChange(option.mode)} accessibilityLabel={`${option.title}模式`}>
          <VStack spacing={8} frame={{ maxWidth: 'infinity' }} contentShape="rect">
            <VStack
              clipShape={{ type: 'rect', cornerRadius: 12, style: 'continuous' }}
              overlay={
                <RoundedRectangle
                  cornerRadius={12}
                  style="continuous"
                  stroke={
                    active ? { shapeStyle: brandGradient, strokeStyle: { lineWidth: 2.5 } } : { shapeStyle: palette.fillMuted, strokeStyle: { lineWidth: 1 } }
                  }
                />
              }
            >
              <Preview mode={option.mode} />
            </VStack>
            <HStack spacing={4}>
              <Image systemName={active ? 'checkmark.circle.fill' : 'circle'} font={13} foregroundStyle={active ? brandGradient : palette.textTertiary} />
              <Text font="subheadline" bold={active} foregroundStyle={active ? palette.textPrimary : palette.textSecondary}>
                {option.title}
              </Text>
            </HStack>
          </VStack>
        </Button>
      )
    })}
  </HStack>
)
