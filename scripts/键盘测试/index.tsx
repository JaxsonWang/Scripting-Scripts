import { Button, Group, List, Navigation, NavigationStack, Script, Section, Text, VStack } from 'scripting'

function Example() {
  const dimiss = Navigation.useDismiss()

  return (
    <NavigationStack>
      <List
        navigationTitle={'Group'}
        navigationBarTitleDisplayMode={'inline'}
        toolbar={{
          cancellationAction: <Button title={'Done'} action={dimiss} />
        }}
      >
        <Section footer={<Text>Apply the headline font to all Text views</Text>}>
          <Group font={'headline'}>
            <Button
              title="Scripting"
              action={() => {
                console.log('Scripting')
              }}
            />
            <Button
              title="TypeScript"
              action={() => {
                console.log('TypeScript')
              }}
            />
            <Button
              title="TSX"
              action={() => {
                console.log('TSX')
              }}
            />
          </Group>
        </Section>
      </List>
    </NavigationStack>
  )
}

async function run() {
  await Navigation.present({
    element: <Example />
  })

  Script.exit()
}

run()
