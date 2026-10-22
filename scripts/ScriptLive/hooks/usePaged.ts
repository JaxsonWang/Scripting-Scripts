import { useEffect, useRef, useState } from 'scripting'
import type { PagedResult } from '../core/types'
import { errorMessage } from '../utils/format'

export type Paged<T> = {
  items: T[]
  /** 首页加载中 */
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  error: string | null
  reload: () => Promise<void>
  loadMore: () => Promise<void>
}

/**
 * 分页列表：依赖变化时从第 1 页重新加载，滚动到底部时追加下一页并按 key 去重。
 * 切换平台或关键词后，旧请求的结果直接丢弃。
 * @param load 读取某一页；为 null 时不加载（如关键词为空）
 * @param keyOf 去重用的唯一键
 * @param deps 触发重新加载的依赖
 */
export function usePaged<T>(load: ((page: number) => Promise<PagedResult<T>>) | null, keyOf: (item: T) => string, deps: unknown[]): Paged<T> {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadRef = useRef(load)
  loadRef.current = load
  const tokenRef = useRef(0)
  const pageRef = useRef(1)
  const busyRef = useRef(false)
  const hasMoreRef = useRef(false)

  const fetchPage = async (page: number, append: boolean) => {
    const loader = loadRef.current
    const token = ++tokenRef.current
    if (!loader) {
      busyRef.current = false
      setLoading(false)
      setLoadingMore(false)
      return
    }
    busyRef.current = true
    if (append) setLoadingMore(true)
    else setLoading(true)
    setError(null)
    try {
      const result = await loader(page)
      if (token !== tokenRef.current) return
      pageRef.current = page
      hasMoreRef.current = result.hasMore && result.items.length > 0
      setHasMore(hasMoreRef.current)
      setItems(previous => {
        const base = append ? previous : []
        const seen = new Set(base.map(keyOf))
        const fresh = result.items.filter(item => {
          const key = keyOf(item)
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        return [...base, ...fresh]
      })
    } catch (failure) {
      if (token !== tokenRef.current) return
      console.error('[ScriptLive] 加载列表失败', failure)
      setError(errorMessage(failure))
    } finally {
      if (token === tokenRef.current) {
        busyRef.current = false
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }

  const reload = () => fetchPage(1, false)

  const loadMore = async () => {
    if (busyRef.current || !hasMoreRef.current) return
    await fetchPage(pageRef.current + 1, true)
  }

  useEffect(() => {
    setItems([])
    hasMoreRef.current = false
    setHasMore(false)
    reload()
  }, deps)

  return { items, loading, loadingMore, hasMore, error, reload, loadMore }
}
