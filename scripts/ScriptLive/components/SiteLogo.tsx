import { Image, Path, Script } from 'scripting'
import type { SiteId } from '../core/types'

/** 平台 Logo 随脚本分发，按原色等比显示。 */
export const SiteLogo = ({ siteId, size = 18 }: { siteId: SiteId; size?: number }) => (
  <Image
    filePath={Path.join(Script.directory, 'assets', 'platforms', `${siteId}.png`)}
    renderingMode="original"
    resizable
    scaleToFit
    frame={{ width: size, height: size }}
  />
)
