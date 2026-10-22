import { Navigation } from 'scripting'
import type { RoomTarget } from '../types'
import { LiveRoomScreen } from './LiveRoomScreen'

/**
 * 全屏打开直播间；页面关闭时播放器和弹幕随组件卸载一起释放。
 * @param target 平台与房间号
 */
export const openRoom = async (target: RoomTarget) => {
  try {
    await Navigation.present({ element: <LiveRoomScreen siteId={target.siteId} roomId={target.roomId} />, modalPresentationStyle: 'fullScreen' })
  } catch (error) {
    console.error('[ScriptLive] 打开直播间失败', error)
    await Dialog.alert({ title: '无法打开直播间', message: String(error) })
  }
}
