import type { RedirectRequest } from 'scripting'
import type { RoomTarget } from '../types'

/**
 * 读取短链的重定向地址：拦截第一次跳转，返回其目标 URL。
 * @param url b23.tv / v.douyin.com 等短链
 */
const resolveRedirect = async (url: string): Promise<string> => {
  let location = ''
  await fetch(url, {
    method: 'GET',
    timeout: 10,
    headers: {
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    },
    handleRedirect: async (request: RedirectRequest) => {
      location = request.url
      return null
    }
  })
  return location
}

const firstMatch = (text: string, pattern: RegExp): string => pattern.exec(text)?.[1] ?? ''

/**
 * 从分享文本或链接中解析平台与房间号，规则与上游「链接解析」一致：
 * 支持 bilibili.com / b23.tv、douyu.com（含 topic 的 rid 参数）、huya.com、live.douyin.com、webcast.amemv.com、v.douyin.com。
 * @param input 用户粘贴的文本
 * @returns 解析结果；无法识别时返回 null
 */
export const parseRoomLink = async (input: string): Promise<RoomTarget | null> => {
  const text = input.trim()
  if (!text) return null
  if (text.includes('bilibili.com')) {
    const roomId = firstMatch(text, /bilibili\.com\/(\w+)/)
    return roomId ? { siteId: 'bilibili', roomId } : null
  }
  if (text.includes('b23.tv')) {
    const short = /https?:\/\/b23\.tv\/[0-9a-zA-Z-]+/.exec(text)?.[0]
    return short ? parseRoomLink(await resolveRedirect(short)) : null
  }
  if (text.includes('douyu.com')) {
    const roomId = text.includes('topic') ? firstMatch(text, /[?&]rid=(\d+)/) : firstMatch(text, /douyu\.com\/(\w+)/)
    return roomId ? { siteId: 'douyu', roomId } : null
  }
  if (text.includes('huya.com')) {
    const roomId = firstMatch(text, /huya\.com\/(\w+)/)
    return roomId ? { siteId: 'huya', roomId } : null
  }
  if (text.includes('live.douyin.com')) {
    const roomId = firstMatch(text, /live\.douyin\.com\/(\w+)/)
    return roomId ? { siteId: 'douyin', roomId } : null
  }
  if (text.includes('webcast.amemv.com')) {
    const roomId = firstMatch(text, /reflow\/(\d+)/)
    return roomId ? { siteId: 'douyin', roomId } : null
  }
  if (text.includes('v.douyin.com')) {
    const short = /https?:\/\/v\.douyin\.com\/[\w-]+\/?/.exec(text)?.[0]
    return short ? parseRoomLink(await resolveRedirect(short)) : null
  }
  return null
}
