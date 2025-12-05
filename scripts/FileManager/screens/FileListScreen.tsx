import {
  Button,
  ControlGroup,
  HStack,
  Image,
  Label,
  List,
  Navigation,
  NavigationLink,
  NavigationStack,
  SVG,
  Script,
  Spacer,
  TabView,
  Text,
  VStack,
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'scripting'
import { FileRow } from '../components/FileRow'
import { PreferencesScreen } from './PreferencesScreen'
type FileEntry = { name: string; path: string; isDir: boolean; stat?: FileStat }
type TransferState = { sourcePath: string; isMove: boolean }

type DirectoryViewProps = {
  rootPath: string
  path: string
  rootDisplayName: string
  tag?: number
  tabItem?: JSX.Element
  onToolbarChange?: (index: number, leading: JSX.Element, trailing: JSX.Element) => void
  disableInternalToolbar?: boolean
  transfer: TransferState | null
  setTransfer: (v: TransferState | null) => void
  externalReloadPath: string | null
  requestExternalReload: (path: string | null) => void
}

const ROOT_TABS = [
  { title: 'Documents', icon: 'folder.fill', path: FileManager.documentsDirectory },
  { title: 'AppGroup', icon: 'externaldrive.fill', path: FileManager.appGroupDocumentsDirectory }
]

/**
 * 将完整相对路径压缩为“末三段 + 省略号”形式，方便在导航栏中显示
 */
const formatRelativePath = (path: string): string => {
  if (path === '/' || path === '') return '/'
  const segments = path.split('/').filter(Boolean)
  if (segments.length <= 3) {
    return `/${segments.join('/')}`
  }
  const tail = segments.slice(-3).join('/')
  return `…/${tail}`
}

export function FileListScreen() {
  const [tabIndex, setTabIndex] = useState(0)
  const [toolbarByTab, setToolbarByTab] = useState<Record<number, { leading: JSX.Element; trailing: JSX.Element }>>({})
  const [transfer, setTransfer] = useState<TransferState | null>(null)
  const [externalReloadPath, setExternalReloadPath] = useState<string | null>(null)

  const handleToolbarChange = useCallback((index: number, leading: JSX.Element, trailing: JSX.Element) => {
    setToolbarByTab(prev => {
      const prevEntry = prev[index]
      if (prevEntry && prevEntry.leading === leading && prevEntry.trailing === trailing) {
        return prev
      }
      return { ...prev, [index]: { leading, trailing } }
    })
  }, [])

  const currentToolbar = toolbarByTab[tabIndex]

  return (
    <NavigationStack>
      <VStack
        frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}
        toolbar={currentToolbar ? { topBarLeading: currentToolbar.leading, topBarTrailing: currentToolbar.trailing } : undefined}
      >
        <TabView tabIndex={tabIndex} onTabIndexChanged={setTabIndex}>
          {ROOT_TABS.map((tab, index) => (
            <DirectoryView
              key={tab.path}
              rootPath={tab.path}
              path={tab.path}
              rootDisplayName={tab.title}
              tag={index}
            tabItem={<Label title={tab.title} systemImage={tab.icon} />}
            onToolbarChange={handleToolbarChange}
            disableInternalToolbar
            transfer={transfer}
            setTransfer={setTransfer}
            externalReloadPath={externalReloadPath}
            requestExternalReload={setExternalReloadPath}
          />
        ))}
      </TabView>
      </VStack>
    </NavigationStack>
  )
}

function DirectoryView({
  rootPath,
  path,
  rootDisplayName,
  tag,
  tabItem,
  onToolbarChange,
  disableInternalToolbar,
  transfer,
  setTransfer,
  externalReloadPath,
  requestExternalReload
}: DirectoryViewProps) {
  const currentPath = path
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [showHidden, setShowHidden] = useState(true)
  const [version, bumpVersion] = useState(0)
  const [toastShown, setToastShown] = useState(false)
  const [toastMessage, setToastMessage] = useState('已拷贝，切换到目标目录粘贴')

  const dismiss = Navigation.useDismiss()

  /**
   * 根据当前路径加载文件列表，统一处理隐藏项过滤与排序。
   */
  const loadFiles = useCallback(async () => {
    try {
      const names = await FileManager.readDirectory(currentPath)
      const filtered = names.filter(n => showHidden || !n.startsWith('.'))
      const withMeta: FileEntry[] = filtered.map(name => {
        const fullPath = currentPath + '/' + name
        let isDir = false
        let stat: FileStat | undefined = undefined
        try {
          isDir = FileManager.isDirectorySync(fullPath)
        } catch (err) {
          console.error('[DirectoryView] isDirectorySync failed', fullPath, err)
        }
        try {
          stat = FileManager.statSync(fullPath)
        } catch (err) {
          console.error('[DirectoryView] statSync failed', fullPath, err)
        }
        return { name, path: fullPath, isDir, stat }
      })
      const sorted = withMeta.sort((a, b) => {
        if (a.isDir && !b.isDir) return -1
        if (!a.isDir && b.isDir) return 1
        return a.name.localeCompare(b.name)
      })
      setEntries(sorted)
    } catch (e) {
      console.error(e)
      await Dialog.alert({ message: 'Failed to read directory' })
    }
  }, [currentPath, showHidden, version])

  useEffect(() => {
    loadFiles()
  }, [loadFiles, version])

  useEffect(() => {
    if (externalReloadPath && externalReloadPath === currentPath) {
      loadFiles()
      requestExternalReload(null)
    }
  }, [externalReloadPath, currentPath, loadFiles, requestExternalReload])

  const triggerReload = useCallback(() => bumpVersion(v => v + 1), [])

  /**
   * 预览文件内容，目录由 NavigationLink 处理。
   */
  const handleOpenFile = useCallback(
    async (name: string) => {
      const newPath = currentPath + '/' + name
      const encodedURL = `file://${encodeURI(newPath)}`
      console.log('[handleOpenFile] tap', { newPath, encodedURL })
      try {
        if (!FileManager.existsSync(newPath)) {
          console.error('[QuickLook] file not found', newPath)
          await Dialog.alert({ title: '文件不存在', message: newPath })
          return
        }
        console.log('[QuickLook] preview', { path: newPath, encodedURL })
        await QuickLook.previewURLs([encodedURL])
      } catch (e) {
        console.error(e)
        await Dialog.alert({ title: '预览失败', message: String(e) })
      }
    },
    [currentPath]
  )

  /**
   * 将选中文件的完整路径写入剪贴板，方便外部粘贴。
   */
  const handleCopy = async (name: string) => {
    const filePath = currentPath + '/' + name
    await Pasteboard.setString(filePath)
    setTransfer({ sourcePath: filePath, isMove: false })
    setToastMessage('已拷贝，前往目标目录粘贴')
    setToastShown(true)
  }

  /**
   * 展示文件/文件夹的基础信息（大小、时间戳、类型）。
   */
  const handleInfo = async (name: string) => {
    const filePath = currentPath + '/' + name
    const stat = await FileManager.stat(filePath)
    const info = `\nPath: ${filePath}\nSize: ${stat.size} bytes\nCreated: ${new Date(stat.creationDate).toLocaleString()}\nModified: ${new Date(
      stat.modificationDate
    ).toLocaleString()}\nType: ${stat.type}\n    `
    await Dialog.alert({ title: 'File Info', message: info })
  }

  /**
   * 触发重命名对话框，并在成功后刷新列表。
   */
  const handleRename = async (name: string) => {
    const filePath = currentPath + '/' + name
    const newName = await Dialog.prompt({
      title: 'Rename',
      defaultValue: name,
      confirmLabel: 'Rename'
    })
    if (newName && newName !== name) {
      await FileManager.rename(filePath, currentPath + '/' + newName)
      triggerReload()
    }
  }

  /**
   * 复制一个副本，自动添加 “copy” 后缀并刷新目录。
   */
  const handleDuplicate = async (name: string) => {
    const filePath = currentPath + '/' + name
    let newName = name
    if (name.includes('.')) {
      const parts = name.split('.')
      const ext = parts.pop()
      newName = parts.join('.') + ' copy.' + ext
    } else {
      newName = name + ' copy'
    }
    await FileManager.copyFile(filePath, currentPath + '/' + newName)
    triggerReload()
  }

  /**
   * 粘贴剪贴板中的文件路径到当前目录，自动避免同名覆盖
   */
  const handlePaste = useCallback(async () => {
    if (!transfer) {
      await Dialog.alert({ title: '没有待粘贴的项目', message: '请先在文件上长按选择“拷贝/移动”。' })
      return
    }
    const source = transfer.sourcePath
    const base = source.split('/').pop() || 'pasted'
    const ensureUnique = (name: string) => {
      let candidate = name
      let idx = 1
      while (FileManager.existsSync(currentPath + '/' + candidate)) {
        const parts = candidate.split('.')
        if (parts.length > 1) {
          const ext = parts.pop()
          candidate = `${parts.join('.')} (${idx}).${ext}`
        } else {
          candidate = `${name} (${idx})`
        }
        idx += 1
      }
      return candidate
    }
    const targetName = ensureUnique(base)
    const target = currentPath + '/' + targetName
    try {
      if (transfer?.isMove) {
        await FileManager.rename(source, target)
        const sourceDir = source.split('/').slice(0, -1).join('/') || '/'
        requestExternalReload(sourceDir)
      } else {
        await FileManager.copyFile(source, target)
      }
      setTransfer(null)
      triggerReload()
    } catch (e) {
      console.error(e)
      await Dialog.alert({ title: '粘贴失败', message: String(e) })
    }
  }, [currentPath, transfer, triggerReload, setTransfer, requestExternalReload])

  /**
   * 删除文件前弹出确认框，防止误操作。
   */
  const handleDelete = async (name: string) => {
    const filePath = currentPath + '/' + name
    const confirm = await Dialog.confirm({
      title: 'Delete',
      message: `Are you sure you want to delete "${name}"?`,
      confirmLabel: 'Delete'
    })
    if (confirm) {
      await FileManager.remove(filePath)
      triggerReload()
    }
  }

  /**
   * 通过重命名实现移动，将条目迁移到用户输入的目录中。
   */
  const handleMove = async (name: string) => {
    const filePath = currentPath + '/' + name
    setTransfer({ sourcePath: filePath, isMove: true })
    setToastMessage('已准备移动，前往目标目录粘贴')
    setToastShown(true)
  }

  /**
   * 创建新文件夹
   */
  const handleCreateFolder = useCallback(async () => {
    const name = await Dialog.prompt({ title: '新建文件夹' })
    if (name) {
      await FileManager.createDirectory(currentPath + '/' + name)
      triggerReload()
    }
  }, [currentPath, triggerReload])

  /**
   * 创建新文件
   */
  const handleCreateFile = useCallback(async () => {
    const name = await Dialog.prompt({ title: 'New File Name', defaultValue: 'untitled.txt' })
    if (name) {
      await FileManager.writeAsString(currentPath + '/' + name, '')
      triggerReload()
    }
  }, [currentPath, triggerReload])

  /**
   * 展示偏好设置页，目前仅包含“显示隐藏文件”开关。
   */
  const handlePreferences = useCallback(() => {
    Navigation.present({
      element: <PreferencesScreen showHidden={showHidden} onToggleHidden={setShowHidden} />
    })
  }, [showHidden])

  /**
   * 退出脚本
   */
  const handleExit = useCallback(() => {
    dismiss()
    // Script.exit()
  }, [dismiss])

  const isRoot = currentPath === rootPath
  const currentDirName = isRoot ? rootDisplayName : currentPath.split('/').pop() || rootDisplayName
  const relativePathFull = currentPath === rootPath ? '/' : currentPath.replace(rootPath, '')
  const relativePath = formatRelativePath(relativePathFull)

  const renderRow = (name: string, path: string, isDirectoryEntry: boolean, stat?: FileStat) => {
    const row = (
      <FileRow
        key={name}
        name={name}
        path={path}
        isDirectory={isDirectoryEntry}
        stat={stat}
        onCopy={() => handleCopy(name)}
        onMove={() => handleMove(name)}
        onInfo={() => handleInfo(name)}
        onRename={() => handleRename(name)}
        onDuplicate={() => handleDuplicate(name)}
        onDelete={() => handleDelete(name)}
      />
    )

    if (isDirectoryEntry) return row

    return (
      <Button key={name} action={() => handleOpenFile(name)}>
        {row}
      </Button>
    )
  }

  const toolbarLeading = useMemo(
    () => (
      <VStack alignment="leading">
        <Text styledText={{ content: currentDirName, font: 16, fontWeight: 'bold' }} />
        <Text styledText={{ content: relativePath, font: 11, foregroundColor: '#8e8e93' }} />
      </VStack>
    ),
    [currentDirName, relativePath]
  )

  const toolbarTrailing = useMemo(
    () => (
      <HStack>
        <ControlGroup label={<Image systemName="ellipsis.circle" frame={{ width: 20, height: 20 }} />} controlGroupStyle="palette">
          <Button title="新增文件夹" systemImage="folder.badge.plus" action={handleCreateFolder} />
          <Button title="新增文件" systemImage="doc.badge.plus" action={handleCreateFile} />
          {transfer ? <Button title="粘贴" systemImage="doc.on.clipboard" action={handlePaste} /> : null}
          <Button
            title="简介"
            systemImage="info.circle"
            action={() =>
              Dialog.alert({
                title: currentDirName,
                message: `当前位置: ${currentPath}\n包含 ${entries.length} 项`
              })
            }
          />
        </ControlGroup>
        <Button action={handlePreferences}>
          <Image systemName="gearshape" frame={{ width: 20, height: 20 }} />
        </Button>
        <Button action={handleExit}>
          <Image systemName="xmark.circle" frame={{ width: 20, height: 20 }} />
        </Button>
      </HStack>
    ),
    [handleCreateFolder, handleCreateFile, handlePaste, currentDirName, currentPath, entries.length, handlePreferences, handleExit, transfer]
  )

  useEffect(() => {
    if (disableInternalToolbar && onToolbarChange) {
      onToolbarChange(tag ?? 0, toolbarLeading, toolbarTrailing)
    }
  }, [disableInternalToolbar, onToolbarChange, tag, toolbarLeading, toolbarTrailing])

  return (
    <VStack
      tag={tag}
      tabItem={tabItem}
      frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}
      toolbar={disableInternalToolbar ? undefined : { topBarLeading: toolbarLeading, topBarTrailing: toolbarTrailing }}
    >
      {entries.length === 0 ? (
        <VStack frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} alignment="center">
          <Spacer />
          <SVG filePath={`${Script.directory}/assets/icon/folder.svg`} resizable frame={{ width: 128, height: 128 }} />
          <Text styledText={{ content: '文件夹空', font: 16, fontWeight: 'bold', foregroundColor: '#8e8e93' }} />
          <Spacer />
        </VStack>
      ) : (
        <List
          listStyle="inset"
          toast={{
            isPresented: toastShown,
            onChanged: setToastShown,
            message: toastMessage,
            duration: 2,
            position: 'bottom'
          }}
        >
          {entries.map(entry => {
            const { name, path: childPath, isDir, stat } = entry
            if (isDir) {
              return (
                <NavigationLink
                  key={name}
                  destination={
                    <DirectoryView
                      rootPath={rootPath}
                      path={childPath}
                      rootDisplayName={rootDisplayName}
                      tag={tag}
                      onToolbarChange={onToolbarChange}
                      disableInternalToolbar={false}
                      transfer={transfer}
                      setTransfer={setTransfer}
                      externalReloadPath={externalReloadPath}
                      requestExternalReload={requestExternalReload}
                    />
                  }
                >
                  {renderRow(name, childPath, true, stat)}
                </NavigationLink>
              )
            }

            return renderRow(name, childPath, false, stat)
          })}
        </List>
      )}
    </VStack>
  )
}
