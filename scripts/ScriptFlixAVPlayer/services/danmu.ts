import type { DanmuConfig, DanmuMatchResult } from '../types'

const buildUrl = (baseUrl: string, path: string, params?: Record<string, string>) => {
  const normalizedBase = baseUrl.replace(/\/+$/, '')
  const normalizedPath = path.replace(/^\/+/, '')
  const url = `${normalizedBase}/${normalizedPath}`
  if (!params || Object.keys(params).length === 0) {
    return url
  }
  const query = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
  return `${url}?${query}`
}

const parseColor = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim()) {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const hex = Math.max(0, Math.min(0xffffff, Math.floor(value)))
      .toString(16)
      .padStart(6, '0')
    return `#${hex}`
  }
  return undefined
}

type NormalizedDanmuItem = {
  time: number
  text: string
  mode?: number
  color?: string
}

const normalizeDanmuItem = (raw: any): NormalizedDanmuItem | null => {
  if (!raw) return null

  if (typeof raw.p === 'string' && typeof raw.m === 'string') {
    const parts = raw.p.split(',')
    const time = Number(parts[0] ?? NaN)
    const mode = Number(parts[1] ?? NaN)
    const color = parseColor(Number(parts[3] ?? NaN))
    if (!Number.isFinite(time) || !raw.m.trim()) {
      return null
    }
    return { time, text: raw.m, mode: Number.isFinite(mode) ? mode : undefined, color }
  }

  const time = Number(raw.time ?? raw.t ?? raw.progress ?? raw.playTime ?? NaN)
  const text = String(raw.text ?? raw.content ?? raw.m ?? '').trim()
  const mode = Number(raw.mode ?? raw.type ?? raw.mod ?? raw.position ?? NaN)
  const color = parseColor(raw.color ?? raw.c)

  if (!Number.isFinite(time) || !text) {
    return null
  }
  return { time, text, mode: Number.isFinite(mode) ? mode : undefined, color }
}

type ParsedKeyword = {
  anime: string
  episode?: string
}

const parseKeyword = (keyword: string): ParsedKeyword => {
  const trimmed = keyword.trim()

  // 电影/剧场版：用于 search/episodes 的 episode=movie 过滤
  if (/\bmovie\b/i.test(trimmed) || /电影|剧场版/.test(trimmed)) {
    const anime = trimmed
      .replace(/\bmovie\b/gi, '')
      .replace(/电影|剧场版/g, '')
      .trim()
    return { anime: anime || trimmed, episode: 'movie' }
  }

  // 形如：Some.Title.S01E05（match 接口会自动解析，但我们也用于 search/episodes）
  const sxxExx = trimmed.match(/^(.*?)\s*[.\s_-]*S(\d{1,2})E(\d{1,3}).*$/i)
  if (sxxExx) {
    const anime = sxxExx[1].trim()
    const episode = String(Number(sxxExx[3]))
    return { anime: anime || trimmed, episode: episode || undefined }
  }

  // 形如：标题 第12集
  const diJi = trimmed.match(/^(.*?)\s*第\s*(\d{1,4})\s*集.*$/)
  if (diJi) {
    const anime = diJi[1].trim()
    const episode = String(Number(diJi[2]))
    return { anime: anime || trimmed, episode: episode || undefined }
  }

  return { anime: trimmed }
}

export const DanmuService = {
  async test(baseUrl: string) {
    const url = buildUrl(baseUrl, '/api/v2/search/anime', { keyword: 'test' })
    const res = await fetch(url)
    return { ok: res.ok, status: res.status }
  },

  async searchEpisodes(baseUrl: string, anime: string, episode?: string): Promise<DanmuMatchResult[]> {
    const params: Record<string, string> = { anime }
    if (episode) {
      params.episode = episode
    }

    const url = buildUrl(baseUrl, '/api/v2/search/episodes', params)
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`search episodes failed: ${res.status}`)
    }
    const raw = (await res.json()) as any
    const animes: any[] = Array.isArray(raw?.animes) ? raw.animes : []

    const flattened: DanmuMatchResult[] = []
    for (const animeItem of animes) {
      const animeTitle = String(animeItem?.animeTitle ?? '').trim()
      const typeDescription = String(animeItem?.typeDescription ?? '').trim() || undefined
      const episodes: any[] = Array.isArray(animeItem?.episodes) ? animeItem.episodes : []

      for (const ep of episodes) {
        const commentId = String(ep?.episodeId ?? '').trim()
        const episodeTitle = String(ep?.episodeTitle ?? '').trim() || undefined
        if (!commentId || !animeTitle) continue
        // comment 接口会 parseInt(commentId)，因此必须是纯数字
        if (!/^\d+$/.test(commentId)) continue
        flattened.push({ commentId, title: animeTitle, episode: episodeTitle, source: typeDescription })
      }
    }

    return flattened
  },

  async match(baseUrl: string, keyword: string): Promise<DanmuMatchResult[]> {
    // 优先走 episodes 搜索（README 提供 GET /api/v2/search/episodes），能直接用 anime/episode 精准定位。
    try {
      const parsed = parseKeyword(keyword)
      const byEpisodes = await DanmuService.searchEpisodes(baseUrl, parsed.anime, parsed.episode)
      if (byEpisodes.length > 0) {
        return byEpisodes
      }
    } catch (error) {
      console.error('[DanmuService] searchEpisodes failed, fallback to match', error)
    }

    const url = buildUrl(baseUrl, '/api/v2/match')

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: keyword })
    })

    if (!res.ok) {
      throw new Error(`match failed: ${res.status}`)
    }

    const raw = (await res.json()) as any
    const matches: any[] = Array.isArray(raw?.matches) ? raw.matches : []

    return matches
      .map(item => {
        const commentId = String(item?.episodeId ?? '').trim()
        const title = String(item?.animeTitle ?? '').trim()
        const episode = String(item?.episodeTitle ?? '').trim() || undefined
        const source = String(item?.typeDescription ?? '').trim() || undefined
        if (!commentId || !title) return null
        if (!/^\d+$/.test(commentId)) return null
        return { commentId, title, episode, source } satisfies DanmuMatchResult
      })
      .filter(Boolean) as DanmuMatchResult[]
  },

  async fetchComments(baseUrl: string, commentId: string) {
    if (!/^\d+$/.test(commentId)) {
      throw new Error(`commentId invalid: ${commentId}`)
    }
    const url = buildUrl(baseUrl, `/api/v2/comment/${encodeURIComponent(commentId)}`, { format: 'json' })
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`comment failed: ${res.status}`)
    }
    const raw = (await res.json()) as any
    const items: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.comments) ? raw.comments : Array.isArray(raw?.data) ? raw.data : []
    const normalized = items.map(normalizeDanmuItem).filter(Boolean) as NormalizedDanmuItem[]
    normalized.sort((a, b) => a.time - b.time)
    return normalized
  },

  applyDefaults(partial?: Partial<DanmuConfig>): DanmuConfig {
    const enabled = Boolean(partial?.enabled ?? false)
    const baseUrl = String(partial?.baseUrl ?? '').trim()
    const opacity = Number.isFinite(Number(partial?.opacity)) ? Math.max(0.1, Math.min(1, Number(partial?.opacity))) : 0.9
    const fontSize = Number.isFinite(Number(partial?.fontSize)) ? Math.max(10, Math.min(28, Math.floor(Number(partial?.fontSize)))) : 16
    const modes = {
      scroll: partial?.modes?.scroll ?? true,
      top: partial?.modes?.top ?? true,
      bottom: partial?.modes?.bottom ?? true
    }
    return { enabled, baseUrl, opacity, fontSize, modes }
  }
}
