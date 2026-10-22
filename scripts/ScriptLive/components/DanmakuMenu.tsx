import { Button, Image, Menu } from 'scripting'
import type { AppSettings } from '../services/settings'
import { updateSettings } from '../services/settings'

const SIZES = [14, 16, 18, 20, 24]
const SPEEDS: [string, number][] = [
  ['很快', 6],
  ['较快', 8],
  ['标准', 10],
  ['较慢', 14],
  ['很慢', 18]
]
const AREAS: [string, number][] = [
  ['四分之一', 0.25],
  ['半屏', 0.5],
  ['四分之三', 0.75],
  ['全屏', 1]
]
const OPACITIES = [1, 0.8, 0.6, 0.4]

/** 设置页用滑块微调，这里的预设只在数值相等时打勾 */
const same = (a: number, b: number) => Math.abs(a - b) < 0.001

const check = (selected: boolean) => (selected ? 'checkmark' : undefined)

/**
 * 播放器上的弹幕快捷设置：字号、速度、显示区域与透明度，改动立即作用到正在滚动的弹幕，并写回设置。
 * @param settings 当前设置
 */
export const DanmakuMenu = ({ settings }: { settings: AppSettings }) => (
  <Menu
    label={<Image systemName="slider.horizontal.3" font={16} foregroundStyle="rgba(255,255,255,0.82)" frame={{ width: 32, height: 32 }} contentShape="rect" />}
  >
    <Menu title={`字号 · ${settings.danmakuSize} pt`} systemImage="textformat.size">
      {SIZES.map(size => (
        <Button key={size} title={`${size} pt`} systemImage={check(settings.danmakuSize === size)} action={() => updateSettings({ danmakuSize: size })} />
      ))}
    </Menu>
    <Menu title={`速度 · ${settings.danmakuSpeed} 秒`} systemImage="speedometer">
      {SPEEDS.map(([label, seconds]) => (
        <Button
          key={seconds}
          title={`${label}（${seconds} 秒）`}
          systemImage={check(settings.danmakuSpeed === seconds)}
          action={() => updateSettings({ danmakuSpeed: seconds })}
        />
      ))}
    </Menu>
    <Menu title={`显示区域 · ${Math.round(settings.danmakuArea * 100)}%`} systemImage="rectangle.tophalf.inset.filled">
      {AREAS.map(([label, area]) => (
        <Button key={area} title={label} systemImage={check(same(settings.danmakuArea, area))} action={() => updateSettings({ danmakuArea: area })} />
      ))}
    </Menu>
    <Menu title={`透明度 · ${Math.round(settings.danmakuOpacity * 100)}%`} systemImage="circle.lefthalf.filled">
      {OPACITIES.map(opacity => (
        <Button
          key={opacity}
          title={`${Math.round(opacity * 100)}%`}
          systemImage={check(same(settings.danmakuOpacity, opacity))}
          action={() => updateSettings({ danmakuOpacity: opacity })}
        />
      ))}
    </Menu>
  </Menu>
)
