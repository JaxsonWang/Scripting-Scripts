import { useEffect, useRef } from 'scripting'

type Target = 'landscape' | 'portrait'

/**
 * 直播间的屏幕方向（仅 iPhone 可设置）：进入后允许随设备旋转，离开时恢复用户在 Scripting 中的方向设置。
 * 点按全屏 / 退出全屏会先锁定到目标方向；等设备实际转到该方向后再放开为自动旋转，
 * 这样手机横着拿时点「退出全屏」不会立刻被转回横屏，开着竖排方向锁定时也能用按钮横屏。
 */
export const usePlayerOrientation = () => {
  const hold = useRef<Target | null>(null)

  useEffect(() => {
    if (!Device.isiPhone) return
    Device.supportedInterfaceOrientations = ['allButUpsideDown']
    const timer = setInterval(() => {
      const target = hold.current
      if (target && (target === 'landscape' ? Device.isLandscape : Device.isPortrait)) {
        hold.current = null
        Device.supportedInterfaceOrientations = ['allButUpsideDown']
      }
    }, 1000)
    return () => {
      clearInterval(timer)
      Device.supportedInterfaceOrientations = Device.userConfiguredInterfaceOrientations
    }
  }, [])

  const rotate = (target: Target) => {
    hold.current = target
    Device.supportedInterfaceOrientations = [target]
  }

  return { canRotate: Device.isiPhone, enterLandscape: () => rotate('landscape'), exitLandscape: () => rotate('portrait') }
}
