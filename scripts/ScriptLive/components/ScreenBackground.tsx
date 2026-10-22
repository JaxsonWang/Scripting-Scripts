import { Rectangle } from 'scripting'
import { palette } from '../theme'

/** 页面底色：延伸到状态栏与标签栏后方，避免安全区出现色带 */
export const ScreenBackground = () => <Rectangle fill={palette.bg} ignoresSafeArea />
