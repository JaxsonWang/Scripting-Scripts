import { Navigation } from 'scripting'
import { FileListScreen } from './screens/FileListScreen'

Navigation.present({
  element: <FileListScreen />,
  modalPresentationStyle: 'fullScreen'
})
