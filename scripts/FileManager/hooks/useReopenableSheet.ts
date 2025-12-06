import { useCallback, useRef } from 'scripting'

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
