import {
  Button,
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

type DirectoryViewProps = {
  rootPath: string
  path: string
  rootDisplayName: string
  tag?: number
  tabItem?: JSX.Element
  onToolbarChange?: (index: number, leading: JSX.Element, trailing: JSX.Element) => void
  disableInternalToolbar?: boolean
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
            />
          ))}
        </TabView>
      </VStack>
    </NavigationStack>
  )
}

function DirectoryView({ rootPath, path, rootDisplayName, tag, tabItem, onToolbarChange, disableInternalToolbar }: DirectoryViewProps) {
  const currentPath = path
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [showHidden, setShowHidden] = useState(true)
  const [version, bumpVersion] = useState(0)

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

  const triggerReload = useCallback(() => bumpVersion(v => v + 1), [])

  /**
   * 预览文件内容，目录由 NavigationLink 处理。
   */
  const handleOpenFile = useCallback(
    (name: string) => {
      const newPath = currentPath + '/' + name
      QuickLook.previewURLs([`file://${newPath}`])
    },
    [currentPath]
  )

  /**
   * 将选中文件的完整路径写入剪贴板，方便外部粘贴。
   */
  const handleCopy = async (name: string) => {
    const filePath = currentPath + '/' + name
    await Pasteboard.setString(filePath)
    await Dialog.alert({ title: '已拷贝路径', message: filePath })
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
    const targetDirInput = await Dialog.prompt({ title: '移动到目录', defaultValue: currentPath, confirmLabel: '移动' })
    if (!targetDirInput) return
    const targetDir = targetDirInput.endsWith('/') ? targetDirInput.slice(0, -1) : targetDirInput
    const destination = `${targetDir}/${name}`
    try {
      if (!FileManager.isDirectorySync(targetDir)) {
        await Dialog.alert({ title: '目标目录不存在', message: targetDir })
        return
      }
      await FileManager.rename(currentPath + '/' + name, destination)
      triggerReload()
    } catch (e) {
      console.error(e)
      await Dialog.alert({ title: '移动失败', message: '请检查目标目录是否存在且可写' })
    }
  }

  /**
   * 创建新文件/文件夹的入口，根据用户选择执行对应操作。
   */
  const handleCreate = useCallback(async () => {
    const index = await Dialog.actionSheet({
      title: 'Create New',
      actions: [{ label: 'Folder' }, { label: 'Text File' }],
      cancelButton: true
    })

    if (index === 0) {
      const name = await Dialog.prompt({ title: 'New Folder Name' })
      if (name) {
        await FileManager.createDirectory(currentPath + '/' + name)
        triggerReload()
      }
    } else if (index === 1) {
      const name = await Dialog.prompt({ title: 'New File Name', defaultValue: 'untitled.txt' })
      if (name) {
        await FileManager.writeAsString(currentPath + '/' + name, '')
        triggerReload()
      }
    }
  }, [currentPath])

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
    Script.exit()
  }, [dismiss])

  const renderRow = (name: string, path: string, isDirectoryEntry: boolean, stat?: FileStat) => (
    <FileRow
      key={name}
      name={name}
      path={path}
      isDirectory={isDirectoryEntry}
      stat={stat}
      onPress={!isDirectoryEntry ? () => handleOpenFile(name) : undefined}
      onCopy={() => handleCopy(name)}
      onMove={() => handleMove(name)}
      onInfo={() => handleInfo(name)}
      onRename={() => handleRename(name)}
      onDuplicate={() => handleDuplicate(name)}
      onDelete={() => handleDelete(name)}
    />
  )

  const isRoot = currentPath === rootPath
  const currentDirName = isRoot ? rootDisplayName : currentPath.split('/').pop() || rootDisplayName
  const relativePathFull = currentPath === rootPath ? '/' : currentPath.replace(rootPath, '')
  const relativePath = formatRelativePath(relativePathFull)

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
      <HStack spacing={8}>
        <Button action={handleCreate}>
          <Image image={UIImage.fromSFSymbol('plus')!} frame={{ width: 20, height: 20 }} />
        </Button>
        <Button action={handlePreferences}>
          <Image image={UIImage.fromSFSymbol('gearshape')!} frame={{ width: 20, height: 20 }} />
        </Button>
        <Button action={handleExit}>
          <Image image={UIImage.fromSFSymbol('xmark.circle')!} frame={{ width: 20, height: 20 }} />
        </Button>
      </HStack>
    ),
    [handleCreate, handlePreferences, handleExit]
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
        <List listStyle="inset">
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
