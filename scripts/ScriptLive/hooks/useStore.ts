import { useEffect, useState } from 'scripting'
import type { Store } from '../services/store'

/** 订阅仓库，值变化时重新渲染 */
export function useStore<T>(store: Store<T>): T {
  const [value, setValue] = useState<T>(store.get)
  useEffect(() => store.subscribe(next => setValue(() => next)), [store])
  return value
}
