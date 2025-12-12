/**
 * Live Activity 工具（精确时间）
 * 在灵动岛显示当前时间，精确到毫秒
 */
import type { LiveActivityState as ActivityState } from 'scripting'
import {
  Button,
  HStack,
  Image,
  Navigation,
  NavigationStack,
  RoundedRectangle,
  Script,
  ScrollView,
  Spacer,
  Text,
  VStack,
  useEffect,
  useRef,
  useState
} from 'scripting'

import { type LiveActivityState as ContentState, DeviceMonitorActivity } from './live_activity'

const UPDATE_INTERVAL_TIME = 1000

function getCurrentTime(): ContentState {
  const now = new Date()
  return {
    hours: now.getHours().toString().padStart(2, '0'),
    minutes: now.getMinutes().toString().padStart(2, '0'),
    seconds: now.getSeconds().toString().padStart(2, '0'),
    milliseconds: now.getMilliseconds().toString().padStart(3, '0'),
    date: now.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short'
    })
  }
}

function buildContentState(): ContentState {
  return getCurrentTime()
}

function LiveActivityToolsApp() {
  const dismiss = Navigation.useDismiss()
  const [activityState, setActivityState] = useState<ActivityState | null>(null)
  const [previewData, setPreviewData] = useState<ContentState>(buildContentState())

  const activityRef = useRef<ReturnType<typeof DeviceMonitorActivity> | null>(null)

  const ensureActivity = (forceNew = false) => {
    if (!activityRef.current || forceNew) {
      const instance = DeviceMonitorActivity()
      instance.addUpdateListener((state: ActivityState) => {
        setActivityState(state)
        if (state === 'dismissed') {
          BackgroundKeeper.stopKeepAlive()
        }
      })
      activityRef.current = instance
    }
    return activityRef.current
  }

  const isRunning = activityState === 'active' || activityState === 'stale'

  useEffect(() => {
    let timerId: number | null = null
    let cancelled = false

    function tick() {
      if (cancelled) return
      setPreviewData(buildContentState())
      timerId = setTimeout(tick, UPDATE_INTERVAL_TIME)
    }

    tick()

    return () => {
      cancelled = true
      if (timerId !== null) {
        clearTimeout(timerId)
      }
    }
  }, [])

  useEffect(() => {
    if (!isRunning) return

    let timerId: number | null = null
    let cancelled = false

    function tick() {
      if (cancelled) return
      const state = buildContentState()
      const instance = activityRef.current
      if (instance) {
        instance.update(state)
      }
      timerId = setTimeout(tick, UPDATE_INTERVAL_TIME)
    }

    tick()

    return () => {
      cancelled = true
      if (timerId !== null) {
        clearTimeout(timerId)
      }
    }
  }, [isRunning])

  const startActivity = async () => {
    const needNew = !activityRef.current || activityState === 'ended' || activityState === 'dismissed'
    const activity = ensureActivity(needNew)

    BackgroundKeeper.keepAlive()
    const success = await activity.start(buildContentState())

    if (success) {
      Dialog.alert({
        title: '已启动',
        message: 'Live Activity 已启动，将在灵动岛显示当前时间。'
      })
    } else {
      BackgroundKeeper.stopKeepAlive()
      Dialog.alert({
        title: '启动失败',
        message: '无法启动 Live Activity，请检查系统设置。'
      })
    }
  }

  const stopActivity = async () => {
    const activity = activityRef.current
    if (!activity) return

    await activity.end(buildContentState(), { dismissTimeInterval: 0 })
    BackgroundKeeper.stopKeepAlive()

    Dialog.alert({
      title: '已停止',
      message: 'Live Activity 已结束。'
    })
  }

  const handleClose = async () => {
    if (isRunning) {
      const activity = activityRef.current
      const shouldStop = await Dialog.confirm({
        title: '确认关闭',
        message: 'Live Activity 正在运行，是否停止并关闭？'
      })
      if (shouldStop) {
        if (activity) {
          await activity.end(buildContentState(), { dismissTimeInterval: 0 })
        }
        BackgroundKeeper.stopKeepAlive()
      }
    }
    dismiss()
  }

  return (
    <NavigationStack>
      <ScrollView
        navigationTitle="Live Activity 工具"
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          topBarTrailing: (
            <Button action={handleClose}>
              <Text foregroundStyle="link">关闭</Text>
            </Button>
          )
        }}
        background="systemBackground"
      >
        <VStack spacing={20} padding={16}>
          <StatusCard activityState={activityState} />
          <PreviewCard data={previewData} />
          <ControlButtons isRunning={isRunning} onStart={startActivity} onStop={stopActivity} />
          <InfoCard />
        </VStack>
      </ScrollView>
    </NavigationStack>
  )
}

function StatusCard({ activityState }: { activityState: ActivityState | null }) {
  const isRunning = activityState === 'active' || activityState === 'stale'
  const statusText = activityState ?? '未启动'

  return (
    <HStack padding={16} background={<RoundedRectangle cornerRadius={16} fill="secondarySystemBackground" />} alignment="center">
      <VStack spacing={4} alignment="leading">
        <Text font="headline" foregroundStyle="label">
          {isRunning ? '运行中' : statusText}
        </Text>
        <Text font="subheadline" foregroundStyle="secondaryLabel">
          精确时间显示
        </Text>
      </VStack>
      <Spacer />
      <HStack spacing={8}>
        <VStack frame={{ width: 12, height: 12 }} background={<RoundedRectangle cornerRadius={6} fill={isRunning ? 'systemGreen' : 'tertiaryLabel'} />} />
        <Text font="caption" foregroundStyle={isRunning ? 'systemGreen' : 'secondaryLabel'}>
          {isRunning ? 'LIVE' : 'OFF'}
        </Text>
      </HStack>
    </HStack>
  )
}

function PreviewCard({ data }: { data: ContentState }) {
  return (
    <VStack spacing={12} alignment="leading">
      <Text font="subheadline" foregroundStyle="secondaryLabel">
        预览
      </Text>
      <VStack padding={20} background={<RoundedRectangle cornerRadius={16} fill="secondarySystemBackground" />} alignment="center">
        <PreviewContent data={data} />
      </VStack>
    </VStack>
  )
}

function PreviewContent({ data }: { data: ContentState }) {
  return (
    <VStack spacing={2} alignment="center">
      <HStack spacing={0} alignment="lastTextBaseline">
        <Text font="largeTitle" fontWeight="bold" foregroundStyle="label">
          {data.hours}:{data.minutes}:{data.seconds}
        </Text>
        <Text font="title3" fontWeight="medium" foregroundStyle="systemCyan">
          .{data.milliseconds}
        </Text>
      </HStack>
      <Text font="caption" foregroundStyle="secondaryLabel">
        {data.date}
      </Text>
    </VStack>
  )
}

function ControlButtons({ isRunning, onStart, onStop }: { isRunning: boolean; onStart: () => void; onStop: () => void }) {
  return (
    <HStack spacing={12}>
      <Button action={isRunning ? onStop : onStart}>
        <HStack
          padding={16}
          frame={{ maxWidth: 'infinity' }}
          background={<RoundedRectangle cornerRadius={12} fill={isRunning ? 'systemRed' : 'systemGreen'} />}
          alignment="center"
        >
          <Image systemName={isRunning ? 'stop.fill' : 'play.fill'} font="body" foregroundStyle="white" />
          <Text font="headline" foregroundStyle="white">
            {isRunning ? '停止' : '启动'}
          </Text>
        </HStack>
      </Button>
    </HStack>
  )
}

function InfoCard() {
  return (
    <VStack spacing={8} padding={16} background={<RoundedRectangle cornerRadius={16} fill="secondarySystemBackground" />} alignment="leading">
      <HStack spacing={8}>
        <Image systemName="info.circle" font="body" foregroundStyle="systemBlue" />
        <Text font="subheadline" fontWeight="semibold" foregroundStyle="label">
          使用说明
        </Text>
      </HStack>
      <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={10}>
        {getInfoText()}
      </Text>
    </VStack>
  )
}

function getInfoText(): string {
  return '启动后，当前时间将实时显示在灵动岛中。时间以 50ms 间隔更新，精确到毫秒。'
}

async function run() {
  await Navigation.present(<LiveActivityToolsApp />)
  Script.exit()
}

run()
