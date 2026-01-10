import { Button, HStack, Image, Text } from 'scripting'

import type { BreadcrumbBarProps } from '../types'
import { encodeNavigationPathId, joinFilePath, normalizeFilePath, sleep } from '../utils/common'

const normalizePath = (path: string) => {
  return normalizeFilePath(path)
}

const joinPath = (base: string, part: string) => {
  return joinFilePath(base, part)
}

const DEBUG_NAVIGATION = false

const debugLog = (...args: unknown[]) => {
  if (!DEBUG_NAVIGATION) return
  console.log('[FileManagerNavDebug]', ...args)
}

const buildNavigationPathValues = (rootPath: string, targetPath: string): string[] => {
  const normalizedRoot = normalizePath(rootPath)
  const normalizedTarget = normalizePath(targetPath)

  if (normalizedTarget === normalizedRoot) {
    return []
  }

  const rootPrefix = normalizedRoot === '/' ? '/' : `${normalizedRoot}/`
  if (!normalizedTarget.startsWith(rootPrefix)) {
    return []
  }

  const relative = normalizedTarget.slice(rootPrefix.length).replace(/^\/+/, '')
  const parts = relative.split('/').filter(Boolean)

  const values: string[] = []
  let accumulated = normalizedRoot
  for (const part of parts) {
    accumulated = joinPath(accumulated, part)
    values.push(encodeNavigationPathId(accumulated))
  }

  return values
}

export const BreadcrumbBar = ({ segments, dismissStack, rootPath, navigationPath }: BreadcrumbBarProps) => (
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
        if (navigationPath) {
          const nextPath = buildNavigationPathValues(rootPath, segment.targetPath)
          handler = async () => {
            debugLog('breadcrumbTap', {
              segmentLabel: segment.label,
              segmentTargetPath: segment.targetPath,
              rootPath,
              before: navigationPath.value,
              nextPath
            })
            navigationPath.setValue(nextPath)
          }
        } else if (dismissStack) {
          const depth = buildNavigationPathValues(rootPath, segment.targetPath).length
          const currentDepth = dismissStack.length - 1

          if (depth < currentDepth) {
            handler = async () => {
              const steps = currentDepth - depth
              console.log(`[Breadcrumb] Pop sequence: current=${currentDepth}, target=${depth}, steps=${steps}`)

              for (let i = 0; i < steps; i++) {
                const stackIndex = currentDepth - i
                const fn = dismissStack[stackIndex]
                if (fn) {
                  fn()
                  await sleep(50)
                }
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
                handler?.()
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
