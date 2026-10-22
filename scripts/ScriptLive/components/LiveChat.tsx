import { Button, HStack, Image, LazyVStack, ScrollView, ScrollViewReader, Spacer, Text, VStack, useEffect, useRef } from 'scripting'
import type { Color, ScrollViewProxy } from 'scripting'
import type { LiveSuperChatMessage } from '../core/types'
import { palette, radius } from '../theme'
import { Avatar } from './RoomCard'
import { EmptyView } from './StateView'

export type ChatLine = { id: number; kind: 'chat'; userName: string; message: string; color: string } | { id: number; kind: 'system'; message: string }

/** 用户名使用品牌强调色，和消息正文保持清晰层级 */
const NAME_COLOR = '#FF5A76'

type ChatListProps = {
  lines: ChatLine[]
  fontSize: number
  /** 弹幕连接断开时显示的原因；为 null 表示连接正常或正在连接 */
  closedReason: string | null
  onReconnect: () => void
}

/** 聊天区：新消息到达时滚动到底部（key 即 SwiftUI 的 id）；连接断开时在底部给出重连按钮 */
export const ChatList = ({ lines, fontSize, closedReason, onReconnect }: ChatListProps) => {
  const proxyRef = useRef<ScrollViewProxy | null>(null)
  const lastId = lines[lines.length - 1]?.id

  useEffect(() => {
    if (lastId !== undefined) proxyRef.current?.scrollTo(lastId, 'bottom')
  }, [lastId])

  return (
    <ScrollViewReader>
      {proxy => {
        proxyRef.current = proxy
        return (
          <ScrollView scrollIndicator="hidden">
            <LazyVStack alignment="leading" spacing={8} padding={{ horizontal: 14, vertical: 10 }}>
              {lines.map(line =>
                line.kind === 'system' ? (
                  <Text key={line.id} font={fontSize - 2} foregroundStyle={palette.textTertiary} lineSpacing={3}>
                    {line.message}
                  </Text>
                ) : (
                  <Text
                    key={line.id}
                    font={fontSize}
                    foregroundStyle={palette.textPrimary}
                    lineSpacing={3}
                    styledText={{ content: [{ content: `${line.userName}：`, foregroundColor: NAME_COLOR, bold: true }, line.message] }}
                  />
                )
              )}
              {closedReason !== null && (
                <HStack spacing={8} padding={{ top: 4 }}>
                  <Text font="footnote" foregroundStyle={palette.warning} lineLimit={2}>
                    {`弹幕已断开：${closedReason}`}
                  </Text>
                  <Button title="重新连接" action={onReconnect} buttonStyle="bordered" controlSize="small" />
                </HStack>
              )}
            </LazyVStack>
          </ScrollView>
        )
      }}
    </ScrollViewReader>
  )
}

const remainingSeconds = (item: LiveSuperChatMessage) => Math.max(0, Math.round((item.endTime - Date.now()) / 1000))

/** 醒目留言：按平台下发的配色绘制卡片，到期后由页面移除 */
export const SuperChatList = ({ items, error }: { items: LiveSuperChatMessage[]; error: string | null }) => {
  if (!items.length) {
    return <EmptyView icon="dollarsign.bubble" title={error ? 'SC 读取失败' : '暂无醒目留言'} message={error ?? undefined} />
  }
  return (
    <ScrollView scrollIndicator="hidden">
      <LazyVStack spacing={10} padding={14}>
        {items.map(item => (
          <VStack
            key={item.id}
            spacing={0}
            border={{ style: palette.gold, width: 1 }}
            clipShape={{ type: 'rect', cornerRadius: radius.lg, style: 'continuous' }}
          >
            <HStack spacing={10} padding={10} background={(item.backgroundColor || '#EDF5FF') as Color}>
              <Avatar url={item.face} size={34} />
              <Image systemName="dollarsign.circle.fill" font={14} foregroundStyle={palette.gold} />
              <VStack alignment="leading" spacing={2}>
                <Text font="subheadline" bold lineLimit={1} foregroundStyle="#1A1716">
                  {item.userName}
                </Text>
                <Text font="caption" foregroundStyle="rgba(26,23,22,0.7)">{`￥${item.price}`}</Text>
              </VStack>
              <Spacer />
              <Text font="caption2" monospacedDigit foregroundStyle="rgba(26,23,22,0.6)">{`${remainingSeconds(item)}s`}</Text>
            </HStack>
            <Text
              font="subheadline"
              foregroundStyle="#FFFFFF"
              padding={10}
              frame={{ maxWidth: 'infinity', alignment: 'leading' }}
              background={(item.backgroundBottomColor || '#2A60B2') as Color}
            >
              {item.message}
            </Text>
          </VStack>
        ))}
      </LazyVStack>
    </ScrollView>
  )
}
