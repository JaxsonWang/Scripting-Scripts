declare global {
  type GMValue =
    | string
    | number
    | boolean
    | null
    | GMValue[]
    | { [key: string]: GMValue }

  interface GMInfo {
    script: {
      name: string
      namespace: string
      version: string
      description?: string
      author?: string
      copyright?: string
      homepage?: string
      icon?: string
      iconURL?: string
      updateURL?: string
      downloadURL?: string
      supportURL?: string
      license?: string
      matches?: string[]
      includes?: string[]
      excludeMatches?: string[]
      excludes?: string[]
      grant?: string[]
      connects?: string[]
      resources?: Array<{ name: string; url: string }>
      resource?: Array<{ name: string; url: string }>
      requires?: string[]
      require?: string[]
      runAt?: string
      "run-at"?: string
      injectInto?: "content" | "page"
      "inject-into"?: "content" | "page"
      weight?: number
      noframes?: boolean
      [key: string]: any
    }
    scriptMetaStr?: string
    scriptHandler: string
    version: string
    platform?: {
      browserName?: string
      os?: string
      [key: string]: any
    }
    downloadMode?: string
    isIncognito?: boolean
    uuid?: string
    scriptWillUpdate?: boolean
    scriptUpdateURL?: string | null
    [key: string]: any
  }

  interface GMProgressEventLike {
    loaded?: number
    total?: number
    lengthComputable?: boolean
    finalUrl?: string
    responseURL?: string
    responseType?: string
    timeout?: number
    status?: number
    context?: any
    [key: string]: any
  }

  interface GMXmlHttpRequestResponse<TResponse = string> {
    status: number
    statusText: string
    responseText: string
    response: TResponse
    responseHeaders: string
    finalUrl: string
    responseURL: string
    responseType?: string
    timeout?: number
    responseXML?: Document | null
    readyState: 4
    context?: any
  }

  interface GMXmlHttpRequestDetails<TContext = any> {
    method?: string
    url: string
    user?: string
    password?: string
    headers?: Record<string, string | number | boolean>
    overrideMimeType?: string
    binary?: boolean
    data?: string | ArrayBuffer | ArrayBufferView | URLSearchParams | FormData | Record<string, any>
    timeout?: number
    context?: TContext
    responseType?: "" | "text" | "json" | "arraybuffer" | "blob" | "document"
    upload?: {
      onabort?: (event?: GMProgressEventLike) => void
      onerror?: (event?: GMProgressEventLike) => void
      onload?: (event?: GMProgressEventLike) => void
      onloadend?: (event?: GMProgressEventLike) => void
      onloadstart?: (event?: GMProgressEventLike) => void
      onprogress?: (event?: GMProgressEventLike) => void
      ontimeout?: (event?: GMProgressEventLike) => void
    }
    onload?: (response: GMXmlHttpRequestResponse) => void
    onerror?: (error: Error) => void
    ontimeout?: (error?: Error) => void
    onabort?: (response?: Partial<GMXmlHttpRequestResponse>) => void
    onloadstart?: (response?: Partial<GMXmlHttpRequestResponse>) => void
    onprogress?: (event: GMProgressEventLike) => void
    onloadend?: (response?: Partial<GMXmlHttpRequestResponse> | Error) => void
    onreadystatechange?: (response: Partial<GMXmlHttpRequestResponse>) => void
  }

  interface GMXmlHttpRequestControl<TResponse = string> extends Promise<GMXmlHttpRequestResponse<TResponse>> {
    abort?: () => void
  }

  interface GMNotificationDetails {
    title?: string
    text?: string
    body?: string
    image?: string
    url?: string
    identifier?: string
    onclick?: () => void
    ondone?: () => void
  }

  interface GMCookie {
    name: string
    value: string
    domain: string
    hostOnly?: boolean
    path: string
    secure: boolean
    httpOnly: boolean
    sameSite?: "no_restriction" | "lax" | "strict" | "unspecified"
    session?: boolean
    expirationDate?: number
    storeId?: string
    [key: string]: any
  }

  interface GMCookieDetails {
    url?: string
    origin?: string
    name?: string
    value?: string
    domain?: string
    path?: string
    secure?: boolean
    httpOnly?: boolean
    sameSite?: "no_restriction" | "lax" | "strict" | "unspecified"
    session?: boolean
    expirationDate?: number
    /** Uses the originating tab's Safari profile/private Cookie store when omitted.
     * An explicit ID selects that store; unavailable or ambiguous automatic selection rejects.
     */
    storeId?: string
  }

  interface GMCookieApi {
    list(details?: GMCookieDetails): Promise<GMCookie[]>
    list(callback: (cookies: GMCookie[]) => void): Promise<GMCookie[]>
    list(details: GMCookieDetails, callback: (cookies: GMCookie[]) => void): Promise<GMCookie[]>
    set(details: GMCookieDetails, callback?: (cookie: GMCookie | null) => void): Promise<GMCookie | null>
    delete(details: GMCookieDetails, callback?: (cookie: GMCookie | null) => void): Promise<GMCookie | null>
  }

  interface GMOpenInTabOptions {
    active?: boolean
    insert?: boolean
    setParent?: boolean
    incognito?: boolean
    loadInBackground?: boolean
  }

  interface GMTabControl {
    closed: boolean
    close(): void
  }

  type GMTab = Record<string, any>
  type GMTabs = Record<string, GMTab>

  interface GMDownloadResponse {
    status: number
    statusText: string
    fileName: string
    path: string
    bytes: number
    finalUrl: string
  }

  interface GMDownloadErrorEvent {
    type: "error" | "timeout" | "loadend"
    error: string
    details?: string
    finalUrl?: string
    [key: string]: any
  }

  interface GMDownloadDetails {
    url: string
    name?: string
    headers?: Record<string, string | number | boolean>
    timeout?: number
    saveAs?: boolean
    onloadstart?: (event?: GMProgressEventLike) => void
    onprogress?: (event: GMProgressEventLike) => void
    onload?: (event: GMDownloadResponse & GMProgressEventLike) => void
    onerror?: (event: GMDownloadErrorEvent) => void
    ontimeout?: (event?: GMDownloadErrorEvent) => void
    onloadend?: (event?: (GMDownloadResponse & GMProgressEventLike) | GMDownloadErrorEvent) => void
  }

  interface GMMenuCommandOptions {
    accessKey?: string
    autoClose?: boolean
    title?: string
  }

  type GMAddElementAttributes = Record<string, any>

  interface ScriptingDirectoryItem {
    name: string
    path: string
    isDirectory: boolean
    size: number
  }

  interface ScriptingFileManagerApi {
    readonly documentsDirectory: string
    readonly iCloudDocumentsDirectory: string | null
    readonly appGroupDocumentsDirectory: string | null
    readonly safariBrowserDirectory: string
    readonly safariBrowserStorageDirectory: string
    readonly safariBrowserDownloadsDirectory: string
    readonly safariBrowserUserscriptsDirectory: string
    readonly isiCloudEnabled: boolean
    readAsString(path: string, encoding?: "utf8" | "utf-8" | "utf16" | "utf-16" | "ascii"): Promise<string>
    writeAsString(
      path: string,
      contents: string,
      encoding?: "utf8" | "utf-8" | "utf16" | "utf-16" | "ascii"
    ): Promise<void>
    createDirectory(path: string, recursive?: boolean): Promise<void>
    readDirectory(path: string): Promise<ScriptingDirectoryItem[]>
    exists(path: string): Promise<boolean>
    remove(path: string): Promise<void>
  }

  interface ScriptingTabInfo {
    /** WebExtension tab id, or null when unavailable. Pass to `activate()` or `GM.closeTab()`. */
    readonly id: number | null
    readonly url: string
    readonly title: string
    readonly active: boolean
    readonly index: number
    readonly windowId: number
    readonly pinned: boolean
  }

  interface ScriptingTabsApi {
    /** All open Safari tabs. Requires `// @grant Scripting.tabs`. */
    query(): Promise<ScriptingTabInfo[]>
    /** The tab this script runs in, or null when unavailable. */
    getCurrent(): Promise<ScriptingTabInfo | null>
    /** Switch focus to an already-open tab by id (does not open a new tab). */
    activate(tabId: number): Promise<void>
  }

  /** Content-world only. Requires @grant Scripting.Translation. */
  interface ScriptingTranslationApi {
    /** iOS/macOS 26+. No UI/downloads; source and installed languages are required. */
    translateInstalled(options: { text: string; source: string; target?: string }): Promise<string>
    /** iOS/macOS 26+. Preserves order. At most 64 texts and 256 KiB per request. */
    translateInstalledBatch(options: { texts: string[]; source: string; target?: string }): Promise<string[]>
  }

  interface ScriptingApi {
    readonly Translation: ScriptingTranslationApi
    readonly FileManager: ScriptingFileManagerApi
    readonly tabs: ScriptingTabsApi
  }

  interface GMApi {
    readonly info: GMInfo
    readonly cookie: GMCookieApi
    log(...items: any[]): void
    getValue<T extends GMValue = GMValue>(key: string, defaultValue?: T): Promise<T>
    setValue(key: string, value: GMValue): Promise<void>
    deleteValue(key: string): Promise<void>
    listValues(): Promise<string[]>
    addStyle(css: string): HTMLStyleElement
    addElement<K extends keyof HTMLElementTagNameMap>(
      tagName: K,
      attributes?: GMAddElementAttributes
    ): HTMLElementTagNameMap[K]
    addElement<K extends keyof HTMLElementTagNameMap>(
      parent: Node,
      tagName: K,
      attributes?: GMAddElementAttributes
    ): HTMLElementTagNameMap[K]
    addValueChangeListener<T extends GMValue = GMValue>(
      key: string,
      callback: (key: string, oldValue: T | undefined | null, newValue: T | undefined | null, remote: boolean) => void
    ): number
    removeValueChangeListener(listenerId: number): void
    registerMenuCommand(
      name: string,
      callback: () => void,
      accessKeyOrOptions?: string | GMMenuCommandOptions
    ): number
    unregisterMenuCommand(listenerId: number): void
    removeMenuCommand(listenerId: number): void
    getResourceText(name: string): Promise<string>
    getResourceURL(name: string): Promise<string>
    getResourceUrl(name: string): Promise<string>
    notification(details: GMNotificationDetails): Promise<string | void>
    notification(text: string, title?: string, image?: string, onclick?: () => void): Promise<string | void>
    openInTab(url: string, options?: boolean | GMOpenInTabOptions): Promise<GMTabControl>
    closeTab(tabId?: number): Promise<void>
    setClipboard(text: string, type?: string): Promise<void>
    getTab(): Promise<GMTab>
    saveTab(tab: GMTab): Promise<void>
    getTabs(): Promise<GMTabs>
    download(details: GMDownloadDetails): Promise<GMDownloadResponse>
    download(url: string, name?: string): Promise<GMDownloadResponse>
    xmlHttpRequest<TResponse = string>(
      details: GMXmlHttpRequestDetails
    ): GMXmlHttpRequestControl<TResponse>
    xmlhttpRequest<TResponse = string>(
      details: GMXmlHttpRequestDetails
    ): GMXmlHttpRequestControl<TResponse>
  }

  const GM: GMApi
  const GM_info: GMInfo
  const GM_cookie: GMCookieApi
  const Scripting: ScriptingApi
  const unsafeWindow: Window & typeof globalThis

  function GM_log(...items: any[]): void
  function GM_getValue<T extends GMValue = GMValue>(key: string, defaultValue?: T): Promise<T>
  function GM_setValue(key: string, value: GMValue): Promise<void>
  function GM_deleteValue(key: string): Promise<void>
  function GM_listValues(): Promise<string[]>
  function GM_addStyle(css: string): HTMLStyleElement
  function GM_addElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    attributes?: GMAddElementAttributes
  ): HTMLElementTagNameMap[K]
  function GM_addElement<K extends keyof HTMLElementTagNameMap>(
    parent: Node,
    tagName: K,
    attributes?: GMAddElementAttributes
  ): HTMLElementTagNameMap[K]
  function GM_addValueChangeListener<T extends GMValue = GMValue>(
    key: string,
    callback: (key: string, oldValue: T | undefined | null, newValue: T | undefined | null, remote: boolean) => void
  ): number
  function GM_removeValueChangeListener(listenerId: number): void
  function GM_registerMenuCommand(
    name: string,
    callback: () => void,
    accessKeyOrOptions?: string | GMMenuCommandOptions
  ): number
  function GM_unregisterMenuCommand(listenerId: number): void
  function GM_removeMenuCommand(listenerId: number): void
  function GM_getResourceText(name: string): Promise<string>
  function GM_getResourceURL(name: string): Promise<string>
  function GM_notification(details: GMNotificationDetails): Promise<string | void>
  function GM_notification(text: string, title?: string, image?: string, onclick?: () => void): Promise<string | void>
  function GM_openInTab(url: string, options?: boolean | GMOpenInTabOptions): Promise<GMTabControl>
  function GM_closeTab(tabId?: number): Promise<void>
  function GM_setClipboard(text: string, type?: string): Promise<void>
  function GM_getTab(): Promise<GMTab>
  function GM_saveTab(tab: GMTab): Promise<void>
  function GM_getTabs(): Promise<GMTabs>
  function GM_download(details: GMDownloadDetails): Promise<GMDownloadResponse>
  function GM_download(url: string, name?: string): Promise<GMDownloadResponse>
  function GM_xmlhttpRequest<TResponse = string>(
    details: GMXmlHttpRequestDetails
  ): GMXmlHttpRequestControl<TResponse>
  function GM_xmlHttpRequest<TResponse = string>(
    details: GMXmlHttpRequestDetails
  ): GMXmlHttpRequestControl<TResponse>
}

export {}
