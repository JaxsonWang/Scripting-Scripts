import { useEffect, useRef, useState } from 'scripting'

export type PlayerOrientation = 'landscape' | 'portrait'

/** 按钮锁定的目标方向；settled 表示按下时手机已经处于该方向 */
type Hold = { target: PlayerOrientation; settled: boolean }

const isLandscapeOrientation = (orientation: Device.Orientation) => orientation === 'landscapeLeft' || orientation === 'landscapeRight'

/** 竖屏或横屏才算一次有效转动，平放、倒置和未知方向不参与判断 */
const isRotation = (orientation: Device.Orientation) => orientation === 'portrait' || isLandscapeOrientation(orientation)

const matches = (orientation: Device.Orientation, target: PlayerOrientation) =>
  target === 'landscape' ? isLandscapeOrientation(orientation) : orientation === 'portrait'

/**
 * 直播间的屏幕方向（仅 iPhone 可设置）。
 * 进入后允许随手机旋转（allButUpsideDown），离开时恢复用户在 Scripting 中的方向设置。
 *
 * 全屏 / 退出全屏按钮把界面锁到目标方向，并通过 locked 立即告诉页面目标布局：
 * 界面只允许这一个方向，必然转过去，页面不用等系统转完、尺寸类变化后再切换布局。
 * 之后由 addOrientationListener 观察手机的物理方向，手机转到目标方向后解除锁定、恢复随手机旋转；
 * 这样横着拿时点「退出全屏」不会马上被转回横屏，开着竖排方向锁定时（系统不再回调方向变化）则一直保持按钮选择的方向。
 */
export const usePlayerOrientation = () => {
  const hold = useRef<Hold | null>(null)
  const [locked, setLocked] = useState<PlayerOrientation | null>(null)

  useEffect(() => {
    if (!Device.isiPhone) return
    const onOrientation = (orientation: Device.Orientation) => {
      const current = hold.current
      if (!current || !isRotation(orientation)) return
      // 已在目标方向时按下按钮：用户下一次转动手机就交还给自动旋转
      if (!current.settled && !matches(orientation, current.target)) return
      hold.current = null
      Device.supportedInterfaceOrientations = ['allButUpsideDown']
      setLocked(null)
    }
    Device.supportedInterfaceOrientations = ['allButUpsideDown']
    Device.addOrientationListener(onOrientation)
    return () => {
      Device.removeOrientationListener(onOrientation)
      hold.current = null
      Device.supportedInterfaceOrientations = Device.userConfiguredInterfaceOrientations
    }
  }, [])

  const rotate = (target: PlayerOrientation) => {
    // 先发出转屏请求，再触发页面渲染，系统转屏动画尽早开始
    Device.supportedInterfaceOrientations = [target]
    hold.current = { target, settled: matches(Device.orientation, target) }
    setLocked(target)
  }

  return {
    canRotate: Device.isiPhone,
    /** 按钮锁定的方向；为 null 时界面随手机旋转，以系统尺寸类为准 */
    locked,
    enterLandscape: () => rotate('landscape'),
    exitLandscape: () => rotate('portrait')
  }
}
