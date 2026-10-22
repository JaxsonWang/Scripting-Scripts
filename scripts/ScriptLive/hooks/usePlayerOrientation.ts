import { useEffect, useRef } from 'scripting'

type Target = 'landscape' | 'portrait'

/** 按钮请求的目标方向；settled 表示按下时手机已经处于该方向 */
type Hold = { target: Target; settled: boolean }

const isLandscapeOrientation = (orientation: Device.Orientation) => orientation === 'landscapeLeft' || orientation === 'landscapeRight'

/** 竖屏或横屏才算一次有效转动，平放、倒置和未知方向不参与判断 */
const isRotation = (orientation: Device.Orientation) => orientation === 'portrait' || isLandscapeOrientation(orientation)

const matches = (orientation: Device.Orientation, target: Target) => (target === 'landscape' ? isLandscapeOrientation(orientation) : orientation === 'portrait')

/**
 * 直播间的屏幕方向（仅 iPhone 可设置）。
 * 进入后允许随手机旋转（allButUpsideDown），离开时恢复用户在 Scripting 中的方向设置。
 * 全屏 / 退出全屏按钮先把界面锁到目标方向；之后由 addOrientationListener 观察手机的物理方向：
 * 手机转到目标方向后放开为自动旋转，这样横着拿时点「退出全屏」不会马上被转回横屏，
 * 开着竖排方向锁定时（系统不再回调方向变化）则一直保持按钮选择的方向。
 */
export const usePlayerOrientation = () => {
  const hold = useRef<Hold | null>(null)

  useEffect(() => {
    if (!Device.isiPhone) return
    const release = () => {
      hold.current = null
      Device.supportedInterfaceOrientations = ['allButUpsideDown']
    }
    const onOrientation = (orientation: Device.Orientation) => {
      const current = hold.current
      if (!current || !isRotation(orientation)) return
      // 已在目标方向时按下按钮：用户下一次转动手机就交还给自动旋转
      if (current.settled || matches(orientation, current.target)) release()
    }
    Device.supportedInterfaceOrientations = ['allButUpsideDown']
    Device.addOrientationListener(onOrientation)
    return () => {
      Device.removeOrientationListener(onOrientation)
      hold.current = null
      Device.supportedInterfaceOrientations = Device.userConfiguredInterfaceOrientations
    }
  }, [])

  const rotate = (target: Target) => {
    hold.current = { target, settled: matches(Device.orientation, target) }
    Device.supportedInterfaceOrientations = [target]
  }

  return { canRotate: Device.isiPhone, enterLandscape: () => rotate('landscape'), exitLandscape: () => rotate('portrait') }
}
