import { Button, HStack, List, Navigation, Rectangle, Section, Text, TextField, VStack, useState } from 'scripting'
import { ScreenBackground } from '../components/ScreenBackground'
import { useStore } from '../hooks/useStore'
import { accountStore, setDouyinCookie } from '../services/accounts'
import { brandGradient, palette, radius } from '../theme'

/** 抖音 Cookie 设置页；搜索需要登录 Cookie，弹幕与播放仍可使用默认 ttwid。 */
export const DouyinCookieScreen = () => {
  const dismiss = Navigation.useDismiss()
  const account = useStore(accountStore)
  const [cookie, setCookie] = useState(account.douyinCookie)

  // 保存后返回「我的」，行尾会显示「已设置」
  const save = () => {
    setDouyinCookie(cookie)
    dismiss()
  }

  const clear = async () => {
    const confirmed = await Dialog.confirm({
      title: '清除抖音 Cookie',
      message: '清除后，抖音搜索将回到未登录状态。确定继续吗？',
      confirmLabel: '清除',
      cancelLabel: '取消'
    })
    if (confirmed) {
      setCookie('')
      setDouyinCookie('')
    }
  }

  return (
    <List
      foregroundStyle={palette.textPrimary}
      background={<ScreenBackground />}
      scrollContentBackground="hidden"
      navigationTitle="抖音 Cookie"
      navigationBarTitleDisplayMode="inline"
    >
      <Section
        header={<Text>抖音 Cookie</Text>}
        listRowBackground={<Rectangle fill={palette.card} />}
        footer={<Text font="footnote">抖音搜索需要登录 Cookie；直播弹幕与播放默认使用 ttwid，不填写也可以使用。</Text>}
      >
        <VStack
          alignment="leading"
          spacing={8}
          padding={14}
          background={palette.cardHi}
          clipShape={{ type: 'rect', cornerRadius: radius.md, style: 'continuous' }}
        >
          <TextField axis="vertical" value={cookie} onChanged={setCookie} prompt="粘贴抖音网页中的完整 Cookie" title="Cookie" />
        </VStack>
      </Section>
      <Section header={<Text>操作</Text>} listRowBackground={<Rectangle fill={palette.card} />}>
        <Button buttonStyle="plain" action={save}>
          <HStack alignment="center" spacing={7} padding={{ horizontal: 16, vertical: 10 }} background={brandGradient} clipShape="capsule" fixedSize>
            <Text font="subheadline" bold foregroundStyle="#FFFFFF">
              保存 Cookie
            </Text>
          </HStack>
        </Button>
        <Button title="清除 Cookie" role="destructive" disabled={!cookie} action={() => void clear()} />
      </Section>
    </List>
  )
}
