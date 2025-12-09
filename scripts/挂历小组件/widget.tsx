import { Circle, Grid, GridRow, HStack, Image, Path, RoundedRectangle, Spacer, Text, VStack, Widget } from 'scripting'
import {
  formatEventTime,
  generateCalendarGrid,
  getCalendarData,
  getCurrentSettings as getCalendarSettings,
  getDynamicTextColor,
  getMonthNameToNumber,
  getWeekdayNames
} from './utils/calendar-service'
import { getDaysLeftInYear, solarToLunar } from './utils/lunar-calendar'
import { getActualColor, getCurrentSettings } from './components/settings-page'

/**
 * 获取背景图片路径
 */
const getWidgetBackgroundImagePath = (settings: any) => {
  return settings.bgPath && Widget.parameter ? Path.join(settings.bgPath, Widget.parameter) : undefined
}

/**
 * 生成背景样式
 */
const generateWidgetBackground = (settings: any) => {
  // 如果开启了颜色背景，优先使用颜色背景
  if (settings.enableColorBackground && settings.backgroundColors && settings.backgroundColors.length > 0) {
    const colors = settings.backgroundColors

    if (colors.length === 1) {
      // 单个颜色，使用纯色背景
      return colors[0]
    } else {
      // 多个颜色，使用渐变背景
      return {
        gradient: colors.map((color: any, index: number) => ({
          color: color,
          location: index / (colors.length - 1)
        })),
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 1, y: 1 }
      }
    }
  }

  return undefined
}
import {
  calculateWeeksToShow,
  formatDaysLeftText,
  formatEventsForDisplay,
  formatLunarDisplay,
  formatMonthDisplay,
  formatYiJiDisplay,
  generateCalendarRows,
  getCellStyle
} from './utils/widget-helpers'

import type { CalendarData } from './utils/calendar-service'
import type { LunarData } from './utils/lunar-calendar'
import type { SettingsData } from './components/settings-page'

/**
 * 组件数据类型
 */
type WidgetData = {
  calendar: CalendarData
  lunar: LunarData
  daysLeft: number
  settings: SettingsData
}

/**
 * 加载所有数据
 */
const loadWidgetData = async (): Promise<WidgetData> => {
  try {
    const settings = getCurrentSettings()
    const now = new Date()

    const calendar = await getCalendarData()
    const lunar = solarToLunar(now)
    const daysLeft = getDaysLeftInYear(now)

    return {
      calendar,
      lunar,
      daysLeft,
      settings
    }
  } catch (error) {
    console.error('加载组件数据失败:', error)

    // 返回默认数据
    const now = new Date()
    return {
      calendar: {
        currentDate: now,
        currentDateDay: now.getDate(),
        currentMonth: now.getMonth() + 1,
        currentYear: now.getFullYear(),
        daysInMonth: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
        firstDayOfWeek: new Date(now.getFullYear(), now.getMonth(), 1).getDay(),
        upcomingEvents: [],
        currentMonthEvents: []
      },
      lunar: solarToLunar(now),
      daysLeft: getDaysLeftInYear(now),
      settings: getCurrentSettings()
    }
  }
}

/**
 * 小号组件 - 显示当前月份日历网格
 */
const SmallWidget = ({ data }: { data: WidgetData }) => {
  const { calendar, lunar, settings } = data
  const grid = generateCalendarGrid(calendar.currentYear, calendar.currentMonth)
  const weekdays = getWeekdayNames()
  const weeksToShow = calculateWeeksToShow(grid)
  const calendarRows = generateCalendarRows(grid, weeksToShow, calendar, false)

  // 获取动态字体颜色和背景图片设置
  const textColor = getDynamicTextColor()
  const calendarSettings = getCalendarSettings()

  // 获取背景图片路径和背景样式
  const getWidgetBg = getWidgetBackgroundImagePath(calendarSettings)
  const widgetBackground = generateWidgetBackground(calendarSettings)

  return (
    <VStack
      padding={{ horizontal: 10, vertical: 5 }}
      background={!calendarSettings.enableColorBackground && getWidgetBg ? <Image filePath={getWidgetBg} resizable={true} scaleToFill={true} /> : undefined}
      widgetBackground={widgetBackground}
    >
      {/* 月份标题 - 包含农历信息 */}
      <VStack padding={{ bottom: 2 }}>
        <HStack spacing={2}>
          <Text font={12} fontWeight="bold" foregroundStyle={getActualColor(settings)}>
            {getMonthNameToNumber(calendar.currentMonth)}
          </Text>
          <Text font="caption2" foregroundStyle={textColor}>
            •
          </Text>
          <Text font="caption2" foregroundStyle={textColor}>
            {lunar.monthName + lunar.dayName}
          </Text>
          <Spacer />
        </HStack>
      </VStack>

      {/* 星期标题 - Grid 布局，全宽 */}
      <Grid horizontalSpacing={2} verticalSpacing={2} alignment="center">
        <GridRow>
          {weekdays.map(day => (
            <Text key={day} font={11} foregroundStyle={textColor} frame={{ maxWidth: 'infinity', alignment: 'center' }} gridCellAnchor="center">
              {day}
            </Text>
          ))}
        </GridRow>
      </Grid>

      {/* 日历网格 - Grid 布局，全宽自适应 */}
      <Grid horizontalSpacing={2} verticalSpacing={2} alignment="center">
        {calendarRows.map(row => (
          <GridRow key={row.weekIndex}>
            {row.cells.map(cell => {
              const cellStyle = getCellStyle(cell, settings, getActualColor)
              return (
                <Text
                  key={cell.key}
                  font={10}
                  foregroundStyle={cellStyle.foregroundStyle}
                  fontWeight={cellStyle.fontWeight}
                  frame={{ maxWidth: 'infinity', minHeight: 18, alignment: 'center' }}
                  padding={cell.isToday ? 2 : 0}
                  background={cell.isToday ? <Circle fill={getActualColor(settings)} /> : undefined}
                  gridCellAnchor="center"
                >
                  {cell.day}
                </Text>
              )
            })}
          </GridRow>
        ))}
      </Grid>
    </VStack>
  )
}

/**
 * 中号组件 - 左侧日历网格，右侧信息
 */
const MediumWidget = ({ data }: { data: WidgetData }) => {
  const { calendar, lunar, daysLeft, settings } = data
  const grid = generateCalendarGrid(calendar.currentYear, calendar.currentMonth)
  const weekdays = getWeekdayNames()
  const weeksToShow = calculateWeeksToShow(grid)
  const calendarRows = generateCalendarRows(grid, weeksToShow, calendar, true)
  const upcomingEvents = formatEventsForDisplay(calendar.upcomingEvents, 2, formatEventTime)
  const daysLeftText = formatDaysLeftText(daysLeft)

  // 获取动态字体颜色和背景图片设置
  const textColor = getDynamicTextColor()
  const calendarSettings = getCalendarSettings()

  // 获取背景图片路径和背景样式
  const getWidgetBg = getWidgetBackgroundImagePath(calendarSettings)
  const widgetBackground = generateWidgetBackground(calendarSettings)
  const lunarDisplay = formatLunarDisplay(lunar)

  return (
    <HStack
      spacing={0}
      padding={{ horizontal: 8, vertical: 10 }}
      background={!calendarSettings.enableColorBackground && getWidgetBg ? <Image filePath={getWidgetBg} resizable={true} scaleToFill={true} /> : undefined}
      widgetBackground={widgetBackground}
    >
      {/* 左侧 - 日历网格 (4/6 宽度) */}
      <VStack spacing={0} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'leading' }}>
        {/* 星期标题 - Grid 布局 */}
        <Grid horizontalSpacing={0} verticalSpacing={0}>
          <GridRow>
            {weekdays.map(day => (
              <Text key={day} font="caption2" foregroundStyle={textColor} frame={{ width: 28, alignment: 'center' }} gridCellAnchor="center">
                {day}
              </Text>
            ))}
          </GridRow>
        </Grid>

        {/* 日历网格 - Grid 布局，固定宽度 */}
        <Grid horizontalSpacing={0} verticalSpacing={0}>
          {calendarRows.map(row => (
            <GridRow key={row.weekIndex}>
              {row.cells.map(cell => {
                const cellStyle = getCellStyle(cell, settings, getActualColor)
                // 获取工作状态（只对当前月份的日期显示）
                const workStatus = cell.isCurrentMonth && cell.workStatus ? cell.workStatus : null

                return (
                  <VStack
                    key={cell.key}
                    spacing={0}
                    alignment="center"
                    frame={{ width: 28, height: 18, alignment: 'center' }}
                    padding={cell.isToday ? { horizontal: 0, vertical: 3 } : { horizontal: 0, vertical: 3 }}
                    background={
                      cell.isToday ? <RoundedRectangle fill={getActualColor(settings)} cornerRadius={5} cornerSize={{ width: 10, height: 10 }} /> : undefined
                    }
                    gridCellAnchor="center"
                  >
                    <VStack
                      spacing={0}
                      alignment="center"
                      overlay={{
                        alignment: 'topTrailing',
                        content: workStatus ? (
                          <Circle
                            offset={{ x: 2, y: -1 }}
                            fill={workStatus === 'work' ? calendarSettings.workColor : calendarSettings.haltColor}
                            frame={{ width: 3, height: 3 }}
                          />
                        ) : (
                          <></>
                        )
                      }}
                    >
                      <HStack spacing={0} alignment="center">
                        <Text font={10} foregroundStyle={cellStyle.foregroundStyle} fontWeight={cellStyle.fontWeight}>
                          {cell.day}
                        </Text>
                      </HStack>
                    </VStack>
                    {/* 显示内容：优先级为 事件 > 节气 > 农历日期 */}
                    {cell.isCurrentMonth && cell.displayText ? (
                      <Text font={8} foregroundStyle={cell.isToday ? 'white' : cell.displayColor} fontWeight={cell.fontWeight}>
                        {cell.displayText}
                      </Text>
                    ) : null}
                  </VStack>
                )
              })}
            </GridRow>
          ))}
        </Grid>
      </VStack>

      {/* 右侧 - 月份标题和信息 (2/6 宽度) */}
      <VStack padding={{ leading: 5 }} alignment="leading" frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'leading' }}>
        {/* 月份标题 - 包含农历信息 */}
        <VStack padding={{ top: 2 }} spacing={0} alignment="leading">
          <HStack spacing={0}>
            <Text font={12} fontWeight="bold" foregroundStyle={getActualColor(settings)}>
              {formatMonthDisplay(calendar.currentYear, calendar.currentMonth, calendar.currentDateDay)}
            </Text>
          </HStack>
          <Text font={12} foregroundStyle={textColor}>
            {lunarDisplay}
          </Text>
        </VStack>

        <Spacer />

        {/* 下一个节日倒计时 */}
        <VStack spacing={2} alignment="leading">
          {upcomingEvents.map(event => (
            <VStack key={event.id} spacing={1} alignment="leading">
              <Text font="caption" foregroundStyle={event.color} lineLimit={1}>
                {event.title}
              </Text>
              <Text font="caption2" foregroundStyle={textColor}>
                {event.time}
              </Text>
            </VStack>
          ))}
        </VStack>

        <Spacer />

        {/* 底部信息 */}
        <VStack padding={{ bottom: 4 }} alignment="leading">
          <Text font={10} foregroundStyle={textColor}>
            {daysLeftText}
          </Text>
        </VStack>
      </VStack>
    </HStack>
  )
}

/**
 * 大号组件 - 完整布局
 */
const LargeWidget = ({ data }: { data: WidgetData }) => {
  const { calendar, lunar, daysLeft, settings } = data
  const grid = generateCalendarGrid(calendar.currentYear, calendar.currentMonth)
  const weekdays = getWeekdayNames()
  const weeksToShow = calculateWeeksToShow(grid)
  const calendarRows = generateCalendarRows(grid, weeksToShow, calendar, true)
  const daysLeftText = formatDaysLeftText(daysLeft)
  const lunarDisplay = formatLunarDisplay(lunar)
  const yiJiDisplay = formatYiJiDisplay(lunar.yi, lunar.ji)

  // 获取动态字体颜色和背景图片设置
  const textColor = getDynamicTextColor()
  const calendarSettings = getCalendarSettings()

  // 获取背景图片路径和背景样式
  const getWidgetBg = getWidgetBackgroundImagePath(calendarSettings)
  const widgetBackground = generateWidgetBackground(calendarSettings)

  return (
    <VStack
      padding={16}
      background={!calendarSettings.enableColorBackground && getWidgetBg ? <Image filePath={getWidgetBg} resizable={true} scaleToFill={true} /> : undefined}
      widgetBackground={widgetBackground}
    >
      {/* 标题栏 */}
      <HStack alignment="center">
        <VStack alignment="leading" spacing={2}>
          <Text font="title2" fontWeight="bold" foregroundStyle={getActualColor(settings)}>
            {formatMonthDisplay(calendar.currentYear, calendar.currentMonth, calendar.currentDateDay)}
          </Text>
          <Text font="caption" foregroundStyle={textColor}>
            {lunar.formatted}
          </Text>
        </VStack>
        <Spacer />
        <VStack alignment="trailing" spacing={2}>
          <Text font="title3" fontWeight="bold" foregroundStyle={textColor}>
            {lunarDisplay}
          </Text>
          <Text font="caption" padding={{ top: 2 }} foregroundStyle={textColor}>
            {daysLeftText}
          </Text>
        </VStack>
      </HStack>

      <Spacer />

      {/* 宜/忌信息 */}
      <HStack padding={0} spacing={4}>
        <Text font="caption2" foregroundStyle={yiJiDisplay.yi.color}>
          {yiJiDisplay.yi.label}
        </Text>
        <Text font="caption2" foregroundStyle={textColor} lineLimit={1}>
          {yiJiDisplay.yi.content}
        </Text>
        <Spacer />
      </HStack>
      <HStack padding={0} spacing={4}>
        <Text font="caption2" foregroundStyle={yiJiDisplay.ji.color}>
          {yiJiDisplay.ji.label}
        </Text>
        <Text font="caption2" foregroundStyle={textColor} lineLimit={1}>
          {yiJiDisplay.ji.content}
        </Text>
        <Spacer />
      </HStack>

      <Spacer />

      {/* 主要内容区域 */}
      <VStack spacing={4} alignment="leading" frame={{ maxWidth: 'infinity' }}>
        {/* 星期标题 */}
        <Grid horizontalSpacing={4} verticalSpacing={4} alignment="center">
          <GridRow>
            {weekdays.map(day => (
              <Text key={day} font="caption" foregroundStyle={textColor} gridCellAnchor="center" frame={{ maxWidth: 'infinity', alignment: 'center' }}>
                {day}
              </Text>
            ))}
          </GridRow>
        </Grid>

        {/* 日历网格 - 使用 Grid 布局，全宽自适应 */}
        <Grid horizontalSpacing={4} verticalSpacing={4} alignment="center">
          {calendarRows.map(row => (
            <GridRow key={row.weekIndex}>
              {row.cells.map(cell => {
                const cellStyle = getCellStyle(cell, settings, getActualColor)
                // 获取工作状态（只对当前月份的日期显示）
                const workStatus = cell.isCurrentMonth && cell.workStatus ? cell.workStatus : null

                return (
                  <VStack
                    key={cell.key}
                    spacing={0}
                    frame={{ maxWidth: 'infinity', maxHeight: 25, alignment: 'center' }}
                    padding={cell.isToday ? { horizontal: 4, vertical: 10 } : { horizontal: 4, vertical: 6 }}
                    background={
                      cell.isToday ? <RoundedRectangle fill={getActualColor(settings)} cornerRadius={5} cornerSize={{ width: 20, height: 20 }} /> : undefined
                    }
                    gridCellAnchor="center"
                  >
                    <VStack
                      spacing={0}
                      alignment="center"
                      overlay={{
                        alignment: 'topTrailing',
                        content: workStatus ? (
                          <Circle
                            offset={{ x: 3, y: -2 }}
                            fill={workStatus === 'work' ? calendarSettings.workColor : calendarSettings.haltColor}
                            frame={{ width: 5, height: 5 }}
                          />
                        ) : (
                          <></>
                        )
                      }}
                    >
                      <HStack spacing={0} alignment="center">
                        <Text font="caption" foregroundStyle={cellStyle.foregroundStyle} fontWeight={cellStyle.fontWeight}>
                          {cell.day}
                        </Text>
                      </HStack>
                    </VStack>
                    {/* 显示内容：优先级为 事件 > 节气 > 农历日期 */}
                    {cell.isCurrentMonth && cell.displayText ? (
                      <Text font="caption2" foregroundStyle={cell.isToday ? 'white' : cell.displayColor} fontWeight={cell.fontWeight}>
                        {cell.displayText}
                      </Text>
                    ) : null}
                  </VStack>
                )
              })}
            </GridRow>
          ))}
        </Grid>
      </VStack>
    </VStack>
  )
}

/**
 * Widget视图 - 根据不同尺寸显示不同布局
 */
const WidgetView = ({ data }: { data: WidgetData }) => {
  switch (Widget.family) {
    case 'systemSmall':
      return <SmallWidget data={data} />

    case 'systemMedium':
      return <MediumWidget data={data} />

    case 'systemLarge':
    case 'systemExtraLarge':
      return <LargeWidget data={data} />

    default: {
      // 获取动态字体颜色和背景图片设置用于默认显示
      const defaultTextColor = getDynamicTextColor()
      return (
        <VStack spacing={8} alignment="center" padding={16}>
          <Image systemName="calendar.badge.clock" font="title" foregroundStyle="systemGreen" />
          <Text font="body" foregroundStyle={defaultTextColor}>
            挂历小组件
          </Text>
          <Text font="caption" foregroundStyle={defaultTextColor}>
            日历、事件
          </Text>
        </VStack>
      )
    }
  }
}

/**
 * 主函数 - 异步加载数据并呈现Widget
 */
const main = async (): Promise<void> => {
  try {
    const data = await loadWidgetData()

    // 使用默认刷新策略，类似油价小组件
    Widget.present(<WidgetView data={data} />)
  } catch (error) {
    console.error('Widget加载失败:', error)

    // 获取动态字体颜色和背景图片设置用于错误显示
    const errorTextColor = getDynamicTextColor()

    // 显示错误信息
    Widget.present(
      <VStack spacing={8} alignment="center" padding={16}>
        <Image systemName="exclamationmark.triangle.fill" font="title" foregroundStyle="systemRed" />
        <Text font="body" foregroundStyle={errorTextColor}>
          数据加载失败
        </Text>
        <Text font="caption" foregroundStyle={errorTextColor}>
          请检查网络连接和权限设置
        </Text>
      </VStack>
    )
  }
}

// 执行主函数
main()
