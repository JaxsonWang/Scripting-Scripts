import { Button, Image, ProgressView, Text, VStack } from 'scripting'
import { brandGradient, palette } from '../theme'

export const LoadingView = ({ label = '加载中…' }: { label?: string }) => (
  <VStack padding={48} spacing={12} alignment="center" frame={{ maxWidth: 'infinity' }}>
    <ProgressView progressViewStyle="circular" />
    <Text font="footnote" foregroundStyle={palette.textTertiary}>
      {label}
    </Text>
  </VStack>
)

type EmptyViewProps = {
  icon?: string
  title: string
  message?: string
  actionTitle?: string
  onAction?: () => void
}

/** 空状态与错误态：图标、说明，以及可选的下一步操作 */
export const EmptyView = ({ icon = 'sparkles.tv', title, message, actionTitle, onAction }: EmptyViewProps) => (
  <VStack padding={40} spacing={12} alignment="center" frame={{ maxWidth: 'infinity' }}>
    <Image systemName={icon} font={38} foregroundStyle={palette.textTertiary} />
    <Text font="headline" foregroundStyle={palette.textSecondary} multilineTextAlignment="center">
      {title}
    </Text>
    {!!message && (
      <Text font="footnote" foregroundStyle={palette.textTertiary} multilineTextAlignment="center">
        {message}
      </Text>
    )}
    {!!actionTitle && !!onAction && (
      <Button action={onAction} buttonStyle="plain">
        <Text font="subheadline" bold foregroundStyle="#FFFFFF" padding={{ horizontal: 20, vertical: 10 }} background={brandGradient} clipShape="capsule">
          {actionTitle}
        </Text>
      </Button>
    )}
  </VStack>
)
