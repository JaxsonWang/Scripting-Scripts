import { fetch } from 'scripting'
import { createStorageManager } from './storage'

// 群晖服务存储管理
const SYNOLOGY_STORAGE_NAME = 'ScriptPie.SynologyWidget'
const synologyStorageManager = createStorageManager(SYNOLOGY_STORAGE_NAME)

// 存储键
export const STORAGE_KEYS = {
  NAS_IP: 'nasIp',
  NAS_PORT: 'nasPort',
  USE_HTTPS: 'useHttps',
  USERNAME: 'username',
  PASSWORD: 'password',
  SESSION_ID: 'sessionId',
  LAST_LOGIN_TIME: 'lastLoginTime',
  LAST_NETWORK_DATA: 'lastNetworkData',
  LAST_NETWORK_TIME: 'lastNetworkTime'
}

// 网络速率缓存（用于计算速率差值）
let lastNetworkBytes: { tx: number; rx: number; timestamp: number } | null = null

// 群晖连接配置接口
export interface SynologyConfig {
  nasIp: string
  nasPort: string
  useHttps: boolean
  username: string
  password: string
}

// DSM 信息接口
export interface DSMInfo {
  model: string
  version_string: string
  uptime: number
}

// 系统日志接口
export interface SystemLog {
  items: Array<{
    time: string
    descr: string
  }>
}

// 系统利用率数据接口
export interface SystemUtilization {
  cpu: {
    '1min_load': number
    '5min_load': number
    '15min_load': number
    user_load: number
    system_load: number
    other_load: number
  }
  memory: {
    memory_size: number
    avail_real: number
    avail_swap: number
    cached: number
    real_usage: number
    swap_usage: number
  }
  network: Array<{
    device: string
    tx_bytes: number
    rx_bytes: number
  }>
}

// 存储信息数据接口
export interface StorageInfo {
  disks: Array<{
    id: string
    name: string
    model: string
    temp: number
    status: string
    size_total: number
  }>
  volumes: Array<{
    id: string
    status: string
    size: {
      total: string
      used: string
    }
  }>
}

// 网络速率数据接口
export interface NetworkSpeed {
  uploadSpeed: number // 上传速率 bytes/s
  downloadSpeed: number // 下载速率 bytes/s
  totalTx: number // 总发送字节
  totalRx: number // 总接收字节
}

// 连接状态数据接口
export interface ConnectionStatus {
  isOnline: boolean
  latency: number // 延迟 ms
}

// 仪表盘汇总数据接口
export interface DashboardData {
  dsmInfo: DSMInfo | null
  cpuUsage: number // CPU 使用率 0-100
  memoryUsage: number // 内存使用率 0-100
  diskUsage: number // 磁盘使用率 0-100
  diskUsedGB: number // 已用空间 GB
  diskTotalGB: number // 总空间 GB
  networkSpeed: NetworkSpeed // 网络速率
  connectionStatus: ConnectionStatus // 连接状态
  lastUpdateTime: Date // 最后更新时间
}

/**
 * 获取当前群晖配置
 */
export function getCurrentSynologyConfig(): SynologyConfig {
  return {
    nasIp: synologyStorageManager.storage.get<string>(STORAGE_KEYS.NAS_IP) || '',
    nasPort: synologyStorageManager.storage.get<string>(STORAGE_KEYS.NAS_PORT) || '',
    useHttps: synologyStorageManager.storage.get<boolean>(STORAGE_KEYS.USE_HTTPS) || false,
    username: synologyStorageManager.storage.get<string>(STORAGE_KEYS.USERNAME) || '',
    password: synologyStorageManager.storage.get<string>(STORAGE_KEYS.PASSWORD) || ''
  }
}

/**
 * 保存群晖配置
 */
export function saveSynologyConfig(config: SynologyConfig): boolean {
  try {
    synologyStorageManager.storage.batchSet({
      [STORAGE_KEYS.NAS_IP]: config.nasIp,
      [STORAGE_KEYS.NAS_PORT]: config.nasPort,
      [STORAGE_KEYS.USE_HTTPS]: config.useHttps,
      [STORAGE_KEYS.USERNAME]: config.username,
      [STORAGE_KEYS.PASSWORD]: config.password
    })
    return true
  } catch (error) {
    console.error('保存群晖配置失败:', error)
    return false
  }
}

/**
 * 构建请求 URL
 */
function buildUrl(config: SynologyConfig, path: string): string {
  const protocol = config.useHttps ? 'https' : 'http'
  return `${protocol}://${config.nasIp}:${config.nasPort}/webapi/${path}`
}

/**
 * 登录到群晖 DSM
 */
export async function loginToSynology(config: SynologyConfig): Promise<{ success: boolean; sid?: string; error?: string }> {
  try {
    const authApi = 'auth.cgi'
    const params = [
      'api=SYNO.API.Auth',
      'version=7',
      'method=login',
      `account=${encodeURIComponent(config.username)}`,
      `passwd=${encodeURIComponent(config.password)}`,
      'session=ScriptingWidgetSession',
      'format=sid'
    ].join('&')

    const url = buildUrl(config, authApi) + '?' + params

    console.log('🔐 群晖登录请求:')
    console.log('URL:', url)
    console.log('用户名:', config.username)
    console.log('密码长度:', config.password.length)
    console.log('密码编码前:', config.password)
    console.log('密码编码后:', encodeURIComponent(config.password))
    console.log('NAS地址:', config.nasIp + ':' + config.nasPort)
    console.log('协议:', config.useHttps ? 'HTTPS' : 'HTTP')
    console.log(
      '完整配置:',
      JSON.stringify(
        {
          nasIp: config.nasIp,
          nasPort: config.nasPort,
          useHttps: config.useHttps,
          username: config.username
        },
        null,
        2
      )
    )

    console.log('⏰ 开始发送请求...')

    // 使用 Promise.race 实现超时
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('请求超时')), 15000) // 15秒超时
    })

    const fetchPromise = fetch(url, {
      method: 'GET',
      allowInsecureRequest: true
    })

    const response = (await Promise.race([fetchPromise, timeoutPromise])) as Response

    console.log('📡 登录响应状态:', response.status, response.statusText)

    if (!response.ok) {
      console.error('❌ HTTP请求失败:', response.status, response.statusText)
      return { success: false, error: `HTTP错误: ${response.status}` }
    }

    const data = (await response.json()) as any
    console.log('📄 登录响应数据:', JSON.stringify(data, null, 2))

    if (data.success) {
      const sid = data.data.sid
      console.log('✅ 登录成功，获取到SID:', sid ? sid.substring(0, 8) + '...' : 'null')
      // 保存会话信息
      synologyStorageManager.storage.batchSet({
        [STORAGE_KEYS.SESSION_ID]: sid,
        [STORAGE_KEYS.LAST_LOGIN_TIME]: Date.now()
      })
      return { success: true, sid }
    } else {
      const errorCode = data.error?.code
      let errorMessage = '登录失败'

      switch (errorCode) {
        case 400:
          errorMessage = '用户不存在'
          break
        case 403:
          errorMessage = '密码错误'
          break
        case 404:
          errorMessage = 'IP地址被封锁'
          break
        default:
          errorMessage = `登录失败，错误代码: ${errorCode}`
      }

      console.error('❌ 登录失败:', errorMessage, '错误详情:', data.error)
      return { success: false, error: errorMessage }
    }
  } catch (error) {
    console.error('❌ 登录群晖异常:', error)

    // 详细的错误分析
    if (error?.toString().includes('请求超时')) {
      return { success: false, error: 'HTTPS连接超时，可能是SSL证书问题。建议尝试HTTP连接或检查网络' }
    } else if (error?.toString().includes('Network')) {
      return { success: false, error: '网络连接失败，请检查IP地址、端口和网络连接' }
    } else {
      return { success: false, error: `连接异常: ${error?.toString() || '未知错误'}` }
    }
  }
}

/**
 * 获取 DSM 信息
 */
export async function getDSMInfo(config: SynologyConfig): Promise<DSMInfo | null> {
  try {
    const sid = synologyStorageManager.storage.get<string>(STORAGE_KEYS.SESSION_ID)
    if (!sid) {
      console.error('未找到有效的会话ID，请先登录')
      return null
    }

    const queryApi = 'entry.cgi'
    const params = ['api=SYNO.DSM.Info', 'version=2', 'method=getinfo', `_sid=${encodeURIComponent(sid)}`].join('&')

    const url = buildUrl(config, queryApi) + '?' + params

    console.log('🏠 获取DSM信息请求:')
    console.log('URL:', url)

    const response = await fetch(url, {
      method: 'GET',
      allowInsecureRequest: true
    })

    console.log('📡 DSM信息响应状态:', response.status, response.statusText)

    if (!response.ok) {
      console.error('❌ 获取DSM信息HTTP失败:', response.status, response.statusText)
      return null
    }

    const data = (await response.json()) as any
    console.log('📄 DSM信息响应数据:', JSON.stringify(data, null, 2))

    if (data.success) {
      console.log('✅ DSM信息获取成功')
      return data.data
    } else {
      console.error('❌ 获取DSM信息失败:', data.error)
      return null
    }
  } catch (error) {
    console.error('❌ 获取DSM信息异常:', error)
    return null
  }
}

/**
 * 获取系统利用率信息
 */
export async function getSystemUtilization(config: SynologyConfig): Promise<SystemUtilization | null> {
  try {
    const sid = synologyStorageManager.storage.get<string>(STORAGE_KEYS.SESSION_ID)
    if (!sid) {
      console.error('未找到有效的会话ID，请先登录')
      return null
    }

    const queryApi = 'entry.cgi'
    const params = ['api=SYNO.Core.System.Utilization', 'version=1', 'method=get', `_sid=${encodeURIComponent(sid)}`].join('&')

    const url = buildUrl(config, queryApi) + '?' + params

    console.log('📊 获取系统利用率请求:')
    console.log('URL:', url)

    const response = await fetch(url, {
      method: 'GET',
      allowInsecureRequest: true
    })

    console.log('📡 系统利用率响应状态:', response.status, response.statusText)

    if (!response.ok) {
      console.error('❌ 获取系统利用率HTTP失败:', response.status, response.statusText)
      return null
    }

    const data = await response.json()
    console.log('📄 系统利用率响应数据:', JSON.stringify(data, null, 2))

    if (data.success) {
      console.log('✅ 系统利用率获取成功')
      return data.data
    } else {
      console.error('获取系统利用率失败:', data.error)
      return null
    }
  } catch (error) {
    console.error('获取系统利用率异常:', error)
    return null
  }
}

/**
 * 获取存储信息
 */
export async function getStorageInfo(config: SynologyConfig): Promise<StorageInfo | null> {
  try {
    const sid = synologyStorageManager.storage.get<string>(STORAGE_KEYS.SESSION_ID)
    if (!sid) {
      console.error('未找到有效的会话ID，请先登录')
      return null
    }

    const queryApi = 'entry.cgi'
    const params = ['api=SYNO.Storage.CGI.Storage', 'version=1', 'method=load_info', `_sid=${encodeURIComponent(sid)}`].join('&')

    const url = buildUrl(config, queryApi) + '?' + params

    console.log('💾 获取存储信息请求:')
    console.log('URL:', url)

    const response = await fetch(url, {
      method: 'GET',
      allowInsecureRequest: true
    })

    console.log('📡 存储信息响应状态:', response.status, response.statusText)

    if (!response.ok) {
      console.error('❌ 获取存储信息HTTP失败:', response.status, response.statusText)
      return null
    }

    const data = await response.json()
    console.log('📄 存储信息响应数据:', JSON.stringify(data, null, 2))

    if (data.success) {
      console.log('✅ 存储信息获取成功')
      return data.data
    } else {
      console.error('获取存储信息失败:', data.error)
      return null
    }
  } catch (error) {
    console.error('获取存储信息异常:', error)
    return null
  }
}

/**
 * 获取系统日志
 */
export async function getSystemLog(config: SynologyConfig): Promise<SystemLog | null> {
  try {
    const sid = synologyStorageManager.storage.get<string>(STORAGE_KEYS.SESSION_ID)
    if (!sid) {
      console.error('未找到有效的会话ID，请先登录')
      return null
    }

    const queryApi = 'entry.cgi'
    const params = [
      'api=SYNO.Core.SyslogClient.Log',
      'version=1',
      'method=list',
      'limit=5',
      'sort_by=time',
      'sort_direction=desc',
      `_sid=${encodeURIComponent(sid)}`
    ].join('&')

    const url = buildUrl(config, queryApi) + '?' + params

    console.log('📋 获取系统日志请求:')
    console.log('URL:', url)

    const response = await fetch(url, {
      method: 'GET',
      allowInsecureRequest: true
    })

    console.log('📡 系统日志响应状态:', response.status, response.statusText)

    if (!response.ok) {
      console.error('❌ 获取系统日志HTTP失败:', response.status, response.statusText)
      return null
    }

    const data = (await response.json()) as any
    console.log('📄 系统日志响应数据:', JSON.stringify(data, null, 2))

    if (data.success) {
      console.log('✅ 系统日志获取成功')
      return data.data
    } else {
      console.error('❌ 获取系统日志失败:', data.error)
      return null
    }
  } catch (error) {
    console.error('❌ 获取系统日志异常:', error)
    return null
  }
}

/**
 * 格式化运行时间
 */
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${days}天 ${hours}小时 ${minutes}分钟`
}

/**
 * 登出群晖
 */
export async function logoutFromSynology(config: SynologyConfig): Promise<void> {
  try {
    const sid = synologyStorageManager.storage.get<string>(STORAGE_KEYS.SESSION_ID)
    if (!sid) {
      return
    }

    const authApi = 'auth.cgi'
    const params = ['api=SYNO.API.Auth', 'version=1', 'method=logout', 'session=PythonDSM7ReportFinal'].join('&')

    const url = buildUrl(config, authApi) + '?' + params

    await fetch(url, {
      method: 'GET',
      allowInsecureRequest: true
    })

    // 清除本地会话信息
    synologyStorageManager.storage.remove(STORAGE_KEYS.SESSION_ID)
    synologyStorageManager.storage.remove(STORAGE_KEYS.LAST_LOGIN_TIME)
  } catch (error) {
    console.error('登出群晖失败:', error)
  }
}

/**
 * 检查会话是否有效
 */
export function isSessionValid(): boolean {
  const sid = synologyStorageManager.storage.get<string>(STORAGE_KEYS.SESSION_ID)
  const lastLoginTime = synologyStorageManager.storage.get<number>(STORAGE_KEYS.LAST_LOGIN_TIME)

  if (!sid || !lastLoginTime) {
    return false
  }

  // 检查会话是否过期（24小时）
  const sessionTimeout = 24 * 60 * 60 * 1000 // 24小时
  return Date.now() - lastLoginTime < sessionTimeout
}

/**
 * 测量网络延迟（Ping）
 */
export async function measureLatency(config: SynologyConfig): Promise<number> {
  try {
    const startTime = Date.now()
    const protocol = config.useHttps ? 'https' : 'http'
    const url = `${protocol}://${config.nasIp}:${config.nasPort}/webapi/query.cgi?api=SYNO.API.Info&version=1&method=query`

    const timeoutPromise = new Promise<Response>((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), 5000)
    })

    const fetchPromise = fetch(url, {
      method: 'GET',
      allowInsecureRequest: true
    })

    await Promise.race([fetchPromise, timeoutPromise])
    const latency = Date.now() - startTime

    return latency
  } catch (error) {
    console.error('测量延迟失败:', error)
    return -1 // 返回 -1 表示无法连接
  }
}

/**
 * 计算网络速率
 */
export function calculateNetworkSpeed(systemData: SystemUtilization | null): NetworkSpeed {
  const defaultSpeed: NetworkSpeed = {
    uploadSpeed: 0,
    downloadSpeed: 0,
    totalTx: 0,
    totalRx: 0
  }

  if (!systemData?.network || systemData.network.length === 0) {
    return defaultSpeed
  }

  // 汇总所有网卡的流量
  let totalTx = 0
  let totalRx = 0
  for (const net of systemData.network) {
    totalTx += net.tx_bytes || 0
    totalRx += net.rx_bytes || 0
  }

  const currentTime = Date.now()

  // 计算速率（与上次数据的差值）
  let uploadSpeed = 0
  let downloadSpeed = 0

  if (lastNetworkBytes) {
    const timeDelta = (currentTime - lastNetworkBytes.timestamp) / 1000 // 秒
    if (timeDelta > 0 && timeDelta < 60) {
      // 防止时间间隔过大导致速率异常
      const txDelta = totalTx - lastNetworkBytes.tx
      const rxDelta = totalRx - lastNetworkBytes.rx

      // 防止溢出回绕（计数器重置）
      if (txDelta >= 0) uploadSpeed = txDelta / timeDelta
      if (rxDelta >= 0) downloadSpeed = rxDelta / timeDelta
    }
  }

  // 更新缓存
  lastNetworkBytes = {
    tx: totalTx,
    rx: totalRx,
    timestamp: currentTime
  }

  return {
    uploadSpeed,
    downloadSpeed,
    totalTx,
    totalRx
  }
}

/**
 * 格式化网络速率为可读字符串
 */
export function formatNetworkSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) {
    return `${bytesPerSecond.toFixed(1)} B/s`
  } else if (bytesPerSecond < 1024 * 1024) {
    return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`
  } else if (bytesPerSecond < 1024 * 1024 * 1024) {
    return `${(bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`
  } else {
    return `${(bytesPerSecond / 1024 / 1024 / 1024).toFixed(1)} GB/s`
  }
}

/**
 * 格式化字节大小
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  if (bytes < 1024 ** 4) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  return `${(bytes / 1024 ** 4).toFixed(1)} TB`
}

/**
 * 获取仪表盘汇总数据（一次性获取所有需要的数据）
 */
export async function getDashboardData(config: SynologyConfig): Promise<DashboardData | null> {
  try {
    // 并行获取所有数据
    const [dsmInfo, systemData, storageData, latency] = await Promise.all([
      getDSMInfo(config),
      getSystemUtilization(config),
      getStorageInfo(config),
      measureLatency(config)
    ])

    // CPU 使用率
    const cpuUsage = systemData?.cpu?.['1min_load'] ?? 0

    // 内存使用率
    const memoryUsage = systemData?.memory?.real_usage ?? 0

    // 磁盘使用率（取第一个卷）
    let diskUsage = 0
    let diskUsedGB = 0
    let diskTotalGB = 0

    if (storageData?.volumes && storageData.volumes.length > 0) {
      const volume = storageData.volumes[0]
      const totalBytes = parseInt(volume.size.total) || 0
      const usedBytes = parseInt(volume.size.used) || 0

      diskTotalGB = totalBytes / 1024 ** 3
      diskUsedGB = usedBytes / 1024 ** 3
      diskUsage = diskTotalGB > 0 ? (diskUsedGB / diskTotalGB) * 100 : 0
    }

    // 网络速率
    const networkSpeed = calculateNetworkSpeed(systemData)

    // 连接状态
    const connectionStatus: ConnectionStatus = {
      isOnline: latency > 0,
      latency: latency > 0 ? latency : 0
    }

    return {
      dsmInfo,
      cpuUsage,
      memoryUsage,
      diskUsage,
      diskUsedGB,
      diskTotalGB,
      networkSpeed,
      connectionStatus,
      lastUpdateTime: new Date()
    }
  } catch (error) {
    console.error('获取仪表盘数据失败:', error)
    return null
  }
}
