import { VStack, Widget } from 'scripting'

const App = () => {
  return <VStack frame={Widget.displaySize} background={'white'} />
}

Widget.present(<App />)
