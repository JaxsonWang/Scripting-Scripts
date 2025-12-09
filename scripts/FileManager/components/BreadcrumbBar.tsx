import { Button, HStack, Image, Text } from 'scripting'
import type { BreadcrumbBarProps } from '../types'
import { sleep } from '../utils/common'

/**
 * 计算目标路径与根路径的相对深度
 * @param path 目标路径
 * @param rootPath 根路径
 */
const getRelativeDepth = (path: string, rootPath: string) => {
  // 处理根目录情况
  const cleanRoot = rootPath.endsWith('/') && rootPath.length > 1 ? rootPath.slice(0, -1) : rootPath
  const cleanPath = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path

  if (cleanPath === cleanRoot) return 0

  // 确保 path 以 rootPath 开头
  const normalizedRoot = cleanRoot.endsWith('/') ? cleanRoot : `${cleanRoot}/`
  if (!cleanPath.startsWith(normalizedRoot)) return 0

  const relative = cleanPath.slice(normalizedRoot.length)
  return relative.split('/').filter(Boolean).length
}

/**
 * 顶部面包屑导航条
 * @param props 面包屑配置
 */
export const BreadcrumbBar = ({ segments, dismissStack, rootPath }: BreadcrumbBarProps) => (
  <HStack alignment="center" padding={{ horizontal: 26 }} spacing={4}>
    {segments.map((segment, index) => {
      const isLast = index === segments.length - 1
      const isRootSegment = index === 0
      const color = segment.isEllipsis ? '#8e8e93' : segment.targetPath ? '#0A84FF' : undefined
      const node = isRootSegment ? (
        <Image systemName="house.circle" imageScale="medium" foregroundStyle={color ?? '#8e8e93'} />
      ) : (
        <Text lineLimit={1} layoutPriority={1} styledText={{ content: segment.label, fontWeight: 'bold', font: 12 }} foregroundStyle={color} />
      )

      let handler: (() => Promise<void>) | undefined

      if (segment.targetPath) {
        const depth = getRelativeDepth(segment.targetPath, rootPath)
        // 目标是 Depth D
        // 栈结构: [dismissRoot, dismissA, dismissB, dismissC] (Length 4, C is current)
        // Root(0), A(1), B(2), C(3).
        // 当前层级 = stack.length - 1.
        // 如果要去 Depth 1 (A). 我们需要 dismiss C (idx 3), 然后 dismiss B (idx 2).
        // 此时回到 A.
        // 也就是我们要调用 indices: length-1, length-2, ... until depth+1.

        // 检查是否需要 pop
        const currentDepth = dismissStack.length - 1
        if (depth < currentDepth) {
          handler = async () => {
            const steps = currentDepth - depth
            console.log(`[Breadcrumb] Pop sequence: current=${currentDepth}, target=${depth}, steps=${steps}`)

            // 顺序执行 dismiss
            for (let i = 0; i < steps; i++) {
              const stackIndex = currentDepth - i
              const fn = dismissStack[stackIndex]
              if (fn) {
                fn()
                // 等待动画完成
                await sleep(50)
              }
            }
          }
        }
      }

      return (
        <HStack key={`crumb-${segment.key}`} alignment="center" spacing={4}>
          {handler ? (
            <Button
              action={() => {
                if (handler) {
                  handler()
                }
              }}
            >
              {node}
            </Button>
          ) : (
            node
          )}
          {!isLast ? <Image systemName="chevron.right" imageScale="small" foregroundStyle="#8e8e93" /> : null}
        </HStack>
      )
    })}
  </HStack>
)
