# OpenSpec 看板功能设计

**日期**: 2026-05-02
**状态**: 待实现

## 概述

在项目管理详情中添加 OpenSpec 看板入口，为 OpenSpec 命令行操作提供可视化界面。用户可通过看板查看变更列表、跟踪工作流状态、预览产物文件、执行常用操作。

## 入口设计

**位置**: 项目详情抽屉左侧区域底部

**布局**:
```
┌─────────────────────┐
│   [项目图标]         │
│   项目名称           │
│   项目描述           │
│   ───────────────   │
│   路径信息           │
│   创建/更新时间      │
│   ───────────────   │
│   [OpenSpec 看板]   │  ← 快捷按钮
└─────────────────────┘
```

**交互**: 点击按钮后关闭抽屉，打开独立的 OpenSpec 看板页面。

## 页面布局

```
┌──────────────────────────────────────────────────────────────────┐
│  ← 返回    项目名 - OpenSpec 看板              [检测CLI状态]     │
├────────────────┬─────────────────────────────────────────────────┤
│                │                                                  │
│  🔍 搜索变更    │         工作流时间线                             │
│  ────────────  │                                                  │
│                │   propose ──→ new ──→ continue ──→ verify ──→    │
│  CHANGES 列表  │      ●         ●        ○           ○           │
│                │                                                  │
│  ┌───────────┐ │   ┌──────────────────────────────────────────┐  │
│  │ feature-1 │ │   │          产物预览区                       │  │
│  │ ● 进行中  │ │   │  ┌─────────┐ ┌─────────┐ ┌─────────┐    │  │
│  └───────────┘ │   │  │proposal │ │ design  │ │ tasks   │    │  │
│  ┌───────────┐ │   │  │ [预览]  │ │ [预览]  │ │ [预览]  │    │  │
│  │ fix-bug   │ │   │  └─────────┘ └─────────┘ └─────────┘    │  │
│  │ ✓ 已归档  │ │   │                                          │  │
│  └───────────┘ │   │  [内容展示区域...]                        │  │
│                │   └──────────────────────────────────────────┘  │
│                │                                                  │
│  [+ 新建变更]  │   [操作按钮区]                                   │
│                │   [继续当前阶段] [查看产物] [归档变更]           │
└────────────────┴─────────────────────────────────────────────────┘
```

## Changes 列表区

### 功能
- 搜索框：支持关键词搜索，匹配变更名称，高亮显示匹配文字
- 变更卡片：显示变更名称、状态、当前阶段
- 新建变更按钮

### 状态标识
- `● 进行中`（蓝色/绿色）
- `✓ 已归档`（灰色）
- `⚠ 有冲突`（橙色，可选）

### 搜索高亮
- 输入关键词后，变更名称中匹配的文字高亮显示
- 无匹配结果时显示空状态提示

### 交互
- 点击变更卡片：在右侧工作流区显示该变更的详细信息
- 新建变更：弹出对话框输入变更名称，调用 `openspec propose` 命令

## 工作流时间线区

### 阶段定义

**标准工作流**:
```
propose → new → continue → apply → verify → archive
```

**快捷路径**:
- `ff` (fast-forward): 快速创建所有产物，跳过逐步迭代
- `explore`: 探索模式，用于需求澄清（可在任意阶段使用）

### 时间线布局
- 横向时间线，节点表示各阶段
- 已完成阶段：实心圆 + 高亮连接线
- 当前阶段：实心圆 + 脉冲动画
- 未开始阶段：空心圆 + 灰色连接线

### 阶段说明

| 阶段 | 说明 | 产物 |
|------|------|------|
| propose | 创建提案 | proposal.md |
| new | 初始化变更 | specs/, design.md, tasks.md |
| continue | 迭代推进 | 更新产物 |
| apply | 执行实现 | 代码变更 |
| verify | 验证实现 | 验证结果 |
| archive | 归档完成 | 归档记录 |

### 交互
- 点击阶段节点：展开该阶段的产物预览
- 当前阶段节点旁显示操作按钮

## 产物预览区

### 显示内容
当前选中变更的所有产物文件。

### 产物类型

| 文件 | 说明 | 预览方式 |
|------|------|----------|
| proposal.md | 变更提案 | Markdown 渲染 |
| design.md | 设计文档 | Markdown 渲染 |
| tasks.md | 任务清单 | Markdown 渲染 |
| specs/*.md | 规范文件 | Markdown 渲染 |

### 布局
- Tab 切换不同产物文件
- 内容区使用 Markdown 渲染（复用现有 SkillMarkdownPreview 组件）
- 文件路径显示在 Tab 下方

### 交互
- 切换 Tab：显示对应产物内容
- 点击文件路径：在系统文件管理器中打开

## 操作按钮区

### 按钮定义

根据当前变更状态动态显示：

| 当前阶段 | 可用操作 | 说明 |
|----------|----------|------|
| 空/无变更 | [新建变更] | 调用 `openspec propose` |
| propose | [继续推进] | 调用 `openspec new` |
| new/continue | [继续迭代] [执行实现] | 调用 `openspec continue` 或 `openspec apply` |
| apply | [验证实现] | 调用 `openspec verify` |
| verify | [归档变更] | 调用 `openspec archive` |
| archived | [重新激活]（可选） | 移出归档目录 |

### 命令执行流程
1. 用户点击操作按钮
2. 显示确认对话框（简要说明将执行的操作）
3. 后台调用 OpenSpec CLI 命令
4. 显示执行状态（加载中/成功/失败）
5. 成功后刷新变更列表和工作流状态

### 错误处理
- CLI 未安装：显示安装提示，提供安装命令
- 命令执行失败：显示错误信息，提供重试选项

## 数据获取与状态管理

### CLI 检测
- 页面加载时执行 `openspec --version` 检测是否安装
- 未安装时显示提示卡片，包含安装命令：
  ```bash
  npm install -g openspec
  # 或
  bun install -g openspec
  ```

### 数据获取
- 变更列表：调用 `openspec list` 或解析 `openspec/changes/` 目录
- 变更详情：读取变更目录下的产物文件
- 当前状态：解析产物文件的存在性和内容

### 状态管理
创建 `openspecStore.ts` 管理看板状态：
- `changes`: 变更列表
- `selectedChangeId`: 当前选中的变更
- `cliInstalled`: CLI 安装状态
- `loading`: 加载状态
- `error`: 错误信息

### 刷新机制
- 操作完成后自动刷新
- 提供手动刷新按钮

## 技术实现

### 前端组件结构

```
src/components/OpenSpec/
├── OpenSpecBoard.tsx          # 看板主页面
├── ChangesList.tsx            # 变更列表组件
├── ChangeCard.tsx             # 变更卡片组件
├── WorkflowTimeline.tsx       # 工作流时间线
├── ArtifactPreview.tsx        # 产物预览区
├── ActionButtons.tsx          # 操作按钮区
├── CliInstallPrompt.tsx       # CLI 安装提示
├── NewChangeDialog.tsx        # 新建变更对话框
└── OpenSpec.css               # 样式文件
```

### Rust 后端命令

```rust
// src-tauri/src/commands/openspec.rs
#[tauri::command]
async fn check_openspec_cli() -> Result<bool, String>

#[tauri::command]
async fn list_openspec_changes(project_path: String) -> Result<Vec<ChangeInfo>, String>

#[tauri::command]
async fn read_openspec_artifact(project_path: String, change_id: String, file_name: String) -> Result<String, String>

#[tauri::command]
async fn execute_openspec_command(project_path: String, command: String, args: Vec<String>) -> Result<String, String>
```

### API 封装

```typescript
// src/api/openspec.ts
export const openspecApi = {
  checkCli(): Promise<boolean>,
  listChanges(projectPath: string): Promise<ChangeInfo[]>,
  readArtifact(projectPath: string, changeId: string, fileName: string): Promise<string>,
  executeCommand(projectPath: string, command: string, args: string[]): Promise<string>,
}
```

### 类型定义

```typescript
// src/types/openspec.ts
export interface ChangeInfo {
  id: string;
  name: string;
  status: 'in_progress' | 'archived';
  currentStage: 'propose' | 'new' | 'continue' | 'apply' | 'verify' | 'archive';
  createdAt: string;
  updatedAt: string;
  artifacts: ArtifactInfo[];
}

export interface ArtifactInfo {
  name: string;
  path: string;
  type: 'proposal' | 'design' | 'tasks' | 'spec';
}
```

## 依赖与约束

### 外部依赖
- OpenSpec CLI (`openspec`) 需要用户自行安装
- 支持 Node.js 20+ 或 Bun 运行时

### 内部依赖
- 复用 `SkillMarkdownPreview` 组件渲染 Markdown 内容
- 复用现有的确认对话框样式
- 遵循现有的 UI 设计规范（Tailwind CSS）

### 约束
- 仅在项目路径下存在 `openspec/` 目录时显示入口按钮（可选检测）
- CLI 命令在项目目录下执行
- 长时间操作需显示进度指示

## 国际化

支持中英文双语：
- 中文：OpenSpec 看板、变更、阶段、产物等
- 英文：OpenSpec Board、Changes、Stages、Artifacts 等
