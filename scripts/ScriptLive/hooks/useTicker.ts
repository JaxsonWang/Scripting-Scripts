import { useEffect, useState } from 'scripting'

/**
 * 按固定间隔让所在组件重新渲染，用于倒计时、开播时长这类随时间变化的文字。
 * 只在小组件里使用，整个直播间不必跟着定时重绘。
 * @param intervalMs 刷新间隔（毫秒）
 */
export const useTicker = (intervalMs: number) => {
  const [, setTick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setTick(tick => tick + 1), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
}
