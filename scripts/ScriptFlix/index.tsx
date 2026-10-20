import { Navigation, Script } from 'scripting'
import { RootScreen } from './screens/RootScreen'

const run = async () => {
  await Navigation.present({ element: <RootScreen />, modalPresentationStyle: 'fullScreen' })
  Script.exit()
}

run()
