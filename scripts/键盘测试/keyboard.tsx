import { Button, HStack, RoundedRectangle, Spacer, Text, VStack, ZStack } from 'scripting'

const qwertyRows: string[][] = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm']
]

const tapKey = async (key: string) => {
  CustomKeyboard.playInputClick()
  await CustomKeyboard.insertText(key)
}

const backspace = async () => {
  CustomKeyboard.playInputClick()
  await CustomKeyboard.deleteBackward()
}

type KeyButtonProps = {
  label: string
  wide?: boolean
  onPress: () => void | Promise<void>
}

const KeyButton = ({ label, onPress, wide }: KeyButtonProps) => (
  <Button action={onPress}>
    <ZStack>
      <RoundedRectangle cornerRadius={8} fill="systemGray5" stroke="systemGray3" />
      <VStack padding={{ horizontal: wide ? 28 : 12, vertical: 10 }}>
        <Text font="title3" fontWeight="semibold">
          {label}
        </Text>
      </VStack>
    </ZStack>
  </Button>
)

const KeyboardLayout = () => (
  <VStack spacing={12} alignment="center">
    <Text font="headline" fontWeight="semibold">
      26 键键盘
    </Text>

    {qwertyRows.map((row, idx) => (
      <HStack key={idx} spacing={6} alignment="center">
        {idx === 1 ? <Spacer /> : null}
        {idx === 2 ? <Spacer /> : null}
        {row.map(key => (
          <KeyButton key={key} label={key.toUpperCase()} onPress={() => tapKey(key)} />
        ))}
        {idx === 1 ? <Spacer /> : null}
        {idx === 2 ? <Spacer /> : null}
      </HStack>
    ))}

    <HStack spacing={10} alignment="center">
      <KeyButton label="🌐" onPress={CustomKeyboard.nextKeyboard} />
      <Spacer />
      <KeyButton label="空格" wide onPress={() => tapKey(' ')} />
      <Spacer />
      <KeyButton label="⌫" onPress={backspace} />
      <KeyButton label="⤓" onPress={CustomKeyboard.dismiss} />
    </HStack>
  </VStack>
)

const run = async () => {
  await CustomKeyboard.setToolbarVisible(false)
  await CustomKeyboard.requestHeight(260)
  CustomKeyboard.present(<KeyboardLayout />)
}

run()
