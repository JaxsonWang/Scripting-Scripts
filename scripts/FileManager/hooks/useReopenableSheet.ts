import { useCallback, useRef } from 'scripting'

/**
 * 提供 open/reopen 能力，适合语言切换后重新展示面板
 */
export const useReopenableSheet = () => {
  const openerRef = useRef<() => void>(() => {})

  const register = useCallback((openFn: () => void) => {
    openerRef.current = openFn
  }, [])

  const open = useCallback(() => {
    openerRef.current()
  }, [])

  const reopen = useCallback(() => {
    setTimeout(() => {
      openerRef.current()
    }, 0)
  }, [])

  return { register, open, reopen }
}
