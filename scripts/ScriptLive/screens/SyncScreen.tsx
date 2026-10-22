import { Button, HStack, Image, List, ProgressView, Rectangle, Section, SecureField, Spacer, Text, TextField, VStack, useState } from 'scripting'
import type { Color } from 'scripting'
import { IconTile } from '../components/IconTile'
import { ScreenBackground } from '../components/ScreenBackground'
import { useStore } from '../hooks/useStore'
import {
  exportBackupFile,
  exportFollowsJson,
  importBackupFile,
  importFollowsJson,
  restoreWebDav,
  testWebDav,
  uploadWebDav,
  webDavStore
} from '../services/backup'
import { errorMessage, formatDateTime } from '../utils/format'
import { TILE, palette } from '../theme'

const rowBackground = <Rectangle fill={palette.card} />

const syncTime = (value: number) => (value ? formatDateTime(new Date(value)) : '从未')

const OperationButton = ({
  icon,
  color,
  title,
  busy,
  disabled,
  onTap
}: {
  icon: string
  color: Color
  title: string
  busy: boolean
  disabled?: boolean
  onTap: () => void
}) => (
  <Button buttonStyle="plain" disabled={busy || disabled} action={onTap}>
    <HStack alignment="center" spacing={12} padding={{ vertical: 3 }}>
      <IconTile icon={icon} color={color} />
      <Text foregroundStyle={palette.textPrimary}>{title}</Text>
      <Spacer />
      {busy ? <ProgressView progressViewStyle="circular" /> : <Image systemName="chevron.right" font={13} foregroundStyle={palette.textTertiary} />}
    </HStack>
  </Button>
)

/** WebDAV 与本地文件导入导出。所有同步操作都在页面内显示进行中状态。 */
export const SyncScreen = () => {
  const webDav = useStore(webDavStore)
  const [busy, setBusy] = useState<string | null>(null)

  const run = async (key: string, operation: () => Promise<boolean | void>, successMessage: string) => {
    if (busy) return
    setBusy(key)
    try {
      const completed = await operation()
      if (completed !== false) await Dialog.alert({ title: '完成', message: successMessage })
    } catch (error) {
      console.error(`[ScriptLive] ${key} 失败`, error)
      await Dialog.alert({ title: '操作失败', message: errorMessage(error) })
    } finally {
      setBusy(null)
    }
  }

  const updateConfig = (patch: Partial<typeof webDav>) => webDavStore.update(current => ({ ...current, ...patch }))

  const testConnection = () =>
    void run(
      'test',
      async () => {
        if (!webDav.url.trim()) throw new Error('请先填写 WebDAV 地址')
        await testWebDav(webDav)
      },
      'WebDAV 连接成功'
    )

  const upload = () =>
    void run(
      'upload',
      async () => {
        if (!webDav.url.trim()) throw new Error('请先填写 WebDAV 地址')
        await uploadWebDav()
      },
      '备份已上传到 WebDAV'
    )

  const restoreRemote = async () => {
    const confirmed = await Dialog.confirm({
      title: '恢复 WebDAV 备份',
      message: '恢复会合并关注与观看记录，并覆盖本地设置和 B站 Cookie。确定继续吗？',
      confirmLabel: '恢复',
      cancelLabel: '取消'
    })
    if (confirmed)
      void run(
        'restore',
        async () => {
          if (!webDav.url.trim()) throw new Error('请先填写 WebDAV 地址')
          await restoreWebDav()
        },
        'WebDAV 备份已恢复'
      )
  }

  const exportFollows = () =>
    void run(
      'export-follows',
      async () => {
        const data = Data.fromRawString(exportFollowsJson())
        if (!data) throw new Error('生成关注 JSON 失败')
        const result = await DocumentPicker.exportFiles({ files: [{ data, name: `ScriptLive_follows_${formatDateTime(new Date()).slice(0, 10)}.json` }] })
        return result.length > 0
      },
      '关注列表已导出'
    )

  const importFollows = () =>
    void run(
      'import-follows',
      async () => {
        const source = await Dialog.actionSheet({
          title: '导入关注 JSON',
          actions: [{ label: '从文件导入' }, { label: '从剪贴板导入' }]
        })
        if (source === null) return false
        let text: string | null
        if (source === 0) {
          const [path] = await DocumentPicker.pickFiles({ types: ['public.json', 'public.plain-text'] })
          if (!path) return false
          text = await FileManager.readAsString(path)
        } else {
          text = await Pasteboard.getString()
        }
        if (!text?.trim()) throw new Error('没有读取到关注 JSON')
        const count = importFollowsJson(text)
        await Dialog.alert({ title: '导入完成', message: `已合并 ${count} 条关注` })
        return false
      },
      '关注列表已导入'
    )

  const exportBackup = () => void run('export-backup', exportBackupFile, '完整备份已导出')

  const importBackup = async () => {
    const confirmed = await Dialog.confirm({
      title: '导入完整备份',
      message: '导入会合并关注、观看记录和屏蔽词，并覆盖本地设置与 B站 Cookie。确定继续吗？',
      confirmLabel: '导入',
      cancelLabel: '取消'
    })
    if (confirmed) void run('import-backup', importBackupFile, '完整备份已导入')
  }

  return (
    <List
      foregroundStyle={palette.textPrimary}
      background={<ScreenBackground />}
      scrollContentBackground="hidden"
      navigationTitle="数据同步"
      navigationBarTitleDisplayMode="inline"
    >
      <Section
        header={<Text>WebDAV</Text>}
        listRowBackground={rowBackground}
        footer={
          <VStack alignment="leading" spacing={4}>
            <Text font="footnote">备份包含关注、观看记录、屏蔽词、设置与 B站 Cookie，请使用可信的 WebDAV 服务。</Text>
            <Text font="caption" foregroundStyle={palette.textTertiary}>
              上次上传：{syncTime(webDav.lastUpload)}
            </Text>
            <Text font="caption" foregroundStyle={palette.textTertiary}>
              上次恢复：{syncTime(webDav.lastRestore)}
            </Text>
          </VStack>
        }
      >
        <TextField
          label={<Text foregroundStyle={palette.textSecondary}>地址</Text>}
          value={webDav.url}
          disabled={!!busy}
          onChanged={url => updateConfig({ url })}
          prompt="https://dav.example.com/remote.php/dav/files/user"
        />
        <TextField
          label={<Text foregroundStyle={palette.textSecondary}>用户名</Text>}
          value={webDav.user}
          onChanged={user => updateConfig({ user })}
          disabled={!!busy}
        />
        <SecureField
          label={<Text foregroundStyle={palette.textSecondary}>密码</Text>}
          value={webDav.password}
          onChanged={password => updateConfig({ password })}
          disabled={!!busy}
        />
        <OperationButton icon="checkmark.seal" color={TILE.blue} title="测试连接" busy={busy === 'test'} disabled={!!busy} onTap={testConnection} />
        <OperationButton icon="arrow.up.circle" color={TILE.green} title="上传备份" busy={busy === 'upload'} disabled={!!busy} onTap={upload} />
        <OperationButton
          icon="arrow.down.circle"
          color={TILE.orange}
          title="恢复备份"
          busy={busy === 'restore'}
          disabled={!!busy}
          onTap={() => void restoreRemote()}
        />
      </Section>
      <Section header={<Text>关注列表</Text>} listRowBackground={rowBackground}>
        <OperationButton
          icon="square.and.arrow.up"
          color={TILE.teal}
          title="导出关注 JSON"
          busy={busy === 'export-follows'}
          disabled={!!busy}
          onTap={exportFollows}
        />
        <OperationButton
          icon="square.and.arrow.down"
          color={TILE.indigo}
          title="导入关注 JSON"
          busy={busy === 'import-follows'}
          disabled={!!busy}
          onTap={importFollows}
        />
      </Section>
      <Section
        header={<Text>完整备份</Text>}
        listRowBackground={rowBackground}
        footer={<Text font="footnote">完整备份会将设置与账号凭据一并写入文件，请妥善保管。</Text>}
      >
        <OperationButton icon="archivebox" color={TILE.purple} title="导出完整备份" busy={busy === 'export-backup'} disabled={!!busy} onTap={exportBackup} />
        <OperationButton
          icon="archivebox.fill"
          color={TILE.pink}
          title="导入备份文件"
          busy={busy === 'import-backup'}
          disabled={!!busy}
          onTap={() => void importBackup()}
        />
      </Section>
    </List>
  )
}
