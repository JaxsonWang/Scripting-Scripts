import { fetch } from 'scripting'

const DEFAULT_UA = 'netdisk;7.2.1;PC;PC-Windows;10.0.19043;WindowsBaiduYunGuanJia'
const DEFAULT_PDF_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export interface BaiduFile {
  fs_id: number
  path: string
  server_filename: string
  size: number
  isdir: number
  category: number
  local_ctime: number
  local_mtime: number
  server_ctime: number
  server_mtime: number
  thumbs?: { [key: string]: string }
  dlink?: string
  // 辅助字段
  selected?: boolean
  relativePath?: string
}

export class BaiduDiskClient {
  cookie: string
  clientIP: string
  bdstoken: string
  commonHeaders: Record<string, string>

  constructor(cookie: string, clientIP: string = '127.0.0.1') {
    this.cookie = cookie || ''
    this.clientIP = clientIP
    this.bdstoken = ''
    this.commonHeaders = {
      'User-Agent': DEFAULT_UA,
      Cookie: this.cookie,
      Referer: 'https://pan.baidu.com/',
      'X-Forwarded-For': this.clientIP,
      'X-BS-Client-IP': this.clientIP,
      'X-Real-IP': this.clientIP
    }
  }

  updateCookies(setCookieHeader: string | string[] | null) {
    if (!setCookieHeader) return

    // Handle string or array of strings
    const cookiesToSet = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
    if (cookiesToSet.length === 0) return

    const cookieMap = new Map<string, string>()
    // 1. Parse old cookies
    this.cookie.split(';').forEach(pair => {
      const idx = pair.indexOf('=')
      if (idx > -1) {
        const k = pair.substring(0, idx).trim()
        const v = pair.substring(idx + 1).trim()
        if (k) cookieMap.set(k, v)
      }
    })

    let hasChange = false
    // 2. Iterate new Set-Cookie
    // Note: Scripting fetch might return Set-Cookie as array or string.
    // We assume standard behavior or comma separated if string.

    for (const cookieStr of cookiesToSet) {
      // Simple parsing, taking the part before first ';'
      const parts = cookieStr.split(';')
      const firstPart = parts[0]
      const idx = firstPart.indexOf('=')
      if (idx > -1) {
        const k = firstPart.substring(0, idx).trim()
        const v = firstPart.substring(idx + 1).trim()

        if (k === '' || k.toLowerCase() === 'path' || k.toLowerCase() === 'domain') continue

        if (cookieMap.get(k) !== v) {
          cookieMap.set(k, v)
          hasChange = true
        }
      }
    }

    // 3. Save if changed
    if (hasChange) {
      const newCookieStr = Array.from(cookieMap.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join('; ')

      this.cookie = newCookieStr
      this.commonHeaders['Cookie'] = newCookieStr
    }
  }

  async fetchJson(url: string, options: any = {}, shouldUpdateCookies = false) {
    const headers = { ...this.commonHeaders, ...options.headers }
    try {
      const resp = await fetch(url, { ...options, headers })
      if (shouldUpdateCookies) {
        // Scripting's fetch response might differ slightly, let's check headers
        // Usually headers.get('set-cookie') returns a string
        // If strictly Headers object:
        const setCookie = resp.headers.get('set-cookie')
        this.updateCookies(setCookie)
      }
      const data = await resp.json()
      return data
    } catch (e) {
      console.error(`Fetch error: ${url}`, e)
      throw e
    }
  }

  async init() {
    const api =
      'https://pan.baidu.com/api/gettemplatevariable?clienttype=12&app_id=web=1&fields=[%22bdstoken%22,%22token%22,%22uk%22,%22isdocuser%22,%22servertime%22]'
    try {
      const data = await this.fetchJson(api, undefined, true)
      if (data.errno === 0 && data.result) {
        this.bdstoken = data.result.bdstoken
        // Update STOKEN
        const pcsUrls = [
          'https://pcs.baidu.com/rest/2.0/pcs/file?method=plantcookie&type=ett',
          'https://pcs.baidu.com/rest/2.0/pcs/file?method=plantcookie&type=stoken&source=pcs'
        ]
        for (const api of pcsUrls) {
          const resp = await fetch(api, { headers: this.commonHeaders })
          const setCookie = resp.headers.get('set-cookie')
          this.updateCookies(setCookie)
          // await resp.body.cancel(); // Not needed/supported in all fetch implementations
        }

        return true
      }
      return false
    } catch (e) {
      console.error('Init failed', e)
      return false
    }
  }

  static async getSharedList(surl: string, pwd: string, dir: string | null = null) {
    const api = 'https://pan.baidu.com/share/wxlist?channel=weixin&version=2.2.3&clienttype=25&web=1&qq-pf-to=pcqq.c2c'

    const params: string[] = [`shorturl=${encodeURIComponent(surl)}`, `pwd=${encodeURIComponent(pwd)}`, 'page=1', 'number=1000', 'order=time']

    if (dir) {
      params.push('root=0', `dir=${encodeURIComponent(dir)}`)
    } else {
      params.push('root=1')
    }

    const body = params.join('&')

    const headers = {
      'User-Agent': 'pan.baidu.com',
      Cookie: 'XFI=a5670f2f-f8ea-321f-0e65-2aa7030459eb; XFCS=945BEA7DFA30AC8B92389217A688C31B247D394739411C7F697F23C4660EB72F;',
      'Content-Type': 'application/x-www-form-urlencoded'
    }

    const resp = await fetch(api, { method: 'POST', body, headers })
    const data = await resp.json()
    if (data.errno !== 0) throw new Error(`List error: ${data.errno}`)
    return data
  }

  async createDir(path: string) {
    const api = `https://pan.baidu.com/api/create?a=commit&clienttype=0&app_id=250528&web=1&bdstoken=${this.bdstoken}`
    const formData = new FormData()
    formData.append('path', path)
    formData.append('isdir', '1')
    formData.append('block_list', '[]')
    const data = await this.fetchJson(api, { method: 'POST', body: formData })
    if (data.errno !== 0) throw new Error(`Create dir failed: ${data.errno}`)
    return data.path
  }

  async transferFiles(fsids: number[], shareid: number, uk: number, sekey: string, destPath: string) {
    const api = `https://pan.baidu.com/share/transfer?shareid=${shareid}&from=${uk}&sekey=${sekey}&ondup=newcopy&async=1&channel=chunlei&web=1&app_id=250528&clienttype=0&bdstoken=${this.bdstoken}`
    const formData = new FormData()
    formData.append('fsidlist', `[${fsids.join(',')}]`)
    formData.append('path', destPath)
    const data = await this.fetchJson(api, { method: 'POST', body: formData })
    if (data.errno !== 0) throw new Error(`Transfer failed: ${data.errno} - ${data.show_msg || ''}`)
    return data
  }

  async listFiles(dir: string) {
    const api = `https://pan.baidu.com/api/list?clienttype=0&app_id=250528&web=1&order=name&desc=0&dir=${encodeURIComponent(dir)}&num=1000&page=1`
    const data = await this.fetchJson(api)
    if (data.errno !== 0) return []
    return (data.list || []) as BaiduFile[]
  }

  async renameFile(path: string, newName: string) {
    const api = `https://pan.baidu.com/api/filemanager?opera=rename&async=2&onnest=fail&channel=chunlei&web=1&app_id=250528&clienttype=0&bdstoken=${this.bdstoken}`
    const formData = new FormData()
    formData.append('filelist', JSON.stringify([{ path, newname: newName }]))
    const data = await this.fetchJson(api, { method: 'POST', body: formData })
    return data.errno === 0
  }

  async deleteFiles(paths: string[]) {
    const api = `https://pan.baidu.com/api/filemanager?opera=delete&async=2&onnest=fail&channel=chunlei&web=1&app_id=250528&clienttype=0&bdstoken=${this.bdstoken}`
    const formData = new FormData()
    formData.append('filelist', JSON.stringify(paths))
    await this.fetchJson(api, { method: 'POST', body: formData })
  }

  async getSmallFileLink(path: string, customUA: string) {
    // UUID.string() from Scripting
    const logid = Data.fromRawString(UUID.string())?.toBase64String() || ''
    const api = `https://pan.baidu.com/api/locatedownload?clienttype=0&app_id=250528&web=1&channel=chunlei&logid=${logid}&path=${encodeURIComponent(path)}&origin=pdf&use=1`
    const headers = { ...this.commonHeaders, 'User-Agent': customUA }
    const resp = await fetch(api, { headers })
    const data = await resp.json()
    if (data.errno === 0) return data.dlink
    throw new Error(`Errno ${data.errno}`)
  }
}

export function getShareInfo(link: string) {
  const text = link.trim()
  let surl = '',
    pwd = ''

  let m = text.match(/(?:^|\s)(?:https?:\/\/)?(?:pan|yun)\.baidu\.com\/s\/([\w-]+)/)
  if (m) {
    surl = m[1]
  } else {
    m = text.match(/(?:^|\s)(?:https?:\/\/)?(?:pan|yun)\.baidu\.com\/share\/init\?.*surl=([\w-]+)/)
    if (m) surl = '1' + m[1]
  }

  m = text.match(/[?&]pwd=([a-zA-Z0-9]{4})\b/)

  if (!m) {
    m = text.match(/(?:pwd|码|code)[\s:：=]+([a-zA-Z0-9]{4})\b/i)
  }

  if (m) pwd = m[1]

  if (!surl) throw new Error('无效的百度网盘链接 (Invalid Link)')

  return { surl, pwd }
}
