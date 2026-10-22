import { Path, Script } from 'scripting'

/** 官方签名脚本在无登录 Cookie、无原生消息桥的临时网页中执行，CSP 禁止额外资源请求。 */
export const signDouyu = async (source: string, roomId: string, did: string): Promise<string> => {
  const [core, md5] = await Promise.all(['core.js', 'md5.js'].map(file => FileManager.readAsString(Path.join(Script.directory, 'assets', 'crypto-js', file))))
  const web = new WebViewController({ ephemeral: true })
  try {
    const loaded = await web.loadHTML(
      `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-eval'"></head><body></body></html>`
    )
    if (!loaded) throw new Error('斗鱼签名环境加载失败')
    return await web.evaluateJavaScript<string>(`
      ${core}
      ${md5}
      ${source}
      return ub98484234(${JSON.stringify(roomId)}, ${JSON.stringify(did)}, ${JSON.stringify(String(Math.floor(Date.now() / 1000)))});
    `)
  } finally {
    web.dispose()
  }
}
