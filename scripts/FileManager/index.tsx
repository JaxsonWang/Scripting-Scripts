import { Navigation, Script } from 'scripting'
import { FileListScreen } from './screens/FileListScreen'

/**
 * 入口函数，负责展示主界面并在关闭后退出脚本
 */
const run = async () => {
  await Navigation.present({
    element: <FileListScreen />,
    modalPresentationStyle: 'fullScreen'
  })
  Script.exit()
}

run()
