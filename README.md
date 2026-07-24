# Skiller - Tauri 应用框架

**版本**: v0.2.0
**状态**: 开发中
**开源地址**: [https://github.com/AFunc-OPC/Skiller](https://github.com/AFunc-OPC/Skiller)
**主页**: [https://afunc-opc.github.io/home/](https://afunc-opc.github.io/home/)
📄 **English Version**: [README-EN.md](./README-EN.md)

## 项目简介

Skiller 是基于 Tauri 2.x 的跨平台桌面应用框架，提供开箱即用的基础设施：国际化（中/英）、明暗主题切换、日志系统、配置持久化、SQLite 存储。可作为各类桌面应用的启动模板。

## 技术栈

| 层级       | 技术         | 版本  | 说明               |
| ---------- | ------------ | ----- | ------------------ |
| 后端框架   | Tauri        | 2.x   | 跨平台桌面应用框架 |
| 语言运行时 | Rust         | 1.75+ | 高性能后端         |
| 前端框架   | React        | 18.x  | 现代化 UI          |
| 构建工具   | Vite         | 5.x   | 快速热更新         |
| UI框架     | Tailwind CSS | 3.x   | 原子化 CSS         |
| 状态管理   | Zustand      | 4.x   | 轻量级状态管理     |
| 数据库     | SQLite       | 3.x   | WAL 模式，本地存储 |

## 框架功能

- ✅ **国际化** - 中英文双语，可扩展
- ✅ **明暗主题** - 跟随系统或手动切换
- ✅ **日志系统** - 查看、过滤、导出、清空运行日志
- ✅ **配置持久化** - 基于 SQLite 的键值配置存储
- ✅ **桌面集成** - 文件夹选择、打开本地目录
- ✅ **Sora 字体** - 本地自托管，离线可用

## 目录结构

```
skiller/
├── src-tauri/                    # Tauri 后端（Rust）
│   ├── src/
│   │   ├── main.rs              # 应用入口
│   │   ├── lib.rs               # 库入口
│   │   ├── commands/            # Tauri 命令层
│   │   │   ├── config.rs        # 配置读写命令
│   │   │   ├── log.rs           # 日志查询/导出命令
│   │   │   └── desktop.rs       # 桌面交互命令
│   │   ├── services/            # 业务服务层
│   │   ├── db/                  # 数据库层
│   │   ├── models/              # 数据模型
│   │   └── utils/               # 工具函数
│   ├── Cargo.toml               # Rust 依赖
│   └── tauri.conf.json          # Tauri 配置
│
├── src/                          # 前端源码（React + TypeScript）
│   ├── main.tsx                 # 应用入口
│   ├── App.tsx                  # 根组件（侧边栏 + 路由）
│   ├── index.css                # 全局样式 + Sora 字体
│   ├── api/                     # API 封装
│   │   ├── tauri.ts             # Tauri invoke 封装
│   │   ├── config.ts            # 配置 API
│   │   ├── log.ts               # 日志 API
│   │   └── desktop.ts           # 桌面 API
│   ├── stores/                  # 状态管理
│   │   ├── appStore.ts          # 语言/主题
│   │   └── logStore.ts          # 日志状态
│   ├── components/              # 组件
│   │   ├── Settings/            # 设置模块
│   │   │   ├── SettingsTabs.tsx # 设置标签页
│   │   │   ├── LogPanel/        # 日志面板
│   │   │   └── About.tsx        # 关于页
│   │   └── ...
│   ├── pages/                   # 页面
│   ├── i18n/                    # 国际化
│   ├── hooks/                   # 自定义 Hooks
│   └── types/                   # 类型定义
│
├── public/fonts/                  # 本地字体文件
├── package.json                   # 前端依赖
├── tsconfig.json                  # TypeScript 配置
├── vite.config.ts                 # Vite 配置
└── tailwind.config.js             # Tailwind 配置
```

## 快速开始

### 环境要求

#### 所有平台

- **Node.js**: 18.x 或更高
- **npm**: 9.x 或更高
- **Rust**: 1.75 或更高，建议通过 `rustup` 安装
- **Git**: 用于拉取仓库与部分依赖场景

建议先确认版本：

```bash
node -v
npm -v
rustc -V
cargo -V
```

### 平台依赖安装

#### macOS

1. 安装 Xcode Command Line Tools：

```bash
xcode-select --install
```

2. 安装 Node.js（如未安装，可用 Homebrew）：

```bash
brew install node
```

3. 安装 Rust：

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

说明：macOS 不需要额外安装 WebKit/GTK 运行库，系统自带 WebView。

#### Windows

1. 安装 Node.js LTS。
2. 安装 Rust：访问 `https://rustup.rs/` 或使用 `winget install Rustlang.Rustup`。
3. 安装 Microsoft Visual Studio C++ Build Tools，至少包含：

- Desktop development with C++
- MSVC v143 Build Tools
- Windows 10/11 SDK

4. 确认 WebView2 Runtime 已安装。

可选的 `winget` 示例：

```powershell
winget install OpenJS.NodeJS.LTS
winget install Rustlang.Rustup
winget install Microsoft.VisualStudio.2022.BuildTools
winget install Microsoft.EdgeWebView2Runtime
```

#### Linux

以下命令适用于 Ubuntu/Debian 系：

```bash
sudo apt update
sudo apt install -y \
  build-essential \
  pkg-config \
  curl \
  wget \
  libssl-dev \
  libgtk-3-dev \
  libglib2.0-dev \
  libwebkit2gtk-4.1-dev \
  libjavascriptcoregtk-4.1-dev \
  libsoup-3.0-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libxdo-dev \
  patchelf
```

### 安装项目依赖

在项目根目录执行：

```bash
npm install
```

Rust 依赖会在首次 `cargo build` 或 `npm run tauri:dev` 时自动下载并编译。

### 调试与运行

#### 方案 A：分步调试（推荐）

适合首次启动、排查环境问题、区分前端问题和 Tauri 原生问题。

1. 只启动前端：

```bash
npm run dev
```

访问 `http://localhost:5173` 确认页面可以加载。注意这只是前端调试，无法调用 Tauri API。

2. 单独编译 Rust 后端：

```bash
cd src-tauri
cargo build
cd ..
```

3. 启动完整桌面应用：

```bash
npm run tauri:dev
```

#### 方案 B：直接启动完整应用

```bash
npm run tauri:dev
```

该命令会先启动 Vite，再启动 Tauri 开发窗口。首次编译 Rust 依赖时通常需要 5-15 分钟。

#### 各平台数据库默认路径

- **macOS**: `~/Library/Application Support/com.skiller.desktop/skiller.db`
- **Windows**: `%APPDATA%\com.skiller.desktop\skiller.db`
- **Linux**: `~/.config/com.skiller.desktop/skiller.db`

## 打包发布

### 快速构建命令

```bash
# 当前平台打包（自动识别）
npm run tauri:build

# macOS 通用二进制（Intel + Apple Silicon，仅 macOS 可用）
npm run tauri:build:mac

# macOS 单架构（仅 macOS 可用）
npm run tauri:build:mac-arm    # Apple Silicon (M1/M2/M3)
npm run tauri:build:mac-x64    # Intel
```

> **重要**: Tauri 不支持交叉编译。Windows 和 Linux 版本必须在对应平台原生构建，或使用 GitHub Actions 自动化构建。

### 全平台一键打包（推荐）

使用 GitHub Actions 自动构建全平台安装包：

1. 创建 Git 标签并推送：

   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```
2. GitHub Actions 自动构建以下产物：

   - **macOS**: `.dmg` (aarch64 + x64 + universal)
   - **Windows**: `.msi` + `.exe` (NSIS)
   - **Linux**: `.deb` + `.AppImage`
3. 在 GitHub Releases 页面下载安装包

详细配置见 [`.github/workflows/release.yml`](./.github/workflows/release.yml)

## 开发指南

### 编码规范

- **Rust**: 遵循 Rust 官方编码规范
- **TypeScript**: 使用 ESLint + Prettier
- **组件命名**: PascalCase
- **文件命名**: kebab-case

### 提交规范

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建工具、依赖更新
```

### 分支管理

- `main`: 主分支，稳定版本
- `develop`: 开发分支
- `feature/*`: 功能分支
- `hotfix/*`: 紧急修复分支

## 许可证

MIT License

## 联系方式

- GitHub: [https://github.com/AFunc-OPC/Skiller](https://github.com/AFunc-OPC/Skiller)
- Homepage: [https://afunc-opc.github.io/home/](https://afunc-opc.github.io/home/)
- Issues: [https://github.com/AFunc-OPC/Skiller/issues](https://github.com/AFunc-OPC/Skiller/issues)
