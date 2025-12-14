// styles/types.ts
import type { BarData, SGCCSettings } from '../api'

export type SGCCWidgetRenderProps = {
  displayData: any
  barData: BarData[]
  settings: SGCCSettings
  logoPath?: string | null
}

export type SGCCWidgetRenderer = (props: SGCCWidgetRenderProps) => JSX.Element
