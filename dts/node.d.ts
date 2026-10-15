/**
 * Node compatibility type declarations for the Scripting app.
 *
 * Describes the Node-compatible runtime layered on JavaScriptCore: a curated
 * subset of Node that is ACTUALLY bridged/implemented. Modules NOT declared here
 * (dgram/child_process/cluster/...) are intentionally absent — importing
 * them is a type error, matching the runtime which throws "not supported".
 *
 * Maintained DIRECTLY in this repo (ScriptingKit/Resources/scripting-js/dts/
 * node.d.ts). Unlike global.d.ts it has NO dependency on the "scripting" SDK
 * types, so it is not sourced from / built by the scripting-js-swiftui repo.
 *
 * ── GLOBAL vs MODULE (important) ───────────────────────────────────────────
 * Only the identifiers the runtime actually injects into the global scope are
 * declared global below (see JSNodeCompat.swift `nodeGlobalsBootstrapJS`):
 *   GLOBAL (usable with NO import):
 *     Buffer, process, require, __dirname, __filename, global,
 *     setImmediate, clearImmediate, queueMicrotask,
 *     TextEncoder, TextDecoder, URL, URLSearchParams,
 *     crypto (Web Crypto subset: getRandomValues + randomUUID ONLY),
 *     plus the global TYPES Buffer / BufferConstructor / BufferEncoding / NodeJS.
 *   MODULE (require import — `declare module` blocks further down):
 *     fs, fs/promises, crypto (Node crypto: createHash/...), path, os, stream,
 *     buffer, events, util, url, querystring, assert, string_decoder, http,
 *     https, net (TCP client), tls (certificate TLS client), timers (+ their "node:" aliases).
 * Note `crypto`: the GLOBAL `crypto` is Web Crypto (getRandomValues/randomUUID);
 * the Node `crypto` module (createHash/createHmac/...) needs `require("crypto")`.
 *
 * NOTE: this is intentionally a SCRIPT file (no top-level import/export), so its
 * `interface Buffer` / `declare const` are global and its ambient `declare module`
 * blocks resolve when the editor loads it as a root file. Do NOT add `export {}`.
 */

// ---------------------------------------------------------------------------
// Buffer
// ---------------------------------------------------------------------------

type BufferEncoding =
  | "ascii" | "utf8" | "utf-8" | "utf16le" | "ucs2" | "ucs-2"
  | "base64" | "base64url" | "latin1" | "binary" | "hex"

interface Buffer extends Uint8Array {
  write(string: string, encoding?: BufferEncoding): number
  write(string: string, offset: number, encoding?: BufferEncoding): number
  write(string: string, offset: number, length: number, encoding?: BufferEncoding): number
  toString(encoding?: BufferEncoding, start?: number, end?: number): string
  toJSON(): { type: "Buffer"; data: number[] }
  equals(otherBuffer: Uint8Array): boolean
  compare(otherBuffer: Uint8Array, targetStart?: number, targetEnd?: number, sourceStart?: number, sourceEnd?: number): -1 | 0 | 1
  copy(target: Uint8Array, targetStart?: number, sourceStart?: number, sourceEnd?: number): number
  slice(start?: number, end?: number): Buffer
  subarray(start?: number, end?: number): Buffer
  fill(value: string | number | Uint8Array, offset?: number, end?: number, encoding?: BufferEncoding): this
  indexOf(value: string | number | Uint8Array, byteOffset?: number, encoding?: BufferEncoding): number
  includes(value: string | number | Uint8Array, byteOffset?: number, encoding?: BufferEncoding): boolean
  readUInt8(offset?: number): number
  readUInt16LE(offset?: number): number
  readUInt16BE(offset?: number): number
  readUInt32LE(offset?: number): number
  readUInt32BE(offset?: number): number
  readInt8(offset?: number): number
  readInt16LE(offset?: number): number
  readInt32LE(offset?: number): number
  readFloatLE(offset?: number): number
  readDoubleLE(offset?: number): number
  readBigUInt64LE(offset?: number): bigint
  readBigInt64LE(offset?: number): bigint
  writeUInt8(value: number, offset?: number): number
  writeUInt16LE(value: number, offset?: number): number
  writeUInt32LE(value: number, offset?: number): number
  writeInt32LE(value: number, offset?: number): number
  writeFloatLE(value: number, offset?: number): number
  writeDoubleLE(value: number, offset?: number): number
}

interface BufferConstructor {
  new (size: number): Buffer
  new (array: Uint8Array): Buffer
  new (arrayBuffer: ArrayBuffer | SharedArrayBuffer): Buffer
  new (array: readonly number[]): Buffer
  new (str: string, encoding?: BufferEncoding): Buffer

  from(arrayBuffer: ArrayBuffer | SharedArrayBuffer, byteOffset?: number, length?: number): Buffer
  from(data: Uint8Array | readonly number[]): Buffer
  from(str: string, encoding?: BufferEncoding): Buffer
  from(obj: { valueOf(): string | object } | { [Symbol.toPrimitive](hint: "string"): string }, byteOffset?: number, length?: number): Buffer
  of(...items: number[]): Buffer
  alloc(size: number, fill?: string | Uint8Array | number, encoding?: BufferEncoding): Buffer
  allocUnsafe(size: number): Buffer
  allocUnsafeSlow(size: number): Buffer
  isBuffer(obj: any): obj is Buffer
  isEncoding(encoding: string): encoding is BufferEncoding
  byteLength(string: string | Uint8Array | ArrayBuffer, encoding?: BufferEncoding): number
  concat(list: readonly Uint8Array[], totalLength?: number): Buffer
  compare(buf1: Uint8Array, buf2: Uint8Array): -1 | 0 | 1
  readonly poolSize: number
}

// ---------------------------------------------------------------------------
// Node global namespace
// ---------------------------------------------------------------------------

declare namespace NodeJS {
  interface Process {
    readonly platform: "darwin" | "ios" | string
    readonly arch: string
    readonly version: string
    readonly versions: Record<string, string>
    readonly pid: number
    readonly env: Record<string, string | undefined>
    readonly argv: string[]
    readonly execPath: string
    cwd(): string
    chdir(directory: string): void
    nextTick(callback: (...args: any[]) => void, ...args: any[]): void
    hrtime: { (time?: [number, number]): [number, number]; bigint(): bigint }
    exit(code?: number): void
    on(event: string, listener: (...args: any[]) => void): Process
    once(event: string, listener: (...args: any[]) => void): Process
    emit(event: string, ...args: any[]): boolean
  }

  interface Require {
    (id: string): any
    resolve(id: string): string
    cache: Record<string, any>
    main: any
  }

  type Timeout = ReturnType<typeof setTimeout>
  type Immediate = { ref(): void; unref(): void }
}

declare const Buffer: BufferConstructor
declare const process: NodeJS.Process
declare const require: NodeJS.Require
declare const __dirname: string
declare const __filename: string
declare const global: typeof globalThis

declare function setImmediate(callback: (...args: any[]) => void, ...args: any[]): NodeJS.Immediate
declare function clearImmediate(immediate: NodeJS.Immediate): void

// Web globals (standard Web/WHATWG APIs available at runtime).
declare class TextEncoder {
  readonly encoding: string
  encode(input?: string): Uint8Array
  encodeInto(source: string, destination: Uint8Array): { read: number; written: number }
}
declare class TextDecoder {
  readonly encoding: string
  constructor(label?: string, options?: { fatal?: boolean; ignoreBOM?: boolean })
  decode(input?: ArrayBuffer | ArrayBufferView, options?: { stream?: boolean }): string
}
declare function queueMicrotask(callback: () => void): void
declare const crypto: {
  getRandomValues<T extends ArrayBufferView>(array: T): T
  randomUUID(): string
  /**
   * WebCrypto API, including HKDF, X25519 key agreement and Ed25519 signatures.
   * Also available as require('node:crypto').webcrypto.subtle.
   */
  readonly subtle: SubtleCrypto
  /** Scripting extension: ciphertext followed by a 16-byte tag; nonce is supplied separately. */
  readonly chacha20Poly1305: ChaCha20Poly1305
}
declare class URLSearchParams implements Iterable<[string, string]> {
  constructor(init?: string | Record<string, string> | [string, string][] | URLSearchParams)
  append(name: string, value: string): void
  delete(name: string): void
  get(name: string): string | null
  getAll(name: string): string[]
  has(name: string): boolean
  set(name: string, value: string): void
  sort(): void
  forEach(callback: (value: string, key: string, parent: URLSearchParams) => void): void
  keys(): IterableIterator<string>
  values(): IterableIterator<string>
  entries(): IterableIterator<[string, string]>
  [Symbol.iterator](): IterableIterator<[string, string]>
  toString(): string
}
declare class URL {
  constructor(url: string, base?: string | URL)
  hash: string
  host: string
  hostname: string
  href: string
  readonly origin: string
  password: string
  pathname: string
  port: string
  protocol: string
  search: string
  readonly searchParams: URLSearchParams
  username: string
  toString(): string
  toJSON(): string
  static canParse(url: string, base?: string): boolean
}

// ---------------------------------------------------------------------------
// Web globals: base64, Event/EventTarget, File, WebCrypto subtle
// ---------------------------------------------------------------------------

/** Decodes a base64-encoded string into a binary (Latin1) string. */
declare function atob(data: string): string
/** Encodes a binary (Latin1) string as base64. Throws if the string contains characters outside the Latin1 range. */
declare function btoa(data: string): string

declare class Event {
  constructor(type: string, eventInitDict?: { bubbles?: boolean; cancelable?: boolean; composed?: boolean })
  readonly type: string
  readonly bubbles: boolean
  readonly cancelable: boolean
  readonly composed: boolean
  readonly defaultPrevented: boolean
  readonly target: EventTarget | null
  readonly currentTarget: EventTarget | null
  readonly timeStamp: number
  preventDefault(): void
  stopPropagation(): void
  stopImmediatePropagation(): void
}
type EventListenerOrEventListenerObject = ((event: Event) => void) | { handleEvent(event: Event): void }
declare class EventTarget {
  constructor()
  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null): void
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null): void
  dispatchEvent(event: Event): boolean
}

/** A `Blob` with a file name and last-modified time (WHATWG `File`). */
declare class File extends Blob {
  constructor(fileBits: any[], fileName: string, options?: { type?: string; lastModified?: number })
  readonly name: string
  readonly lastModified: number
  readonly webkitRelativePath: string
}

// WebCrypto subtle (crypto.subtle / require('crypto').webcrypto.subtle)
interface JsonWebKey {
  kty?: string
  k?: string
  alg?: string
  ext?: boolean
  key_ops?: string[]
  [key: string]: any
}
interface CryptoKey {
  readonly type: string
  readonly extractable: boolean
  readonly algorithm: any
  readonly usages: string[]
}
/** WebCrypto CryptoKey global (not directly constructible). Use for `key instanceof CryptoKey`. */
declare var CryptoKey: { readonly prototype: CryptoKey }
type SubtleHashAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512"
type SubtleAlgorithm =
  | SubtleHashAlgorithm
  | string
  | {
      name: string
      hash?: SubtleHashAlgorithm | string | { name: string }
      iv?: ArrayBufferView | ArrayBuffer
      additionalData?: ArrayBufferView | ArrayBuffer
      tagLength?: number
      length?: number
      [key: string]: any
    }
interface HKDFDeriveParams {
  name: "HKDF"
  hash: "SHA-256" | "SHA-384" | "SHA-512" | { name: "SHA-256" | "SHA-384" | "SHA-512" }
  salt: ArrayBufferView | ArrayBuffer
  info: ArrayBufferView | ArrayBuffer
}
interface ChaCha20Poly1305Options {
  /** Exactly 32 bytes. */
  key: ArrayBufferView | ArrayBuffer
  /** Exactly 12 bytes; unique for every encryption under the same key. */
  nonce: ArrayBufferView | ArrayBuffer
  additionalData?: ArrayBufferView | ArrayBuffer
}
interface ChaCha20Poly1305 {
  encrypt(options: ChaCha20Poly1305Options, data: ArrayBufferView | ArrayBuffer): Promise<ArrayBuffer>
  decrypt(options: ChaCha20Poly1305Options, data: ArrayBufferView | ArrayBuffer): Promise<ArrayBuffer>
}
interface CryptoKeyPair {
  readonly privateKey: CryptoKey
  readonly publicKey: CryptoKey
}
type Curve25519Algorithm = "X25519" | "Ed25519" | { name: "X25519" | "Ed25519" }
interface SubtleCrypto {
  digest(algorithm: SubtleAlgorithm, data: ArrayBufferView | ArrayBuffer): Promise<ArrayBuffer>
  importKey(
    format: "raw" | "jwk" | "spki" | "pkcs8",
    keyData: ArrayBufferView | ArrayBuffer | JsonWebKey,
    algorithm: SubtleAlgorithm,
    extractable: boolean,
    keyUsages: string[]
  ): Promise<CryptoKey>
  exportKey(format: "raw", key: CryptoKey): Promise<ArrayBuffer>
  exportKey(format: "jwk", key: CryptoKey): Promise<JsonWebKey>
  exportKey(format: string, key: CryptoKey): Promise<ArrayBuffer | JsonWebKey>
  sign(algorithm: SubtleAlgorithm, key: CryptoKey, data: ArrayBufferView | ArrayBuffer): Promise<ArrayBuffer>
  verify(
    algorithm: SubtleAlgorithm,
    key: CryptoKey,
    signature: ArrayBufferView | ArrayBuffer,
    data: ArrayBufferView | ArrayBuffer
  ): Promise<boolean>
  encrypt(algorithm: SubtleAlgorithm, key: CryptoKey, data: ArrayBufferView | ArrayBuffer): Promise<ArrayBuffer>
  decrypt(algorithm: SubtleAlgorithm, key: CryptoKey, data: ArrayBufferView | ArrayBuffer): Promise<ArrayBuffer>
  generateKey(algorithm: Curve25519Algorithm, extractable: boolean, keyUsages: string[]): Promise<CryptoKeyPair>
  generateKey(algorithm: SubtleAlgorithm, extractable: boolean, keyUsages: string[]): Promise<CryptoKey>
  deriveBits(algorithm: HKDFDeriveParams, baseKey: CryptoKey, length: number): Promise<ArrayBuffer>
  deriveBits(algorithm: SubtleAlgorithm, baseKey: CryptoKey, length?: number | null): Promise<ArrayBuffer>
  deriveKey(algorithm: SubtleAlgorithm, baseKey: CryptoKey, derivedKeyType: SubtleAlgorithm, extractable: boolean, keyUsages: string[]): Promise<CryptoKey>
}

// ---------------------------------------------------------------------------
// buffer
// ---------------------------------------------------------------------------

declare module "buffer" {
  const Buffer: BufferConstructor
  const constants: { MAX_LENGTH: number; MAX_STRING_LENGTH: number }
  class Blob {
    constructor(sources?: any[], options?: { type?: string })
    readonly size: number
    readonly type: string
    arrayBuffer(): Promise<ArrayBuffer>
    text(): Promise<string>
    slice(start?: number, end?: number, type?: string): Blob
  }
  export { Buffer, Blob, constants }
}

// ---------------------------------------------------------------------------
// events
// ---------------------------------------------------------------------------

declare module "events" {
  type Listener = (...args: any[]) => void
  class EventEmitter {
    constructor()
    addListener(event: string | symbol, listener: Listener): this
    on(event: string | symbol, listener: Listener): this
    once(event: string | symbol, listener: Listener): this
    prependListener(event: string | symbol, listener: Listener): this
    prependOnceListener(event: string | symbol, listener: Listener): this
    removeListener(event: string | symbol, listener: Listener): this
    off(event: string | symbol, listener: Listener): this
    removeAllListeners(event?: string | symbol): this
    setMaxListeners(n: number): this
    getMaxListeners(): number
    listeners(event: string | symbol): Listener[]
    rawListeners(event: string | symbol): Listener[]
    emit(event: string | symbol, ...args: any[]): boolean
    listenerCount(event: string | symbol): number
    eventNames(): (string | symbol)[]
    static defaultMaxListeners: number
  }
  // Namespace merge so both `import { EventEmitter } from "events"` and
  // `import EventEmitter from "events"` work.
  namespace EventEmitter {
    export { EventEmitter }
  }
  export = EventEmitter
}

// ---------------------------------------------------------------------------
// stream
// ---------------------------------------------------------------------------

declare module "stream" {
  import EventEmitter = require("events")
  class Stream extends EventEmitter {
    pipe<T extends Writable>(destination: T, options?: { end?: boolean }): T
  }
  class Readable extends Stream {
    constructor(options?: any)
    readable: boolean
    read(size?: number): any
    setEncoding(encoding: BufferEncoding): this
    pause(): this
    resume(): this
    isPaused(): boolean
    unshift(chunk: any): void
    push(chunk: any, encoding?: BufferEncoding): boolean
    destroy(error?: Error): this
    [Symbol.asyncIterator](): AsyncIterableIterator<any>
    static from(iterable: Iterable<any> | AsyncIterable<any>, options?: any): Readable
  }
  class Writable extends Stream {
    constructor(options?: any)
    writable: boolean
    write(chunk: any, encoding?: BufferEncoding, callback?: (error?: Error | null) => void): boolean
    write(chunk: any, callback?: (error?: Error | null) => void): boolean
    end(chunk?: any, encoding?: BufferEncoding, callback?: () => void): this
    end(callback?: () => void): this
    destroy(error?: Error): this
  }
  class Duplex extends Readable {
    writable: boolean
    write(chunk: any, encoding?: BufferEncoding, callback?: (error?: Error | null) => void): boolean
    end(chunk?: any, encoding?: BufferEncoding, callback?: () => void): this
  }
  class Transform extends Duplex {}
  class PassThrough extends Transform {}
  export { Stream, Readable, Writable, Duplex, Transform, PassThrough }
  export default Stream
}

// ---------------------------------------------------------------------------
// fs / fs/promises
// ---------------------------------------------------------------------------

declare module "fs" {
  type PathLike = string
  type Mode = number | string
  interface Stats {
    isFile(): boolean
    isDirectory(): boolean
    isSymbolicLink(): boolean
    isBlockDevice(): boolean
    isCharacterDevice(): boolean
    isFIFO(): boolean
    isSocket(): boolean
    size: number
    mode: number
    mtimeMs: number
    atimeMs: number
    ctimeMs: number
    birthtimeMs: number
    mtime: Date
    atime: Date
    ctime: Date
    birthtime: Date
  }
  interface OpenDirOptions {
    encoding?: BufferEncoding | "buffer"
    bufferSize?: number
    recursive?: boolean
  }
  class Dir<Name extends string | Buffer = string> implements AsyncIterable<Dirent<Name>> {
    readonly path: string
    read(): Promise<Dirent<Name> | null>
    read(callback: (error: Error | null, entry: Dirent<Name> | null) => void): void
    readSync(): Dirent<Name> | null
    close(): Promise<void>
    close(callback: (error: Error | null) => void): void
    closeSync(): void
    [Symbol.asyncIterator](): AsyncIterator<Dirent<Name>>
  }
  function opendirSync(path: PathLike, options: OpenDirOptions & { encoding: "buffer" }): Dir<Buffer>
  function opendirSync(path: PathLike, options?: OpenDirOptions | BufferEncoding): Dir
  function opendir(path: PathLike, callback: (error: Error | null, dir: Dir) => void): void
  function opendir(path: PathLike, options: OpenDirOptions | BufferEncoding, callback: (error: Error | null, dir: Dir) => void): void
  class Dirent<Name extends string | Buffer = string> {
    name: Name
    readonly parentPath?: string
    readonly path?: string
    isFile(): boolean
    isDirectory(): boolean
    isSymbolicLink(): boolean
  }
  interface ReadFileOptions {
    encoding?: BufferEncoding | null
    flag?: string
  }
  interface WriteFileOptions {
    encoding?: BufferEncoding | null
    mode?: Mode
    flag?: string
  }
  type NoParamCallback = (err: NodeJS.ErrnoException | null) => void

  // sync
  function readFileSync(path: PathLike, options?: { encoding?: null; flag?: string } | null): Buffer
  function readFileSync(path: PathLike, options: { encoding: BufferEncoding; flag?: string } | BufferEncoding): string
  function writeFileSync(path: PathLike, data: string | Uint8Array, options?: WriteFileOptions | BufferEncoding): void
  function appendFileSync(path: PathLike, data: string | Uint8Array, options?: WriteFileOptions | BufferEncoding): void
  function existsSync(path: PathLike): boolean
  function mkdirSync(path: PathLike, options?: { recursive?: boolean; mode?: Mode } | Mode): string | undefined
  function rmSync(path: PathLike, options?: { recursive?: boolean; force?: boolean }): void
  function rmdirSync(path: PathLike, options?: { recursive?: boolean }): void
  function unlinkSync(path: PathLike): void
  function readdirSync(path: PathLike, options?: { encoding?: BufferEncoding; withFileTypes?: false } | BufferEncoding): string[]
  function readdirSync(path: PathLike, options: { withFileTypes: true }): Dirent[]
  function statSync(path: PathLike): Stats
  function lstatSync(path: PathLike): Stats
  function accessSync(path: PathLike, mode?: number): void
  function realpathSync(path: PathLike): string
  function readlinkSync(path: PathLike): string
  function renameSync(oldPath: PathLike, newPath: PathLike): void
  function copyFileSync(src: PathLike, dest: PathLike, mode?: number): void
  function symlinkSync(target: PathLike, path: PathLike, type?: string): void

  // callback
  function readFile(path: PathLike, options: { encoding: BufferEncoding; flag?: string } | BufferEncoding, callback: (err: NodeJS.ErrnoException | null, data: string) => void): void
  function readFile(path: PathLike, callback: (err: NodeJS.ErrnoException | null, data: Buffer) => void): void
  function writeFile(path: PathLike, data: string | Uint8Array, callback: NoParamCallback): void
  function writeFile(path: PathLike, data: string | Uint8Array, options: WriteFileOptions | BufferEncoding, callback: NoParamCallback): void
  function appendFile(path: PathLike, data: string | Uint8Array, callback: NoParamCallback): void
  function mkdir(path: PathLike, options: { recursive?: boolean; mode?: Mode } | Mode | undefined, callback: NoParamCallback): void
  function mkdir(path: PathLike, callback: NoParamCallback): void
  function rm(path: PathLike, options: { recursive?: boolean; force?: boolean }, callback: NoParamCallback): void
  function rm(path: PathLike, callback: NoParamCallback): void
  function unlink(path: PathLike, callback: NoParamCallback): void
  function readdir(path: PathLike, callback: (err: NodeJS.ErrnoException | null, files: string[]) => void): void
  function stat(path: PathLike, callback: (err: NodeJS.ErrnoException | null, stats: Stats) => void): void
  function rename(oldPath: PathLike, newPath: PathLike, callback: NoParamCallback): void
  function exists(path: PathLike, callback: (exists: boolean) => void): void

  const constants: {
    F_OK: number; R_OK: number; W_OK: number; X_OK: number
  }

  namespace promises {
    interface FileHandle {
      readonly fd: number
      createReadStream(options?: { encoding?: BufferEncoding; highWaterMark?: number; start?: number; end?: number; autoClose?: boolean; emitClose?: boolean }): import("stream").Readable
      readFile(options?: { encoding?: null } | null): Promise<Buffer>
      readFile(options: { encoding: BufferEncoding } | BufferEncoding): Promise<string>
      read(buffer: Uint8Array, offset?: number, length?: number, position?: number | null): Promise<{ bytesRead: number; buffer: Uint8Array }>
      close(): Promise<void>
      stat(): Promise<Stats>
      truncate(len?: number): Promise<void>
      sync(): Promise<void>
      datasync(): Promise<void>
    }
    function open(path: PathLike, flags?: string | number, mode?: Mode): Promise<FileHandle>
    function readFile(path: PathLike, options?: { encoding?: null; flag?: string } | null): Promise<Buffer>
    function readFile(path: PathLike, options: { encoding: BufferEncoding; flag?: string } | BufferEncoding): Promise<string>
    function writeFile(path: PathLike, data: string | Uint8Array, options?: WriteFileOptions | BufferEncoding): Promise<void>
    function appendFile(path: PathLike, data: string | Uint8Array, options?: WriteFileOptions | BufferEncoding): Promise<void>
    function mkdir(path: PathLike, options?: { recursive?: boolean; mode?: Mode } | Mode): Promise<string | undefined>
    function rm(path: PathLike, options?: { recursive?: boolean; force?: boolean }): Promise<void>
    function unlink(path: PathLike): Promise<void>
    function readdir(path: PathLike, options?: { encoding?: BufferEncoding; withFileTypes?: false } | BufferEncoding): Promise<string[]>
    function readdir(path: PathLike, options: { withFileTypes: true }): Promise<Dirent[]>
    function opendir(path: PathLike, options: OpenDirOptions & { encoding: "buffer" }): Promise<Dir<Buffer>>
    function opendir(path: PathLike, options?: OpenDirOptions | BufferEncoding): Promise<Dir>
    function stat(path: PathLike): Promise<Stats>
    function lstat(path: PathLike): Promise<Stats>
    function access(path: PathLike, mode?: number): Promise<void>
    function realpath(path: PathLike): Promise<string>
    function readlink(path: PathLike): Promise<string>
    function rename(oldPath: PathLike, newPath: PathLike): Promise<void>
    function copyFile(src: PathLike, dest: PathLike, mode?: number): Promise<void>
    function symlink(target: PathLike, path: PathLike, type?: string): Promise<void>
  }
}

declare module "fs/promises" {
  import { promises } from "fs"
  export = promises
}

// ---------------------------------------------------------------------------
// path
// ---------------------------------------------------------------------------

declare module "path" {
  interface ParsedPath {
    root: string
    dir: string
    base: string
    ext: string
    name: string
  }
  interface PathApi {
    normalize(p: string): string
    join(...paths: string[]): string
    resolve(...paths: string[]): string
    isAbsolute(p: string): boolean
    relative(from: string, to: string): string
    dirname(p: string): string
    basename(p: string, ext?: string): string
    extname(p: string): string
    parse(p: string): ParsedPath
    format(pathObject: Partial<ParsedPath>): string
    readonly sep: string
    readonly delimiter: string
    readonly posix: PathApi
    readonly win32: PathApi
  }
  const path: PathApi
  export = path
}

// ---------------------------------------------------------------------------
// os
// ---------------------------------------------------------------------------

declare module "os" {
  function platform(): string
  function arch(): string
  function type(): string
  function release(): string
  function hostname(): string
  function tmpdir(): string
  function homedir(): string
  function endianness(): "BE" | "LE"
  function cpus(): { model: string; speed: number; times: any }[]
  function totalmem(): number
  function freemem(): number
  function uptime(): number
  function userInfo(): { username: string; homedir: string; shell: string | null; uid: number; gid: number }
  const EOL: string
  const constants: any
}

// ---------------------------------------------------------------------------
// crypto
// ---------------------------------------------------------------------------

declare module "crypto" {
  /** Shares global crypto, including HKDF and the Scripting ChaCha20-Poly1305 extension. */
  const webcrypto: typeof crypto
  type BinaryLike = string | Uint8Array
  type Encoding = BufferEncoding

  interface Hash {
    update(data: BinaryLike, inputEncoding?: Encoding): Hash
    digest(): Buffer
    digest(encoding: Encoding): string
  }
  interface Hmac {
    update(data: BinaryLike, inputEncoding?: Encoding): Hmac
    digest(): Buffer
    digest(encoding: Encoding): string
  }
  interface Cipher {
    update(data: BinaryLike, inputEncoding?: Encoding, outputEncoding?: Encoding): any
    final(): Buffer
    final(outputEncoding: Encoding): string
    setAutoPadding(autoPadding?: boolean): this
    getAuthTag(): Buffer
    setAAD(buffer: Uint8Array): this
  }
  interface Decipher {
    update(data: BinaryLike, inputEncoding?: Encoding, outputEncoding?: Encoding): any
    final(): Buffer
    final(outputEncoding: Encoding): string
    setAutoPadding(autoPadding?: boolean): this
    setAuthTag(buffer: Uint8Array): this
    setAAD(buffer: Uint8Array): this
  }

  function createHash(algorithm: string): Hash
  function createHmac(algorithm: string, key: BinaryLike): Hmac
  function createCipheriv(algorithm: string, key: BinaryLike, iv: BinaryLike | null): Cipher
  function createDecipheriv(algorithm: string, key: BinaryLike, iv: BinaryLike | null): Decipher
  function randomBytes(size: number): Buffer
  function randomBytes(size: number, callback: (err: Error | null, buf: Buffer) => void): void
  function randomFillSync(buffer: Uint8Array, offset?: number, size?: number): Uint8Array
  function randomInt(max: number): number
  function randomInt(min: number, max: number): number
  function randomUUID(): string
  function pbkdf2Sync(password: BinaryLike, salt: BinaryLike, iterations: number, keylen: number, digest: string): Buffer
  function pbkdf2(password: BinaryLike, salt: BinaryLike, iterations: number, keylen: number, digest: string, callback: (err: Error | null, derivedKey: Buffer) => void): void
  function createSign(algorithm: string): any
  function createVerify(algorithm: string): any
  function getHashes(): string[]
  function getCiphers(): string[]
}

// ---------------------------------------------------------------------------
// util
// ---------------------------------------------------------------------------

declare module "util" {
  function format(format: any, ...args: any[]): string
  function inspect(object: any, options?: any): string
  function promisify<T = any>(fn: (...args: any[]) => void): (...args: any[]) => Promise<T>
  function callbackify(fn: (...args: any[]) => Promise<any>): (...args: any[]) => void
  function inherits(constructor: any, superConstructor: any): void
  function deprecate<T extends (...args: any[]) => any>(fn: T, msg: string): T
  function isDeepStrictEqual(a: any, b: any): boolean
  /** Modern compatibility extension; runtime baseline remains Node 20.0.0. */
  function styleText(format: string | string[], text: string, options?: {validateStream?: boolean; stream?: {isTTY?: boolean}}): string
  class TextEncoder {
    encode(input?: string): Uint8Array
    readonly encoding: string
  }
  class TextDecoder {
    constructor(encoding?: string, options?: any)
    decode(input?: Uint8Array, options?: any): string
    readonly encoding: string
  }
  namespace types {
    function isUint8Array(value: any): boolean
    function isArrayBuffer(value: any): boolean
    function isTypedArray(value: any): boolean
  }
}

// ---------------------------------------------------------------------------
// url
// ---------------------------------------------------------------------------

declare module "url" {
  interface UrlObject {
    protocol?: string | null
    host?: string | null
    hostname?: string | null
    port?: string | number | null
    pathname?: string | null
    search?: string | null
    query?: string | Record<string, any> | null
    hash?: string | null
    href?: string
  }
  function parse(urlStr: string, parseQueryString?: boolean): UrlObject
  function format(urlObject: UrlObject | URL): string
  function resolve(from: string, to: string): string
  const URL: typeof globalThis.URL
  const URLSearchParams: typeof globalThis.URLSearchParams
}

// ---------------------------------------------------------------------------
// querystring
// ---------------------------------------------------------------------------

declare module "querystring" {
  type ParsedUrlQuery = Record<string, string | string[]>
  function parse(str: string, sep?: string, eq?: string): ParsedUrlQuery
  function stringify(obj: Record<string, any>, sep?: string, eq?: string): string
  function escape(str: string): string
  function unescape(str: string): string
}

// ---------------------------------------------------------------------------
// assert
// ---------------------------------------------------------------------------

declare module "assert" {
  function assert(value: any, message?: string | Error): asserts value
  namespace assert {
    function ok(value: any, message?: string | Error): asserts value
    function equal(actual: any, expected: any, message?: string | Error): void
    function strictEqual<T>(actual: any, expected: T, message?: string | Error): asserts actual is T
    function deepEqual(actual: any, expected: any, message?: string | Error): void
    function deepStrictEqual(actual: any, expected: any, message?: string | Error): void
    function notEqual(actual: any, expected: any, message?: string | Error): void
    function throws(fn: () => void, message?: string | Error): void
    function fail(message?: string | Error): never
  }
  export = assert
}

// ---------------------------------------------------------------------------
// string_decoder
// ---------------------------------------------------------------------------

declare module "string_decoder" {
  class StringDecoder {
    constructor(encoding?: BufferEncoding)
    write(buffer: Uint8Array): string
    end(buffer?: Uint8Array): string
  }
  export { StringDecoder }
}

// ---------------------------------------------------------------------------
// http / https  (client only — createServer throws at runtime)
// ---------------------------------------------------------------------------

declare module "http" {
  import { Readable, Writable } from "stream"

  interface IncomingHttpHeaders {
    [header: string]: string | string[] | undefined
  }
  interface RequestOptions {
    protocol?: string
    host?: string
    hostname?: string
    port?: number | string
    method?: string
    path?: string
    headers?: Record<string, string | number | string[]>
    timeout?: number
    auth?: string
  }
  class IncomingMessage extends Readable {
    statusCode?: number
    statusMessage?: string
    headers: IncomingHttpHeaders
    rawHeaders: string[]
    httpVersion: string
    url?: string
    method?: string
  }
  class ClientRequest extends Writable {
    setHeader(name: string, value: string | number | string[]): this
    getHeader(name: string): string | number | string[] | undefined
    removeHeader(name: string): void
    setTimeout(timeout: number, callback?: () => void): this
    abort(): void
    on(event: "response", listener: (response: IncomingMessage) => void): this
    on(event: "error", listener: (err: Error) => void): this
    on(event: string, listener: (...args: any[]) => void): this
  }
  function request(options: RequestOptions | string, callback?: (res: IncomingMessage) => void): ClientRequest
  function request(url: string, options: RequestOptions, callback?: (res: IncomingMessage) => void): ClientRequest
  function get(options: RequestOptions | string, callback?: (res: IncomingMessage) => void): ClientRequest
  function get(url: string, options: RequestOptions, callback?: (res: IncomingMessage) => void): ClientRequest
  const METHODS: string[]
  const STATUS_CODES: Record<number, string>
  class Agent { constructor(options?: any) }
  const globalAgent: Agent

  // Server side. Responses are buffered (not streamed) and require the full runtime.
  class ServerResponse extends Writable {
    statusCode: number
    statusMessage: string
    headersSent: boolean
    setHeader(name: string, value: string | number | string[]): this
    getHeader(name: string): string | number | string[] | undefined
    removeHeader(name: string): void
    writeHead(statusCode: number, statusMessage?: string, headers?: Record<string, string | number | string[]>): this
    writeHead(statusCode: number, headers?: Record<string, string | number | string[]>): this
    end(chunk?: any, encoding?: BufferEncoding, callback?: () => void): this
  }
  class Server {
    listen(port?: number, hostname?: string, callback?: () => void): this
    listen(port?: number, callback?: () => void): this
    close(callback?: () => void): this
    address(): { port: number, address: string, family: string } | null
    on(event: "request", listener: (req: IncomingMessage, res: ServerResponse) => void): this
    on(event: "listening" | "close", listener: () => void): this
    on(event: "error", listener: (err: Error) => void): this
    on(event: string, listener: (...args: any[]) => void): this
  }
  function createServer(requestListener?: (req: IncomingMessage, res: ServerResponse) => void): Server
}

declare module "https" {
  import * as http from "http"
  export import IncomingMessage = http.IncomingMessage
  export import ClientRequest = http.ClientRequest
  export import RequestOptions = http.RequestOptions
  export import Agent = http.Agent
  export import Server = http.Server
  export import ServerResponse = http.ServerResponse
  function request(options: http.RequestOptions | string, callback?: (res: http.IncomingMessage) => void): http.ClientRequest
  function request(url: string, options: http.RequestOptions, callback?: (res: http.IncomingMessage) => void): http.ClientRequest
  function get(options: http.RequestOptions | string, callback?: (res: http.IncomingMessage) => void): http.ClientRequest
  function get(url: string, options: http.RequestOptions, callback?: (res: http.IncomingMessage) => void): http.ClientRequest
  function createServer(requestListener?: (req: http.IncomingMessage, res: http.ServerResponse) => void): http.Server
}

// ---------------------------------------------------------------------------
// timers
// ---------------------------------------------------------------------------

declare module "timers" {
  function setTimeout(callback: (...args: any[]) => void, ms?: number, ...args: any[]): NodeJS.Timeout
  function clearTimeout(timeout: NodeJS.Timeout): void
  function setInterval(callback: (...args: any[]) => void, ms?: number, ...args: any[]): NodeJS.Timeout
  function clearInterval(interval: NodeJS.Timeout): void
  function setImmediate(callback: (...args: any[]) => void, ...args: any[]): NodeJS.Immediate
  function clearImmediate(immediate: NodeJS.Immediate): void
}

// ---------------------------------------------------------------------------
// zlib  (gzip / deflate / inflate — sync, async-callback, and stream forms.
//        No brotli: the runtime has no brotli backend, so it isn't declared.)
// ---------------------------------------------------------------------------

declare module "zlib" {
  import { Transform } from "stream"

  interface ZlibOptions {
    level?: number
    chunkSize?: number
    windowBits?: number
    memLevel?: number
    strategy?: number
    dictionary?: Uint8Array
  }
  type InputType = string | Uint8Array | ArrayBuffer

  class Gzip extends Transform {}
  class Gunzip extends Transform {}
  class Deflate extends Transform {}
  class Inflate extends Transform {}
  class DeflateRaw extends Transform {}
  class InflateRaw extends Transform {}
  class Unzip extends Transform {}

  function createGzip(options?: ZlibOptions): Gzip
  function createGunzip(options?: ZlibOptions): Gunzip
  function createDeflate(options?: ZlibOptions): Deflate
  function createInflate(options?: ZlibOptions): Inflate
  function createDeflateRaw(options?: ZlibOptions): DeflateRaw
  function createInflateRaw(options?: ZlibOptions): InflateRaw
  function createUnzip(options?: ZlibOptions): Unzip

  type ZlibCallback = (error: Error | null, result: Buffer) => void
  function gzip(buf: InputType, callback: ZlibCallback): void
  function gzip(buf: InputType, options: ZlibOptions, callback: ZlibCallback): void
  function gunzip(buf: InputType, callback: ZlibCallback): void
  function gunzip(buf: InputType, options: ZlibOptions, callback: ZlibCallback): void
  function deflate(buf: InputType, callback: ZlibCallback): void
  function deflate(buf: InputType, options: ZlibOptions, callback: ZlibCallback): void
  function inflate(buf: InputType, callback: ZlibCallback): void
  function inflate(buf: InputType, options: ZlibOptions, callback: ZlibCallback): void
  function deflateRaw(buf: InputType, callback: ZlibCallback): void
  function deflateRaw(buf: InputType, options: ZlibOptions, callback: ZlibCallback): void
  function inflateRaw(buf: InputType, callback: ZlibCallback): void
  function inflateRaw(buf: InputType, options: ZlibOptions, callback: ZlibCallback): void
  function unzip(buf: InputType, callback: ZlibCallback): void
  function unzip(buf: InputType, options: ZlibOptions, callback: ZlibCallback): void

  function gzipSync(buf: InputType, options?: ZlibOptions): Buffer
  function gunzipSync(buf: InputType, options?: ZlibOptions): Buffer
  function deflateSync(buf: InputType, options?: ZlibOptions): Buffer
  function inflateSync(buf: InputType, options?: ZlibOptions): Buffer
  function deflateRawSync(buf: InputType, options?: ZlibOptions): Buffer
  function inflateRawSync(buf: InputType, options?: ZlibOptions): Buffer
  function unzipSync(buf: InputType, options?: ZlibOptions): Buffer

  // Zlib constants are exposed both at the top level and under `zlib.constants`.
  const Z_NO_FLUSH: number
  const Z_PARTIAL_FLUSH: number
  const Z_SYNC_FLUSH: number
  const Z_FULL_FLUSH: number
  const Z_FINISH: number
  const Z_BLOCK: number
  const Z_NO_COMPRESSION: number
  const Z_BEST_SPEED: number
  const Z_BEST_COMPRESSION: number
  const Z_DEFAULT_COMPRESSION: number
  const Z_FILTERED: number
  const Z_HUFFMAN_ONLY: number
  const Z_RLE: number
  const Z_FIXED: number
  const Z_DEFAULT_STRATEGY: number

  const constants: {
    Z_NO_FLUSH: number
    Z_PARTIAL_FLUSH: number
    Z_SYNC_FLUSH: number
    Z_FULL_FLUSH: number
    Z_FINISH: number
    Z_BLOCK: number
    Z_NO_COMPRESSION: number
    Z_BEST_SPEED: number
    Z_BEST_COMPRESSION: number
    Z_DEFAULT_COMPRESSION: number
    Z_FILTERED: number
    Z_HUFFMAN_ONLY: number
    Z_RLE: number
    Z_FIXED: number
    Z_DEFAULT_STRATEGY: number
    [key: string]: number
  }
}

// ---------------------------------------------------------------------------
// vm  (evaluate code in an isolated child JSContext sharing the same VM —
//      isolated globals, values/functions/objects pass through directly.
//      runInThisContext is plain indirect eval in the current context.)
// ---------------------------------------------------------------------------

declare module "vm" {
  interface Context {
    [key: string]: any
  }
  interface RunningScriptOptions {
    filename?: string
    timeout?: number
  }
  class Script {
    constructor(code: string, options?: RunningScriptOptions)
    runInThisContext(options?: RunningScriptOptions): any
    runInContext(contextifiedSandbox: Context, options?: RunningScriptOptions): any
    runInNewContext(sandbox?: Context, options?: RunningScriptOptions): any
  }
  function runInThisContext(code: string, options?: RunningScriptOptions): any
  function runInContext(code: string, contextifiedSandbox: Context, options?: RunningScriptOptions): any
  function runInNewContext(code: string, sandbox?: Context, options?: RunningScriptOptions): any
  function createContext(sandbox?: Context): Context
  function isContext(sandbox: Context): boolean
}

// ---------------------------------------------------------------------------
// node: prefixed aliases
// ---------------------------------------------------------------------------

declare module "node:buffer" { export * from "buffer" }
declare module "node:events" { import e = require("events"); export = e }
declare module "node:stream" { export * from "stream"; import s from "stream"; export default s }
declare module "node:fs" { export * from "fs" }
declare module "node:fs/promises" { import p = require("fs/promises"); export = p }
declare module "node:path" { import p = require("path"); export = p }
declare module "node:os" { export * from "os" }
declare module "node:crypto" { export * from "crypto" }
declare module "node:util" { export * from "util" }
declare module "node:url" { export * from "url" }
declare module "node:querystring" { export * from "querystring" }
declare module "node:assert" { import a = require("assert"); export = a }
declare module "node:string_decoder" { export * from "string_decoder" }
declare module "node:http" { export * from "http" }
declare module "node:https" { export * from "https" }
declare module "node:timers" { export * from "timers" }
declare module "node:zlib" { export * from "zlib" }
declare module "node:vm" { export * from "vm" }

declare namespace NodeJS {
  interface ErrnoException extends Error {
    errno?: number
    code?: string
    path?: string
    syscall?: string
  }
}

// ---------------------------------------------------------------------------
// net: bounded TCP client (full Scripting runtime, main JS execution queue)
// ---------------------------------------------------------------------------
declare module "net" {
  import { Duplex } from "stream"
  interface SocketOptions {
    allowHalfOpen?: boolean
    highWaterMark?: number
    readableHighWaterMark?: number
    writableHighWaterMark?: number
    noDelay?: boolean
    keepAlive?: boolean
    keepAliveInitialDelay?: number
  }
  interface TCPConnectOptions extends SocketOptions {
    port: number
    host?: string
    family?: 0 | 4 | 6
    lookup?: (hostname: string, options: { family: 0 | 4 | 6; hints: 0; all: false }, callback: (error: Error | null, address?: string, family?: 4 | 6) => void) => void
    timeout?: number
    signal?: AbortSignal
  }
  interface AddressInfo { address: string; family: "IPv4" | "IPv6"; port: number }
  class Socket extends Duplex {
    constructor(options?: SocketOptions)
    connect(options: TCPConnectOptions, listener?: () => void): this
    connect(port: number, host?: string, listener?: () => void): this
    connect(port: number, listener?: () => void): this
    write(data: string | Uint8Array, callback?: (error?: Error | null) => void): boolean
    write(data: string | Uint8Array, encoding?: BufferEncoding, callback?: (error?: Error | null) => void): boolean
    end(callback?: (error?: Error) => void): this
    end(data?: string | Uint8Array, callback?: (error?: Error) => void): this
    end(data?: string | Uint8Array, encoding?: BufferEncoding, callback?: (error?: Error) => void): this
    setTimeout(timeout: number, callback?: () => void): this
    /** Configure before connect; post-connect changes explicitly reject. */
    setNoDelay(noDelay?: boolean): this
    /** Configure before connect; post-connect changes explicitly reject. */
    setKeepAlive(enable?: boolean, initialDelay?: number): this
    destroySoon(): this
    address(): AddressInfo | Record<string, never>
    readonly connecting: boolean
    readonly pending: boolean
    readonly bytesRead: number
    readonly bytesWritten: number
    readonly bufferSize: number
    readonly timeout: number
    readonly readableLength: number
    readonly writableLength: number
    readonly readableEnded: boolean
    readonly writableEnded: boolean
    readonly writableFinished: boolean
    readonly destroyed: boolean
    readonly localAddress: string | undefined
    readonly localPort: number | undefined
    readonly localFamily: "IPv4" | "IPv6" | undefined
    readonly remoteAddress: string | undefined
    readonly remotePort: number | undefined
    readonly remoteFamily: "IPv4" | "IPv6" | undefined
    readonly readyState: "opening" | "open" | "readOnly" | "writeOnly" | "closed"
    on(event: "close", listener: (hadError: boolean) => void): this
    on(event: "lookup", listener: (error: Error | null, address: string | undefined, family: number | undefined, host: string) => void): this
    on(event: "data", listener: (data: Buffer | string) => void): this
    on(event: "error", listener: (error: Error & { code?: string; errno?: number; syscall?: string; address?: string; port?: number }) => void): this
    on(event: string | symbol, listener: (...args: any[]) => void): this
  }
  function createConnection(options: TCPConnectOptions, listener?: () => void): Socket
  function createConnection(port: number, host?: string, listener?: () => void): Socket
  function createConnection(port: number, listener?: () => void): Socket
  function connect(options: TCPConnectOptions, listener?: () => void): Socket
  function connect(port: number, host?: string, listener?: () => void): Socket
  function connect(port: number, listener?: () => void): Socket
  function isIP(input: unknown): 0 | 4 | 6
  function isIPv4(input: unknown): boolean
  function isIPv6(input: unknown): boolean
}
declare module "node:net" { export * from "net" }

declare module "tls" {
  import {Socket,TCPConnectOptions} from "net"
  interface ConnectionOptions extends TCPConnectOptions {
    servername?: string
    ca?: string | Uint8Array | (string | Uint8Array)[]
    ALPNProtocols?: string[]
    minVersion?: "TLSv1.2" | "TLSv1.3"
    maxVersion?: "TLSv1.2" | "TLSv1.3"
    rejectUnauthorized?: true
  }
  interface CipherNameAndProtocol {name: string; standardName: string; version: string}
  interface PeerCertificate {raw?: Buffer; fingerprint256?: string}
  class TLSSocket extends Socket {
    private constructor()
    readonly encrypted: true
    readonly authorized: boolean
    readonly authorizationError: string | null | undefined
    readonly alpnProtocol: string | false
    readonly servername: string | false
    getProtocol(): string | null
    getCipher(): CipherNameAndProtocol | null
    getPeerCertificate(detailed?: false): PeerCertificate
    on(event: "secureConnect", listener: () => void): this
    on(event: string | symbol, listener: (...args: any[]) => void): this
    once(event: "secureConnect", listener: () => void): this
    once(event: string | symbol, listener: (...args: any[]) => void): this
  }
  function connect(options: ConnectionOptions, listener?: () => void): TLSSocket
  function connect(port: number, host: string, options: Omit<ConnectionOptions,"port"|"host">, listener?: () => void): TLSSocket
  function connect(port: number, host: string, listener?: () => void): TLSSocket
  function connect(port: number, options: Omit<ConnectionOptions,"port"|"host">, listener?: () => void): TLSSocket
  function connect(port: number, listener?: () => void): TLSSocket
  const DEFAULT_MIN_VERSION: "TLSv1.2"
  const DEFAULT_MAX_VERSION: "TLSv1.3"
}
declare module "node:tls" {export * from "tls"}
