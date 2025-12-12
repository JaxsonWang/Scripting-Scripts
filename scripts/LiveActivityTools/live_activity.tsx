import type { LiveActivityUIBuilder } from 'scripting'
import { HStack, Image, LiveActivity, LiveActivityUI, LiveActivityUIExpandedCenter, Text, VStack } from 'scripting'

export type LiveActivityState = {
  hours: string
  minutes: string
  seconds: string
  milliseconds: string
  date: string
}

const DEVICE_MONITOR_ACTIVITY_ID = 'DeviceMonitorActivity'

const builder: LiveActivityUIBuilder<LiveActivityState> = state => {
  return (
    <LiveActivityUI
      content={
        <HStack>
          <Image systemName="clock.fill" foregroundStyle="systemCyan" />
          <Text>
            {state.hours}:{state.minutes}:{state.seconds}
          </Text>
        </HStack>
      }
      compactLeading={
        <Text>
          {state.hours}:{state.minutes}
        </Text>
      }
      compactTrailing={<Text>:{state.seconds}</Text>}
      minimal={<Image systemName="clock" />}
    >
      <LiveActivityUIExpandedCenter>
        <VStack>
          <Text font="title">
            {state.hours}:{state.minutes}:{state.seconds}
          </Text>
          <Text font="caption">{state.date}</Text>
        </VStack>
      </LiveActivityUIExpandedCenter>
    </LiveActivityUI>
  )
}

export const DeviceMonitorActivity = LiveActivity.register<LiveActivityState>(DEVICE_MONITOR_ACTIVITY_ID, builder)
