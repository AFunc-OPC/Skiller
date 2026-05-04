# OpenSpec 看板设置功能设计

**日期**: 2026-05-04
**状态**: 待实现

## 概述

在 OpenSpec 看板的刷新按钮旁边添加设置入口，提供项目级配置功能。首个功能为定时刷新，支持配置自动刷新间隔。

## 入口设计

**位置**: OpenSpec 看板 Header 区域，刷新按钮右侧

```
┌──────────────────────────────────────────────────────────────────┐
│  ← 返回    项目名 - OpenSpec 看板        [CLI状态] [🔄] [⚙️]    │
└──────────────────────────────────────────────────────────────────┘
```

**交互**: 点击设置按钮打开设置弹框

## 弹框布局

采用左侧 Tab + 右侧内容的经典布局：

```
┌─────────────────────────────────────────────┐
│                                         [×] │
├──────────────┬──────────────────────────────┤
│              │                              │
│  设置        │  定时刷新                    │
│  ──────────  │  自动刷新看板数据，保持数据同步│
│  ⏱ 定时刷新  │                              │
│  (其他Tab)   │  刷新间隔                     │
│              │  ┌─────────────────────────┐ │
│              │  │ 不刷新              ▼ │ │
│              │  ├─────────────────────────┤ │
│              │  │ 5 秒                    │ │
│              │  │ 10 秒（推荐）           │ │
│              │  │ 30 秒                   │ │
│              │  │ 1 分钟                  │ │
│              │  │ 5 分钟                  │ │
│              │  └─────────────────────────┘ │
│              │                              │
│              │        [取消] [保存并生效]   │
└──────────────┴──────────────────────────────┘
```

## 定时刷新功能

### 刷新间隔选项

| 选项 | 说明 | interval 值 |
|------|------|-------------|
| 不刷新 | 关闭定时刷新，仅手动刷新 | 0 |
| 5 秒 | 高频刷新，适合活跃开发场景 | 5 |
| 10 秒（推荐） | 默认选项，平衡性能与实时性 | 10 |
| 30 秒 | 中等频率，适合稳定查看 | 30 |
| 1 分钟 | 低频刷新，节省资源 | 60 |
| 5 分钟 | 超低频，适合长期监控 | 300 |

### 交互流程

1. **打开看板时**
   - 读取项目级配置
   - 若 `interval > 0`，启动定时器

2. **修改配置时**
   - 选择刷新间隔
   - 点击「保存并生效」
   - 配置立即生效：
     - `interval = 0`：停止定时器
     - `interval > 0`：重启定时器（应用新间隔）
   - 关闭弹框，显示成功提示

3. **关闭看板时**
   - 清除定时器

### 视觉反馈

- **定时器激活中**: 刷新按钮旁显示倒计时气泡 `[5s]`
- **正在刷新**: 按钮显示 loading 动画（复用现有样式）
- **保存成功**: Toast 提示「设置已生效」

## 数据存储

### 存储位置

使用现有的 `configApi` 存储，key 格式：

```
openspec_board_settings_{projectId}
```

### 存储内容

```typescript
interface OpenSpecBoardSettings {
  autoRefreshInterval: number  // 秒数，0 表示不刷新
}
```

示例：
```json
{
  "autoRefreshInterval": 10
}
```

### 项目隔离

每个项目独立配置，互不影响。

## 组件结构

```
src/components/OpenSpec/
├── OpenSpecBoard.tsx           # 主页面（添加设置按钮、定时器逻辑）
├── OpenSpecSettingsDialog.tsx  # 设置弹框组件（新增）
├── OpenSpec.css                # 样式（添加弹框样式）
└── ...
```

## 状态管理

在 `openspecStore.ts` 中添加：

```typescript
interface OpenSpecState {
  // ... 现有字段
  settings: OpenSpecBoardSettings
  loadSettings: (projectId: string) => Promise<void>
  saveSettings: (projectId: string, settings: OpenSpecBoardSettings) => Promise<void>
}
```

## 实现要点

### 1. 设置弹框组件

- 左侧 Tab 导航（目前只有「定时刷新」一个 Tab，预留扩展）
- 右侧内容区显示配置项
- 下拉选择刷新间隔
- 取消 / 保存并生效 按钮

### 2. 定时器管理

在 `OpenSpecBoard.tsx` 中：

```typescript
useEffect(() => {
  if (settings.autoRefreshInterval > 0) {
    const timer = setInterval(() => {
      refresh(project.path)
    }, settings.autoRefreshInterval * 1000)
    
    return () => clearInterval(timer)
  }
}, [settings.autoRefreshInterval, project.path])
```

### 3. 倒计时显示

使用 `useState` + `useEffect` 实现倒计时：

```typescript
const [countdown, setCountdown] = useState(settings.autoRefreshInterval)

useEffect(() => {
  if (settings.autoRefreshInterval > 0) {
    const timer = setInterval(() => {
      setCountdown(c => c > 0 ? c - 1 : settings.autoRefreshInterval)
    }, 1000)
    return () => clearInterval(timer)
  }
}, [settings.autoRefreshInterval])
```

### 4. 配置读取与保存

使用 `configApi.get` / `configApi.set`：

```typescript
// 读取
const settingsJson = await configApi.get(`openspec_board_settings_${projectId}`)
const settings = settingsJson ? JSON.parse(settingsJson) : { autoRefreshInterval: 0 }

// 保存
await configApi.set(`openspec_board_settings_${projectId}`, JSON.stringify(settings))
```

## 国际化

添加中英文翻译：

| Key | 中文 | 英文 |
|-----|------|------|
| settings | 设置 | Settings |
| autoRefresh | 定时刷新 | Auto Refresh |
| autoRefreshDesc | 自动刷新看板数据，保持数据同步 | Automatically refresh board data to keep it in sync |
| refreshInterval | 刷新间隔 | Refresh Interval |
| noRefresh | 不刷新 | No Refresh |
| seconds | {n} 秒 | {n} seconds |
| recommended | （推荐） | (Recommended) |
| minute | {n} 分钟 | {n} minute(s) |
| saveAndApply | 保存并生效 | Save & Apply |
| settingsSaved | 设置已生效 | Settings applied |
| onlyWhenBoardOpen | 仅在当前项目看板打开时生效 | Only active when this project's board is open |

## 扩展性

左侧 Tab 预留位置，未来可添加：
- 数据源配置
- 显示选项
- 通知设置
- 其他看板相关配置

## 依赖

- 复用现有的 `configApi`
- 复用现有的弹框样式（`.os-dialog-overlay` 等）
- 复用现有的刷新逻辑（`refresh(projectPath)`）
