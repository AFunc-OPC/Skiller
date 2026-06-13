# 技能中心（Skill Center）功能逻辑文档

> 本文档描述 Skiller 应用中技能中心模块的完整业务逻辑，包括数据模型、核心流程、前后端交互和边界条件。
> 最后更新：2026-06-13

---

## 1. 概述

技能中心是 Skiller 的核心功能模块，负责 AI 技能（Skill）的**导入、管理、组织和分发**。一个「技能」本质上是一个包含 `SKILL.md` 的目录，可被多种 AI 编码工具（Cursor、Claude Code、OpenCode、Gemini CLI 等）消费。

### 核心定位

```
导入源 → [技能中心 ~/.skiller/skills/] → 分发目标（项目/全局路径）
```

技能中心充当所有 AI 技能的**中央仓库**，用户在此统一管理技能，再按需分发到具体项目或全局路径。

---

## 2. 数据模型

### 2.1 技能（Skill）

技能是核心实体，代表一个可分发的 AI 技能包。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 技能的唯一标识，文件系统模式下为目录的绝对路径 |
| `name` | string | 技能名称，优先取 `SKILL.md` 中的 name 字段，fallback 为目录名 |
| `description` | string \| null | 来自 `SKILL.md` 的 description 字段 |
| `file_path` | string | 技能目录的绝对路径 |
| `source` | string | 来源类型：`file` / `npx` / `repository` / `clawhub` |
| `source_metadata` | SourceMetadata \| null | 来源详情，以 JSON 形式存储在技能目录的 `.skiller-source.json` |
| `repo_id` | string \| null | 关联的仓库 ID（当 source=repository 时） |
| `tags` | string[] | 关联的标签 ID 列表 |
| `status` | `'available'` \| `'disabled'` | 技能启用/禁用状态 |
| `is_symlink` | boolean | 是否为符号链接 |
| `symlink_valid` | boolean | 符号链接目标是否存在且可用 |
| `symlink_target_disabled` | boolean | 符号链接目标是否被禁用 |

### 2.2 来源元数据（SourceMetadata）

记录技能的导入来源，是一个 tagged union：

```typescript
// 文件导入
{ type: 'file', original_path: string }

// NPX 命令导入
{ type: 'npx', command: string }

// 从仓库导入
{ type: 'repository', repo_id: string }

// 从 Clawhub 注册表导入
{ type: 'clawhub', source_id: string, slug: string }
```

来源元数据持久化在技能目录内的 `.skiller-source.json` 文件中，而非数据库。

### 2.3 标签系统

标签用于组织和筛选技能，采用**物化路径**树形结构：

- **TagGroup**：标签分组（如「构建与分发」「同步与仓库」「文档与质量」）
- **Tag**：标签节点，通过 `parent_id` 形成树结构
- **skill_tags**：技能与标签的多对多关联表，以技能路径（skill_id）为键

标签绑定在 `skill_tags` 表中，以技能的绝对路径作为 `skill_id`。

### 2.4 工具预设（ToolPreset）

定义各 AI 工具的技能存放路径：

| 预设 ID | 工具名称 | 项目内路径 | 全局路径 |
|---------|----------|-----------|---------|
| `preset-cursor` | Cursor | `.cursor/rules/` | `~/.cursor/rules/` |
| `preset-claude` | Claude Code | `.claude/commands/` | `~/.claude/commands/` |
| `preset-opencode` | OpenCode | `.opencode/skills/` | `~/.opencode/skills/` |
| `preset-gemini` | Gemini CLI | `.gemini/skills/` | `~/.gemini/skills/` |
| `preset-codex` | Codex | `.codex/skills/` | `~/.codex/skills/` |
| `preset-npx` | Npx Skills | `.agents/skills/` | `~/.agents/skills/` |
| ... | ... | ... | ... |

### 2.5 数据库 Schema

```sql
-- 核心表（文件系统模式下 skills 表较少使用，主要用 skill_tags 做标签关联）
CREATE TABLE skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    source TEXT NOT NULL,
    repo_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE skill_tags (
    skill_id TEXT NOT NULL,  -- 实际为技能目录的绝对路径
    tag_id TEXT NOT NULL,
    PRIMARY KEY (skill_id, tag_id)
);

CREATE TABLE tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    group_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE tag_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_builtin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE tool_presets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    skill_path TEXT NOT NULL,      -- 项目内的技能路径
    global_path TEXT NOT NULL,      -- 全局技能路径
    is_builtin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    skill_path TEXT NOT NULL,
    tool_preset_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

---

## 3. 存储架构

### 3.1 文件系统布局

```
~/.skiller/
├── skills/                    # 技能中心主目录（所有导入的技能）
│   ├── my-skill/              # 正常技能
│   │   ├── SKILL.md
│   │   └── .skiller-source.json
│   ├── .disable.another-skill/# 被禁用的技能（重命名前缀）
│   │   ├── .disable.SKILL.md  # SKILL.md 也被同步重命名
│   │   └── .skiller-source.json
│   └── ...
├── .temp_skills/              # NPX 导入临时暂存目录
│   └── <session_id>/          # 每次导入一个会话
│       ├── repo/              # git clone 的仓库
│       └── session.json       # 导入会话元数据
├── .backup/                   # 导入覆盖时的备份
└── .temp/                     # 通用临时文件
```

### 3.2 双存储模式

系统存在两套技能读取模式：

| 模式 | 读取命令 | 数据来源 | 用途 |
|------|---------|---------|------|
| **文件系统模式** | `get_file_skills` | 扫描 `~/.skiller/skills/` 目录 | **主用模式**，前端技能中心页面使用 |
| **数据库模式** | `get_skills` | 查询 SQLite `skills` 表 | 遗留模式，部分 API 仍保留 |

当前前端通过 `fileSkillStore` → `invoke('get_file_skills')` 获取技能列表，不经过数据库的 `skills` 表。

---

## 4. 核心业务流程

### 4.1 技能导入

技能支持 4 种导入来源：

#### 4.1.1 文件导入（File Import）

**触发**：用户选择本地 `.zip` / `.skill` 文件或技能文件夹

**流程**：
1. 用户通过文件对话框选择文件
2. 前端调用 `invoke('unzip_skill', { filePath })`
3. 后端处理：
   - 如果是 `.zip` / `.skill`：解压到临时目录，递归查找包含 `SKILL.md` 的目录
   - 如果是文件夹：直接检查 `SKILL.md` 是否存在
   - **必须包含 `SKILL.md`**，否则报错
4. 将技能目录复制到 `~/.skiller/skills/<skill_name>/`
5. 如果目标已存在：先备份到 `~/.skiller/.backup/<name>-<timestamp>/`，再覆盖
6. 写入 `.skiller-source.json`，记录来源为 `{ type: 'file', original_path }`

**校验规则**：
- 必须包含 `SKILL.md` 文件
- 递归查找最深 10 层（跳过 `.开头`、`node_modules`、`__MACOSX`）

#### 4.1.2 NPX 命令导入（NPX Import）

**触发**：用户粘贴 `npx skills add` 命令

**支持两种模式**：

**A. 接管模式（Managed）** — Skiller 自己 clone 仓库，不依赖 npx：

流程：
1. 用户输入命令，如 `npx skills add owner/repo@skill-name`
2. 前端调用 `prepare_npx_skill_import`，后端解析命令：
   - 支持标准格式：`npx skills add <repo-url> --skill <name> --branch <branch> --path <path>`
   - 支持 shorthand 格式：`npx skills add owner/repo@skill-name`
   - 自动补全 GitHub URL：`owner/repo` → `https://github.com/owner/repo`
3. 创建临时会话目录，执行 `git clone` 到暂存区
4. 定位技能目录（按目录名或 SKILL.md 中的 name 字段匹配）
5. 返回导入摘要，等待用户确认
6. 用户确认后调用 `confirm_npx_skill_import`，将暂存目录复制到 `~/.skiller/skills/`
7. 如果目标已存在，直接覆盖（视为更新）
8. 清理临时会话

**B. 原生模式（Native）** — 直接执行 npx 命令：

流程：
1. 前端调用 `execute_npx_skills_add_native`
2. 自动补充 `-g -y` 标志
3. 执行 `npx skills add ...` 命令，安装到 `~/.agents/skills/`
4. 实时通过事件流推送 stdout/stderr 输出到前端
5. 安装完成后，检测 `~/.agents/skills/` 新增的技能
6. 用户通过 `syncToSkiller` 将技能从 `~/.agents/skills/` 同步到 `~/.skiller/skills/`
7. 同步完成后删除全局目录中的副本

**命令解析规则**：

```
npx skills add <repo-url> [--skill|-s <name>] [--branch|-b <branch>] [--path|-p <path>] [--all] [-g] [-y]
npx skills add owner/repo@skill-name [--branch <branch>] [--path <path>]
```

- `--skill '*'` 或 `--all` 表示导入所有技能
- 忽略的标志：`-g`、`-y`、`--global`、`--yes`、`--copy`、`--full-depth`、`-l`、`--list`
- `--agent <agents>` / `-a <agents>`：跳过但不报错

#### 4.1.3 仓库导入（Repository Import）

**触发**：用户从已注册的仓库中选择技能

**流程**：
1. 用户在仓库选择对话框中选择仓库
2. 展示仓库中的技能列表（扫描仓库 `local_path` 下包含 `SKILL.md` 的目录）
3. 用户选择要导入的技能
4. 前端调用 `invoke('copy_skill', { repoId, skillPath })`
5. 后端将技能目录复制到 `~/.skiller/skills/<skill_name>/`
6. 写入 `.skiller-source.json`，记录 `{ type: 'repository', repo_id }`
7. **如果目标已存在，直接报错**（不会覆盖）

#### 4.1.4 Clawhub 导入

**触发**：用户从 Clawhub 注册表浏览并导入技能

**流程**：通过独立的 Clawhub 模块完成，导入后技能进入 `~/.skiller/skills/`，来源标记为 `clawhub`。

#### 4.1.5 NPX 搜索发现（NPX Find）

**触发**：用户搜索 skills.sh 上的公开技能

**支持两种搜索方式**：
1. **API 搜索**：直接调用 `https://skills.sh/api/search?q=<keyword>`
2. **CLI 搜索**：执行 `npx skills find <keyword>`，解析终端输出

搜索结果展示技能名称、作者、仓库、安装量等信息，用户可选择直接导入。

### 4.2 技能管理

#### 4.2.1 列表展示

**数据加载**：
- 前端通过 `fileSkillStore.fetchSkills()` → `get_file_skills` 扫描文件系统
- 每个技能目录生成一个 Skill 对象：
  - `id` = 目录绝对路径
  - `name` = SKILL.md 的 name 字段 || 目录名
  - `status` = 根据目录名前缀 `.disable.` 判断
  - `is_symlink` / `symlink_valid` = 检测符号链接状态
  - `tags` = 从 `skill_tags` 表查询
  - `source` = 从 `.skiller-source.json` 读取

**视图模式**：
- **卡片视图**：网格展示，每个技能一张卡片
- **列表视图**：紧凑的行列表

**筛选与排序**：
- 按标签筛选：选中标签后仅显示关联技能
- 按关键词搜索：匹配技能 name 和 file_path
- 排序选项：按名称、创建时间、更新时间（升/降序）
- 标签路径面包屑：展示当前选中标签的层级路径

#### 4.2.2 技能详情

点击技能卡片/列表项打开详情抽屉（SkillDetailDrawer），展示：
- 技能名称和描述
- SKILL.md 内容预览
- 来源信息（导入方式、原始路径/命令/仓库）
- 关联标签
- 分发面板：将技能分发到项目或全局路径
- 操作按钮：启用/禁用、删除

#### 4.2.3 启用/禁用

**禁用**：
1. 将技能目录重命名：`<name>` → `.disable.<name>`
2. 将 `SKILL.md` 重命名：`SKILL.md` → `.disable.SKILL.md`
3. 更新数据库中 `skill_tags` 的 `skill_id`（路径变了）

**启用**：反向操作

**符号链接的特殊处理**：
- 如果是符号链接且目标目录被禁用，源链接也标记为 `symlink_target_disabled: true`
- 启用时需要检查目标的禁用状态

#### 4.2.4 删除

1. 删除数据库中关联的标签绑定（`DELETE FROM skill_tags`）
2. 删除技能目录（`fs::remove_dir_all`）
3. 支持批量删除（多选模式）

#### 4.2.5 标签管理

**标签树**：
- 通过 `tagTreeStore` 管理，使用物化路径（materialized_path）构建树形结构
- 支持搜索、展开/折叠、创建、重命名、移动、删除

**拖拽分配标签**：
- 使用 @dnd-kit 实现拖拽交互
- 将标签从左侧标签树拖到右侧技能卡片上，即可为技能添加标签
- 通过 `update_file_skill_tags` 更新绑定

**批量标签操作**：
- 多选模式下，可通过批量标签选择器一次性为多个技能添加标签

### 4.3 技能分发

#### 4.3.1 分发概念

将技能从技能中心（`~/.skiller/skills/`）分发到目标位置，使 AI 工具可以消费。

**分发目标**：
- **项目级别**：复制/链接到某个项目的 AI 工具技能目录下
- **全局级别**：复制/链接到 AI 工具的全局技能目录下

**分发模式**：
- **Copy（复制）**：完全复制技能文件
- **Symlink（符号链接）**：创建指向源技能的符号链接

#### 4.3.2 分发流程

1. 用户在详情抽屉或批量分发面板中选择：
   - 分发目标（全局/项目）
   - 工具预设（Cursor、Claude Code 等）
   - 分发模式（复制/符号链接）
   - 如果选项目级别，还需选择具体项目
2. 前端调用 `distributionApi.distribute(request)`
3. 后端 `distribution_service::distribute_skill`：
   - 解析源技能目录名
   - 根据目标和预设计算目标路径：
     - 全局：`<preset.global_path>/<skill_name>`（展开 `~`）
     - 项目：`<project.path>/<preset.skill_path>/<skill_name>`
   - 如果目标已存在：
     - `overwrite: true` → 删除后重新分发
     - `overwrite: false` → 返回错误
   - 执行复制或创建符号链接

#### 4.3.3 冲突检测

分发前可先调用 `check_distribution_conflicts` 检测目标位置是否已有同名技能：
- 遍历所有技能 × 所有预设 × 所有项目的组合
- 返回冲突列表（技能名、目标路径、目标标签）

用户在 `DistributionConflictModal` 中选择覆盖或跳过。

#### 4.3.4 批量分发

多选模式下可批量分发：
- 选中多个技能 → 打开 `BatchDistributionModal`
- 复用 `SkillDistributionPanel` 组件
- 逐个执行分发操作

### 4.4 技能导出

多选模式下可批量导出技能为 ZIP 文件：
1. 用户选择导出路径
2. 前端调用 `invoke('export_skills', { skillIds, exportPath })`
3. 后端将所有选中技能打包为一个 ZIP 文件

---

## 5. 前端架构

### 5.1 状态管理

| Store / Context | 职责 |
|----------------|------|
| `fileSkillStore` | 技能列表数据（从文件系统读取），`fetchSkills` / `updateSkillLocally` |
| `skillStore` | 遗留的数据库模式技能管理（当前主页面未使用） |
| `tagTreeStore` | 标签树管理，CRUD + 展开/折叠 |
| `SkillContext` | 技能中心页面的核心上下文，整合技能/标签/导入/分发等所有操作 |
| `repositoryStore` | 仓库列表数据 |

### 5.2 组件结构

```
SkillCenter（主页面）
├── SkillSearchInput           # 搜索框
├── ViewToggle                 # 卡片/列表视图切换
├── AddSkillButton             # 添加技能按钮（下拉菜单）
├── SortDropdown               # 排序选项
├── 多选工具栏
│   ├── 全选/取消全选
│   ├── 批量标签
│   ├── 批量删除
│   ├── 批量导出
│   └── 批量分发
├── TagTree（左侧面板）
│   ├── SearchInput            # 标签搜索
│   ├── DraggableTagNode       # 可拖拽的标签节点
│   └── SearchResults          # 标签搜索结果
├── DroppableSkillArea（右侧技能列表区域）
│   ├── DroppableSkillCard     # 卡片视图项（支持接收拖拽标签）
│   └── DroppableSkillListItem # 列表视图项（支持接收拖拽标签）
├── SkillDetailDrawer          # 技能详情抽屉
│   ├── SkillMarkdownPreview   # SKILL.md 预览
│   └── SkillDistributionPanel # 分发面板
├── FileImportDialog           # 文件导入对话框
├── NpxImportDialog            # NPX 命令导入对话框
├── NpxFindDialog              # NPX 搜索对话框
├── RepositorySelectDialog     # 仓库选择导入对话框
├── BatchDistributionModal     # 批量分发模态框
│   └── SkillDistributionPanel # 复用分发面板
└── DistributionConflictModal  # 冲突确认模态框
```

### 5.3 DnD 拖拽交互

使用 `@dnd-kit/core` 实现：
- **拖拽源**：标签树中的标签节点
- **放置目标**：技能卡片/列表项
- **碰撞检测**：自定义逻辑，优先检测指针是否在技能区域内
- **效果**：拖拽标签到技能上 → 为技能添加该标签

---

## 6. 后端架构

### 6.1 Tauri 命令分层

```
命令层（commands/）
├── skill_file.rs               # 主命令文件（文件系统模式的技能 CRUD + NPX 导入）
│   ├── get_file_skills         # 扫描 ~/.skiller/skills/ 获取所有技能
│   ├── toggle_skill            # 启用/禁用技能（重命名目录）
│   ├── delete_file_skill       # 删除技能（删目录 + 清标签）
│   ├── unzip_skill             # 从 zip/文件夹导入技能
│   ├── copy_skill              # 从仓库导入技能
│   ├── distribute_skill        # 分发技能
│   ├── prepare_npx_skill_import # NPX 导入 - 准备阶段（clone）
│   ├── confirm_npx_skill_import # NPX 导入 - 确认阶段（复制）
│   ├── cancel_npx_skill_import  # NPX 导入 - 取消（清理临时文件）
│   ├── execute_npx_skills_add_native # 原生 npx 执行
│   ├── sync_skill_to_skiller   # 从全局目录同步到技能中心
│   ├── export_skills           # 批量导出
│   ├── read_skill_md_content   # 读取 SKILL.md 内容
│   ├── search_skills_sh_api    # skills.sh API 搜索
│   └── execute_npx_skills_find # npx skills find CLI 搜索
├── skill.rs                    # 遗留数据库模式的技能 CRUD
├── project_skill.rs            # 项目内技能管理（查看/删除/启用禁用）
└── skill_file.rs（也包含）
    ├── get_file_skill_tags     # 获取技能标签
    └── update_file_skill_tags  # 更新技能标签

服务层（services/）
├── skill_service.rs            # 遗留数据库模式技能服务
├── skill_file_service.rs       # 文件系统模式的标签绑定服务
└── distribution_service.rs     # 技能分发核心逻辑
```

### 6.2 NPX 导入会话管理

NPX 接管模式使用**会话机制**管理导入过程：

```
用户发起导入 → 创建 session（UUID）→ git clone 到暂存区
→ 用户确认 → 复制到技能中心 → 清理暂存区
→ 用户取消 → 删除暂存区
```

会话元数据存储在 `~/.skiller/.temp_skills/<session_id>/session.json`，包含：
- `session_id`：唯一标识
- `command`：原始 npx 命令
- `parsed`：解析后的命令参数
- `summary`：导入摘要

### 6.3 技能目录发现

在仓库中定位技能目录的策略（优先级从高到低）：

1. **指定路径**（`--path`）：直接使用指定路径
2. **目录名匹配**：遍历仓库查找与 `--skill` 名称匹配的目录（且包含 SKILL.md）
3. **SKILL.md name 匹配**：如果目录名不匹配，读取 SKILL.md 的 name 字段进行匹配
4. **自动发现**：如果没有指定 `--skill`，查找所有包含 SKILL.md 的目录
   - 只有 1 个 → 直接使用
   - 多个 → 报错，要求用户指定

搜索深度限制为 10 层，跳过以 `.` 开头、`node_modules`、`__MACOSX` 的目录。

---

## 7. 重要业务规则

### 7.1 技能必须包含 SKILL.md

所有导入途径都要求技能目录中存在 `SKILL.md` 文件。缺少该文件会直接报错。

### 7.2 禁用通过重命名实现

不使用数据库字段标记禁用状态，而是通过重命名目录和文件：
- 目录：`name` → `.disable.name`
- SKILL.md：`SKILL.md` → `.disable.SKILL.md`

好处：文件系统级别即能看出哪些技能被禁用，且 AI 工具不会读取 `.disable.` 前缀的文件。

### 7.3 导入覆盖策略

| 来源 | 目标已存在时 | 处理 |
|------|------------|------|
| 文件导入 | 先备份再覆盖 | 备份到 `~/.skiller/.backup/` |
| NPX 导入（接管模式） | 直接覆盖 | 删除后重新复制 |
| NPX 导入（原生模式同步） | 直接覆盖 | 删除后重新复制 |
| 仓库导入 | 报错 | 不允许覆盖 |

### 7.4 分发冲突

分发时如果目标位置已有同名技能：
- `overwrite: false`（默认）：返回错误
- `overwrite: true`：删除目标后重新分发
- 符号链接模式下的删除需特殊处理（区分链接本身和目标）

### 7.5 标签绑定以路径为键

`skill_tags` 表使用技能目录的绝对路径作为 `skill_id`，而非数据库中的 UUID。这意味着：
- 技能目录被移动/重命名后，标签绑定会丢失
- 禁用/启用操作会同步更新 `skill_tags` 中的路径

### 7.6 来源追踪

每个技能目录内的 `.skiller-source.json` 记录了导入来源，不存储在数据库中。这确保了即使数据库被清理，来源信息仍然保留在文件系统中。

---

## 8. 前后端交互 API 汇总

### 技能 CRUD

| 前端调用 | Tauri 命令 | 说明 |
|---------|-----------|------|
| `fileSkillStore.fetchSkills()` | `get_file_skills` | 扫描文件系统获取技能列表 |
| `SkillContext.deleteSkill()` | `delete_file_skill` | 删除技能 |
| `SkillContext.toggleSkillStatus()` | `toggle_skill` | 启用/禁用技能 |
| `SkillContext.updateSkillTags()` | `update_file_skill_tags` | 更新技能标签绑定 |
| `SkillContext.getSkillTags()` | `get_file_skill_tags` | 获取技能标签 |
| `skillApi.readSkillMdContent()` | `read_skill_md_content` | 读取 SKILL.md 内容 |

### 技能导入

| 前端调用 | Tauri 命令 | 说明 |
|---------|-----------|------|
| `SkillContext.importSkillFromFile()` | `unzip_skill` | 文件/ZIP 导入 |
| `SkillContext.prepareSkillImportFromNpx()` | `prepare_npx_skill_import` | NPX 导入-准备 |
| `SkillContext.confirmSkillImportFromNpx()` | `confirm_npx_skill_import` | NPX 导入-确认 |
| `SkillContext.cancelSkillImportFromNpx()` | `cancel_npx_skill_import` | NPX 导入-取消 |
| `SkillContext.executeNativeNpxSkillsAdd()` | `execute_npx_skills_add_native` | 原生 npx 执行 |
| `SkillContext.syncToSkiller()` | `sync_skill_to_skiller` | 全局→技能中心同步 |
| `SkillContext.importSkillFromRepository()` | `copy_skill` | 仓库导入 |
| `SkillContext.checkToolAvailability()` | `check_git_available` + `check_npx_available` | 工具检测 |

### 技能分发

| 前端调用 | Tauri 命令 | 说明 |
|---------|-----------|------|
| `distributionApi.distribute()` | `distribute_skill` | 执行分发 |
| `distributionApi.checkConflicts()` | `check_distribution_conflicts` | 冲突检测 |

### 技能搜索

| 前端调用 | Tauri 命令 | 说明 |
|---------|-----------|------|
| NpxFindDialog | `search_skills_sh_api` | skills.sh API 搜索 |
| NpxFindDialog | `execute_npx_skills_find` | npx CLI 搜索 |

### 标签管理

| 前端调用 | Tauri 命令 | 说明 |
|---------|-----------|------|
| `tagTreeStore.fetchTree()` | `tagApi.getTree()` | 获取标签树 |
| `tagTreeStore.createTag()` | `tagApi.create()` | 创建标签 |
| `tagTreeStore.updateTag()` | `tagApi.update()` | 重命名标签 |
| `tagTreeStore.deleteTag()` | `tagApi.delete()` | 删除标签 |

---

## 9. 项目内技能（Project Skills）

项目内技能是已分发到具体项目中的技能，由 `project_skill.rs` 管理：

| 命令 | 说明 |
|------|------|
| `get_project_skills` | 扫描项目的技能目录，列出所有项目内技能 |
| `get_project_skills_by_presets` | 按所有预设分组列出项目内技能 |
| `remove_project_skill` | 删除项目中的技能 |
| `toggle_project_skill_status` | 启用/禁用项目中的技能 |
| `batch_remove_project_skills` | 批量删除 |
| `batch_toggle_project_skills_status` | 批量启用/禁用 |
| `check_project_skill_exists` | 检查技能是否存在于项目中 |

项目内技能的 ID 格式：`project:<project_id>:<preset_id>:<skill_name>`

---

## 10. 边界条件与注意事项

1. **跨平台路径**：Windows 下路径可能以 `C:`、`D:` 等盘符开头，路径验证需同时支持 POSIX 和 Windows 格式
2. **符号链接处理**：需区分「链接本身」和「链接目标」的状态，两层都可能被禁用
3. **并发导入**：NPX 导入使用 `spawn_blocking` 避免阻塞主线程；原生模式通过事件流实时推送输出
4. **临时文件清理**：NPX 导入取消/失败时应清理暂存目录，但某些异常路径可能导致残留
5. **ANSI 转义**：原生 npx 执行需 strip ANSI 转义码，并处理 Unicode box-drawing 字符
6. **标签去重**：标签绑定时通过 `resolve_tag_id` 规范化，避免重复绑定

---

## 11. 技术债务与优化方向

### 11.1 遗留数据库模式清理（低优先级）

**现状**：系统中并存两套技能读取模式：

| 模式 | 前端 Store | 后端命令 | 后端服务 | 状态 |
|------| ---------- | -------- | -------- | ---- |
| **文件系统模式**（主用） | `fileSkillStore.ts` | `commands/skill_file.rs` | `skill_file_service.rs` | ✅ 活跃 |
| **数据库模式**（遗留） | `skillStore.ts` | `commands/skill.rs` | `skill_service.rs` | ⚠️ 未使用 |

**问题**：

- 前端 `skillStore.ts` 和 `api/skill.ts` 仍然存在，新开发者可能调错 API
- 后端 `commands/skill.rs` 和 `services/skill_service.rs` 注册了 `get_skills`、`create_skill` 等命令，但前端主流程不再使用
- `SkillContext` 已完全迁移到文件系统模式，但遗留代码增加理解成本

**清理范围**：

```text
前端可删除：
- src/stores/skillStore.ts
- src/api/skill.ts

后端可删除：
- src-tauri/src/commands/skill.rs
- src-tauri/src/services/skill_service.rs

后端需确认：
- src-tauri/src/models/skill.rs 中的 Skill / CreateSkillRequest / UpdateSkillRequest
  （被 skill_file.rs 和 project_skill.rs 复用，不能直接删除，需重构提取）
- main.rs 中注册的 get_skills / create_skill / update_skill / delete_skill 命令

数据库表：
- skills 表（v1 schema）可考虑在迁移中标记废弃
```

**风险评估**：纯清理，无功能影响。需先全局搜索确认没有其他地方调用这些 API。

### 11.2 标签绑定改用稳定 ID（中等优先级）

**现状**：`skill_tags` 表以技能目录的绝对路径作为 `skill_id`：

```sql
CREATE TABLE skill_tags (
    skill_id TEXT NOT NULL,  -- 实际存储的是如 "C:\Users\xxx\.skiller\skills\my-skill"
    tag_id TEXT NOT NULL,
    PRIMARY KEY (skill_id, tag_id)
);
```

**问题**：
- 禁用/启用会改变路径（加/去 `.disable.` 前缀），需同步更新 `skill_tags`
- 如果未来支持技能重命名或移动，标签绑定会断裂
- Windows/Linux 路径格式不一致时可能导致匹配失败

**改进方案**：在技能目录内生成一个持久 ID 文件（如 `.skiller-id`），标签绑定改用该 ID：

```text
~/.skiller/skills/my-skill/
├── .skiller-id              # 内容：一个 UUID
├── .skiller-source.json
└── SKILL.md
```

**迁移策略**：
1. 在 `get_file_skills` 扫描时，为没有 `.skiller-id` 的技能自动生成
2. `skill_tags.skill_id` 改为读取 `.skiller-id` 的值
3. 写一个一次性迁移脚本，把现有路径键转换为 ID 键
4. 禁用/启用操作不再需要更新 `skill_tags`

**触发条件**：等出现技能重命名/移动需求时再做，目前仅在禁用/启用场景下有已知风险（已通过同步更新 `skill_tags` 规避）。

### 11.3 不需要优化的设计决策

以下设计经过评估认为当前方案合理，无需改动：

| 决策 | 理由 |
| ---- | ---- |
| 禁用=文件重命名（`.disable.` 前缀） | 文件系统级可见，AI 工具自然忽略 `.disable.` 开头的文件，无需额外过滤逻辑 |
| 来源追踪用文件（`.skiller-source.json`） | 来源信息跟着技能目录走，可移植、抗数据库重置，与技能目录共存亡 |
| NPX 会话式导入（暂存 → 确认 → 清理） | 两阶段提交保证导入可取消，暂存目录与正式目录隔离 |
| 分发支持 symlink 模式 | 节省磁盘空间，技能中心更新后项目自动生效，但需注意目标禁用状态的传播 |
