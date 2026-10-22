/**
 * 基于 Storage 的持久化小仓库：读写同一个键，并通知已打开的页面刷新。
 * 用 function 声明泛型，避免 Scripting 把 `<T>(…) =>` 当成 JSX。
 */

export type Store<T> = {
  get(): T
  set(value: T): void
  update(updater: (value: T) => T): void
  subscribe(listener: (value: T) => void): () => void
}

const KEY_PREFIX = 'script_live_'

export function createStore<T>(key: string, fallback: T, normalize?: (stored: T) => T): Store<T> {
  const storageKey = `${KEY_PREFIX}${key}`
  const listeners = new Set<(value: T) => void>()
  let cache: T | undefined

  const get = (): T => {
    if (cache === undefined) {
      const stored = Storage.get<T>(storageKey)
      cache = stored === null || stored === undefined ? fallback : normalize ? normalize(stored) : stored
    }
    return cache
  }

  const set = (value: T) => {
    cache = value
    if (!Storage.set(storageKey, value)) console.error(`[ScriptLive] 保存 ${storageKey} 失败`)
    listeners.forEach(listener => listener(value))
  }

  return {
    get,
    set,
    update: updater => set(updater(get())),
    subscribe: listener => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }
  }
}

/** 内存中的可订阅值，用于不需要持久化的共享状态（如关注的直播状态） */
export function createSignal<T>(initial: T): Store<T> {
  let value = initial
  const listeners = new Set<(value: T) => void>()
  const set = (next: T) => {
    value = next
    listeners.forEach(listener => listener(next))
  }
  return {
    get: () => value,
    set,
    update: updater => set(updater(value)),
    subscribe: listener => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }
  }
}
