/**
 * WHATWG fetch / streams ambient global type declarations for the Scripting app.
 */

// ── Streams ──────────────────────────────────────────────────────────────────

type UnderlyingSource<R> = {
  start?: (controller: ReadableStreamDefaultController<R>) => void | Promise<void>
  pull?: (controller: ReadableStreamDefaultController<R>) => void | Promise<void>
  cancel?: (reason?: any) => void | Promise<void>
}

/** Controller allowing control of a ReadableStream's state and internal queue. */
declare class ReadableStreamDefaultController<R> {
  /** Enqueues a given chunk in the associated stream. */
  enqueue(chunk: R): void
  /** Closes the associated stream. */
  close(): void
  /** Causes any future interactions with the associated stream to error. */
  error(e: any): void
  /** The desired size required to fill the stream's internal queue. */
  get desiredSize(): number
}

/** A readable stream of some data. */
declare class ReadableStream<R = any> {
  constructor(underlyingSource: UnderlyingSource<R>)
  [Symbol.asyncIterator](): AsyncIterableIterator<R>
  /** Whether the stream is locked to a reader. */
  get locked(): boolean
  /** Creates a reader and locks the stream to it. */
  getReader(): ReadableStreamDefaultReader<R>
  /** Tees the stream into two branches that receive the same data. */
  tee(): [ReadableStream<R>, ReadableStream<R>]
}

/** Reader used to read from a ReadableStream. Obtain via ReadableStream.getReader(). */
declare class ReadableStreamDefaultReader<R> {
  /** Fulfills when the stream closes; rejects on error or lock release. */
  get closed(): Promise<void>
  /** Cancels the stream. */
  cancel(reason?: any): Promise<void>
  /** Reads the next chunk. `{ value, done: false }` or `{ value: undefined, done: true }`. */
  read(): Promise<{ value: R; done: false } | { value: undefined; done: true }>
  /** Releases the reader's lock on the stream. */
  releaseLock(): void
}

// ── Writable / Transform ─────────────────────────────────────────────────────

type UnderlyingSink<W = any> = {
  start?: (controller: WritableStreamDefaultController) => void | Promise<void>
  write?: (chunk: W, controller: WritableStreamDefaultController) => void | Promise<void>
  close?: () => void | Promise<void>
  abort?: (reason?: any) => void | Promise<void>
}

declare class WritableStreamDefaultController {
  error(reason?: any): void
}

/** Writer used to write to a WritableStream. Obtain via WritableStream.getWriter(). */
declare class WritableStreamDefaultWriter<W = any> {
  get desiredSize(): number
  get ready(): Promise<void>
  /** Fulfills when the stream closes; rejects on error. */
  get closed(): Promise<void>
  write(chunk: W): Promise<void>
  close(): Promise<void>
  abort(reason?: any): Promise<void>
  releaseLock(): void
}

/** A writable stream of some data. */
declare class WritableStream<W = any> {
  constructor(underlyingSink?: UnderlyingSink<W>)
  /** Whether the stream is locked to a writer. */
  get locked(): boolean
  /** Creates a writer and locks the stream to it. */
  getWriter(): WritableStreamDefaultWriter<W>
}

type Transformer<I = any, O = any> = {
  start?: (controller: TransformStreamDefaultController<O>) => void | Promise<void>
  transform?: (chunk: I, controller: TransformStreamDefaultController<O>) => void | Promise<void>
  flush?: (controller: TransformStreamDefaultController<O>) => void | Promise<void>
}

declare class TransformStreamDefaultController<O = any> {
  enqueue(chunk: O): void
  error(reason?: any): void
  terminate(): void
  get desiredSize(): number
}

/** A pair of streams: a writable end and a readable end (default is an identity transform). */
declare class TransformStream<I = any, O = any> {
  constructor(transformer?: Transformer<I, O>)
  readonly readable: ReadableStream<O>
  readonly writable: WritableStream<I>
}

// ── Abort ────────────────────────────────────────────────────────────────────

/**
 * WHATWG `DOMException`. There is no separate `AbortError` class — an aborted operation
 * (e.g. a fetch cancelled via `AbortController`) rejects with a `DOMException` whose `name`
 * is `"AbortError"` (`code` 20); `AbortSignal.timeout()` uses `"TimeoutError"` (`code` 23).
 * Detect cancellation with `err.name === 'AbortError'` or `err instanceof DOMException`.
 */
declare class DOMException extends Error {
  constructor(message?: string, name?: string)
  readonly code: number
  static readonly ABORT_ERR: 20
  static readonly TIMEOUT_ERR: 23
}

/** Event representing an abort, analogous to the browser's AbortEvent. */
declare class AbortEvent {
  readonly type: "abort"
  readonly target: AbortSignal
  constructor(signal: AbortSignal)
}

type AbortEventListener = (event: AbortEvent) => void

/** Allows communicating with and aborting requests (e.g. fetch). */
declare class AbortSignal {
  /** Optional callback for the 'abort' event. */
  onabort: AbortEventListener | null
  /** Whether the signal has been aborted. */
  get aborted(): boolean
  /** The reason why the signal was aborted. */
  get reason(): any
  /** Throws a DOMException (name "AbortError") if the signal has already been aborted. */
  throwIfAborted(): void
  addEventListener(type: 'abort', listener: AbortEventListener): void
  removeEventListener(type: 'abort', listener: AbortEventListener): void
  /** A signal that is already aborted with an optional reason. */
  static abort(reason?: any): AbortSignal
  /** A signal that aborts after the given delay (in milliseconds). */
  static timeout(delay: number): AbortSignal
  /** A signal that aborts when any of the provided signals abort. */
  static any(signals: AbortSignal[]): AbortSignal
}

/** Controller that allows aborting one or more requests. */
declare class AbortController {
  /** The AbortSignal associated with this controller. */
  readonly signal: AbortSignal
  constructor()
  /** Aborts the associated signal, setting the reason if provided. */
  abort(reason?: any): void
}

// ── Headers / FormData / Cookie ─────────────────────────────────────────────

type HeadersInit = [string, string][] | Record<string, string> | Headers

/** Perform actions on HTTP request and response headers. Names are case-insensitive. */
declare class Headers {
  constructor(init?: HeadersInit)
  append(name: string, value: string): void
  get(name: string): string | null
  /** Returns an array of all Set-Cookie header values (WHATWG getSetCookie). */
  getSetCookie(): string[]
  has(name: string): boolean
  set(name: string, value: string): void
  delete(name: string): void
  forEach(callback: (value: string, name: string) => void): void
  keys(): string[]
  values(): string[]
  entries(): [string, string][]
  /** WHATWG 可迭代：yield [name, value]；set-cookie 逐条 yield。 */
  [Symbol.iterator](): IterableIterator<[string, string]>
  toJson(): { [x: string]: string }
}

type FormBinaryData = {
  data: Data
  mimeType?: string
  filename?: string
}

/** Construct a set of key/value form fields, encoded as multipart/form-data. */
declare class FormData {
  append(name: string, value: string): void
  append(name: string, value: Blob, filename?: string): void
  append(name: string, value: Data, mimeType: string, filename?: string): void
  get(name: string): string | FormBinaryData | Blob | null
  getAll(name: string): Array<string | FormBinaryData | Blob>
  has(name: string): boolean
  delete(name: string): void
  set(name: string, value: string): void
  set(name: string, value: Blob, filename?: string): void
  set(name: string, value: Data, mimeType: string, filename?: string): void
  forEach(callback: (value: string | FormBinaryData | Blob, name: string, parent: FormData) => void): void
  entries(): [string, string | FormBinaryData | Blob][]
  toJson(): Record<string, Array<string | FormBinaryData | Blob>>
}

interface Cookie {
  name: string
  value: string
  domain: string
  path: string
  isSecure: boolean
  isHTTPOnly: boolean
  isSessionOnly: boolean
  expiresDate?: Date | null
}

interface RedirectRequest {
  method: string
  url: string
  headers: Record<string, string>
  cookies: Cookie[]
  body?: Data
  timeout?: number
}

// ── Blob ─────────────────────────────────────────────────────────────────────

type BlobPart = string | ArrayBuffer | ArrayBufferView | Blob

/** A file-like object of immutable, raw data. */
declare class Blob {
  constructor(blobParts?: BlobPart[], options?: { type?: string; endings?: 'transparent' | 'native' })
  /** Size of the Blob in bytes. */
  get size(): number
  /** The MIME type of the Blob. */
  get type(): string
  /** The entire contents as an ArrayBuffer. */
  arrayBuffer(): Promise<ArrayBuffer>
  /** The entire contents as a Uint8Array. */
  bytes(): Promise<Uint8Array>
  /** The entire contents interpreted as UTF-8 text. */
  text(): Promise<string>
  /** A ReadableStream yielding the Blob's data as Uint8Array chunks. */
  stream(): ReadableStream<Uint8Array>
  /** A new Blob over the specified byte range (negative indices count from the end). */
  slice(start?: number, end?: number, contentType?: string): Blob
}

/**
 * A File-like object: a Blob with a name and last-modified time. Multipart/form-data file
 * fields parsed by `Request.formData()` / Hono `c.req.parseBody()` are File instances.
 */
declare class File extends Blob {
  constructor(
    fileBits?: BlobPart[],
    fileName?: string,
    options?: { type?: string; lastModified?: number; endings?: 'transparent' | 'native' }
  )
  /** The name of the file. */
  get name(): string
  /** Last modified time (ms since epoch). */
  get lastModified(): number
}

// ── Request / Response ──────────────────────────────────────────────────────

type RequestInit = {
  method?: string
  headers?: HeadersInit
  body?: Data | FormData | string | ArrayBuffer | ArrayBufferView | null
  /**
   * Whether to allow insecure request, default is false. If the request URL is HTTP and the
   * app is served over HTTPS, the request will be blocked unless this option is set to true.
   */
  allowInsecureRequest?: boolean
  /**
   * Called when a redirect response is received. Return a Promise resolving to a
   * `RedirectRequest` (to modify and follow) or `null` (to cancel the redirect).
   */
  handleRedirect?: (newRequest: RedirectRequest) => Promise<RedirectRequest | null>
  /**
   * Called when a redirect response is received. Return a Promise resolving to whether the
   * redirect is allowed.
   * @deprecated Use `handleRedirect` instead.
   */
  shouldAllowRedirect?: (newRequest: Request) => Promise<boolean>
  /** Request timeout in seconds. */
  timeout?: number
  /** Abort the request via the corresponding AbortController. */
  signal?: AbortSignal
  /**
   * `CancelToken` instance (import from "scripting"); call `cancel()` to cancel the request.
   * @deprecated Use `signal` instead.
   */
  cancelToken?: any
  /** Debug label shown in the log panel. */
  debugLabel?: string
}

/** The Request interface of the Fetch API represents a resource request. */
/** The body accepted by the public Response/Request constructors. */
type BodyInit = string | ArrayBuffer | ArrayBufferView | Blob | FormData | ReadableStream<Uint8Array> | Data | null

declare class Request {
  url: string
  method: string
  headers: Headers
  body?: Data | FormData | string | ArrayBuffer | ArrayBufferView | null
  allowInsecureRequest?: boolean
  handleRedirect?: (newRequest: RedirectRequest) => Promise<RedirectRequest | null>
  /** @deprecated Use `handleRedirect` instead. */
  shouldAllowRedirect?: (newRequest: Request) => Promise<boolean>
  /** Request timeout in seconds. */
  timeout?: number
  signal?: AbortSignal
  /** @deprecated Use `signal` instead. */
  cancelToken?: any
  debugLabel?: string
  constructor(input: string | Request, init?: RequestInit)
  /** Whether the body has been read by one of the read methods below. */
  get bodyUsed(): boolean
  text(): Promise<string>
  json(): Promise<any>
  arrayBuffer(): Promise<ArrayBuffer>
  bytes(): Promise<Uint8Array>
  blob(): Promise<Blob>
  formData(): Promise<FormData>
  clone(): Request
}

type ResponseInit = {
  status?: number
  statusText?: string
  headers?: HeadersInit
  cookies?: Cookie[]
  url?: string
  mimeType?: string
  expectedContentLength?: number
  textEncodingName?: string
}

/** The response to a request. */
declare class Response {
  /** The response body as a stream of Uint8Array chunks (WHATWG-compatible). */
  body: ReadableStream<Uint8Array>
  /**
   * The response body as a stream of native `Data` chunks (zero-copy fast path).
   * Use this instead of `body` to stream the body as `Data` without the per-chunk
   * `Data → Uint8Array` conversion that `body` performs. Mutually exclusive with
   * `body` and the read methods — the body can only be consumed once.
   */
  get dataStream(): ReadableStream<Data>
  /**
   * Create a Response. `body` accepts the WHATWG BodyInit set; non-stream bodies are
   * normalized to a single-chunk stream. `fetch()` passes a ReadableStream as-is.
   */
  constructor(body?: BodyInit, init?: ResponseInit)
  /** Create a JSON response (serializes `data`, sets content-type application/json). */
  static json(data: any, init?: ResponseInit): Response
  /** Create a network-error response (status 0). */
  static error(): Response
  /** Create a redirect response to `url` (default status 302). */
  static redirect(url: string, status?: number): Response
  get bodyUsed(): boolean
  /** Cookies set by the response (Scripting extension). */
  get cookies(): Cookie[]
  json(): Promise<any>
  text(): Promise<string>
  /** The whole body as native Data. */
  data(): Promise<Data>
  bytes(): Promise<Uint8Array>
  arrayBuffer(): Promise<ArrayBuffer>
  /** The whole body as a Blob (type taken from the content-type header). */
  blob(): Promise<Blob>
  formData(): Promise<FormData>
  clone(): Response
  get status(): number
  get statusText(): string
  get headers(): Headers
  get ok(): boolean
  get url(): string
  get mimeType(): string | undefined
  get expectedContentLength(): number | undefined
  get textEncodingName(): string | undefined
}

// ── Cache ────────────────────────────────────────────────────────────────────

type RequestInfo = string | Request

/** WHATWG Cache: a storage of Request/Response pairs (in-memory; keyed by request URL, GET only). */
declare class Cache {
  match(request: RequestInfo, options?: any): Promise<Response | undefined>
  matchAll(request?: RequestInfo, options?: any): Promise<Response[]>
  add(request: RequestInfo): Promise<void>
  addAll(requests: RequestInfo[]): Promise<void>
  put(request: RequestInfo, response: Response): Promise<void>
  delete(request: RequestInfo, options?: any): Promise<boolean>
  keys(request?: RequestInfo, options?: any): Promise<Request[]>
}

/** WHATWG CacheStorage, exposed as the global `caches`. */
declare class CacheStorage {
  open(cacheName: string): Promise<Cache>
  has(cacheName: string): Promise<boolean>
  delete(cacheName: string): Promise<boolean>
  keys(): Promise<string[]>
  match(request: RequestInfo, options?: any): Promise<Response | undefined>
}

/** The global CacheStorage (WHATWG Cache API). In-memory; cleared on context teardown. */
declare var caches: CacheStorage

// ── fetch ────────────────────────────────────────────────────────────────────

/**
 * Starts fetching a resource from the network, returning a promise fulfilled once the
 * response is available. A fetch() promise only rejects on a network/request error — it does
 * NOT reject on HTTP error status (404, 500, …); check `Response.ok` / `Response.status`.
 */
declare function fetch(url: string, init?: RequestInit): Promise<Response>
declare function fetch(request: Request): Promise<Response>
