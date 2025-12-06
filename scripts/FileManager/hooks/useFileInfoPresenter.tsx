import { Navigation, useCallback } from 'scripting'
import { FileInfoView } from '../components/FileInfoView'
import type { FileInfoPresenterOptions, FileInfoRequest } from '../types'

/**
 * 提供 showInfo 方法，封装 stat 获取与视图展示
 * @param options presenter 依赖
 */
export const useFileInfoPresenter = ({ l10n }: FileInfoPresenterOptions) => {
  const showInfo = useCallback(
    async ({ name, path, stat, autoComputeSize }: FileInfoRequest) => {
      let fileStat = stat
      if (!fileStat) {
        try {
          fileStat = await FileManager.stat(path)
        } catch (error) {
          console.error('[useFileInfoPresenter] stat failed', path, error)
          await Dialog.alert({ title: l10n.previewFailed, message: String(error) })
          return
        }
      }
      let isDirectory = fileStat.type === 'directory'
      if (!isDirectory) {
        try {
          isDirectory = FileManager.isDirectorySync(path)
        } catch (error) {
          console.error('[useFileInfoPresenter] isDirectorySync failed', path, error)
        }
      }
      await Navigation.present({
        element: <FileInfoView name={name} path={path} stat={fileStat} isDirectory={isDirectory} autoComputeSize={autoComputeSize && isDirectory} l10n={l10n} />
      })
    },
    [l10n]
  )

  return { showInfo }
}
