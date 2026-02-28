import { Navigation, Script } from 'scripting'
import { FileManageApp } from './screens/FileManageApp'

const run = async () => {
  await Navigation.present({
    element: <FileManageApp />,
    modalPresentationStyle: 'fullScreen'
  })
  Script.exit()
}

void run()
