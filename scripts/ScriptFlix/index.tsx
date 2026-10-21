import { Navigation, Script } from 'scripting'
import { RootScreen } from './screens/RootScreen'
import type { LaunchTarget } from './types'

/** 读取小组件通过 run_single URL 传入的作品；URL 参数均为字符串 */
const readLaunchTarget = (): LaunchTarget | null => {
  const { vodId, sourceUrl, sourceName } = Script.queryParameters ?? {}
  const id = Number(vodId)
  if (!Number.isInteger(id) || id <= 0 || typeof sourceUrl !== 'string' || !/^https?:\/\//.test(sourceUrl)) {
    return null
  }
  return { id, sourceUrl, sourceName: typeof sourceName === 'string' && sourceName ? sourceName : undefined }
}

const run = async () => {
  await Navigation.present({ element: <RootScreen launch={readLaunchTarget()} />, modalPresentationStyle: 'fullScreen' })
  Script.exit()
}

run()
