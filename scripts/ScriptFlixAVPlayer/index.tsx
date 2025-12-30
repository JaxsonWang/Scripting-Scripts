import { Navigation, Script } from 'scripting'
import { HomeScreen } from './screens/HomeScreen'

const run = async () => {
  await Navigation.present({ element: <HomeScreen />, modalPresentationStyle: 'fullScreen' })
  Script.exit()
}

run()
