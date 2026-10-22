import { useEffect, useRef } from 'scripting'

export type NowPlaying = {
  title: string
  artist: string
  playing: boolean
}

/**
 * 锁屏与控制中心的正在播放信息和播放 / 暂停按钮。
 * 原生播放器为支持画中画改用 layer 渲染，系统不再自动管理 Now Playing，由这里补上。
 * @param info 正在播放的直播；为 null 时清空并停用远程控制
 * @param onSetPaused 远程控制回调，参数为是否暂停
 */
export const useNowPlaying = (info: NowPlaying | null, onSetPaused: (paused: boolean) => void) => {
  const latest = useRef({ playing: false, onSetPaused })
  latest.current = { playing: !!info?.playing, onSetPaused }
  const enabled = !!info

  useEffect(() => {
    if (!enabled) return
    MediaPlayer.setAvailableCommands(['play', 'pause', 'togglePausePlay'])
    MediaPlayer.commandHandler = (command: 'pause' | 'play' | 'stop' | 'togglePausePlay' | 'nextTrack' | 'previousTrack') => {
      if (command === 'play') latest.current.onSetPaused(false)
      else if (command === 'pause') latest.current.onSetPaused(true)
      else if (command === 'togglePausePlay') latest.current.onSetPaused(latest.current.playing)
    }
    return () => {
      MediaPlayer.commandHandler = null
      MediaPlayer.setAvailableCommands([])
      MediaPlayer.nowPlayingInfo = null
    }
  }, [enabled])

  useEffect(() => {
    if (!info) return
    MediaPlayer.nowPlayingInfo = {
      title: info.title,
      artist: info.artist,
      mediaType: MediaType.video,
      isLiveStream: true,
      playbackRate: info.playing ? 1 : 0
    }
  }, [enabled, info?.title, info?.artist, info?.playing])
}
