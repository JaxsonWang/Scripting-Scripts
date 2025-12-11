import { Button, Spacer, Text, VStack } from 'scripting'
import type { EmptySourcesStateProps } from '../types'

/**
 * 用于提示用户尚未配置任何视频源，并提供前往设置页面的入口。
 * @param onOpenSettings 打开设置界面的回调
 * @param onExit
 */
export const EmptySourcesState = ({ onOpenSettings, onExit }: EmptySourcesStateProps) => {
  return (
    <VStack alignment="center" spacing={16}>
      <Spacer />
      <Text font={100}>📺</Text>
      <Text font="title" bold foregroundStyle="#e50914">
        欢迎使用 ScriptFlix
      </Text>
      <Text foregroundStyle="gray">您还没有配置任何视频源</Text>
      <Text font="subheadline" foregroundStyle="gray" multilineTextAlignment="center">
        请添加至少一个视频源来开始浏览和观看内容。{'\n'}您可以在设置中添加和管理您的视频源。
      </Text>

      <Spacer />

      <Button title="添加视频源" action={onOpenSettings} />
      <Button title="退出" action={onExit} />
    </VStack>
  )
}
