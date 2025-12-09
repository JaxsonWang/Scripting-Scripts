import chokidar from 'chokidar'
import fs from 'fs-extra'
import { homedir } from 'os'
import path from 'path'

const devPath = path.join(homedir(), 'Library', 'Mobile Documents', 'iCloud~com~thomfang~Scripting', 'Documents', 'scripts')

const srcDir = path.resolve('scripts')
const destDir = path.resolve(devPath)

fs.ensureDirSync(destDir)

const watcher = chokidar.watch(srcDir, {
  ignored: /(^|[/\\])\../, // 忽略隐藏文件
  ignoreInitial: false
})

watcher.on('all', (event: string, filePath: string) => {
  const relativePath = path.relative(srcDir, filePath)
  const targetPath = path.join(destDir, relativePath)

  switch (event) {
    case 'add':
    case 'change':
      fs.copy(filePath, targetPath, { overwrite: true })
        .then(() => console.log(`✅ 文件更新: ${relativePath}`))
        .catch(err => console.error(`❌ 复制失败: ${err}`))
      break

    case 'unlink':
      fs.remove(targetPath)
        .then(() => console.log(`🗑 文件删除: ${relativePath}`))
        .catch(err => console.error(`❌ 删除失败: ${err}`))
      break

    default:
      break
  }
})
