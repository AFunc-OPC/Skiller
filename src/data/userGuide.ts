export const USER_GUIDE_CONTENT = `# Skiller 使用手册

欢迎使用 **Skiller** — 一款跨平台的 Skill 管理工具，帮助你高效组织、预览和管理技能文件。

---

## 界面概览

Skiller 采用现代化的单窗口布局，左侧为导航侧边栏，右侧为工作区域。侧边栏可以收起/展开，方便在不同功能模块间切换。

### 导航模块

| 模块 | 功能说明 |
|------|----------|
| 总览 | 系统仪表盘，展示核心统计数据和快速操作入口 |
| 技能中心 | 技能的集中管理、预览、导入和分发 |
| 项目管理 | 项目与技能的关联配置 |
| 仓库管理 | 外部技能仓库的接入和同步 |
| 标签治理 | 标签的层级管理和技能分类 |
| 设置 | 语言、主题、路径预设、日志查看 |

---

## 功能详解

### 一、总览页面

总览页面是 Skiller 的首页仪表盘，提供全局视图和快速操作。

#### 统计卡片

页面顶部展示四个核心指标卡片，点击可快速跳转到对应模块：

| 卡片 | 显示内容 | 状态指示 |
|------|----------|----------|
| 技能 | 已管理技能总数 | 显示可用/禁用数量，有可用技能时显示绿色 |
| 项目 | 已创建项目数 | 无项目时显示警告色 |
| 标签 | 标签总数 | 显示无标签技能数，全部已分类显示绿色 |
| 仓库 | 已同步/总仓库数 | 有待同步仓库时显示警告色 |

#### 快速操作

页面下方提供四个快捷操作按钮：

1. **导入技能** - 悬停展开导入方式菜单：
   - 从文件导入：选择本地 \`SKILL.md\` 文件
   - 从 NPX 查找：在线搜索并安装技能
   - 从 NPX 安装：直接执行 npx 命令安装
   - 从仓库导入：从已接入仓库批量导入

2. **新建项目** - 快速创建新项目配置

3. **添加仓库** - 接入新的技能仓库

4. **管理标签** - 跳转到标签治理页面

---

### 二、技能中心

技能中心是 Skiller 的核心功能模块，提供技能的全生命周期管理。

#### 界面布局

技能中心采用主内容区 + 抽屉布局：
- **主内容区左侧**：标签树导航，支持搜索和层级浏览
- **主内容区右侧**：技能列表/网格展示区
- **抽屉面板**：点击技能打开详情面板

#### 搜索与筛选

**搜索功能**
- 顶部搜索框支持技能名称、描述、标签的模糊搜索
- 实时过滤，输入即显示结果

**标签筛选**
- 左侧标签树点击任意标签，右侧显示该标签下的技能
- 标签路径面包屑显示当前筛选位置
- 点击"全部技能"返回完整列表

**排序选项**
- 按名称排序（A-Z / Z-A）
- 按更新时间排序
- 按创建时间排序

#### 视图切换

| 视图 | 特点 |
|------|------|
| 卡片视图 | 网格布局，展示技能图标、名称、描述、标签、状态 |
| 列表视图 | 紧凑列表，适合快速浏览大量技能 |

#### 技能卡片/列表项

每个技能展示以下信息：
- **图标**：技能标识图标
- **名称**：技能名称
- **描述**：简短描述
- **标签**：关联的标签列表
- **状态**：可用（绿色）/ 禁用（灰色）
- **来源**：本地 / NPX / 仓库

#### 技能详情抽屉

点击技能卡片打开右侧详情抽屉，包含：

**基本信息**
- 技能名称、描述
- 来源信息（文件导入/NPX安装/仓库导入）
- 所属仓库（如有，可点击跳转）
- 创建时间、更新时间

**状态切换**
- 点击状态按钮切换"可用"/"禁用"
- 禁用的技能不会被分发到项目中

**查看文档**
- 点击"查看文档"按钮打开 SKILL.md 预览
- 支持源码模式和渲染模式切换
- 全屏阅读体验

**标签管理**
- 显示当前关联的所有标签（含完整路径）
- 点击"选择标签"打开标签选择器
- 标签选择器支持：
  - 树形结构展示标签层级
  - 搜索框快速过滤标签
  - 点击选中/取消选中标签
  - 显示已选中状态
- 点击标签旁的 × 移除单个标签

**存储位置**
- 显示技能文件完整路径
- 复制路径到剪贴板
- 在文件管理器中打开

**技能分发** ⭐ 核心功能

技能分发功能可将技能部署到不同的目标环境：

**分发目标**
| 目标 | 说明 |
|------|------|
| 全局技能库 | 分发到系统统一目录，跨项目复用 |
| 项目技能目录 | 分发到指定项目，适合团队协作与项目隔离 |

**分发配置**
- **目标项目**（选择"项目"时）：下拉选择目标项目，支持搜索、多选
- **工具目录**：选择目标工具预设（如 opencode、claude、cursor），支持搜索、多选

**分发模式**
| 模式 | 说明 |
|------|------|
| 复制 | 生成独立副本，目标目录可单独维护 |
| 软链接 | 保持与源技能同步，适合本地迭代 |

**目标路径预览**
- 实时显示分发后的目标路径
- 路径根据选择的分发目标、项目、工具预设自动计算

**执行分发**
- 点击"分发"按钮执行
- 支持批量分发到多个预设/项目
- 显示分发成功/失败状态

#### 导入技能

点击"添加技能"按钮，选择导入方式：

**1. 从文件导入**
- 点击选择文件或拖拽上传
- 支持 \`SKILL.md\` 或包含该文件的文件夹
- 系统自动解析文件内容并创建技能记录

**2. 从 NPX 查找** ⭐ 推荐方式

强大的在线技能搜索和安装功能：

**搜索模式切换**
| 模式 | 说明 |
|------|------|
| skills.sh API 搜索 | 通过在线目录搜索，速度快 |
| npx skills find 搜索 | 通过本地命令搜索，实时日志 |

**搜索结果**
- 技能名称、描述（搜索关键词高亮）
- 作者、仓库信息
- 安装量统计
- 外部链接（点击打开详情页）
- 安装命令（一键复制）

**批量操作**
- 全选/取消全选
- 多选技能批量导入
- 实时执行日志
- 导入成功/失败计数

**3. 从 NPX 安装**
- 直接输入 npx 安装命令
- 支持自定义安装参数
- 安装完成后自动同步到技能中心
- 显示安装进度和日志

**4. 从仓库导入**
- 选择已接入的仓库
- 浏览仓库中的技能列表
- 批量选择并导入

---

### 三、项目管理

项目管理模块帮助你为不同项目配置技能预设，实现项目与技能的关联。

#### 项目列表

**视图模式**
- 卡片视图：展示项目图标、名称、描述、路径
- 列表视图：紧凑展示项目信息

**搜索功能**
- 支持按项目名称、路径搜索
- 实时过滤显示匹配结果

**排序选项**
- 按名称、创建时间、更新时间排序

#### 创建项目

1. 点击"新建"按钮
2. 选择项目文件夹（支持拖拽）
3. 填写项目名称（自动获取文件夹名称）
4. 添加项目描述（可选）
5. 点击"创建"完成

> 项目创建后会自动配置默认技能路径 \`.skills\`

#### 项目详情

点击项目卡片打开详情抽屉：

**项目信息**
- **图标**：支持自定义，拖拽或点击上传图片（PNG/JPG/GIF/SVG/WebP，≤10MB）
- **名称**：点击可编辑
- **描述**：点击可编辑（支持长文本）
- **路径**：显示完整路径，支持复制和打开文件夹
- **创建时间/更新时间**

**项目技能管理** ⭐ 核心功能

**工具预设切换**
- 顶部标签栏显示所有工具预设
- 切换标签查看不同工具下的技能配置
- 每个标签显示技能数量

**技能列表**
- 卡片/列表视图切换
- 搜索技能（按名称、路径）
- 显示技能名称、描述、路径、状态

**批量操作**
- 全选/取消全选
- 批量切换状态（启用/禁用）
- 批量移除技能

**单个技能操作**
- 切换启用/禁用状态
- 移除技能（需确认）

**导入技能到项目**
1. 点击"导入"按钮
2. 弹出技能选择对话框
3. 搜索或浏览技能中心
4. 多选要导入的技能
5. 选择目标工具预设（可多选）
6. 选择分发模式（复制/软链接）
7. 可选：强制覆盖已有技能
8. 确认导入

#### 项目操作

| 操作 | 说明 |
|------|------|
| 编辑 | 修改项目名称、描述、图标 |
| 删除 | 移除项目配置（不影响实际文件） |
| 打开文件夹 | 在系统文件管理器中打开项目目录 |
| 复制路径 | 复制项目完整路径到剪贴板 |

---

### 四、仓库管理

仓库管理用于接入和管理外部技能仓库，支持本地和远程仓库。

#### 仓库列表

- 卡片视图展示所有已接入仓库
- 显示仓库名称、类型、同步状态、技能数量
- 支持搜索过滤

#### 添加仓库

点击"添加仓库"按钮，在弹窗中配置：

**基本信息**
- **仓库地址**：输入 Git 仓库 URL（HTTPS/SSH）
- **分支**：选择要使用的分支（默认 main）
- **仓库名称**：自定义显示名称（可从 URL 自动填充）
- **仓库简介**：添加描述信息（可选）

**认证配置** ⭐ 重要

| 认证方式 | 配置项 | 说明 |
|----------|--------|------|
| SSH | SSH Key 文件 | 默认使用 \`~/.ssh/id_rsa\`，可自定义路径 |
| HTTP/HTTPS | 用户名 | Git 用户名（可选） |
| HTTP/HTTPS | Token | 个人访问令牌（必填） |

**SSH Key 配置提示**
- Linux/macOS 默认位置：\`~/.ssh/id_rsa\`
- Windows 默认位置：\`C:\\Users\\<用户名>\\.ssh\\id_rsa\`
- 可选择文件或直接输入路径

**高级选项**
- 自动同步间隔（开发中）
- 同步策略配置（开发中）

#### 仓库详情

点击仓库卡片查看详情：

**仓库信息**
- 名称、描述（点击可编辑）
- 仓库 URL（点击打开外部链接）
- 存储位置（本地克隆路径）
- 分支信息
- 授权方式及凭证
- 上次同步时间

**编辑功能**
- 点击字段即可编辑
- 支持编辑：名称、描述、分支、认证方式、用户名、Token、SSH Key

**同步操作**

**立即同步**
- 拉取仓库最新内容
- 扫描仓库中的技能文件
- 显示同步进度和结果

**同步状态提示**
| 状态 | 说明 |
|------|------|
| 同步中... | 正在拉取仓库并扫描技能 |
| 同步成功 | 显示发现的技能数量 |
| 同步失败 | 显示错误信息和快速修复选项 |

**快速修复**
- 当本地仓库损坏或丢失时出现
- 点击"快速修复"重新克隆仓库
- 自动恢复并同步

**仓库技能管理** ⭐ 核心功能

**技能列表**
- 显示仓库中所有技能
- 技能名称、描述、相对路径
- 搜索过滤技能

**技能操作**
- 查看文档：预览 SKILL.md 内容
- 复制路径：复制技能完整路径
- 打开文件夹：在文件管理器中定位

**批量导入到技能中心**
1. 勾选要导入的技能
2. 点击"导入到技能中心"按钮
3. 显示导入进度
4. 导入成功后自动刷新列表

#### 删除仓库

- 删除仓库配置和本地克隆目录
- 已导入到技能中心的技能不受影响
- 删除操作需确认

---

### 五、标签治理

标签治理模块提供标签的层级管理功能，帮助组织和分类技能。

#### 标签树

**树形结构**
- 可视化展示标签层级
- 支持展开/折叠子标签
- 显示每个标签关联的技能数量

**标签搜索**
- 顶部搜索框实时过滤标签
- 高亮匹配结果

#### 标签操作

**创建标签**
1. 点击"新建"按钮
2. 输入标签名称
3. 选择父标签（可选，创建子标签）
4. 确认创建

**创建子标签**
- 点击标签旁的"创建子标签"图标
- 自动设置父标签

**编辑标签**
- 点击标签右侧编辑图标
- 修改标签名称
- 保存更改

**删除标签**
- 点击标签右侧删除图标
- 查看关联技能数量
- 选择是否同时删除子标签
- 确认删除

**拖拽排序**
- 拖拽标签调整层级关系
- 拖拽到其他标签上设为子标签
- 拖拽到根级别设为顶级标签

#### 标签与技能关联

在技能详情抽屉中可以为技能添加标签：
- 支持多标签选择
- 支持搜索标签
- 标签树形展示，层级清晰
- 显示标签完整路径

---

### 六、设置

设置模块包含四个子页面：

#### 通用设置

**语言**
- 中文（简体）
- English

**主题**
- 明亮模式
- 暗色模式

#### 路径预设

路径预设定义不同工具的技能存储规则，用于项目技能分发时确定目标路径。

**预设字段说明**

| 字段 | 说明 |
|------|------|
| 预设名称 | 工具标识，如 opencode、claude、cursor |
| 项目相对路径 | 项目内技能存储位置，如 \`.opencode/skills\` |
| 全局路径 | 非项目环境下的默认路径 |
| 类型 | 内置（系统预设）/ 自定义（用户创建） |

**操作**
- 新建预设：添加自定义工具配置
- 编辑预设：修改路径配置（点击字段编辑）
- 删除预设：移除自定义预设（内置预设不可删除）
- 打开文件夹：直接打开预设对应目录
- 复制路径：复制预设路径到剪贴板

**Skilled 存储路径**
- 显示 Skiller 数据存储位置
- 支持复制路径、打开文件夹

#### 运行日志

查看系统运行日志，用于问题排查。

**日志统计**
- 各级别日志数量统计
- 实时更新

**日志级别过滤**
- 全部
- 信息（Info）
- 警告（Warning）
- 错误（Error）
- 调试（Debug）

**日志操作**
- 搜索：按关键词过滤日志内容
- 刷新：获取最新日志
- 导出：下载日志文件
- 清空：清除当前显示的日志

**日志查看器**
- 实时滚动显示
- 时间戳、级别、内容
- 不同级别颜色区分

#### 关于

显示 Skiller 版本信息：
- 应用版本
- 技术栈
- 开源协议
- 联系方式

---

## 常见操作指南

### 首次使用流程

1. **导入技能**：从总览页点击"导入技能"，推荐使用"从 NPX 查找"
2. **创建标签**：在标签治理页面创建标签分类体系
3. **关联标签**：为导入的技能添加标签
4. **创建项目**：添加你的开发项目
5. **分发技能**：将技能分发到项目的工具预设中

### 技能管理最佳实践

1. **建立标签体系**：按功能、场景、工具等维度创建标签层级
2. **定期同步仓库**：保持远程仓库技能最新
3. **项目隔离**：不同项目使用独立的技能配置
4. **善用搜索**：快速定位所需技能
5. **使用软链接**：开发中的技能使用软链接分发，方便迭代

---

## 常见问题

### Q: 如何导入第一个技能？

1. 进入"技能中心"页面
2. 点击"添加技能"按钮
3. 选择"从 NPX 查找"（推荐）
4. 输入关键词搜索
5. 选择技能后点击"导入选中项"

### Q: 如何为项目配置技能？

1. 进入"项目管理"页面
2. 创建或选择目标项目
3. 切换到目标工具预设标签
4. 点击"导入"按钮
5. 选择技能、预设和分发模式
6. 确认导入

### Q: 如何刷新仓库？

1. 进入"仓库管理"页面
2. 点击目标仓库卡片
3. 在详情抽屉中点击"立即同步"按钮
4. 等待同步完成

### Q: 仓库同步失败怎么办？

1. 查看错误信息
2. 如果提示"本地仓库损坏"或"文件不存在"
3. 点击"快速修复"按钮重新克隆

### Q: 如何查看技能文档？

1. 在技能中心找到目标技能
2. 点击技能卡片打开详情抽屉
3. 点击"查看文档"按钮
4. 在预览模式下阅读文档

### Q: 技能状态"禁用"是什么意思？

禁用的技能不会被分发到项目中，但仍保留在技能中心。可以在需要时重新启用。

### Q: 项目删除后技能文件会被删除吗？

不会。删除项目配置只移除 Skiller 中的项目记录，不影响项目文件夹中的任何内容。

### Q: 复制分发和软链接分发有什么区别？

| 模式 | 特点 | 适用场景 |
|------|------|----------|
| 复制 | 独立副本，与源技能无关 | 生产环境、稳定版本 |
| 软链接 | 与源技能同步更新 | 开发调试、本地迭代 |

### Q: 如何配置 SSH 访问私有仓库？

1. 确保本机已生成 SSH Key（\`ssh-keygen\`）
2. 将公钥添加到 Git 服务商（GitHub/GitLab 等）
3. 添加仓库时选择 SSH 认证
4. 保持 SSH Key 文件为默认或指定自定义路径

---

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| \`Esc\` | 关闭弹窗、抽屉、预览 |
| \`Tab\` | 在表单元素间切换焦点 |
| \`Enter\` | 确认对话框操作、提交表单 |

---

## 技术支持

如遇问题，请通过以下方式获取帮助：

1. **查看运行日志**：设置 > 运行日志，查看错误信息
2. **提交 Issue**：在开源仓库提交问题反馈

---

**版本**：v0.1.0 (Beta)  
**技术栈**：Tauri + React + TypeScript + Tailwind CSS  
**开源地址**：[https://github.com/AFunc-OPC/Skiller](https://github.com/AFunc-OPC/Skiller)
`

export const USER_GUIDE_CONTENT_EN = `# Skiller User Guide

Welcome to **Skiller** — a cross-platform Skill management tool that helps you efficiently organize, preview, and manage skill files.

---

## Interface Overview

Skiller features a modern single-window layout with a navigation sidebar on the left and a workspace on the right. The sidebar can be collapsed/expanded for easy navigation between functional modules.

### Navigation Modules

| Module | Description |
|--------|-------------|
| Overview | System dashboard showing key statistics and quick actions |
| Skill Center | Centralized skill management, preview, import, and distribution |
| Projects | Project and skill association configuration |
| Repos | External skill repository connection and synchronization |
| Tag Governance | Hierarchical tag management and skill categorization |
| Settings | Language, theme, path presets, and log viewing |

---

## Feature Details

### 1. Overview Page

The Overview page is Skiller's home dashboard, providing a global view and quick actions.

#### Statistics Cards

Four key metric cards at the top, clickable to navigate to corresponding modules:

| Card | Content | Status Indicator |
|------|---------|------------------|
| Skills | Total managed skills | Shows available/disabled count, green when skills available |
| Projects | Created projects count | Warning color when no projects |
| Tags | Total tags count | Shows untagged skills, green when all categorized |
| Repos | Synced/total repos | Warning color when repos need sync |

#### Quick Actions

Four shortcut action buttons at the bottom:

1. **Import Skill** - Hover to expand import menu:
   - From File: Select local \`SKILL.md\` file
   - NPX Find: Search and install skills online
   - NPX Install: Execute npx command directly
   - From Repository: Batch import from connected repos

2. **New Project** - Quickly create new project configuration

3. **Add Repository** - Connect a new skill repository

4. **Manage Tags** - Navigate to tag governance page

---

### 2. Skill Center

The Skill Center is Skiller's core functional module, providing full lifecycle management of skills.

#### Interface Layout

The Skill Center uses a three-column layout:
- **Left**: Tag tree navigation with search and hierarchical browsing
- **Right**: Skill list/grid display area
- **Drawer**: Skill detail panel

#### Search & Filter

**Search Function**
- Top search box supports fuzzy search by skill name, description, tags
- Real-time filtering, results display as you type

**Tag Filtering**
- Click any tag in the left tag tree to filter skills
- Breadcrumb shows current filter position
- Click "All Skills" to return to full list

**Sort Options**
- Sort by name (A-Z / Z-A)
- Sort by update time
- Sort by creation time

#### View Toggle

| View | Features |
|------|----------|
| Card View | Grid layout showing skill icon, name, description, tags, status |
| List View | Compact list, suitable for browsing many skills quickly |

#### Skill Card/List Item

Each skill displays:
- **Icon**: Skill identifier icon
- **Name**: Skill name
- **Description**: Brief description
- **Tags**: Associated tag list
- **Status**: Available (green) / Disabled (gray)
- **Source**: Local / NPX / Repository

#### Skill Detail Drawer

Click a skill card to open the right detail drawer containing:

**Basic Information**
- Skill name, description
- Source info (file import/NPX install/repository import)
- Associated repository (if any, clickable to navigate)
- Creation time, update time

**Status Toggle**
- Click status button to toggle "Available"/"Disabled"
- Disabled skills won't be distributed to projects

**View Document**
- Click "View Document" button to open SKILL.md preview
- Supports source code and rendered mode switching
- Full-screen reading experience

**Tag Management**
- Display all associated tags with full path
- Click "Select tags" to open tag selector
- Tag selector supports:
  - Tree structure display of tag hierarchy
  - Search box for quick tag filtering
  - Click to select/deselect tags
  - Show selected status
- Click × next to tag to remove individual tag

**Storage Location**
- Display skill file full path
- Copy path to clipboard
- Open in file manager

**Skill Distribution** ⭐ Core Feature

The skill distribution feature deploys skills to different target environments:

**Distribution Target**
| Target | Description |
|--------|-------------|
| Global Skill Library | Deploy to system-wide directory, reusable across projects |
| Project Skill Directory | Deploy to specified project, suitable for team collaboration and project isolation |

**Distribution Configuration**
- **Target Project** (when "Project" selected): Dropdown to select target project, supports search, multi-select
- **Tool Directory**: Select target tool preset (e.g., opencode, claude, cursor), supports search, multi-select

**Distribution Mode**
| Mode | Description |
|------|-------------|
| Copy | Create independent copy, target directory can be maintained separately |
| Symlink | Keep synchronized with source skill, suitable for local iteration |

**Target Path Preview**
- Real-time display of target path after distribution
- Path is automatically calculated based on selected distribution target, project, and tool preset

**Execute Distribution**
- Click "Distribute" button to execute
- Supports batch distribution to multiple presets/projects
- Shows distribution success/failure status

#### Import Skills

Click "Add Skill" button and choose import method:

**1. From File**
- Click to select file or drag and drop
- Supports \`SKILL.md\` or folder containing it
- System automatically parses file content and creates skill record

**2. NPX Find** ⭐ Recommended

Powerful online skill search and installation feature:

**Search Mode Switch**
| Mode | Description |
|------|-------------|
| skills.sh API Search | Search via online catalog, fast |
| npx skills find Search | Search via local command, real-time logs |

**Search Results**
- Skill name, description (search keyword highlighted)
- Author, repository info
- Install count statistics
- External link (click to open details page)
- Install command (one-click copy)

**Batch Operations**
- Select all/deselect all
- Multi-select skills for batch import
- Real-time execution logs
- Import success/failure count

**3. NPX Install**
- Directly input npx install command
- Supports custom install parameters
- Auto-syncs to Skill Center after installation
- Shows installation progress and logs

**4. From Repository**
- Select from connected repositories
- Browse skill list in repository
- Batch select and import

---

### 3. Project Management

The Project Management module helps you configure skill presets for different projects, linking projects with skills.

#### Project List

**View Modes**
- Card View: Shows project icon, name, description, path
- List View: Compact display of project information

**Search Function**
- Supports searching by project name, path
- Real-time filtering of matching results

**Sort Options**
- Sort by name, creation time, update time

#### Create Project

1. Click "New" button
2. Select project folder (supports drag & drop)
3. Enter project name (auto-filled from folder name)
4. Add project description (optional)
5. Click "Create" to finish

> Projects are automatically configured with default skill path \`.skills\`

#### Project Details

Click project card to open detail drawer:

**Project Information**
- **Icon**: Supports customization, drag or click to upload image (PNG/JPG/GIF/SVG/WebP, ≤10MB)
- **Name**: Click to edit
- **Description**: Click to edit (supports long text)
- **Path**: Shows full path, supports copy and open folder
- **Created/Updated time**

**Project Skill Management** ⭐ Core Feature

**Tool Preset Tabs**
- Top tab bar shows all tool presets
- Switch tabs to view skill configuration under different tools
- Each tab shows skill count

**Skill List**
- Card/list view toggle
- Search skills (by name, path)
- Shows skill name, description, path, status

**Batch Operations**
- Select all/deselect all
- Batch toggle status (enable/disable)
- Batch remove skills

**Individual Skill Operations**
- Toggle enable/disable status
- Remove skill (requires confirmation)

**Import Skills to Project**
1. Click "Import" button
2. Skill selection dialog appears
3. Search or browse Skill Center
4. Multi-select skills to import
5. Select target tool presets (can multi-select)
6. Choose distribution mode (copy/symlink)
7. Optional: Force overwrite existing skills
8. Confirm import

#### Project Actions

| Action | Description |
|--------|-------------|
| Edit | Modify project name, description, icon |
| Delete | Remove project configuration (doesn't affect actual files) |
| Open Folder | Open project directory in system file manager |
| Copy Path | Copy full project path to clipboard |

---

### 4. Repository Management

Repository Management connects and manages external skill repositories, supporting both local and remote repositories.

#### Repository List

- Card view showing all connected repositories
- Displays repository name, type, sync status, skill count
- Supports search filtering

#### Add Repository

Click "Add Repository" button and configure in the popup:

**Basic Information**
- **Repository URL**: Enter Git repository URL (HTTPS/SSH)
- **Branch**: Select branch to use (default: main)
- **Repository Name**: Custom display name (auto-filled from URL)
- **Description**: Add description (optional)

**Authentication Configuration** ⭐ Important

| Auth Method | Configuration | Description |
|-------------|---------------|-------------|
| SSH | SSH Key File | Default \`~/.ssh/id_rsa\`, can customize path |
| HTTP/HTTPS | Username | Git username (optional) |
| HTTP/HTTPS | Token | Personal access token (required) |

**SSH Key Configuration Tips**
- Linux/macOS default: \`~/.ssh/id_rsa\`
- Windows default: \`C:\\Users\\<username>\\.ssh\\id_rsa\`
- Can select file or enter path directly

**Advanced Options**
- Auto sync interval (coming soon)
- Sync strategy configuration (coming soon)

#### Repository Details

Click repository card to view details:

**Repository Information**
- Name, description (click to edit)
- Repository URL (click to open external link)
- Storage location (local clone path)
- Branch info
- Auth method and credentials
- Last sync time

**Edit Functions**
- Click field to edit
- Supports editing: name, description, branch, auth method, username, token, SSH key

**Sync Operations**

**Sync Now**
- Pull latest repository content
- Scan skill files in repository
- Display sync progress and results

**Sync Status Indicators**
| Status | Description |
|--------|-------------|
| Syncing... | Pulling repository and scanning skills |
| Sync Complete | Shows number of skills found |
| Sync Failed | Shows error info and quick fix option |

**Quick Fix**
- Appears when local repository is corrupted or missing
- Click "Quick Fix" to re-clone repository
- Automatically recovers and syncs

**Repository Skill Management** ⭐ Core Feature

**Skill List**
- Shows all skills in repository
- Skill name, description, relative path
- Search and filter skills

**Skill Operations**
- View Document: Preview SKILL.md content
- Copy Path: Copy skill full path
- Open Folder: Locate in file manager

**Batch Import to Skill Center**
1. Check skills to import
2. Click "Import to Skill Center" button
3. Shows import progress
4. Auto-refresh list after successful import

#### Delete Repository

- Deletes repository configuration and local clone directory
- Skills already imported to Skill Center are unaffected
- Deletion requires confirmation

---

### 5. Tag Governance

The Tag Governance module provides hierarchical tag management for organizing and categorizing skills.

#### Tag Tree

**Tree Structure**
- Visual display of tag hierarchy
- Supports expand/collapse child tags
- Shows skill count for each tag

**Tag Search**
- Top search box for real-time tag filtering
- Highlights matching results

#### Tag Actions

**Create Tag**
1. Click "New" button
2. Enter tag name
3. Select parent tag (optional, creates child tag)
4. Confirm creation

**Create Child Tag**
- Click "Create child tag" icon next to tag
- Parent tag is automatically set

**Edit Tag**
- Click edit icon on tag right side
- Modify tag name
- Save changes

**Delete Tag**
- Click delete icon on tag right side
- View associated skill count
- Choose whether to delete child tags
- Confirm deletion

**Drag & Drop Sorting**
- Drag tag to adjust hierarchy
- Drop on another tag to make it a child
- Drop at root level to make it a top-level tag

#### Tag and Skill Association

Add tags to skills in the skill detail drawer:
- Supports multiple tag selection
- Supports tag search
- Tree display of tags with clear hierarchy
- Shows full tag path

---

### 6. Settings

The Settings module contains four sub-pages:

#### General Settings

**Language**
- 中文（简体）
- English

**Theme**
- Light Mode
- Dark Mode

#### Path Presets

Path presets define skill storage rules for different tools, determining target paths during project skill distribution.

**Preset Field Descriptions**

| Field | Description |
|-------|-------------|
| Preset Name | Tool identifier, e.g., opencode, claude, cursor |
| Project Relative Path | Skill storage location within project, e.g., \`.opencode/skills\` |
| Global Path | Default path for non-project environments |
| Type | Built-in (system preset) / Custom (user created) |

**Actions**
- New Preset: Add custom tool configuration
- Edit Preset: Modify path configuration (click field to edit)
- Delete Preset: Remove custom presets (built-in presets cannot be deleted)
- Open Folder: Directly open preset's corresponding directory
- Copy Path: Copy preset path to clipboard

**Skilled Storage Path**
- Shows Skiller data storage location
- Supports copy path, open folder

#### Runtime Logs

View system runtime logs for troubleshooting.

**Log Statistics**
- Count of logs at each level
- Real-time updates

**Log Level Filtering**
- All
- Info
- Warning
- Error
- Debug

**Log Actions**
- Search: Filter log content by keyword
- Refresh: Get latest logs
- Export: Download log file
- Clear: Clear currently displayed logs

**Log Viewer**
- Real-time scrolling display
- Timestamp, level, content
- Color coding by level

#### About

Shows Skiller version information:
- Application version
- Tech stack
- Open source license
- Contact information

---

## Common Operation Guide

### First-Time Usage Flow

1. **Import Skills**: Click "Import Skill" from Overview page, recommended: "NPX Find"
2. **Create Tags**: Create tag classification system in Tag Governance page
3. **Associate Tags**: Add tags to imported skills
4. **Create Project**: Add your development projects
5. **Distribute Skills**: Distribute skills to project's tool presets

### Skill Management Best Practices

1. **Build Tag System**: Create tag hierarchy by function, scenario, tool dimensions
2. **Regular Repo Sync**: Keep remote repository skills up to date
3. **Project Isolation**: Use independent skill configurations for different projects
4. **Use Search**: Quickly locate needed skills
5. **Use Symlinks**: For skills in development, use symlink distribution for easy iteration

---

## FAQ

### Q: How to import my first skill?

1. Go to "Skill Center" page
2. Click "Add Skill" button
3. Choose "NPX Find" (recommended)
4. Enter keyword to search
5. Select skills and click "Import Selected"

### Q: How to configure skills for a project?

1. Go to "Projects" page
2. Create or select target project
3. Switch to target tool preset tab
4. Click "Import" button
5. Select skills, presets, and distribution mode
6. Confirm import

### Q: How to refresh a repository?

1. Go to "Repos" page
2. Click target repository card
3. Click "Sync Now" button in detail drawer
4. Wait for sync to complete

### Q: What to do if repository sync fails?

1. Check error message
2. If it shows "local repository corrupted" or "file not found"
3. Click "Quick Fix" button to re-clone

### Q: How to view skill documentation?

1. Find target skill in Skill Center
2. Click skill card to open detail drawer
3. Click "View Document" button
4. Read documentation in preview mode

### Q: What does "Disabled" skill status mean?

Disabled skills won't be distributed to projects but remain in Skill Center. Can be re-enabled when needed.

### Q: Will skill files be deleted when project is deleted?

No. Deleting project configuration only removes the project record in Skiller, it doesn't affect any content in the project folder.

### Q: What's the difference between Copy and Symlink distribution?

| Mode | Feature | Use Case |
|------|---------|----------|
| Copy | Independent copy, unrelated to source | Production, stable versions |
| Symlink | Synced with source skill | Development, local iteration |

### Q: How to configure SSH access to private repository?

1. Ensure SSH Key is generated (\`ssh-keygen\`)
2. Add public key to Git provider (GitHub/GitLab, etc.)
3. Select SSH authentication when adding repository
4. Keep SSH Key file as default or specify custom path

---

## Keyboard Shortcuts

| Shortcut | Function |
|----------|----------|
| \`Esc\` | Close popups, drawers, previews |
| \`Tab\` | Switch focus between form elements |
| \`Enter\` | Confirm dialog action, submit form |

---

## Technical Support

If you encounter issues, please get help through:

1. **Check Runtime Logs**: Settings > Runtime Logs, view error information
2. **Submit Issue**: Submit problem feedback in open source repository

---

**Version**: v0.1.0 (Beta)  
**Tech Stack**: Tauri + React + TypeScript + Tailwind CSS  
**Open Source**: [https://github.com/AFunc-OPC/Skiller](https://github.com/AFunc-OPC/Skiller)
`
