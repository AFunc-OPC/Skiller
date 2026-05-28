# Skiller Technology Stack Blueprint

> 版本: 0.1.9 | 许可证: MIT | 平台: macOS / Windows / Linux

---

## 1. 项目概览

Skiller 是一个基于 **Tauri v2** 的跨平台桌面应用，采用 **Rust 后端 + React 前端** 架构。前端通过 Tauri IPC（`invoke`）与后端通信，后端使用 SQLite 做持久化，整体为单窗口本地优先（local-first）应用。

---

## 2. 技术栈总览

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 桌面框架 | Tauri | 2.0 | 跨平台桌面壳 + IPC |
| 后端语言 | Rust | Edition 2021 | 核心逻辑、数据层 |
| 前端框架 | React | ^18.3 | UI 渲染 |
| 前端语言 | TypeScript | ^5.3 | 类型安全 |
| 构建（前端） | Vite | ^5.1 | 开发服务器 + 打包 |
| 样式 | Tailwind CSS | ^3.4 | 原子化 CSS |
| 状态管理 | Zustand | ^4.5 | 全局 Store |
| 数据库 | SQLite (rusqlite) | 0.31 | 本地持久化 |
| 测试（前端） | Vitest + Testing Library | ^4.1 | 单元/组件测试 |
| 测试（后端） | Rust 内置 test + rusqlite 内存库 | — | 集成测试 |

---

## 3. 前端技术栈详情

### 3.1 核心依赖

| 包名 | 版本 | 分类 | 用途 |
|------|------|------|------|
| `react` / `react-dom` | ^18.3 | 框架 | UI 渲染 |
| `zustand` | ^4.5 | 状态管理 | 全局 Store |
| `@tauri-apps/api` | ^2.10 | 桥接 | Tauri IPC invoke |
| `@tauri-apps/plugin-dialog` | ^2.7 | 桥接 | 原生文件对话框 |
| `@tauri-apps/plugin-opener` | ^2.5 | 桥接 | 打开外部 URL |
| `lucide-react` | ^0.344 | 图标 | SVG 图标库 |
| `fuse.js` | ^7.3 | 搜索 | 模糊搜索 |
| `react-markdown` / `remark-gfm` | ^10.1 / ^4.0 | 渲染 | Markdown 渲染 |
| `react-window` | ^1.8 | 虚拟化 | 长列表性能优化 |
| `@dnd-kit/core` / `sortable` / `utilities` | ^6.3 / ^10 / ^3.2 | 交互 | 拖拽排序 |

### 3.2 开发依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| `vite` | ^5.1 | 构建工具 |
| `@vitejs/plugin-react` | ^4.2 | Vite React 插件 |
| `typescript` | ^5.3 | 类型检查 |
| `tailwindcss` / `autoprefixer` / `postcss` | ^3.4 / ^10.4 / ^8.4 | 样式管线 |
| `vitest` | ^4.1 | 测试框架 |
| `@testing-library/react` | ^16.3 | 组件测试 |
| `@testing-library/jest-dom` | ^6.9 | DOM 断言 |
| `@testing-library/user-event` | ^14.6 | 用户交互模拟 |
| `jsdom` | ^29.0 | 测试 DOM 环境 |

### 3.3 TypeScript 配置

- **Target**: ES2020
- **Module**: ESNext (ESM)
- **JSX**: react-jsx（自动 JSX 转换）
- **Module Resolution**: bundler
- **Strict Mode**: 开启
- **Path Alias**: `@/*` → `src/*`
- **noEmit**: true（仅类型检查，由 Vite 负责编译）

### 3.4 Vite 配置要点

- 开发端口: 5173（strictPort）
- 环境变量前缀: `VITE_`, `TAURI_`
- 构建目标: Windows → chrome105，其他 → safari13
- 生产压缩: esbuild（非 debug 模式）
- Source Map: 仅 debug 模式

---

## 4. 后端技术栈详情

### 4.1 Rust 核心依赖

| 包名 | 版本 | 分类 | 用途 |
|------|------|------|------|
| `tauri` | 2.0 | 框架 | 桌面应用框架 |
| `tauri-plugin-shell` | 2.0 | 插件 | Shell 命令执行 |
| `tauri-plugin-dialog` | 2.0 | 插件 | 原生对话框 |
| `tauri-plugin-opener` | 2.0 | 插件 | 打开外部链接/文件 |
| `rusqlite` | 0.31 (bundled) | 数据库 | SQLite 绑定 |
| `serde` / `serde_json` | 1.0 | 序列化 | JSON 序列化/反序列化 |
| `tokio` | 1.0 (rt) | 异步 | 异步运行时 |
| `uuid` | 1.7 (v4) | ID 生成 | UUID 生成 |
| `chrono` | 0.4 (serde) | 时间 | 时间戳处理 |
| `thiserror` | 1.0 | 错误处理 | 派生 Error 枚举 |
| `anyhow` | 1.0 | 错误处理 | 通用错误 |
| `git2` | 0.18 (vendored-openssl) | Git | Git 操作 |
| `reqwest` | 0.11 (json) | HTTP | HTTP 客户端 |
| `regex` | 1.10 | 正则 | 正则匹配 |
| `zip` | 0.6 | 压缩 | ZIP 文件处理 |
| `aes-gcm` | 0.10 | 加密 | AES-GCM 加密 |
| `base64` | 0.21 | 编码 | Base64 编解码 |
| `dirs` / `directories` | 5.0 | 系统 | 系统目录路径 |
| `fs_extra` | 1.3 | 文件 | 文件操作增强 |
| `urlencoding` | 2.1 | 编码 | URL 编解码 |

### 4.2 Workspace 结构

```toml
[workspace]
members = ["src-tauri"]
resolver = "2"
```

单一 crate workspace，所有后端代码在 `src-tauri` 中。

### 4.3 Features

- `default = ["custom-protocol"]` — 生产构建使用自定义协议
- `custom-protocol` — 启用 Tauri 自定义协议

---

## 5. 项目骨架

```
Skiller/
├── src/                          # 前端源码
│   ├── api/                      # Tauri IPC 调用封装
│   │   ├── tauri.ts              # invoke 封装 + 环境检测
│   │   ├── skill.ts              # Skill API
│   │   ├── tag.ts                # Tag API
│   │   ├── repo.ts               # Repo API
│   │   ├── project.ts            # Project API
│   │   ├── config.ts             # Config API
│   │   ├── distribution.ts       # Distribution API
│   │   ├── clawhub.ts            # ClawHub API
│   │   ├── desktop.ts            # Desktop API
│   │   └── log.ts                # Log API
│   ├── components/               # UI 组件
│   │   ├── SkillCenter/          # 技能中心
│   │   ├── RepositoryManagement/ # 仓库管理
│   │   ├── ProjectSkill/         # 项目技能
│   │   ├── TagTree/              # 标签树
│   │   ├── ClawHub/              # ClawHub
│   │   ├── Settings/             # 设置
│   │   ├── UserGuide/            # 使用指南
│   │   ├── shared/               # 共享组件
│   │   ├── AlertDialog.tsx       # 通用弹窗
│   │   └── NotificationToast.tsx # 通知组件
│   ├── contexts/                 # React Context
│   │   └── SkillContext.tsx      # Skill 领域 Context
│   ├── hooks/                    # 自定义 Hooks
│   │   ├── useDebounce.ts        # 防抖
│   │   └── useSort.ts            # 排序
│   ├── stores/                   # Zustand Store
│   │   ├── appStore.ts           # 应用全局状态
│   │   ├── skillStore.ts         # 技能状态
│   │   ├── fileSkillStore.ts     # 文件技能状态
│   │   ├── projectStore.ts       # 项目状态
│   │   ├── repoStore.ts          # 仓库状态
│   │   ├── tagTreeStore.ts       # 标签树状态
│   │   ├── clawhubStore.ts       # ClawHub 状态
│   │   └── logStore.ts           # 日志状态
│   ├── pages/                    # 页面级组件
│   │   ├── OverviewPage.tsx
│   │   ├── ProjectsPage.tsx
│   │   └── TagGovernancePage.tsx
│   ├── types/                    # TypeScript 类型定义
│   │   ├── index.ts              # 核心类型
│   │   ├── skill.ts
│   │   ├── project.ts
│   │   ├── tag.ts
│   │   ├── sort.ts
│   │   └── tauri.d.ts
│   ├── utils/                    # 工具函数
│   ├── i18n/                     # 国际化
│   │   ├── index.ts              # 翻译函数 + 语言选择
│   │   └── zh.ts                 # 中英文翻译表
│   ├── data/                     # 静态数据
│   ├── test/                     # 测试配置
│   │   └── setup.ts              # Vitest setup
│   ├── App.tsx                   # 应用入口
│   ├── main.tsx                  # React 挂载
│   └── index.css                 # 全局样式 + Tailwind
│
├── src-tauri/                    # Rust 后端源码
│   ├── src/
│   │   ├── commands/             # Tauri 命令层（IPC Handler）
│   │   │   ├── mod.rs
│   │   │   ├── skill.rs
│   │   │   ├── skill_file.rs
│   │   │   ├── tag.rs
│   │   │   ├── project.rs
│   │   │   ├── project_skill.rs
│   │   │   ├── repo.rs
│   │   │   ├── config.rs
│   │   │   ├── clawhub.rs
│   │   │   ├── desktop.rs
│   │   │   └── log.rs
│   │   ├── services/             # 业务逻辑层
│   │   │   ├── mod.rs
│   │   │   ├── skill_service.rs
│   │   │   ├── skill_file_service.rs
│   │   │   ├── tag_service.rs
│   │   │   ├── tag_binding_service.rs
│   │   │   ├── project_service.rs
│   │   │   ├── repo_service.rs
│   │   │   ├── distribution_service.rs
│   │   │   ├── config_service.rs
│   │   │   ├── clawhub_service.rs
│   │   │   ├── proxy_service.rs
│   │   │   └── log_service.rs
│   │   ├── models/               # 数据模型层
│   │   │   ├── mod.rs
│   │   │   ├── skill.rs
│   │   │   ├── tag.rs
│   │   │   ├── project.rs
│   │   │   ├── repo.rs
│   │   │   ├── config.rs
│   │   │   ├── conflict.rs
│   │   │   ├── distribution.rs
│   │   │   ├── log.rs
│   │   │   ├── clawhub.rs
│   │   │   └── npx_import.rs
│   │   ├── db/                   # 数据库层
│   │   │   ├── mod.rs
│   │   │   ├── connection.rs     # 连接管理 + 初始化
│   │   │   ├── schema.rs         # 建表语句
│   │   │   └── migrations/       # 版本迁移（v1-v14 + rollback）
│   │   ├── utils/                # 工具模块
│   │   │   ├── mod.rs
│   │   │   ├── crypto.rs         # 加密
│   │   │   ├── fs.rs             # 文件系统
│   │   │   ├── git.rs            # Git 操作
│   │   │   ├── markdown.rs       # Markdown 处理
│   │   │   ├── shell.rs          # Shell 执行
│   │   │   └── symlink.rs        # 符号链接
│   │   ├── error.rs              # 统一错误类型
│   │   ├── lib.rs                # 库入口（模块声明）
│   │   ├── main.rs               # 应用入口（Tauri Builder）
│   │   └── test_utils.rs         # 测试工具
│   ├── capabilities/             # Tauri 权限配置
│   ├── examples/                 # 示例
│   ├── tests/                    # 集成测试
│   └── tauri.conf.json           # Tauri 配置
│
├── tests/                        # 前端测试 fixtures
│   └── fixtures/
├── public/                       # 静态资源
├── docs/                         # 文档
├── index.html                    # SPA 入口
├── vite.config.ts                # Vite 配置
├── vitest.config.ts              # Vitest 配置
├── tailwind.config.js            # Tailwind 配置
├── postcss.config.js             # PostCSS 配置
├── tsconfig.json                 # TypeScript 配置
└── Cargo.toml                    # Workspace 根配置
```

---

## 6. 架构模式

### 6.1 整体架构: Tauri IPC 分层

```
┌──────────────────────────────────────────────┐
│                  React UI                     │
│  Components → Context/Stores → API Layer      │
└─────────────────┬────────────────────────────┘
                  │ invoke(command, args)
                  ▼
┌──────────────────────────────────────────────┐
│              Tauri IPC Bridge                 │
└─────────────────┬────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────┐
│              Rust Backend                     │
│  Commands → Services → DB (SQLite)            │
│            ↘ Utils (crypto, fs, git, ...)     │
└──────────────────────────────────────────────┘
```

### 6.2 前端分层

| 层级 | 目录 | 职责 |
|------|------|------|
| **UI 层** | `components/`, `pages/` | 渲染、用户交互 |
| **状态层** | `stores/` (Zustand) | 全局状态管理 |
| **上下文层** | `contexts/` (React Context) | 领域逻辑聚合（如 SkillContext） |
| **API 层** | `api/` | Tauri invoke 封装 |
| **类型层** | `types/` | 前后端共享类型契约 |

**前端数据流**: Component → Store/API → `invoke()` → Rust Command → Service → DB

### 6.3 后端分层

| 层级 | 目录 | 职责 |
|------|------|------|
| **命令层** | `commands/` | `#[tauri::command]` 函数，参数校验 + 调用 Service |
| **服务层** | `services/` | 业务逻辑，事务编排 |
| **模型层** | `models/` | 数据结构定义（Serialize/Deserialize） |
| **数据层** | `db/` | SQLite 连接、Schema、迁移 |
| **工具层** | `utils/` | 通用工具（加密、文件、Git、Shell、符号链接） |
| **错误层** | `error.rs` | 统一 `SkillerError` 枚举 + `ApiError` 序列化 |

**后端调用链**: Command → Service → DB (rusqlite) / Utils

### 6.4 数据库架构

- **引擎**: SQLite (WAL 模式)
- **连接管理**: `Mutex<Connection>`（通过 Tauri State 管理）
- **Schema**: 手写 SQL（`db/schema.rs`）
- **迁移**: 版本化迁移文件 `db/migrations/v1.rs` ~ `v14.rs`，含回滚支持
- **测试库**: 内存 SQLite（`create_test_connection`）

### 6.5 状态管理

- **Zustand Store**: 每个领域一个独立 Store
- **React Context**: `SkillContext` 聚合复杂领域逻辑（搜索、排序、筛选、导入流程等）
- **本地持久化**: 部分用户偏好存入 `localStorage`（视图模式、排序选项）

### 6.6 国际化

- 自研轻量 i18n 方案（非 i18next）
- 中/英双语，翻译表在 `i18n/zh.ts`
- 通过 `t(key, lang)` 函数调用

---

## 7. 代码规范

### 7.1 前端规范

| 规范 | 约定 |
|------|------|
| 组件风格 | 函数组件 + Hooks |
| 组件命名 | PascalCase（`SkillCenter.tsx`） |
| Store 命名 | camelCase + `Store` 后缀（`skillStore.ts`） |
| API 模块 | camelCase（`skill.ts`），导出对象 `skillApi` |
| 类型命名 | PascalCase interface（`Skill`, `CreateSkillRequest`） |
| CSS 方法 | Tailwind CSS 原子类 + 自定义 CSS（`index.css`） |
| 暗色模式 | Tailwind `darkMode: 'class'`，通过 `data-theme` 切换 |
| 路径别名 | `@/` → `src/` |
| ESM | `"type": "module"` |
| 注释语言 | 中文为主 |

### 7.2 后端规范

| 规范 | 约定 |
|------|------|
| 文件命名 | snake_case（`skill_service.rs`） |
| 模块命名 | snake_case（`pub mod skill_service`） |
| 结构体命名 | PascalCase（`Skill`, `CreateSkillRequest`） |
| 枚举命名 | PascalCase（`SkillerError`, `SourceMetadata`） |
| 函数命名 | snake_case（`get_skills`, `create_skill`） |
| 命令装饰器 | `#[tauri::command]` |
| 错误处理 | `thiserror` 派生枚举 + `anyhow` 通用错误 |
| 错误序列化 | `SkillerError` → `ApiError`（code + message） |
| 命令层错误转换 | `.map_err(\|e\| e.to_string())`（Tauri 要求返回 `Result<T, String>`） |
| 数据库参数 | `rusqlite::params![]` 宏 |
| 序列化 | `#[derive(Serialize, Deserialize)]` |
| 枚举序列化 | `#[serde(tag = "type")]` + `#[serde(rename = "...")]` |

### 7.3 编辑器/格式化

| 工具 | 配置 |
|------|------|
| Prettier | JS/TS/JSON/CSS/MD: 2 空格, LF, UTF-8 |
| EditorConfig | Rust: 4 空格 |
| ESLint | 配置文件 `.eslintrc.json` |
| Tailwind | darkMode: class |

---

## 8. 构建与部署

### 8.1 NPM Scripts

| 命令 | 用途 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | TypeScript 编译 + Vite 构建 |
| `npm run test` | 运行 Vitest 测试 |
| `npm run tauri:dev` | 启动 Tauri 开发模式 |
| `npm run tauri:build` | 构建生产包 |
| `npm run tauri:build:mac` | macOS Universal 构建 |
| `npm run tauri:build:mac-arm` | macOS ARM 构建 |
| `npm run tauri:build:mac-x64` | macOS x64 构建 |
| `npm run tauri:build:win` | Windows 构建 |
| `npm run tauri:build:linux` | Linux 构建 |

### 8.2 Tauri 应用配置

| 配置项 | 值 |
|--------|-----|
| 产品名 | Skiller |
| 标识符 | `com.skiller.desktop` |
| 默认窗口 | 1280×800（最小 1024×600） |
| CSP | 关闭（null） |
| 打包目标 | deb, rpm, dmg, app, msi, nsis |
| macOS 最低版本 | 10.13 |
| 自定义协议 | 启用（custom-protocol feature） |

---

## 9. 测试架构

### 9.1 前端测试

- **框架**: Vitest + jsdom
- **组件测试**: @testing-library/react + user-event
- **DOM 断言**: @testing-library/jest-dom/vitest
- **Setup**: `src/test/setup.ts`（自动 cleanup + matchMedia mock）
- **Store 测试**: `stores/*.test.ts`（如 `repositoryStore.test.ts`）
- **页面测试**: `pages/*.test.tsx`（如 `ProjectsPage.test.tsx`）
- **类型测试**: `types/__tests__/`

### 9.2 后端测试

- **单元测试**: Rust `#[test]`，内联在各模块
- **集成测试**: `src-tauri/tests/` 目录
- **测试数据库**: 内存 SQLite（`create_test_connection`）
- **示例**: `examples/tag_tree_test.rs`
- **测试工具**: `test_utils.rs`

---

## 10. Tauri IPC 通信模式

### 10.1 前端调用模式

```typescript
// api/tauri.ts — 统一 invoke 封装
export async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>

// api/skill.ts — 领域 API 对象
export const skillApi = {
  list: async (tagIds?: string[]) => invoke<Skill[]>('get_skills', { tagIds }),
  create: async (request) => invoke<Skill>('create_skill', { request }),
}
```

### 10.2 后端命令模式

```rust
// commands/skill.rs
#[tauri::command]
pub fn get_skills(db: State<'_, DbConnection>, tag_ids: Option<Vec<String>>) -> Result<Vec<Skill>, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    skill_service::get_skills(&conn, tag_ids).map_err(|e| e.to_string())
}
```

**模式**: Command 接收 `State<DbConnection>` → 获取连接 → 委托 Service → 错误转 String

### 10.3 环境检测

```typescript
export function isTauriEnvironment() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}
```

前端支持非 Tauri 环境降级（开发预览模式）。

---

## 11. 关键设计决策

| 决策 | 原因 |
|------|------|
| Tauri v2 而非 Electron | 更小的包体积、Rust 性能、更安全 |
| SQLite 而非 IndexedDB | 后端统一数据管理、SQL 查询能力、迁移可控 |
| Zustand 而非 Redux | 轻量、简洁、无模板代码 |
| Mutex\<Connection\> 单连接 | SQLite 单写限制、简化事务管理 |
| WAL 模式 | 读写并发优化 |
| 手写 SQL 而非 ORM | SQLite 场景下更灵活、避免 ORM 开销 |
| 自研 i18n 而非 i18next | 仅需中英双语、减少依赖 |
| 版本化迁移 | 数据库 Schema 演进可追溯、支持回滚 |
| React Context + Zustand 混合 | Context 聚合复杂领域逻辑、Store 管理简单状态 |

---

## 12. 实现模式详解

### 12.1 后端 Command 标准实现

所有 Tauri Command 遵循统一的三步模式：获取连接 → 委托 Service → 错误转换。

**同步 Command**（大多数场景）：

```rust
#[tauri::command]
pub fn get_skills(
    db: State<'_, DbConnection>,       // 注入 DB 连接
    tag_ids: Option<Vec<String>>,       // 业务参数
) -> Result<Vec<Skill>, String> {       // Tauri 要求 Err 为 String
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    skill_service::get_skills(&conn, tag_ids).map_err(|e| e.to_string())
}
```

**异步 Command**（需要 `AppHandle` 或阻塞操作）：

```rust
#[tauri::command]
pub async fn clawhub_test_connection(app: AppHandle, source_id: String) -> Result<ConnectionTestResult, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?.to_string_lossy().to_string();
    tauri::async_runtime::spawn_blocking(move || {
        let conn = init_database(&app_data_dir).map_err(|e| e.to_string())?;
        clawhub_service::test_connection(&conn, &source_id).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}
```

**带日志的 Command**（复杂操作）：

```rust
fn log_action(app: &tauri::AppHandle, level: &str, source: &str, message: &str) {
    if let Some(log_service) = app.try_state::<LogService>() {
        log_service.log(Some(app), level, source, message, None);
    }
}
```

### 12.2 后端 Service 标准实现

Service 层是纯函数集合，接收 `&Connection`，不持有状态：

```rust
pub fn get_skills(conn: &Connection, tag_ids: Option<Vec<String>>) -> Result<Vec<Skill>, SkillerError> {
    let mut skills = Vec::new();
    let sql = match &tag_ids {
        Some(tags) if !tags.is_empty() => { /* 动态 SQL 拼接 */ }
        _ => "SELECT ... FROM skills".to_string(),
    };
    let mut stmt = conn.prepare(&sql)?;
    let mut rows = stmt.query(params)?;
    while let Some(row) = rows.next()? {
        let skill = Skill { id: row.get(0)?, ... };
        skills.push(skill);
    }
    Ok(skills)
}

pub fn create_skill(conn: &Connection, request: CreateSkillRequest) -> Result<Skill, SkillerError> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    // 校验
    if let Some(ref metadata) = request.source_metadata {
        validate_source_metadata_with_conn(metadata, conn)?;
    }
    // 插入
    conn.execute("INSERT INTO skills ... VALUES (?1, ?2, ...)", rusqlite::params![id, ...])?;
    // 返回完整对象
    Ok(Skill { id, created_at: now, ... })
}
```

**Service 模式要点**：
- 所有函数签名为 `fn xxx(conn: &Connection, ...) -> Result<T, SkillerError>`
- ID 生成: `Uuid::new_v4().to_string()`
- 时间戳: `chrono::Utc::now().to_rfc3339()`
- 校验在 Service 内完成（而非 Command 层）
- 返回完整对象（非仅 ID）

### 12.3 后端 Model 标准实现

Model 定义数据结构和请求/响应类型：

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    // ...
}

// 枚举使用 serde tag 模式
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SourceMetadata {
    #[serde(rename = "file")]
    File { original_path: String },
    #[serde(rename = "npx")]
    Npx { command: String },
    #[serde(rename = "repository")]
    Repository { repo_id: String },
    #[serde(rename = "clawhub")]
    Clawhub { source_id: String, slug: String },
}

// 请求类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSkillRequest {
    pub name: String,
    pub description: Option<String>,
    // ...
}

// 更新类型：字段为 Option 表示可选更新
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSkillRequest {
    pub id: String,          // 必填
    pub name: Option<String>, // 可选
}
```

### 12.4 前端 API 层标准实现

每个领域一个文件，导出对象字面量：

```typescript
// api/skill.ts
import { invoke } from './tauri'
import type { Skill, CreateSkillRequest, UpdateSkillRequest } from '../types'

export const skillApi = {
  list: async (tagIds?: string[]): Promise<Skill[]> => {
    return await invoke('get_skills', { tagIds })
  },
  create: async (request: CreateSkillRequest): Promise<Skill> => {
    return await invoke('create_skill', { request })
  },
  delete: async (id: string): Promise<void> => {
    return await invoke('delete_skill', { id })
  },
}
```

**API 层约定**：
- 命令名使用 snake_case（`get_skills`, `create_skill`）
- 参数名使用 camelCase（`tagIds`, `repoId`），Tauri 自动映射
- 返回类型显式声明泛型参数

### 12.5 前端 Store 标准实现

Zustand Store 使用 `create<State>((set) => ({...}))` 模式：

```typescript
interface FileSkillState {
  skills: Skill[]              // 数据
  loading: boolean             // 加载状态
  error: string | null         // 错误状态
  fetchSkills: () => Promise<void>         // 异步操作
  updateSkillLocally: (id: string, updates: Partial<Skill>) => void  // 本地更新
}

export const useFileSkillStore = create<FileSkillState>((set) => ({
  skills: [],
  loading: false,
  error: null,

  fetchSkills: async () => {
    set({ loading: true, error: null })
    try {
      const skills = await invoke<Skill[]>('get_file_skills')
      set({ skills: skills.map(normalizeSkillSourceMetadata), loading: false })
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },

  updateSkillLocally: (skillId, updates) => {
    set((state) => ({
      skills: state.skills.map((skill) =>
        skill.id === skillId ? { ...skill, ...updates } : skill
      ),
    }))
  },
}))
```

**Store 模式要点**：
- 每个 Store 独立，不互相依赖（除 `appStore` 外）
- 异步操作统一: `set({ loading: true })` → try/catch → `set({ loading: false })`
- 错误处理: `set({ error: String(error) })`
- 本地乐观更新: `updateSkillLocally` 避免不必要的 invoke

### 12.6 前端 Context 标准实现

`SkillContext` 聚合复杂领域逻辑，混合使用 Store 和直接 invoke：

```typescript
interface SkillContextValue extends SkillCenterState {
  filteredSkills: Skill[]
  loadSkills: () => Promise<void>
  deleteSkill: (skillId: string, options?: { refresh?: boolean }) => Promise<void>
  importSkillFromFile: (filePath: string) => Promise<void>
  distributeSkill: (request: DistributeSkillRequest) => Promise<DistributeSkillResult>
}

const SkillContext = createContext<SkillContextValue | undefined>(undefined)

export function SkillProvider({ children }: { children: ReactNode }) {
  const { skills, fetchSkills, updateSkillLocally } = useFileSkillStore()
  const { fetchTree } = useTagTreeStore()
  const [state, setState] = useState<Omit<SkillCenterState, 'skills' | 'loading'>>({ ... })

  // 业务逻辑在 useCallback 中
  const deleteSkill = useCallback(async (skillId, options) => {
    await invoke('delete_file_skill', { skillId })
    if (options?.refresh !== false) {
      await fetchSkills()
      await fetchTagTree()
    }
  }, [fetchSkills, fetchTagTree])

  // 派生数据在 useMemo 中
  const filteredSkills = useMemo(() => {
    return skills.filter(...).sort(...)
  }, [skills, state.selectedTagId, state.searchKeyword, state.sortOption])

  return <SkillContext.Provider value={value}>{children}</SkillContext.Provider>
}

export function useSkillContext() {
  const context = useContext(SkillContext)
  if (!context) throw new Error('useSkillContext must be used within SkillProvider')
  return context
}
```

### 12.7 数据库迁移模式

版本化迁移，每个版本一个文件，顺序执行：

```rust
// db/migrations/mod.rs
pub fn run_migrations(conn: &Connection) -> Result<(), crate::error::SkillerError> {
    v1::seed_initial_data(conn)?;
    v2::migrate_tag_hierarchy(conn)?;
    v3::fix_unique_constraint(conn)?;
    // ...
    Ok(())
}
```

```rust
// db/migrations/v1.rs
pub fn seed_initial_data(conn: &Connection) -> Result<(), crate::error::SkillerError> {
    conn.execute_batch(r#"INSERT OR IGNORE INTO ..."#)?;
    // 幂等性守卫
    let initialized: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM config WHERE key = 'builtin_presets_initialized'",
        [], |row| row.get(0)
    ).unwrap_or(false);
    if initialized { return Ok(()); }
    // 填充数据
    conn.execute_batch(r#"INSERT OR IGNORE INTO ..."#)?;
    conn.execute("INSERT INTO config ...", params![now])?;
    Ok(())
}
```

**迁移约定**：
- 文件命名: `v{n}.rs`（递增编号）
- 函数命名: 描述性（如 `seed_initial_data`, `migrate_tag_hierarchy`）
- 幂等性: 使用 `INSERT OR IGNORE` 或 config 标记守卫
- 回滚: `rollback_v2.rs`（如需要）

### 12.8 错误处理链路

```
Rust Service 层    → SkillerError (thiserror 枚举)
Rust Command 层    → .map_err(|e| e.to_string()) → Result<T, String>
Tauri IPC Bridge   → JSON 序列化传输
前端 invoke 封装   → throw new Error(`调用 xxx 失败: ${normalizeTauriError(error)}`)
前端 Store/Context → set({ error: String(error) }) / throw new Error(...)
```

**SkillerError → ApiError 序列化**（供前端结构化解析）：

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct ApiError {
    pub code: String,     // "SKILL_NOT_FOUND", "DATABASE_ERROR" 等
    pub message: String,  // 人类可读消息
}
```

---

## 13. 前端组件组织模式

### 13.1 组件目录结构

每个功能域一个目录，包含主组件 + 子组件 + 样式 + 测试 + 导出：

```
components/SkillCenter/
├── index.ts                    # 导出入口
├── SkillCenter.tsx             # 主组件
├── SkillCenter.css             # 样式
├── SkillCard.tsx               # 子组件
├── SkillList.tsx               # 子组件
├── SkillDetailDrawer.tsx       # 抽屉组件
├── SkillDetailDrawer.test.tsx  # 测试
├── AddSkillButton.tsx          # 操作按钮
├── ImportDropdown.tsx          # 导入下拉
├── NpxImportDialog.tsx         # NPX 导入对话框
├── NpxImportDialog.test.tsx    # 测试
├── FileImportDialog.tsx        # 文件导入对话框
├── FileImportDialog.test.tsx   # 测试
├── RepositorySelectDialog.tsx  # 仓库选择对话框
├── RepositorySelectDialog.test.tsx # 测试
├── SkillMarkdownPreview.tsx    # Markdown 预览
├── SkillMarkdownPreview.css    # 预览样式
├── SkillDistributionPanel.tsx  # 分发面板
├── BatchDistributionModal.tsx  # 批量分发弹窗
├── DistributionConflictModal.tsx # 冲突弹窗
├── DroppableSkill.tsx          # 可拖拽技能项
├── DroppableSkill.css          # 拖拽样式
├── DroppableSkillArea.tsx      # 拖拽区域
├── DroppableSkillListItem.tsx  # 列表项拖拽
├── EmptyState.tsx              # 空状态
├── HighlightText.tsx           # 高亮文本
├── SkillSearchInput.tsx        # 搜索输入
├── SkillIcon.tsx               # 技能图标
├── SimpleTagTree.tsx           # 简易标签树
├── TerminalOutput.tsx          # 终端输出
├── ViewToggle.tsx              # 视图切换
└── NpxFindDialog.tsx           # NPX 查找对话框
```

### 13.2 组件命名约定

| 类型 | 命名 | 示例 |
|------|------|------|
| 页面组件 | PascalCase + Page 后缀 | `OverviewPage`, `ProjectsPage` |
| 功能组件 | PascalCase 描述性 | `SkillCard`, `TagTree` |
| 对话框 | PascalCase + Dialog/Modal | `FileImportDialog`, `BatchDistributionModal` |
| 抽屉 | PascalCase + Drawer | `SkillDetailDrawer` |
| 列表项 | PascalCase + Item/ListItem | `DroppableSkillListItem` |
| 共享组件 | `shared/` 目录 | `SortDropdown` |
| 样式文件 | 同名 `.css` | `SkillCenter.css` |
| 测试文件 | 同名 `.test.tsx` | `SkillDetailDrawer.test.tsx` |

### 13.3 路由模式

无 React Router，使用 **状态驱动路由**（单页多模块切换）：

```typescript
type ModuleKey = 'overview' | 'skills' | 'projects' | 'repos' | 'tags' | 'clawhub' | 'settings'
const [activeModule, setActiveModule] = useState<ModuleKey>('overview')

const renderContent = () => {
  switch (activeModule) {
    case 'skills': return <SkillProvider><SkillCenter /></SkillProvider>
    case 'projects': return <SkillProvider><ProjectsPage /></SkillProvider>
    // ...
  }
}
```

---

## 14. 样式体系

### 14.1 CSS 架构

- **基础**: Tailwind CSS（`@tailwind base/components/utilities`）
- **自定义 CSS**: `src/index.css`（~11800 行，含全部自定义样式）
- **组件样式**: 同目录 `.css` 文件（如 `SkillCenter.css`, `AlertDialog.css`）
- **暗色模式**: CSS 变量 + `[data-theme="dark"]` 选择器

### 14.2 CSS 变量体系

```css
:root {
  --bg-base: #fafafa;           /* 页面底色 */
  --bg-elevated: #ffffff;       /* 卡片/面板底色 */
  --border-soft: #e5e7eb;       /* 边框色 */
  --text-primary: #111827;      /* 主文字 */
  --text-secondary: #6b7280;    /* 次文字 */
  --text-tertiary: #9ca3af;     /* 辅助文字 */
  --accent-mint: #10b981;       /* 品牌色-薄荷绿 */
  --accent-amber: #f59e0b;      /* 警告色-琥珀 */
  --accent-ink: #3b82f6;        /* 信息色-蓝 */
}

[data-theme="dark"] {
  --bg-base: #0a0a0a;
  --bg-elevated: #171717;
  --border-soft: #262626;
  --text-primary: #fafafa;
  --text-secondary: #a3a3a3;
  --text-tertiary: #737373;
  --accent-mint: #34d399;
  --accent-amber: #fbbf24;
  --accent-ink: #60a5fa;
}
```

### 14.3 布局类

```css
.app-shell          /* 全局容器, min-height: 100vh */
.desktop-frame      /* flex 布局, height: 100vh */
.sidebar            /* 侧边栏, width: 220px, 可折叠 */
.workspace          /* 主工作区 */
.glass-panel        /* 玻璃面板, 圆角+边框+阴影 */
.content-grid       /* 内容网格 */
.single-grid        /* 单列网格 */
```

---

## 15. Tauri 事件系统

### 15.1 前端→后端：invoke 调用

主要通信方式，同步/异步命令调用。

### 15.2 后端→前端：Event Emitter

用于实时进度推送（如 NPX 导入进度）：

```rust
// 后端发射事件
app.emit("npx-import-progress", NpxImportProgressEvent { request_id, entry })?;

// 前端监听（通过 Tauri API）
import { listen } from '@tauri-apps/api/event'
const unlisten = await listen('npx-import-progress', (event) => { ... })
```

**已定义的事件**：

| 事件名 | 用途 |
|--------|------|
| `npx-import-progress` | NPX 导入进度 |
| `native-npx-progress` | 原生 NPX 执行进度 |
| `repo-sync-event` | 仓库同步状态 |

---

## 16. 跨平台适配

### 16.1 符号链接

```rust
// utils/symlink.rs — 条件编译
#[cfg(target_os = "windows")]
use std::os::windows::fs::symlink_dir;

#[cfg(not(target_os = "windows"))]
use std::os::unix::fs::symlink as symlink_dir;
```

### 16.2 路径处理

- Rust 端使用 `Path`/`PathBuf`，跨平台路径拼接
- `dirs::home_dir()` 获取用户目录
- `expand_tilde()` 处理 `~/` 路径展开
- 前端路径显示兼容 `/` 和 `\`

### 16.3 构建目标

| 平台 | Target | 打包格式 |
|------|--------|----------|
| macOS Universal | `universal-apple-darwin` | `.app` / `.dmg` |
| macOS ARM | `aarch64-apple-darwin` | `.app` / `.dmg` |
| macOS x64 | `x86_64-apple-darwin` | `.app` / `.dmg` |
| Windows | `x86_64-pc-windows-msvc` | `.msi` / `.nsis` |
| Linux | `x86_64-unknown-linux-gnu` | `.deb` / `.rpm` |

---

## 17. 新增功能实现清单

基于以上架构，新增一个完整功能模块的标准步骤：

### 后端

1. **Model**: 在 `models/` 新增数据结构和请求/响应类型
2. **DB Schema**: 在 `db/schema.rs` 添加建表语句
3. **DB Migration**: 在 `db/migrations/` 新增 `v{n}.rs` + 注册到 `mod.rs`
4. **Service**: 在 `services/` 新增业务逻辑函数
5. **Command**: 在 `commands/` 新增 `#[tauri::command]` 函数
6. **注册**: 在 `main.rs` 的 `invoke_handler` 中注册新命令
7. **测试**: 编写 Service 层单元测试（使用内存 DB）

### 前端

1. **Type**: 在 `types/index.ts` 新增 TypeScript 接口
2. **API**: 在 `api/` 新增领域 API 封装
3. **Store**: 在 `stores/` 新增 Zustand Store（如需要）
4. **Context**: 在 `contexts/` 扩展现有 Context 或新增（如需要）
5. **Component**: 在 `components/` 新增功能域目录
6. **Page**: 在 `pages/` 新增页面组件（如需要）
7. **i18n**: 在 `i18n/zh.ts` 添加翻译
8. **测试**: 编写组件测试 + Store 测试
