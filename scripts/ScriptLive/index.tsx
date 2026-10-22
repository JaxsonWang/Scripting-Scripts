import { Navigation, Script } from 'scripting'
import { RootScreen } from './screens/RootScreen'
import { isSiteId } from './services/sites'
import type { RoomTarget } from './types'

/** 读取小组件通过 run_single 链接传入的直播间；URL 参数均为字符串 */
const readLaunchTarget = (): RoomTarget | null => {
  const { siteId, roomId } = Script.queryParameters ?? {}
  return isSiteId(siteId) && typeof roomId === 'string' && roomId ? { siteId, roomId } : null
}

const run = async () => {
  await Navigation.present({ element: <RootScreen launch={readLaunchTarget()} />, modalPresentationStyle: 'fullScreen' })
  Script.exit()
}

run()
