# Scripting Scripts Collection

一个基于 **Scripting** 应用的 TypeScript 脚本项目集合，使用类 React 的 TSX 语法创建 iOS 原生 UI 组件、小组件、灵动岛和自动化工具。

## 🚀 快速开始

### 环境要求

- iOS 设备或模拟器
- [Scripting](https://apps.apple.com/app/scripting/id1471239139) 应用
- Node.js 16+ (用于开发工具)

### 安装依赖

```bash
pnpm install
```

### 开发服务器

```bash
pnpm run serve # 使用 Scripting 开发模式

pnpm run watch # 监听文件变化同步到 iCloud 网盘，开发模式效率比上面高一些
```

## 📁 项目结构

```
scripts/
├── index.tsx          # 主脚本入口
├── widget.tsx         # 小组件定义
├── intent.tsx         # Intent 处理
├── app_intents.tsx    # AppIntent 注册
└── assistant_tool.tsx # Assistant Tool 实现
```

## 🛠️ 开发工具

| 命令 | 描述 |
|------|------|
| `pnpm run serve` | 启动开发服务器 |
| `pnpm run watch` | 监听文件变化 |
| `pnpm run lint` | 代码检查并自动修复 |
| `pnpm run format` | 代码格式化 |
| `pnpm run type-check` | TypeScript 类型检查 |
| `pnpm run code-quality` | 运行所有质量检查 |

## 📱 功能特性

### UI 组件
- 使用 TSX 语法创建原生 iOS 界面
- 支持 SwiftUI 风格的组件和修饰符
- 响应式布局和动画效果

### 小组件 (Widget)
- 主屏幕小组件开发
- 支持多种尺寸和配置
- 实时数据更新和交互

### 灵动岛 (Live Activity)
- 动态岛内容展示
- 实时状态更新
- 交互式控件支持

### 系统集成
- **健康数据**: 读取 HealthKit 数据
- **语音识别**: 实时语音转文字
- **媒体播放**: Now Playing 控制
- **文件系统**: 文件读写操作
- **通知推送**: 本地通知管理

## 📖 核心 API

### 基础组件
```tsx
import { VStack, HStack, Text, Button } from 'scripting'

function MyView() {
  return (
    <VStack>
      <Text>Hello, Scripting!</Text>
      <Button title="点击我" onPress={() => console.log('按钮被点击')} />
    </VStack>
  )
}
```

### 健康数据
```tsx
// 读取步数数据
const steps = await Health.queryQuantitySamples('stepCount', {
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
  endDate: new Date()
})
```

### 小组件
```tsx
// widget.tsx
function MyWidget() {
  return (
    <VStack>
      <Text>当前时间</Text>
      <Text>{new Date().toLocaleTimeString()}</Text>
    </VStack>
  )
}

Widget.register(MyWidget)
```

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。
