import { Button, HStack, Image, RoundedRectangle, Spacer, Text, VStack, ZStack, useState } from 'scripting'

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
  label?: string
  systemImage?: string
  isAction?: boolean
  isWide?: boolean
  onPress: () => void | Promise<void>
}

const KeyButton = ({ label, systemImage, isAction, isWide, onPress }: KeyButtonProps) => (
  <Button action={onPress}>
    <ZStack>
      <RoundedRectangle cornerRadius={5} fill={isAction ? 'tertiarySystemFill' : 'systemBackground'} shadow={{ radius: 1, y: 1, color: 'gray' }} />
      <VStack
        frame={{ height: 42, width: isWide ? 180 : undefined }}
        padding={{ horizontal: isWide ? 0 : (label?.length ?? 0) > 1 ? 10 : 4 }} // Adjust padding for wider labels or icons
        alignment="center"
      >
        <Spacer />
        {systemImage ? (
          <Image systemName={systemImage} font="title3" foregroundStyle="label" />
        ) : (
          <Text font="title2" fontWeight="regular" foregroundStyle="label">
            {label ?? ''}
          </Text>
        )}
        <Spacer />
      </VStack>
    </ZStack>
  </Button>
)

const KeyboardLayout = () => {
  const [isUppercased, setIsUppercased] = useState(false)

  const handleKeyTap = (key: string) => {
    const text = isUppercased ? key.toUpperCase() : key
    tapKey(text)
    if (isUppercased) setIsUppercased(false)
  }

  return (
    <VStack spacing={12} padding={{ top: 10, bottom: 40, horizontal: 4 }} alignment="center">
      {/* Row 1: QWERTY */}
      <HStack spacing={6} alignment="center">
        {qwertyRows[0].map(key => (
          <KeyButton key={key} label={isUppercased ? key.toUpperCase() : key} onPress={() => handleKeyTap(key)} />
        ))}
      </HStack>

      {/* Row 2: ASDFG */}
      <HStack spacing={6} alignment="center">
        <Spacer />
        {qwertyRows[1].map(key => (
          <KeyButton key={key} label={isUppercased ? key.toUpperCase() : key} onPress={() => handleKeyTap(key)} />
        ))}
        <Spacer />
      </HStack>

      {/* Row 3: Shift + ZXCV + Backspace */}
      <HStack spacing={6} alignment="center">
        <KeyButton systemImage={isUppercased ? 'arrow.up.square.fill' : 'arrow.up'} isAction onPress={() => setIsUppercased(!isUppercased)} />
        <Spacer />
        {qwertyRows[2].map(key => (
          <KeyButton key={key} label={isUppercased ? key.toUpperCase() : key} onPress={() => handleKeyTap(key)} />
        ))}
        <Spacer />
        <KeyButton systemImage="delete.left" isAction onPress={backspace} />
      </HStack>

      {/* Row 4: 123 + Space + Dismiss */}
      <HStack spacing={6} alignment="center">
        <KeyButton
          label="123"
          isAction
          onPress={() => {
            /* Toggle numbers view logic could go here */
          }}
        />
        <KeyButton label="空格" isWide onPress={() => tapKey(' ')} />
        <KeyButton systemImage="keyboard.chevron.compact.down" isAction onPress={CustomKeyboard.dismiss} />
      </HStack>
    </VStack>
  )
}

const run = async () => {
  await CustomKeyboard.setToolbarVisible(false)
  await CustomKeyboard.requestHeight(280) // Slightly increased height for comfortable layout
  CustomKeyboard.present(<KeyboardLayout />)
}

run()
