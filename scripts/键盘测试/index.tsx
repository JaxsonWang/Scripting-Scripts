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

const KeyboardLayout = () => (
  <VStack spacing={10} alignment="center">
    {qwertyRows.map((row, idx) => (
      <HStack key={idx} spacing={6} alignment="center">
        {idx === 2 ? <Spacer /> : null}
        {row.map(key => (
          <Button key={key} title={key.toUpperCase()} action={() => tapKey(key)} />
        ))}
        {idx === 2 ? <Spacer /> : null}
      </HStack>
    ))}

    <HStack spacing={8} alignment="center">
      <Button title="Space" action={() => tapKey(' ')} />
      <Button title="Backspace" action={backspace} />
      <Button title="Next" action={CustomKeyboard.nextKeyboard} />
      <Button title="Hide" action={CustomKeyboard.dismiss} />
    </HStack>
  </VStack>
)

const run = async () => {
  await CustomKeyboard.setToolbarVisible(false)
  await CustomKeyboard.requestHeight(260)
  CustomKeyboard.present(<KeyboardLayout />)
}

run()
