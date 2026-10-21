import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, rename, rm } from 'node:fs/promises'
import path from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const scriptsDir = path.join(rootDir, 'scripts')
const releasesDir = path.join(rootDir, 'releases')

async function selectScripts(names) {
  console.log('可打包的脚本：')
  names.forEach((name, index) => console.log(`  ${index + 1}. ${name}`))

  const input = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await new Promise(resolve => {
    input.question('输入编号（多选用空格或逗号分隔，直接回车取消）：', resolve)
    input.once('close', () => resolve(''))
  })
  input.close()

  if (!answer.trim()) return []

  return answer
    .trim()
    .split(/[\s,，]+/)
    .map(value => {
      const index = Number(value) - 1
      if (!/^\d+$/.test(value) || !Number.isInteger(index) || index < 0 || index >= names.length) {
        throw new Error(`无效编号：${value}`)
      }
      return names[index]
    })
}

async function packScript(name) {
  const outputPath = path.join(releasesDir, `${name}.scripting`)
  const tempDir = await mkdtemp(path.join(releasesDir, '.pack-'))

  try {
    const archivePath = path.join(tempDir, 'archive.scripting')
    const result = spawnSync('zip', ['-q', '-r', archivePath, '.', '-x', '*.DS_Store', '__MACOSX/*', '*/__MACOSX/*'], {
      cwd: path.join(scriptsDir, name),
      encoding: 'utf8'
    })

    if (result.error) {
      if (result.error.code === 'ENOENT') throw new Error('未找到 zip 命令，请先安装 zip 并确保它在 PATH 中。')
      throw result.error
    }
    if (result.status !== 0) throw new Error(`${name} 打包失败：${result.stderr || result.stdout || `zip 退出码 ${result.status}`}`)

    // 从空压缩包生成，成功后才替换旧包，避免残留已删除文件或破坏已有产物。
    await rename(archivePath, outputPath)
    console.log(`已打包：${outputPath}`)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log(
      '用法：pnpm run pack [文件夹名 ...]\n不带参数时按编号多选，每个脚本输出为 releases/<文件夹名>.scripting。\n示例：pnpm run pack ScriptFlix 一言小组件'
    )
    return
  }

  const entries = await readdir(scriptsDir, { withFileTypes: true })
  const names = entries
    .filter(entry => entry.isDirectory() && existsSync(path.join(scriptsDir, entry.name, 'script.json')))
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))

  if (!names.length) throw new Error('scripts 目录下没有包含 script.json 的脚本文件夹。')

  const selected = [...new Set(args.length ? args : await selectScripts(names))]
  for (const name of selected) {
    if (!names.includes(name)) throw new Error(`未找到脚本：${name}。请使用 scripts 目录下含 script.json 的直属文件夹名。`)
  }
  if (!selected.length) {
    console.log('已取消打包。')
    return
  }

  await mkdir(releasesDir, { recursive: true })
  for (const name of selected) await packScript(name)
}

main().catch(error => {
  console.error(`打包失败：${error.message}`)
  process.exitCode = 1
})
