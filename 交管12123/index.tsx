import {
  Navigation,
  NavigationStack,
  List,
  Section,
  Button,
  Text,
  TextField,
  Toggle,
  Script,
  useState,
} from "scripting"
import { Traffic12123Settings } from "./api"

declare const Storage: any
declare const Dialog: any
declare const Safari: any

const SETTINGS_KEY = "traffic12123Settings"
const VERSION = "1.0.0"
const BUILD_DATE = "2025-12-10"

// ========= 组件模块链接（预留，按需自行填写） =========

// 交管 12123 对应的 Surge 模块地址（TODO：替换为实际地址）
const TRAFFIC12123_MODULE_URL = "https://surge.bytevalley.workers.dev/?src=https://raw.githubusercontent.com/95du/scripts/master/rewrite/getToken_12123.sgmodule&name=交管12123&category=数据采集"

// 交管 12123 模块在 Egern 中显示的名称
const TRAFFIC12123_EGERN_NAME = "交管 12123"

// ========= 内部设置结构（在原有基础上增加 fullscreen） =========

type InternalSettings = Traffic12123Settings & {
  // 设置页打开方式：true = 页面（全屏），false = 弹层
  fullscreen?: boolean
}

// 默认设置
const defaultSettings: InternalSettings = {
  token: "",
  enableBoxJs: false,
  boxJsUrl: "",
  vehicleImageUrl: "",
  vehicleImageWidth: 120,
  vehicleImageHeight: 60,
  vehicleImageOffsetY: 30,
  fullscreen: true,
}

// ======== 全屏偏好读写（共用 settings 存储） ========

function getFullscreenPref(): boolean {
  try {
    const raw = Storage.get(SETTINGS_KEY) as InternalSettings | null
    if (raw && typeof raw === "object" && typeof raw.fullscreen === "boolean") {
      return raw.fullscreen
    }
  } catch {}
  return true
}

function setFullscreenPrefValue(value: boolean) {
  try {
    const raw =
      (Storage.get(SETTINGS_KEY) as InternalSettings | null) ?? defaultSettings
    const next: InternalSettings = { ...raw, fullscreen: value }
    Storage.set(SETTINGS_KEY, next)
  } catch {}
}

// ========= 设置视图 =========

function SettingsView() {
  const dismiss = Navigation.useDismiss()

  const initialSettings =
    (Storage.get(SETTINGS_KEY) as InternalSettings | null) ?? defaultSettings

  // State for the form fields
  const [token, setToken] = useState(initialSettings.token ?? "")
  const [enableBoxJs, setEnableBoxJs] = useState(initialSettings.enableBoxJs ?? false)
  const [boxJsUrl, setBoxJsUrl] = useState(initialSettings.boxJsUrl ?? "")
  const [vehicleImageUrl, setVehicleImageUrl] = useState(
    initialSettings.vehicleImageUrl ?? "",
  )
  const [vehicleImageWidth, setVehicleImageWidth] = useState(
    String(initialSettings.vehicleImageWidth ?? 120),
  )
  const [vehicleImageHeight, setVehicleImageHeight] = useState(
    String(initialSettings.vehicleImageHeight ?? 60),
  )
  const [vehicleImageOffsetY, setVehicleImageOffsetY] = useState(
    String(initialSettings.vehicleImageOffsetY ?? 30),
  )
  const [fullscreenPref, setFullscreenPrefState] = useState<boolean>(
    typeof initialSettings.fullscreen === "boolean"
      ? initialSettings.fullscreen
      : getFullscreenPref(),
  )

  const handleSave = async () => {
    const width = parseInt(vehicleImageWidth, 10) || 120
    const height = parseInt(vehicleImageHeight, 10) || 60
    const offsetY = parseInt(vehicleImageOffsetY, 10) || 30

    const newSettings: InternalSettings = {
      token: token.trim(),
      enableBoxJs,
      boxJsUrl: boxJsUrl.trim(),
      vehicleImageUrl: vehicleImageUrl.trim(),
      vehicleImageWidth: width,
      vehicleImageHeight: height,
      vehicleImageOffsetY: offsetY,
      fullscreen: fullscreenPref,
    }

    // 如果启用 BoxJs，至少需要 URL
    if (enableBoxJs && !newSettings.boxJsUrl) {
      try {
        await Dialog.alert({
          title: "缺少 BoxJs 地址",
          message: "启用 BoxJs 后，请先填写 BoxJs 地址，例如：https://boxjs.com",
          buttonLabel: "好的",
        })
      } catch {}
      return
    }

    // 如果未启用 BoxJs，至少需要 Token
    if (!enableBoxJs && !newSettings.token) {
      try {
        await Dialog.alert({
          title: "缺少 Token",
          message: "未启用 BoxJs 时，需要在「Token 设置」中填写交管 12123 的 Token。",
          buttonLabel: "好的",
        })
      } catch {}
      return
    }

    Storage.set(SETTINGS_KEY, newSettings)
    dismiss()
  }

  const handleAbout = async () => {
    try {
      await Dialog.alert({
        title: "交管 12123 组件",
        message:
          `作者：©ByteValley\n` +
          `版本：v${VERSION}（${BUILD_DATE}）\n` +
          `说明：Surge / Egern 模块安装链接已预留，可在脚本顶部常量中填入实际地址。`,
        buttonLabel: "关闭",
      })
    } catch {}
  }

  // 一键安装到 Surge
  const handleInstallToSurge = async () => {
    if (!TRAFFIC12123_MODULE_URL) {
      try {
        await Dialog.alert({
          title: "模块地址未配置",
          message: "请先在脚本顶部填入 TRAFFIC12123_MODULE_URL，再尝试安装到 Surge。",
          buttonLabel: "好的",
        })
      } catch {}
      return
    }
    const encodedUrl = encodeURIComponent(TRAFFIC12123_MODULE_URL)
    const surgeUrl = `surge:///install-module?url=${encodedUrl}`
    await Safari.openURL(surgeUrl)
  }

  // 一键安装到 Egern
  const handleInstallToEgern = async () => {
    if (!TRAFFIC12123_MODULE_URL) {
      try {
        await Dialog.alert({
          title: "模块地址未配置",
          message: "请先在脚本顶部填入 TRAFFIC12123_MODULE_URL，再尝试安装到 Egern。",
          buttonLabel: "好的",
        })
      } catch {}
      return
    }
    const encodedUrl = encodeURIComponent(TRAFFIC12123_MODULE_URL)
    const name = encodeURIComponent(TRAFFIC12123_EGERN_NAME)
    const egernUrl = `egern:/modules/new?name=${name}&url=${encodedUrl}`
    await Safari.openURL(egernUrl)
  }

  // 切换「页面 / 弹层」打开方式
  const handleToggleFullscreen = async () => {
    const next = !fullscreenPref
    setFullscreenPrefState(next)
    setFullscreenPrefValue(next)

    try {
      await Dialog.alert({
        title: "显示模式已更新",
        message: `已切换为「${next ? "页面（全屏）" : "弹层弹出"}」模式，下次打开设置时生效。`,
        buttonLabel: "好的",
      })
    } catch {}
  }

  return (
    <NavigationStack>
      <List
        navigationTitle={"交管 12123 组件"}
        navigationBarTitleDisplayMode={"inline"}
        toolbar={{
          topBarLeading: [<Button title={"关闭"} action={dismiss} />],
          topBarTrailing: [
            <Button
              title={fullscreenPref ? "页面" : "弹层"}
              systemImage={
                fullscreenPref
                  ? "rectangle.arrowtriangle.2.outward"
                  : "rectangle"
              }
              action={handleToggleFullscreen}
            />,
            <Button title={"完成"} action={handleSave} />,
          ],
          bottomBar: [
            <Button
              systemImage="info.circle"
              title="关于本组件"
              action={handleAbout}
              foregroundStyle="secondaryLabel"
            />,
          ],
        }}
      >
        {/* 组件模块 */}
        <Section
          header={
            <Text font="body" fontWeight="semibold">
              组件模块
            </Text>
          }
          footer={
            <Text font="caption2" foregroundStyle="secondaryLabel">
              • 这里预留了安装到 Surge / Egern 的一键入口。
              {"\n"}• 请在脚本顶部填入 TRAFFIC12123_MODULE_URL 后再使用。
            </Text>
          }
        >
          <Button title="⚡ 安装 Surge 模块" action={handleInstallToSurge} />
          <Button title="🌀 安装 Egern 模块" action={handleInstallToEgern} />
        </Section>

        {/* BoxJs 配置 */}
        <Section
          header={
            <Text font="body" fontWeight="semibold">
              BoxJs 配置
            </Text>
          }
          footer={
            <Text font="caption2" foregroundStyle="secondaryLabel">
              • 开启后优先从 BoxJs 读取交管 12123 的 Token。
              {"\n"}• BoxJs 地址，例如：https://boxjs.com 或 http://192.168.1.5:9999
            </Text>
          }
        >
          <Toggle
            title="启用 BoxJs 读取 Token"
            value={enableBoxJs}
            onChanged={(value) => {
              setEnableBoxJs(value)
              if (value && !boxJsUrl) {
                setBoxJsUrl("https://boxjs.com")
              }
            }}
          />
          {enableBoxJs ? (
            <TextField
              title="BoxJs 地址"
              value={boxJsUrl}
              onChanged={setBoxJsUrl}
            />
          ) : null}
        </Section>

        {/* Token 设置 */}
        <Section
          header={
            <Text font="body" fontWeight="semibold">
              Token 设置
            </Text>
          }
          footer={
            <Text font="caption2" foregroundStyle="secondaryLabel">
              • 如果未启用 BoxJs，可在此处直接填写交管 12123 的 Token（params=...）。
            </Text>
          }
        >
          <TextField
            title="Token"
            prompt="请输入 Token (params=...)"
            value={token}
            onChanged={setToken}
          />
        </Section>

        {/* 车辆图片设置 */}
        <Section
          header={
            <Text font="body" fontWeight="semibold">
              车辆图片设置
            </Text>
          }
          footer={
            <Text font="caption2" foregroundStyle="secondaryLabel">
              • 所有数值均为像素单位。
              {"\n"}• 上下偏移数值越大，图片越靠下。
            </Text>
          }
        >
          <TextField
            title="车辆图片 URL"
            prompt="请输入车辆图片 URL（可选）"
            value={vehicleImageUrl}
            onChanged={setVehicleImageUrl}
          />
          <TextField
            title="图片宽度"
            prompt="请输入图片宽度（默认：120）"
            value={vehicleImageWidth}
            onChanged={setVehicleImageWidth}
          />
          <TextField
            title="图片高度"
            prompt="请输入图片高度（默认：60）"
            value={vehicleImageHeight}
            onChanged={setVehicleImageHeight}
          />
          <TextField
            title="图片上下位置"
            prompt="请输入上下偏移（默认：30，数值越大越靠下）"
            value={vehicleImageOffsetY}
            onChanged={setVehicleImageOffsetY}
          />
        </Section>
      </List>
    </NavigationStack>
  )
}

// ========= App 包装 =========

type AppProps = {
  interactiveDismissDisabled?: boolean
}

function App(_props: AppProps) {
  return <SettingsView />
}

// ========= 入口 =========

async function run() {
  const fullscreen = getFullscreenPref()

  await Navigation.present({
    element: <App interactiveDismissDisabled />,
    ...(fullscreen ? { modalPresentationStyle: "fullScreen" } : {}),
  })
  Script.exit()
}

run()