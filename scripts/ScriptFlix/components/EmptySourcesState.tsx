import { Button, Text, VStack } from 'scripting'
import { EmptyView } from './StateView'
import { palette } from '../theme'
import type { EmptySourcesStateProps } from '../types'

export const EmptySourcesState = ({ onOpenSettings, onExit }: EmptySourcesStateProps) => (
  <VStack spacing={16} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
    <EmptyView icon="sparkles.tv" title="开启你的私人影院" message="添加视频源，开始浏览和观看内容" actionTitle="添加视频源" onAction={onOpenSettings} />
    <Button action={onExit}>
      <Text font="subheadline" foregroundStyle={palette.textTertiary}>
        退出 ScriptFlix
      </Text>
    </Button>
  </VStack>
)
