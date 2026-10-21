# ScriptFlix

运行后，从底部「发现 / 搜索 / 片库」切换页面。界面移植自 Hady，沿用 ScriptFlix 原有的视频源和观看记录。

- **发现**：切换视频源、主分类和子分类，浏览头图与海报列表；列表仍按原接口分页。右上角进入设置或退出。
- **搜索**：输入关键词，点击「全源搜索」或键盘搜索键；结果可按视频源过滤，点击后使用该结果对应的视频源播放。
- **片库**：查看、播放和清空原有观看历史；切回本页时刷新记录。
- **播放详情**：播放器固定在上方，下方滚动浏览信息、播放源、剧集和简介。
- **设置**：原有视频源增删改、当前源选择、iCloud 同步及更新日志入口均保留；新增「外观」切换和小组件预览。

未引入 Hady 的示例数据、收藏或相关推荐。CMS 请求与响应类型、播放地址解析和筛选规则、存储键、80 条历史上限、iCloud 路径及备份格式保持不变。

## 桌面小组件：每日推荐

在主屏幕添加 Scripting 小组件，长按选择「编辑小组件」，脚本选 ScriptFlix。小组件读取设置里当前选中的视频源，每天推荐一批电影和剧集：

- **小号**：整幅主推海报，顶部是「今日」角标和评分，底部是栏目、更新状态和片名。
- **中号**：立体海报配片名、年份地区类型、标签和简介，右上角标出视频源，底图是同一张海报的模糊放大。
- **大号**：主推大卡加四张「更多推荐」海报，每张都能单独点开。
- **锁屏**：矩形和单行尺寸显示主推片名，圆形尺寸显示图标，跟随系统的锁屏渲染。

推荐按「日期 + 源地址」生成，同一天、同一个源的内容固定，第二天 00:05 自动换新；切换视频源或修改源列表会立即刷新。挑选时从源的电影、剧集分类中各抽一个子分类取最新一页，评分高的作品更容易排在前面，短剧、伦理、预告、体育等分类不进推荐位。当天结果保存在 `script_flix_daily_picks`，各尺寸看到的是同一批作品。

点击海报会通过 `run_single` 链接打开 ScriptFlix：首页出现后，播放页叠在上面直接播放这部作品，返回即回到首页。没有视频源、源里暂无可推荐作品或请求失败时，小组件显示对应提示；失败 30 分钟后重试，单张封面加载失败只显示渐变占位。

## 外观：自动 / 日间 / 夜间

设置页「外观」提供三种模式，默认「自动」：跟随手机的浅色 / 深色外观切换。「日间」「夜间」固定外观，原来的深色界面即夜间模式。选择后已打开的页面立即换肤，桌面小组件同步刷新。模式保存在 `script_flix_theme_mode`。

主题色在 `theme.ts` 中以 `{ light, dark }` 动态色定义，由系统按当前外观取值。固定模式通过 `preferredColorScheme` 生效；全屏呈现的根页面不响应这个属性，`RootScreen` 另外用 `environments={{ colorScheme }}` 覆盖整棵视图的外观。

Scripting 转译脚本时 `.ts` 文件也按 TSX 解析，`<T>(x: T) => x` 这类泛型箭头函数会被当成 JSX 标签而报 `SyntaxError: Unexpected token ')'`，泛型函数需写成 `function` 声明。

## 按 Pro 身份选择播放器

每次打开播放页时，调用一次官方 `Script.hasFullAccess()`：

- 返回 `true`：只创建 `AVPlayer`；音频会话准备好并成功调用 `setSource()` 后，再挂载 `AVPlayerView`，媒体就绪后自动播放。不能在设置媒体源之前挂载原生视图，否则视图无法绑定播放器，可能有声音或播放回调却没有画面。
- 返回 `false`：只创建原来的 `WebViewController`，继续通过 `WebView` 加载播放链接，不初始化原生播放器或音频会话。

两条路径共用原来的详情请求、播放源分组、剧集索引和历史记录。切换播放源仍回到首集，切集复用当前播放器，关闭页面释放资源。原生分支目前不启用画中画或后台续播，保持播放器随页面关闭而结束的生命周期。加载失败会明确显示错误，不会暗中切换另一种播放器。

官方文档将 `hasFullAccess()` 定义为完整的 Scripting PRO 访问权限判断；`AVPlayer` / `AVPlayerView` 本身没有标注为 PRO 专属。本脚本按使用要求，仅对 Pro 身份启用原生分支。

## Scripting API 核对（2026-10-20）

已核对官方最新文档与仓库类型声明；本脚本使用的 API 仍受支持，按现行契约完善了以下调用：

- 使用 `TabView + Tab + useObservable` 组织底部导航，不使用 iOS 26 专属标签栏扩展。
- Pro 分支使用 `AVPlayer.setSource()` / `onReadyToPlay` / `play()`，先配置 `SharedAudioSession`，关闭页面时暂停并释放播放器。
- 非 Pro 分支的 `WebViewController.loadURL()` 返回 `Promise<boolean>`；返回 `false` 或抛错时展示加载失败信息，切换剧集后重新加载。控制器只初始化一次，页面卸载时调用 `dispose()`。
- 先检查 `FileManager.isiCloudEnabled`，再读取 `iCloudDocumentsDirectory`；目录不可用时沿用现有同步失败提示。
- 图片通过普通 `Image.imageUrl` 加载，渐变、裁切、网格、表单均使用原生视图能力。

本脚本使用的 UI、WebView、Storage、FileManager 和网络 API 在核对的文档中未标为 PRO；没有引入后台保活、网页爬虫、共享 CloudKit 数据等付费能力。原有 iCloud Drive 文件备份仍使用 FileManager，不替换为要求 PRO 的 iCloud 共享数据 API。

官方参考：[Pro 权限判断](https://scriptingapp.github.io/zh/guide/Script/Script)、[AVPlayer](https://scriptingapp.github.io/zh/guide/Device%20Capabilities/AVPlayer)、[AVPlayerView](https://scriptingapp.github.io/zh/guide/Views/AVPlayerView)、[完整文档](https://scriptingapp.github.io/llms-full.txt)、[TabView](https://scriptingapp.github.io/zh/guide/Views/Navigation/TabView/TabView)、[WebView 控制器](https://scriptingapp.github.io/zh/guide/Device%20Capabilities/WebViewController)、[文件管理器](https://scriptingapp.github.io/zh/guide/Utilities/FileManager)。

## 播放失败时查看日志

在现有开发终端搜索 `[ScriptFlixDiag]`。每条日志包含 `scope`、`session`、`event` 和 `elapsedMs`，用同一个会话编号串起请求或播放过程：

- `api.response`：请求类型、HTTP 状态、Content-Type、最终 URL 和是否发生重定向；`json.error` 表示响应不能解析成 JSON。错误提示同时展示状态码和响应类型。
- `source.selected`：原生或网页分支、播放源与剧集索引、媒体 URL，以及地址是否包含空白。
- `audio.*`、`native.setSource.*`、`native.view.appear`、`native.ready`、`native.play.result`：区分音频会话、媒体源设置、视图挂载、媒体就绪和开始播放。
- `native.error`、`native.status`、`native.pause`、`dispose`：记录系统错误、播放时间与时长、暂停和资源释放。

日志保留 URL 的实际路径及 `ac`、`pg`、`ids` 等普通参数，仅隐藏账号密码、token、签名等鉴权参数、URL 片段及 Bearer 凭据。日志只写入现有控制台，不上传到其他服务。

2026-10-20 实机排查区分出两类播放问题：

1. 原生视图在 `setSource()` 前挂载会导致黑屏；已调整挂载顺序，并在 iPhone 上确认极速资源《遮天》第 1 话、切换第 2 话均有实际画面和原生控件。
2. 非凡资源《比弗利娇妻第十一季》`ffm3u8` 第 1 集的媒体链接检查返回 HTTP 404 和 HTML 错误页，与手机“找不到所请求的 URL”一致；这条资源需要源站恢复或由用户切换可用线路。添加 Safari User-Agent 或源站分享页 Referer 后仍返回 404。

此前上报的 JSON `<` 解析错误在这次非凡资源请求中未复现：接口返回 HTTP 200，虽然 Content-Type 标为 `text/html`，响应体仍是合法 JSON。代码继续以实际 JSON 解析结果为准，不仅凭 Content-Type 拒绝数据；再次出现时可通过日志定位接口和响应状态。

## 验证

在仓库根目录运行：

```bash
pnpm run lint:check
pnpm run type-check
pnpm exec prettier --check "scripts/ScriptFlix/**/*.{ts,tsx,json,md}"
```

2026-10-21 在 Mac 版 Scripting 上验证了小组件和外观：

- 「同步并预览小组件」下，小、中、大三种尺寸在浅色和深色外观中均正常渲染，大号四张海报的链接指向对应作品。
- 设置页切换夜间、日间、自动后首页即时换肤；自动模式回到系统外观；夜间模式下重启脚本，首页仍为深色。
- 用小组件链接启动后进入对应作品的播放页并自动播放，返回后停在首页。

iPhone 主屏幕上的实际小组件、iOS 着色与透明模式、锁屏尺寸，以及手机上从小组件点开再返回的流程仍需验收。

上述静态检查通过。21 项组件与服务模拟回归覆盖原有浏览、搜索、历史和 WebView 行为，以及 Pro/非 Pro 分流、设置媒体源后才挂载原生视图、原生就绪播放、切源与选集、加载及音频会话失败、快速切集、关闭期间的异步取消、资源释放、日志脱敏和 CMS 异常响应。

已通过 iPhone 镜像和开发终端验证 Pro 原生播放、暂停、切集、返回首页，以及首页、详情和设置入口的实际呈现。非 Pro 真实设备、iPad 布局和以下未覆盖的完整功能仍需验收；模拟回归不能替代这些运行时检查：

1. 原视频源和观看历史仍能读取；无需重新创建或重命名脚本。
2. 三个底部页面、安全区、头图和三列海报在实际屏幕上正常显示。
3. 分类、上拉分页、全源搜索及分源过滤正常；从搜索和历史打开的影片使用正确的视频源。
4. 分别验证 Pro 的原生控件和非 Pro 的 WebView；两者切换播放源、选集和关闭页面正常，原生关闭后停止播放。
5. 视频源编辑和 iCloud 同步沿用原有行为。
