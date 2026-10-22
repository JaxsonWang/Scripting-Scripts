import type { VirtualNode } from 'scripting'
import { useTicker } from '../hooks/useTicker'

/**
 * 定时刷新的一小块界面：render 每隔 interval 毫秒重新执行一次。
 * @param interval 刷新间隔（毫秒）
 * @param render 生成界面的函数，在这里读取当前时间
 */
export const Ticking = ({ interval, render }: { interval: number; render: () => VirtualNode }) => {
  useTicker(interval)
  return render()
}
