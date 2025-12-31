type StorageOptions = { shared: boolean }

export type BizRequestParams = {
  api: string
  verifyToken: string
  params: any
  productId: string
  version: string
  sign: string
  authToken: string
  accessTime: number
  businessPrincipalId: string
  businessId: string
  userId: string
  certType: string
  certName: string
  certNo: string
  verifyChannel: string
}

export type WidgetConfig = {
  endpoint: string
  bizParams: BizRequestParams
  vehicleImagePath?: string
}

export type CachedResponse = {
  fetchedAt: number
  response: any
}

export type LoginConfig = {
  // 直接粘贴抓包的 form body，例如：
  // login_method=2&login_token=...&client_version=...&device=...&wxa_session=...
  loginBody: string
}

// 小组件（Widget）与 App（index.tsx）可能是不同进程/沙盒，使用 shared 存储保证两端可读写同一份数据。
const STORAGE_OPTIONS: StorageOptions = { shared: true }
const CONFIG_KEY = 'traffic_12123_widget_config'
const CACHE_KEY = 'traffic_12123_widget_cache'
const LOGIN_KEY = 'traffic_12123_widget_login'

export const ConfigStorage = {
  loadConfig(): WidgetConfig | null {
    return Storage.get<WidgetConfig>(CONFIG_KEY, STORAGE_OPTIONS)
  },

  saveConfig(config: WidgetConfig): void {
    Storage.set(CONFIG_KEY, config, STORAGE_OPTIONS)
  },

  clearConfig(): void {
    Storage.remove(CONFIG_KEY, STORAGE_OPTIONS)
  },

  loadCache(): CachedResponse | null {
    return Storage.get<CachedResponse>(CACHE_KEY, STORAGE_OPTIONS)
  },

  saveCache(cache: CachedResponse): void {
    Storage.set(CACHE_KEY, cache, STORAGE_OPTIONS)
  },

  clearCache(): void {
    Storage.remove(CACHE_KEY, STORAGE_OPTIONS)
  },

  loadLogin(): LoginConfig | null {
    return Storage.get<LoginConfig>(LOGIN_KEY, STORAGE_OPTIONS)
  },

  saveLogin(login: LoginConfig): void {
    Storage.set(LOGIN_KEY, login, STORAGE_OPTIONS)
  },

  clearLogin(): void {
    Storage.remove(LOGIN_KEY, STORAGE_OPTIONS)
  }
}
