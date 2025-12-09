import { fetch } from 'scripting'
import { storage } from './storage'

interface Aria2Task {
  url: string
  outPath: string
  userAgent?: string
}

export const sendToAria2 = async (task: Aria2Task) => {
  const aria2Url = storage.get('aria2Url') || 'http://localhost:6800/jsonrpc'
  const aria2Token = storage.get('aria2Token')

  const ua = task.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

  const payload = {
    jsonrpc: '2.0',
    method: 'aria2.addUri',
    id: Date.now().toString(),
    params: [aria2Token ? `token:${aria2Token}` : undefined, [task.url], { out: task.outPath, 'user-agent': ua }].filter(x => x !== undefined)
  }

  const res = await fetch(aria2Url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.result
}
