import { Button, HStack, RoundedRectangle, Text } from 'scripting'
import type { FilterChipProps } from '../types'

export const FilterChip = ({ label, active, onTap, count }: FilterChipProps) => {
  return (
    <Button action={onTap}>
      <HStack
        spacing={6}
        padding={{ horizontal: 16, vertical: 8 }}
        background={<RoundedRectangle cornerRadius={16} style="continuous" fill={active ? '#e50914' : '#1c1c1e'} />}
      >
        <Text font="subheadline" foregroundStyle="white">
          {label}
        </Text>
        {count !== undefined && (
          <Text font="caption2" foregroundStyle={active ? 'white' : '#a0a0a0'}>
            {count}
          </Text>
        )}
      </HStack>
    </Button>
  )
}
