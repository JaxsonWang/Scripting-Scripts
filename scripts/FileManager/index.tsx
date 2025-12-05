import { Navigation } from 'scripting'
import { FileListScreen } from './screens/FileListScreen'

await Navigation.present({
  element: <FileListScreen />,
  modalPresentationStyle: 'fullScreen'
})
