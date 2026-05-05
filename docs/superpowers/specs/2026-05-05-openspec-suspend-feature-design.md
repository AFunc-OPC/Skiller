# OpenSpec 挂起功能设计文档

**日期**: 2026-05-05  
**状态**: 设计完成  
**作者**: OpenCode

## 概述

为 OpenSpec 看板添加挂起功能，允许用户将当前查看的 OpenSpec 看板收缩到 App 右侧的侧边栏，便于在多个项目之间快速切换。

## 功能需求

### 核心功能

1. **挂起按钮**: 在 OpenSpec 看板的返回按钮右边添加"挂起"按钮
2. **挂起行为**: 点击挂起后，看板收缩到 App 整体右侧的侧边栏
3. **多项目支持**: 可同时挂起多个项目的 OpenSpec 看板
4. **状态保持**: 挂起时暂停自动刷新，恢复时继续运行
5. **快速切换**: 点击侧边栏中的项目可恢复该项目的 OpenSpec 看板

### 用户场景

**场景 1: 临时查看其他项目**
1. 用户正在查看 Project A 的 OpenSpec 看板
2. 需要临时查看 Project B 的看板
3. 点击"挂起"按钮，Project A 看板收缩到侧边栏
4. 返回项目列表，打开 Project B 看板
5. 随时可以从侧边栏恢复 Project A 看板

**场景 2: 在多个项目间切换**
1. 用户同时处理 3 个项目的 OpenSpec 变更
2. 将所有 3 个项目的看板都挂起
3. 通过侧边栏在不同项目间快速切换
4. 每个看板保持挂起时的状态

## UI 设计

### 布局结构

#### 1. 正常状态

```
┌─────────────────────────────────────────────────────┐
│ 项目列表 (280px)  │  主内容区域                      │
│                   │  (显示项目列表或 OpenSpec 看板)  │
│                   │                                   │
└─────────────────────────────────────────────────────┘
```

#### 2. OpenSpec 看板打开

```
┌─────────────────────────────────────────────────────┐
│ 项目列表 (280px)  │  OpenSpec 看板                   │
│   (半透明遮罩)    │  ┌──────────────────────────┐  │
│                   │  │ [←返回] [📌挂起] 标题    │  │
│                   │  ├──────────────────────────┤  │
│                   │  │ 变更列表 │ 工作流+预览   │  │
│                   │  └──────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

#### 3. 挂起状态

```
┌─────────────────────────────────────────────────────┬──────────┐
│ 项目列表 (280px)  │  主内容区域 (项目列表)         │ 挂起列表 │
│                   │                                 │ (60px)   │
│                   │                                 │          │
│                   │                                 │ ┌──────┐ │
│                   │                                 │ │ 📷 A │ │
│                   │                                 │ └──────┘ │
│                   │                                 │ ┌──────┐ │
│                   │                                 │ │ 📷 B │ │
│                   │                                 │ └──────┘ │
└─────────────────────────────────────────────────────┴──────────┘
```

### 挂起按钮设计

**位置**: OpenSpec 看板 header，返回按钮右边  
**样式**: 橙色主题，醒目但不突兀

```css
.os-suspend-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid #ff9800;
  border-radius: 0.5rem;
  background: #fff3e0;
  color: #f57c00;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.os-suspend-btn:hover {
  background: #ffe0b2;
  border-color: #f57c00;
}
```

**图标**: 使用 `Pin` 图标 (lucide-react)

### 挂起列表侧边栏设计

**位置**: App 整体右侧  
**宽度**: 60px  
**样式**: 橙色主题，与挂起按钮呼应

```
┌──────────┐
│ OPENSPEC │  <- header
├──────────┤
│   ┌──┐   │
│   │A │   │  <- 项目图标 (32x32)
│   └──┘   │
│ Proj A   │  <- 项目名 (小字体)
│          │
│   ┌──┐   │
│   │B │   │  <- 当前激活项目 (带蓝色边框)
│   └──┘   │
│ Proj B   │
└──────────┘
```

**项目图标**: 复用现有项目列表的图标系统  
**激活状态**: 当前查看的项目显示蓝色边框和加粗名称  
**Hover 效果**: 鼠标悬停时显示完整项目名 tooltip

## 技术设计

### 数据结构

#### 挂起项目状态

```typescript
interface SuspendedOpenSpecBoard {
  projectId: string
  projectName: string
  projectPath: string
  projectIcon: string | null
  suspendedAt: number
  state: {
    selectedChangeId: string | null
    settings: OpenSpecBoardSettings
    // 其他需要保持的状态
  }
}
```

#### Store 扩展

在 `appStore` 中添加：

```typescript
interface AppState {
  // ... 现有状态
  suspendedBoards: SuspendedOpenSpecBoard[]
  activeSuspendedBoardId: string | null
  
  // Actions
  suspendOpenSpecBoard: (project: Project, state: OpenSpecBoardState) => void
  resumeOpenSpecBoard: (projectId: string) => void
  removeSuspendedBoard: (projectId: string) => void
}
```

### 状态管理

#### 挂起流程

1. 用户点击"挂起"按钮
2. 收集当前 OpenSpec 看板状态
   - 选择的变更 ID
   - 自动刷新设置
   - 其他用户偏好
3. 暂停自动刷新定时器
4. 保存状态到 `suspendedBoards`
5. 关闭 OpenSpec 看板（调用 `onBack`）
6. 显示挂起列表侧边栏

#### 恢复流程

1. 用户点击侧边栏中的项目
2. 从 `suspendedBoards` 获取保存的状态
3. 打开对应项目的 OpenSpec 看板
4. 恢复保存的状态
   - 设置选择的变更 ID
   - 恢复自动刷新设置
   - 启动自动刷新定时器（如果之前启用）
5. 更新 `activeSuspendedBoardId`

#### 移除流程

当用户通过"返回"按钮正常关闭 OpenSpec 看板时：
1. 从 `suspendedBoards` 移除该项目
2. 如果 `suspendedBoards` 为空，隐藏侧边栏

### 组件设计

#### 1. OpenSpecSuspendButton 组件

```typescript
interface OpenSpecSuspendButtonProps {
  project: Project
  currentState: OpenSpecBoardState
  onSuspend: () => void
}
```

功能：
- 显示挂起按钮
- 点击时调用 `suspendOpenSpecBoard`
- 调用 `onBack` 关闭看板

#### 2. OpenSpecSuspendedSidebar 组件

```typescript
interface OpenSpecSuspendedSidebarProps {
  suspendedBoards: SuspendedOpenSpecBoard[]
  activeBoardId: string | null
  onBoardClick: (projectId: string) => void
}
```

功能：
- 显示所有挂起的项目
- 使用项目图标
- 标识当前激活的项目
- Hover 显示完整项目名

#### 3. OpenSpecBoard 状态保持

扩展 `OpenSpecBoard` 组件：

```typescript
interface OpenSpecBoardProps {
  project: Project
  onBack: () => void
  initialState?: Partial<OpenSpecBoardState>  // 新增：用于恢复状态
}
```

### 自动刷新暂停机制

在 `OpenSpecBoard` 中：

```typescript
useEffect(() => {
  if (settings.autoRefreshInterval > 0 && !loading && initialized && !isPaused) {
    timerRef.current = setInterval(() => {
      refresh(project.path)
    }, settings.autoRefreshInterval * 1000)
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }
}, [settings.autoRefreshInterval, project.path, loading, initialized, isPaused])
```

挂起时设置 `isPaused = true`，恢复时设置为 `false`。

## 边界情况处理

### 1. 项目被删除

**场景**: 项目在挂起状态被删除  
**处理**: 
- 在 `removeProject` 时，同时从 `suspendedBoards` 移除
- 如果删除的是当前激活项目，清空 `activeSuspendedBoardId`

### 2. OpenSpec 目录被删除

**场景**: 项目存在但 OpenSpec 目录被删除  
**处理**:
- 恢复时重新检查 `hasOpenSpecDirectory`
- 如果不存在，显示初始化对话框
- 保持其他状态（选择的变更等）

### 3. 变更被归档或删除

**场景**: 挂起时选择的变更已不存在  
**处理**:
- 恢复时验证 `selectedChangeId` 是否仍然存在
- 如果不存在，清空 `selectedChangeId`，显示空状态

### 4. 最大挂起数量

**场景**: 用户挂起过多项目  
**处理**:
- 不设置硬性限制
- 侧边栏支持滚动
- 考虑添加"全部关闭"功能（后续优化）

### 5. 同时打开多个窗口

**场景**: 用户在多个窗口中操作  
**处理**:
- 每个窗口有独立的 `suspendedBoards` 状态
- 不跨窗口同步（简化实现）

## 实现计划

### Phase 1: 基础功能

1. 扩展 `appStore`，添加挂起相关状态和 actions
2. 创建 `OpenSpecSuspendButton` 组件
3. 修改 `OpenSpecBoard`，添加挂起按钮
4. 实现挂起逻辑（保存状态、暂停刷新、关闭看板）

### Phase 2: 挂起列表

1. 创建 `OpenSpecSuspendedSidebar` 组件
2. 修改 `ProjectsPage`，集成侧边栏
3. 实现恢复逻辑（打开看板、恢复状态）
4. 添加样式和动画效果

### Phase 3: 状态管理优化

1. 在 `OpenSpecBoard` 中支持 `initialState` prop
2. 实现自动刷新暂停/恢复机制
3. 处理各种边界情况
4. 添加项目删除时的清理逻辑

### Phase 4: 测试和优化

1. 单元测试：store actions、组件渲染
2. 集成测试：完整挂起/恢复流程
3. 性能优化：避免不必要的状态保存
4. UX 优化：添加过渡动画、tooltip 等

## 测试要点

### 单元测试

- [ ] `suspendOpenSpecBoard` action 正确保存状态
- [ ] `resumeOpenSpecBoard` action 正确恢复状态
- [ ] `removeSuspendedBoard` action 正确移除项目
- [ ] `OpenSpecSuspendButton` 组件正确触发挂起
- [ ] `OpenSpecSuspendedSidebar` 组件正确显示列表

### 集成测试

- [ ] 完整挂起/恢复流程
- [ ] 多项目挂起和切换
- [ ] 自动刷新正确暂停和恢复
- [ ] 项目删除时正确清理挂起状态

### E2E 测试

- [ ] 用户挂起一个项目，然后恢复
- [ ] 用户挂起多个项目，在它们之间切换
- [ ] 用户挂起项目后删除项目
- [ ] 用户在挂起状态下关闭应用，重新打开

## 文件结构

```
src/
├── components/
│   └── OpenSpec/
│       ├── OpenSpecBoard.tsx           # 修改：添加挂起按钮
│       ├── OpenSpecSuspendButton.tsx   # 新增：挂起按钮组件
│       ├── OpenSpecSuspendedSidebar.tsx # 新增：挂起列表侧边栏
│       └── OpenSpec.css                 # 修改：添加相关样式
├── stores/
│   └── appStore.ts                      # 修改：添加挂起状态
├── pages/
│   └── ProjectsPage.tsx                 # 修改：集成挂起侧边栏
└── types/
    └── app.ts                           # 新增：SuspendedOpenSpecBoard 类型
```

## 未来优化

1. **全部关闭**: 添加"关闭所有挂起看板"按钮
2. **拖拽排序**: 允许用户拖拽调整挂起项目的顺序
3. **分组标签**: 如果挂起项目很多，可以添加分组功能
4. **持久化**: 将挂起状态保存到本地存储，应用重启后恢复
5. **快捷键**: 添加快捷键快速切换挂起的项目

## 总结

OpenSpec 挂起功能通过在 App 右侧添加一个 60px 宽的侧边栏，让用户可以方便地在多个项目的 OpenSpec 看板之间切换。核心设计要点：

1. **简洁的 UI**: 仅显示项目图标和名称，不占用过多空间
2. **状态保持**: 挂起时暂停自动刷新，保持用户的工作状态
3. **一致性**: 复用现有项目图标系统，保持视觉一致性
4. **易用性**: 一键挂起，一键恢复，操作简单直观

该功能将显著提升用户在处理多个项目时的效率和体验。
