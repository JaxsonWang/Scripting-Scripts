import { Button, HStack, Image, List, Spacer, Text, VStack, useCallback, useColorScheme, useEffect, useState } from 'scripting'
import { FileRow } from '../components/FileRow'

export function FileListScreen() {
  const [root, setRoot] = useState(FileManager.documentsDirectory)
  const [currentPath, setCurrentPath] = useState(FileManager.documentsDirectory)
  const [files, setFiles] = useState<string[]>([])
  const [showHidden, setShowHidden] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const loadFiles = useCallback(async () => {
    try {
      const names = await FileManager.readDirectory(currentPath)
      const filtered = names.filter(n => showHidden || !n.startsWith('.'))
      // Sort: Directories first, then files.
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

  const handleNavigate = (name: string) => {
    const newPath = currentPath + '/' + name
    if (FileManager.isDirectorySync(newPath)) {
      setCurrentPath(newPath)
    } else {
      QuickLook.previewURLs([`file://${newPath}`])
    }
  }

  const handleBack = () => {
    if (currentPath === root) return
    const parent = currentPath.substring(0, currentPath.lastIndexOf('/'))
    setCurrentPath(parent)
  }

  const isRoot = currentPath === root

  const handleInfo = async (name: string) => {
    const filePath = currentPath + '/' + name
    const stat = await FileManager.stat(filePath)
    const info = `
Path: ${filePath}
Size: ${stat.size} bytes
Created: ${new Date(stat.creationDate).toLocaleString()}
Modified: ${new Date(stat.modificationDate).toLocaleString()}
Type: ${stat.type}
    `
    await Dialog.alert({ title: 'File Info', message: info })
  }

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

  const handleRootChange = (newRoot: string) => {
    setRoot(newRoot)
    setCurrentPath(newRoot)
  }

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

  const currentDirName = currentPath.split('/').pop() || 'Documents'
  const relativePath = currentPath.replace(root, '') || '/'

  return (
    <VStack frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }} background="#ffffff">
      {/* Header */}
      <VStack padding={16} background="#ffffff">
        <HStack alignment="center">
          {!isRoot && (
            <Button action={handleBack}>
              <Image image={UIImage.fromSFSymbol('chevron.left')!} frame={{ width: 24, height: 24 }} />
            </Button>
          )}
          <VStack padding={{ leading: !isRoot ? 10 : 0 }} layoutPriority={1}>
            <Text styledText={{ content: currentDirName, font: 20, fontWeight: 'bold', foregroundColor: isDark ? '#ffffff' : '#000000' }} />
            <Text styledText={{ content: relativePath, font: 12, foregroundColor: '#8e8e93' }} />
          </VStack>
          <Spacer />
          <Button action={handleCreate}>
            <Image image={UIImage.fromSFSymbol('plus')!} frame={{ width: 24, height: 24 }} />
          </Button>
        </HStack>

        <HStack padding={{ top: 10 }} spacing={10}>
          <Button action={() => handleRootChange(FileManager.documentsDirectory)}>
            <Text
              styledText={{
                content: 'Documents',
                font: 14,
                fontWeight: root === FileManager.documentsDirectory ? 'bold' : 'regular',
                foregroundColor: root === FileManager.documentsDirectory ? '#007aff' : '#8e8e93'
              }}
            />
          </Button>
          <Button action={() => handleRootChange(FileManager.appGroupDocumentsDirectory)}>
            <Text
              styledText={{
                content: 'App Group',
                font: 14,
                fontWeight: root === FileManager.appGroupDocumentsDirectory ? 'bold' : 'regular',
                foregroundColor: root === FileManager.appGroupDocumentsDirectory ? '#007aff' : '#8e8e93'
              }}
            />
          </Button>
          <Spacer />
          <Button action={() => setShowHidden(!showHidden)}>
            <Image image={UIImage.fromSFSymbol(showHidden ? 'eye' : 'eye.slash')!} frame={{ width: 20, height: 20 }} />
          </Button>
        </HStack>
      </VStack>

      {/* File List */}
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
