import {
  Button,
  Form,
  HStack,
  Image,
  Label,
  List,
  Navigation,
  NavigationLink,
  NavigationStack,
  Section,
  SVG,
  Script,
  Spacer,
  TabView,
  Text,
  Toggle,
  VStack,
  useCallback,
  useEffect,
  useState
} from 'scripting'
import { FileRow } from '../components/FileRow'

const ROOT_TABS = [
  { title: 'Documents', icon: 'folder.fill', path: FileManager.documentsDirectory },
  { title: 'AppGroup', icon: 'externaldrive.fill', path: FileManager.appGroupDocumentsDirectory }
]

export function FileListScreen() {
  const [tabIndex, setTabIndex] = useState(0)

  return (
    <NavigationStack>
      <TabView tabIndex={tabIndex} onTabIndexChanged={setTabIndex}>
        {ROOT_TABS.map((tab, index) => (
          <DirectoryView
            key={tab.path}
            rootPath={tab.path}
            path={tab.path}
            rootDisplayName={tab.title}
            tag={index}
            tabItem={<Label title={tab.title} systemImage={tab.icon} />}
          />
        ))}
      </TabView>
    </NavigationStack>
  )
}

type DirectoryViewProps = {
  rootPath: string
  path: string
  rootDisplayName: string
  tag?: number
  tabItem?: JSX.Element
}

function DirectoryView({ rootPath, path, rootDisplayName, tag, tabItem }: DirectoryViewProps) {
  const currentPath = path
  const [files, setFiles] = useState<string[]>([])
  const [showHidden, setShowHidden] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const dismiss = Navigation.useDismiss()

  /**
   * 根据当前路径加载文件列表，统一处理隐藏项过滤与排序。
   */
  const loadFiles = useCallback(async () => {
    try {
      const names = await FileManager.readDirectory(currentPath)
      const filtered = names.filter(n => showHidden || !n.startsWith('.'))
      const sorted = filtered.sort((a, b) => {
        const pathA = currentPath + '/' + a
        const pathB = currentPath + '/' + b
        const isDirA = FileManager.isDirectorySync(pathA)
        const isDirB = FileManager.isDirectorySync(pathB)
        if (isDirA && !isDirB) return -1
        if (!isDirA && isDirB) return 1
        return a.localeCompare(b)
      })
      setFiles(sorted)
    } catch (e) {
      console.error(e)
      Dialog.alert({ message: 'Failed to read directory' })
    }
  }, [currentPath, showHidden, refreshKey])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

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
      setRefreshKey(k => k + 1)
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
    setRefreshKey(k => k + 1)
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
      setRefreshKey(k => k + 1)
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
      setRefreshKey(k => k + 1)
    } catch (e) {
      console.error(e)
      await Dialog.alert({ title: '移动失败', message: '请检查目标目录是否存在且可写' })
    }
  }

  /**
   * 创建新文件/文件夹的入口，根据用户选择执行对应操作。
   */
  const handleCreate = async () => {
    const index = await Dialog.actionSheet({
      title: 'Create New',
      actions: [{ label: 'Folder' }, { label: 'Text File' }],
      cancelButton: true
    })

    if (index === 0) {
      const name = await Dialog.prompt({ title: 'New Folder Name' })
      if (name) {
        await FileManager.createDirectory(currentPath + '/' + name)
        setRefreshKey(k => k + 1)
      }
    } else if (index === 1) {
      const name = await Dialog.prompt({ title: 'New File Name', defaultValue: 'untitled.txt' })
      if (name) {
        await FileManager.writeAsString(currentPath + '/' + name, '')
        setRefreshKey(k => k + 1)
      }
    }
  }

  /**
   * 展示偏好设置页，目前仅包含“显示隐藏文件”开关。
   */
  const handlePreferences = useCallback(() => {
    Navigation.present({
      element: <PreferencesView showHidden={showHidden} onToggleHidden={setShowHidden} />
    })
  }, [showHidden])

  const isRoot = currentPath === rootPath
  const currentDirName = isRoot ? rootDisplayName : currentPath.split('/').pop() || rootDisplayName
  const relativePath = currentPath === rootPath ? '/' : currentPath.replace(rootPath, '')

  return (
    <VStack tag={tag} tabItem={tabItem} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
      <VStack padding={16}>
        <HStack alignment="center">
          <VStack layoutPriority={1} alignment="leading">
            <Text styledText={{ content: currentDirName, font: 20, fontWeight: 'bold' }} />
            <Text styledText={{ content: relativePath, font: 12, foregroundColor: '#8e8e93' }} />
          </VStack>
          <Spacer />
          <Button action={handleCreate}>
            <Image image={UIImage.fromSFSymbol('plus')!} frame={{ width: 24, height: 24 }} />
          </Button>
          <Button action={handlePreferences}>
            <Image image={UIImage.fromSFSymbol('gear')!} frame={{ width: 24, height: 24 }} />
          </Button>
          <Button action={dismiss}>
            <Image image={UIImage.fromSFSymbol('xmark.circle')!} frame={{ width: 24, height: 24 }} />
          </Button>
        </HStack>
      </VStack>

      {files.length === 0 ? (
        <VStack frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} alignment="center">
          <Spacer />
          <SVG filePath={`${Script.directory}/assets/icon/folder.svg`} resizable frame={{ width: 128, height: 128 }} />
          <Text styledText={{ content: '文件夹空', font: 16, fontWeight: 'bold', foregroundColor: '#8e8e93' }} />
          <Spacer />
        </VStack>
      ) : (
        <List listStyle="inset">
          {files.map(name => {
            const path = currentPath + '/' + name
            let isDir = false
            let stat = undefined
            try {
              isDir = FileManager.isDirectorySync(path)
              stat = FileManager.statSync(path)
            } catch (e) {
              console.error(e)
            }
            if (isDir) {
              return (
                <NavigationLink key={name} destination={<DirectoryView rootPath={rootPath} path={path} rootDisplayName={rootDisplayName} />}>
                  <FileRow
                    name={name}
                    path={path}
                    isDirectory
                    stat={stat}
                    onCopy={() => handleCopy(name)}
                    onMove={() => handleMove(name)}
                    onInfo={() => handleInfo(name)}
                    onRename={() => handleRename(name)}
                    onDuplicate={() => handleDuplicate(name)}
                    onDelete={() => handleDelete(name)}
                  />
                </NavigationLink>
              )
            }

            return (
              <FileRow
                key={name}
                name={name}
                path={path}
                isDirectory={false}
                stat={stat}
                onPress={() => handleOpenFile(name)}
                onCopy={() => handleCopy(name)}
                onMove={() => handleMove(name)}
                onInfo={() => handleInfo(name)}
                onRename={() => handleRename(name)}
                onDuplicate={() => handleDuplicate(name)}
                onDelete={() => handleDelete(name)}
              />
            )
          })}
        </List>
      )}
    </VStack>
  )
}

type PreferencesViewProps = {
  showHidden: boolean
  onToggleHidden: (value: boolean) => void
}

function PreferencesView({ showHidden, onToggleHidden }: PreferencesViewProps) {
  const dismiss = Navigation.useDismiss()

  return (
    <NavigationStack>
      <Form
        navigationTitle="偏好设置"
        toolbar={{
          cancellationAction: (
            <Button
              title="完成"
              action={() => {
                dismiss()
              }}
            />
          )
        }}
      >
        <Section header={<Text>列表显示</Text>}>
          <Toggle
            title="显示隐藏文件"
            value={showHidden}
            onChanged={value => {
              onToggleHidden(value)
            }}
          />
        </Section>
      </Form>
    </NavigationStack>
  )
}
