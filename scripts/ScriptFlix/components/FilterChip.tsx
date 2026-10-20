import { Button, HStack, Text } from 'scripting'
import { brandGradient, palette } from '../theme'
import type { FilterChipProps } from '../types'

export const FilterChip = ({ label, active, onTap, count }: FilterChipProps) => (
  <Button action={onTap} buttonStyle="plain">
    <HStack spacing={6} padding={{ horizontal: 16, vertical: 9 }} background={active ? brandGradient : palette.card} clipShape="capsule">
      <Text font="subheadline" bold={active} foregroundStyle={active ? '#FFFFFF' : palette.textSecondary}>
        {label}
      </Text>
      {count !== undefined && (
        <Text font="caption2" foregroundStyle={active ? '#FFFFFF' : palette.textTertiary}>
          {count}
        </Text>
      )}
    </HStack>
  </Button>
)
