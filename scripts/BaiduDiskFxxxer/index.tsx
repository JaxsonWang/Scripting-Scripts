import { Button, Form, HStack, Image, List, Navigation, NavigationStack, Section, Spacer, Text, TextField, VStack, useState } from 'scripting'
import type { BaiduFile } from './utils/baidu-client'
import { BaiduDiskClient, getShareInfo } from './utils/baidu-client'
import { processDownload } from './utils/processor'
import { storage } from './utils/storage'
import { FileRow } from './components/FileRow'
import { SettingsScreen } from './screens/SettingsScreen'
import { ResultScreen } from './screens/ResultScreen'

const normalizeBdussCookie = (raw: string | null | undefined): string => {
  if (!raw) return ''
  const trimmed = raw.trim()
  if (!trimmed) return ''

  if (trimmed.includes('BDUSS=')) return trimmed
  if (trimmed.includes('=') && !/^[A-Za-z0-9+/=]+$/.test(trimmed)) return trimmed
  return `BDUSS=${trimmed}`
}

export const PanPDFViewer = () => {
  const [link, setLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [currentList, setCurrentList] = useState<BaiduFile[]>([])
  const [pathStack, setPathStack] = useState<BaiduFile[]>([]) // Stack of folders
  const [dirCache, setDirCache] = useState<Record<string, BaiduFile[]>>({})
  const [shareData, setShareData] = useState<any>(null)
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set())

  // Settings Modal
  const [showSettings, setShowSettings] = useState(false)

  const handleAnalyze = async () => {
    console.log('[PanPDFViewer] handleAnalyze start', { link })
    if (!link) {
      console.warn('[PanPDFViewer] handleAnalyze: link is empty')
      await Dialog.alert({ title: '提示', message: '请先输入分享链接' })
      return
    }

    setLoading(true)
    setLoadingText('解析链接中...')
    setErrorMsg('')
    setCurrentList([])
    setPathStack([])
    setSelectedFiles(new Set())

    try {
      const { surl, pwd } = getShareInfo(link)
      console.log('[PanPDFViewer] getShareInfo result', { surl, hasPwd: !!pwd })
      const res = await BaiduDiskClient.getSharedList(surl, pwd)
      const innerList = Array.isArray(res.data?.list) ? res.data.list : []
      console.log('[PanPDFViewer] getSharedList response', {
        errno: res.errno,
        hasData: !!res.data,
        listLength: innerList.length
      })

      if (res.errno !== 0) throw new Error(`Error ${res.errno}`)

      // Baidu 返回的数据实际在 res.data 里，结构与原 Cloudflare 版一致
      const payload = res.data as { list?: BaiduFile[]; shareid: number; uk: number; seckey?: string }
      const list = (payload?.list || []) as BaiduFile[]

      if (!Array.isArray(payload?.list) || list.length === 0) {
        console.warn('[PanPDFViewer] handleAnalyze: empty list returned from Baidu API (res.data.list)')
        const msg = '分享链接解析成功，但接口返回的文件列表为空，可能是分享内容为空，或接口返回结构发生了变化。'
        setErrorMsg(msg)
        await Dialog.alert({ title: '未找到文件', message: msg })
        return
      }

      setShareData({ shareid: payload.shareid, uk: payload.uk, sekey: payload.seckey || '' })
      setCurrentList(list)
      setDirCache({ root: list })
    } catch (e: any) {
      console.error('[PanPDFViewer] handleAnalyze error', e)
      const message = e?.message ?? String(e)
      setErrorMsg(message)
      await Dialog.alert({ title: '解析失败', message })
    } finally {
      setLoading(false)
      console.log('[PanPDFViewer] handleAnalyze finished')
    }
  }

  const enterFolder = async (folder: BaiduFile) => {
    console.log('[PanPDFViewer] enterFolder', { path: folder.path, name: folder.server_filename })
    setLoading(true)
    setLoadingText(`加载 ${folder.server_filename}...`)

    try {
      if (dirCache[folder.path]) {
        console.log('[PanPDFViewer] enterFolder: use cache')
        setCurrentList(dirCache[folder.path])
        setPathStack([...pathStack, folder])
        setLoading(false)
        return
      }

      const { surl, pwd } = getShareInfo(link)
      console.log('[PanPDFViewer] enterFolder: fetch dir', { surl, hasPwd: !!pwd, dir: folder.path })
      const res = await BaiduDiskClient.getSharedList(surl, pwd, folder.path)
      const payload = res.data as { list?: BaiduFile[] }
      const list = (payload?.list || []) as BaiduFile[]

      setDirCache(prev => ({ ...prev, [folder.path]: list }))
      setCurrentList(list)
      setPathStack([...pathStack, folder])
    } catch (e: any) {
      console.error('[PanPDFViewer] enterFolder error', e)
      await Dialog.alert({ title: '加载文件夹失败', message: e.message })
    } finally {
      setLoading(false)
      console.log('[PanPDFViewer] enterFolder finished')
    }
  }

  const goBack = () => {
    if (pathStack.length === 0) return
    const newStack = [...pathStack]
    newStack.pop()
    setPathStack(newStack)

    if (newStack.length === 0) {
      setCurrentList(dirCache['root'] || [])
    } else {
      const parent = newStack[newStack.length - 1]
      setCurrentList(dirCache[parent.path] || [])
    }
  }

  const toggleFile = (file: BaiduFile) => {
    const newSet = new Set(selectedFiles)
    if (newSet.has(file.fs_id)) {
      newSet.delete(file.fs_id)
    } else {
      newSet.add(file.fs_id)
    }
    setSelectedFiles(newSet)
  }

  const toggleAll = () => {
    const validFiles = currentList.filter(f => f.isdir === 0 && f.size <= 150 * 1024 * 1024)
    if (selectedFiles.size === validFiles.length) {
      setSelectedFiles(new Set())
    } else {
      const newSet = new Set<number>()
      validFiles.forEach(f => newSet.add(f.fs_id))
      setSelectedFiles(newSet)
    }
  }

  const handleProcess = async () => {
    console.log('[PanPDFViewer] handleProcess start', { selectedCount: selectedFiles.size })
    if (selectedFiles.size === 0) {
      console.warn('[PanPDFViewer] handleProcess: no selected files')
      return
    }

    const bdussRaw = storage.get('bduss')
    if (!bdussRaw) {
      console.warn('[PanPDFViewer] handleProcess: missing BDUSS')
      await Dialog.alert({ title: '未配置 Cookie', message: '请先点击右上角设置图标配置百度网盘 BDUSS' })
      return
    }

    const cookie = normalizeBdussCookie(bdussRaw)
    console.log('[PanPDFViewer] handleProcess cookie info', {
      length: cookie.length,
      hasBDUSS: cookie.includes('BDUSS=')
    })

    if (!shareData) {
      console.warn('[PanPDFViewer] handleProcess: missing shareData')
      await Dialog.alert({ title: '缺少分享信息', message: '请先解析分享链接，再执行批量加速。' })
      return
    }

    setLoading(true)
    setLoadingText('加速处理中 (这可能需要几十秒)...')

    try {
      const filesToDownload = currentList.filter(f => selectedFiles.has(f.fs_id))
      console.log('[PanPDFViewer] handleProcess: filesToDownload', { count: filesToDownload.length })

      // 没有配置 SESSION_AUTH 时，回退到本地直连百度逻辑
      const processingClient = new BaiduDiskClient(cookie)
      if (!(await processingClient.init())) {
        throw new Error('Cookie 无效或已过期，请重新获取 BDUSS')
      }
      const result = await processDownload(processingClient, filesToDownload, shareData)

      console.log('[PanPDFViewer] handleProcess: processDownload result', {
        fileCount: result.files.length,
        errorCount: result.errors.length
      })

      await Navigation.present(<ResultScreen results={result.files} errors={result.errors} />)

      setSelectedFiles(new Set())
    } catch (e: any) {
      console.error('[PanPDFViewer] handleProcess error', e)
      const message = e?.message ?? String(e)
      await Dialog.alert({ title: '处理失败', message })
    } finally {
      setLoading(false)
      console.log('[PanPDFViewer] handleProcess finished')
    }
  }

  const isAllSelected =
    currentList.length > 0 && currentList.filter(f => f.isdir === 0 && f.size <= 150 * 1024 * 1024).length === selectedFiles.size && selectedFiles.size > 0

  return (
    <NavigationStack>
      <VStack
        navigationTitle="百度网盘PDF加速"
        navigationBarTitleDisplayMode="inline"
        alignment="leading"
        toolbar={{
          topBarLeading: pathStack.length > 0 ? <Button title="返回" action={goBack} /> : undefined,
          topBarTrailing: (
            <HStack>
              <Button action={() => setShowSettings(true)}>
                <Image systemName="gear" />
              </Button>
            </HStack>
          )
        }}
        sheet={{
          isPresented: showSettings,
          onChanged: setShowSettings,
          content: <SettingsScreen />
        }}
      >
        <Form>
          <Section>
            <TextField title="链接" value={link} prompt="输入分享链接 (含提取码)" onChanged={setLink} keyboardType="URL" />
          </Section>
          <Section>
            <Button title={loading ? loadingText || '处理中...' : '解析链接'} action={handleAnalyze} disabled={loading} />
          </Section>
          {errorMsg ? (
            <Text foregroundStyle="systemRed" font="caption">
              {errorMsg}
            </Text>
          ) : null}

          {currentList.length > 0 && (
            <Section
              header={
                <HStack>
                  <Text>文件列表</Text>
                  <Spacer />
                  <Button title={isAllSelected ? '取消全选' : '全选'} action={toggleAll} font="caption" />
                </HStack>
              }
            >
              {currentList.map(file => (
                <FileRow
                  key={file.fs_id}
                  file={file}
                  isSupported={file.size <= 150 * 1024 * 1024}
                  isSelected={selectedFiles.has(file.fs_id)}
                  onToggle={toggleFile}
                  onEnterFolder={enterFolder}
                />
              ))}
            </Section>
          )}

          {selectedFiles.size > 0 && (
            <Section>
              <Button title={`加速下载 (${selectedFiles.size})`} action={handleProcess} foregroundStyle="green" />
            </Section>
          )}
          <VStack alignment="leading">
            <Text font="footnote" foregroundStyle="secondaryLabel">
              BaiduDisk Fxxxer {'\n'}
              实现对 150MB 以下文件的免客户端高速预览。
            </Text>
          </VStack>
        </Form>
      </VStack>
    </NavigationStack>
  )
}

// Present the main component
console.log('[PanPDFViewer] script loaded, presenting UI')
Navigation.present(<PanPDFViewer />)
