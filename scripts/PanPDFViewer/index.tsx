import { Button, HStack, Image, List, Navigation, NavigationStack, Section, Spacer, Text, TextField, VStack, useState } from 'scripting'
import type { BaiduFile } from './utils/baidu-client'
import { BaiduDiskClient, getShareInfo } from './utils/baidu-client'
import { processDownload } from './utils/processor'
import { storage } from './utils/storage'
import { FileRow } from './components/FileRow'
import { SettingsScreen } from './screens/SettingsScreen'
import { ResultScreen } from './screens/ResultScreen'

export const PanPDFViewer = () => {
  const [link, setLink] = useState('https://pan.baidu.com/s/1xoVIZzOSjWX0WaEOkFQTbg?pwd=bgbh')
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

  const client = new BaiduDiskClient(storage.get('bduss') as string)

  const handleAnalyze = async () => {
    if (!link) return
    setLoading(true)
    setLoadingText('解析链接中...')
    setErrorMsg('')
    setCurrentList([])
    setPathStack([])
    setSelectedFiles(new Set())

    try {
      const { surl, pwd } = getShareInfo(link)
      const res = await BaiduDiskClient.getSharedList(surl, pwd)

      if (res.errno !== 0) throw new Error(`Error ${res.errno}`)

      setShareData({ shareid: res.shareid, uk: res.uk, sekey: res.seckey })

      // Initialize List
      const list = (res.list || []) as BaiduFile[]
      setCurrentList(list)
      setDirCache({ root: list })
    } catch (e: any) {
      setErrorMsg(e.message)
      await Dialog.alert({ title: '解析失败', message: e.message })
    } finally {
      setLoading(false)
    }
  }

  const enterFolder = async (folder: BaiduFile) => {
    setLoading(true)
    setLoadingText(`加载 ${folder.server_filename}...`)

    try {
      // Check cache
      if (dirCache[folder.path]) {
        setCurrentList(dirCache[folder.path])
        setPathStack([...pathStack, folder])
        setLoading(false)
        return
      }

      // Fetch
      const { surl, pwd } = getShareInfo(link)
      const res = await BaiduDiskClient.getSharedList(surl, pwd, folder.path)
      const list = (res.list || []) as BaiduFile[]

      setDirCache(prev => ({ ...prev, [folder.path]: list }))
      setCurrentList(list)
      setPathStack([...pathStack, folder])
    } catch (e: any) {
      await Dialog.alert({ title: '加载文件夹失败', message: e.message })
    } finally {
      setLoading(false)
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
    if (selectedFiles.size === 0) return

    // Check Cookie
    const bduss = storage.get('bduss')
    if (!bduss) {
      Dialog.alert({ title: '未配置 Cookie', message: '请先点击右上角设置图标配置百度网盘 BDUSS' })
      return
    }

    setLoading(true)
    setLoadingText('加速处理中 (这可能需要几十秒)...')

    try {
      // Re-init client with latest cookie
      const processingClient = new BaiduDiskClient(bduss)
      if (!(await processingClient.init())) {
        throw new Error('Cookie 无效或已过期，请重新获取 BDUSS')
      }

      const filesToDownload = currentList.filter(f => selectedFiles.has(f.fs_id))

      const result = await processDownload(processingClient, filesToDownload, shareData)

      Navigation.present(
        <NavigationStack>
          <ResultScreen results={result.files} errors={result.errors} />
        </NavigationStack>
      )

      setSelectedFiles(new Set()) // Clear selection
    } catch (e: any) {
      Dialog.alert({ title: '处理失败', message: e.message })
    } finally {
      setLoading(false)
    }
  }

  const isAllSelected =
    currentList.length > 0 && currentList.filter(f => f.isdir === 0 && f.size <= 150 * 1024 * 1024).length === selectedFiles.size && selectedFiles.size > 0

  return (
    <NavigationStack>
      <List
        navigationTitle="百度网盘PDF加速"
        navigationBarTitleDisplayMode="inline"
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
        <Section>
          <VStack spacing={10}>
            <TextField title="链接" value={link} prompt="输入分享链接 (含提取码)" onChanged={setLink} keyboardType="URL" />
            <Button title={loading ? loadingText || '处理中...' : '解析链接'} action={handleAnalyze} disabled={loading} />
          </VStack>
          {errorMsg ? (
            <Text foregroundStyle="systemRed" font="caption">
              {errorMsg}
            </Text>
          ) : null}
        </Section>

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
            <Button title={`批量加速 (${selectedFiles.size})`} action={handleProcess} background="systemGreen" foregroundStyle="white" />
          </Section>
        )}
      </List>
    </NavigationStack>
  )
}

// Present the main component
Navigation.present(<PanPDFViewer />)
