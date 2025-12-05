import { Button, HStack, Image, Label, List, Script, Spacer, TabView, Text, VStack, useCallback, useColorScheme, useEffect, useState } from 'scripting'

import { FileRow } from '../components/FileRow'

const ROOT_TABS = [
  { title: 'Documents', icon: 'folder.fill', path: FileManager.documentsDirectory },
  { title: 'AppGroup', icon: 'externaldrive.fill', path: FileManager.appGroupDocumentsDirectory }
]

export function FileListScreen() {
  const [tabIndex, setTabIndex] = useState(0)

  return (
    <TabView tabIndex={tabIndex} onTabIndexChanged={setTabIndex}>
      {ROOT_TABS.map((tab, index) => (
        <FileListView key={tab.path} initialRoot={tab.path} tag={index} tabItem={<Label title={tab.title} systemImage={tab.icon} />} />
      ))}
    </TabView>
  )
}

type FileListViewProps = {
  initialRoot: string
  tag: number
  tabItem: JSX.Element
}

function FileListView({ initialRoot, tag, tabItem }: FileListViewProps) {
  const [currentPath, setCurrentPath] = useState(initialRoot)
  const [files, setFiles] = useState<string[]>([])
  const [showHidden, setShowHidden] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  useEffect(() => {
    setCurrentPath(initialRoot)
    setRefreshKey(k => k + 1)
  }, [initialRoot])

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
   * 点击条目时决定是进入子目录还是直接预览文件。
   */
  const handleNavigate = (name: string) => {
    const newPath = currentPath + '/' + name
    if (FileManager.isDirectorySync(newPath)) {
      setCurrentPath(newPath)
    } else {
      QuickLook.previewURLs([`file://${newPath}`])
    }
  }

  /**
   * 将选中文件的完整路径写入剪贴板，方便外部粘贴。
   */
  const handleCopy = async (name: string) => {
    const filePath = currentPath + '/' + name
    await Pasteboard.setString(filePath)
    await Dialog.alert({ title: '已拷贝路径', message: filePath })
  }

  /**
   * 返回上一层目录，根目录时保持不动。
   */
  const handleBack = () => {
    if (currentPath === initialRoot) return
    const parent = currentPath.substring(0, currentPath.lastIndexOf('/'))
    setCurrentPath(parent)
  }

  /**
   * 快速退出脚本，供右上角按钮调用。
   */
  const handleExit = async () => {
    Script.exit()
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

  const isRoot = currentPath === initialRoot
  const rootDisplayName = initialRoot === FileManager.appGroupDocumentsDirectory ? 'AppGroup' : 'Documents'
  const currentDirName = isRoot ? rootDisplayName : currentPath.split('/').pop() || rootDisplayName
  const relativePath = currentPath.replace(initialRoot, '') || '/'

  return (
    <VStack tag={tag} tabItem={tabItem} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} background="#ffffff">
      <VStack padding={16} background="#ffffff">
        <HStack alignment="center">
          {!isRoot && (
            <Button action={handleBack}>
              <Image image={UIImage.fromSFSymbol('chevron.left')!} frame={{ width: 24, height: 24 }} />
            </Button>
          )}
          <VStack layoutPriority={1} alignment="leading">
            <Text styledText={{ content: currentDirName, font: 20, fontWeight: 'bold', foregroundColor: isDark ? '#ffffff' : '#000000' }} />
            <Text styledText={{ content: relativePath, font: 12, foregroundColor: '#8e8e93' }} />
          </VStack>
          <Spacer />
          <Button action={handleCreate}>
            <Image image={UIImage.fromSFSymbol('plus')!} frame={{ width: 24, height: 24 }} />
          </Button>
          <Button action={handleExit}>
            <Image image={UIImage.fromSFSymbol('xmark.circle')!} frame={{ width: 24, height: 24 }} />
          </Button>
        </HStack>

        <HStack padding={{ top: 10 }}>
          <Spacer />
          <Button action={() => setShowHidden(!showHidden)}>
            <Image image={UIImage.fromSFSymbol(showHidden ? 'eye' : 'eye.slash')!} frame={{ width: 20, height: 20 }} />
          </Button>
        </HStack>
      </VStack>

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

          return (
            <FileRow
              key={name}
              name={name}
              path={path}
              isDirectory={isDir}
              stat={stat}
              onPress={() => handleNavigate(name)}
              onCopy={() => handleCopy(name)}
              onMove={() => handleMove(name)}
              onInfo={() => handleInfo(name)}
              onRename={() => handleRename(name)}
              onDuplicate={() => handleDuplicate(name)}
              onDelete={() => handleDelete(name)}
            />
          )
        })}
        {files.length === 0 && (
          <VStack alignment="center" padding={{ top: 50 }}>
            <Text styledText={{ content: 'Empty Folder', font: 14, foregroundColor: '#8e8e93' }} />
          </VStack>
        )}
      </List>
    </VStack>
  )
}
