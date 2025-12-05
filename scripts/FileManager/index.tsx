import { Navigation, Script } from 'scripting'
import { FileListScreen } from './screens/FileListScreen'

const run = async () => {
  await Navigation.present({
    element: <FileListScreen />,
    modalPresentationStyle: 'fullScreen'
  })
  Script.exit()
}

run()
