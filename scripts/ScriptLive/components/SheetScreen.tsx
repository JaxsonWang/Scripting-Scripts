import { Button, Navigation, NavigationStack, VStack } from 'scripting'
import type { VirtualNode } from 'scripting'
import { useThemeScheme } from '../hooks/useThemeScheme'
import { FULL_FRAME, palette } from '../theme'
import { ScreenBackground } from './ScreenBackground'

type SheetScreenProps = {
  title: string
  trailing?: VirtualNode
  children: VirtualNode | VirtualNode[]
}

/**
 * 以弹出层呈现的页面外壳：自带导航栈、「关闭」按钮与外观设置。
 * 弹出层是独立的视图树，不继承根页面的外观，需要在这里重新指定。
 */
export const SheetScreen = ({ title, trailing, children }: SheetScreenProps) => {
  const dismiss = Navigation.useDismiss()
  const colorScheme = useThemeScheme()
  return (
    <NavigationStack preferredColorScheme={colorScheme} tint={palette.accent}>
      <VStack
        spacing={0}
        frame={FULL_FRAME}
        background={<ScreenBackground />}
        environments={{ colorScheme }}
        navigationTitle={title}
        navigationBarTitleDisplayMode="inline"
        toolbarBackground={palette.bg}
        toolbarColorScheme={colorScheme}
        toolbar={{ cancellationAction: <Button title="关闭" action={() => dismiss()} />, topBarTrailing: trailing }}
      >
        {children}
      </VStack>
    </NavigationStack>
  )
}

/**
 * 以页面弹出层打开，关闭后返回。
 * @param element 页面内容，通常以 SheetScreen 为根
 */
export const presentSheet = async (element: VirtualNode) => {
  try {
    await Navigation.present({ element, modalPresentationStyle: 'pageSheet' })
  } catch (error) {
    console.error('[ScriptLive] 打开页面失败', error)
    await Dialog.alert({ title: '无法打开页面', message: String(error) })
  }
}
