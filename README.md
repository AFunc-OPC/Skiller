# Skiller - 跨平台 Skill 管理工具

**版本**: v0.1.1
**状态**: Production Ready
**开源地址**: [https://github.com/AFunc-OPC/Skiller](https://github.com/AFunc-OPC/Skiller)
**主页**: [https://afunc-opc.github.io/home/](https://afunc-opc.github.io/home/)

## 项目简介

Skiller 是一款跨平台桌面应用，用于统一管理 AI 工具的 Skill（技能/提示词配置）。支持多个 AI CLI 工具（Claude Code、OpenCode、Cursor 等），提供可视化管理界面，实现 Skill 的集中管理、分类标签、项目分发等功能。

## 快速使用

从 [GitHub Releases](https://github.com/AFunc-OPC/Skiller/releases) 下载对应平台的安装包：

| 平台 | 安装包格式 | 说明 |
|------|-----------|------|
| **macOS** | `.dmg` | 支持 Intel (x64) 和 Apple Silicon (aarch64)，推荐下载 universal 版本 |
| **Windows** | `.msi` / `.exe` | MSI 安装包或 NSIS 安装包，支持 x64 |
| **Linux** | `.deb` / `.AppImage` | DEB 适用于 Debian/Ubuntu，AppImage 为通用格式 |

下载后直接安装即可使用。

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
| 图标库     | Lucide React | 0.3.x | 丰富的图标库       |

## 功能特性

### V1.1 核心功能

- ✅ **Skill Center 管理** - 创建、编辑、删除、搜索 Skill
- ✅ **Tag 分类管理** - 标签分组、多对多关联、侧边栏筛选
- ✅ **项目管理** - 项目列表、自定义 Skill 目录、预设工具选择
- ✅ **仓库管理** - 在线仓库接入、拉取更新
- ✅ **Skill 分发** - 复制/软链接分发到项目
- ✅ **多环境配置** - 开发、测试、生产环境支持
- ✅ **国际化** - 中英文双语支持
- ✅ **明暗主题** - 主题切换

## 目录结构

```
skiller-final/
├── src-tauri/                    # Tauri 后端（Rust）
│   ├── src/
│   │   ├── main.rs              # 应用入口
│   │   ├── lib.rs               # 库入口
│   │   ├── commands/            # Tauri 命令层
│   │   ├── services/            # 业务服务层
│   │   ├── db/                  # 数据库层
│   │   ├── models/              # 数据模型
│   │   └── utils/               # 工具函数
│   ├── Cargo.toml               # Rust 依赖
│   └── tauri.conf.json          # Tauri 配置
│
├── src/                          # 前端源码（React + TypeScript）
│   ├── main.tsx                 # 应用入口
│   ├── App.tsx                  # 根组件
│   ├── index.css                # 全局样式
│   ├── api/                     # API 封装
│   ├── stores/                  # 状态管理
│   ├── types/                   # 类型定义
│   └── i18n/                    # 国际化
│
├── public/                       # 静态资源
├── package.json                  # 前端依赖
├── tsconfig.json                 # TypeScript 配置
├── vite.config.ts                # Vite 配置
└── tailwind.config.js            # Tailwind 配置
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

说明：如果缺少 `glib-2.0`、`gdk-3.0`、`webkit2gtk` 之类报错，通常就是上述开发包未安装完整。

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

#### 平台调试命令

macOS / Linux:

```bash
RUST_BACKTRACE=1 RUST_LOG=info npm run tauri:dev
```

Windows PowerShell:

```powershell
$env:RUST_BACKTRACE="1"
$env:RUST_LOG="info"
npm run tauri:dev
```

#### 常用调试场景

- **只看前端 UI**：`npm run dev`
- **验证 Rust 能否独立编译**：`cd src-tauri && cargo build`
- **检查打包链路**：`npm run tauri:build`
- **查看更详细 Rust 错误栈**：设置 `RUST_BACKTRACE=1`

#### 各平台数据库默认路径

- **macOS**: `~/Library/Application Support/com.skiller.desktop/skiller.db`
- **Windows**: `%APPDATA%\com.skiller.desktop\skiller.db`
- **Linux**: `~/.config/com.skiller.desktop/skiller.db`

#### 启动脚本说明

- `./start-app.sh` 适用于 macOS / Linux 的 Bash 环境
- Windows 请使用 `npm run tauri:dev` 或按上面的分步调试命令手动执行

#### 常见启动失败定位顺序

1. `npm install`
2. `npm run dev`，确认前端可用
3. `cd src-tauri && cargo build`，确认原生依赖齐全
4. `npm run tauri:dev`

如果第 3 步失败，优先检查平台依赖是否安装完整，而不是只等待重新编译。

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
   git tag v0.1.1
   git push origin v0.1.1
   ```

2. GitHub Actions 自动构建以下产物：
   - **macOS**: `.dmg` (aarch64 + x64 + universal)
   - **Windows**: `.msi` + `.exe` (NSIS)
   - **Linux**: `.deb` + `.AppImage`

3. 在 GitHub Releases 页面下载安装包

详细配置见 [`.github/workflows/release.yml`](./.github/workflows/release.yml)

### 各平台打包方式

#### macOS

**开发环境打包**:

```bash
npm run tauri:build
```

**输出位置**:

- `src-tauri/target/release/bundle/dmg/` - DMG 安装包
- `src-tauri/target/release/bundle/macos/` - .app 应用包

**支持架构**:

- Intel (x86_64)
- Apple Silicon (aarch64)

**注意事项**:

1. 如需签名和公证，需要在 `tauri.conf.json` 中配置证书
2. 通用二进制（Universal Binary）需要分别编译两个架构后合并

**签名命令示例**:

```bash
# 签名
codesign --deep --force --verify --verbose --sign "Developer ID Application: Your Name" src-tauri/target/release/bundle/macos/Skiller.app

# 公证
xcrun notarytool submit src-tauri/target/release/bundle/dmg/Skiller_1.1.0_x64.dmg --apple-id "your@email.com" --team-id "TEAMID" --password "app-specific-password"
```

**安装后无法打开（已损坏）问题**:

由于应用未签名，macOS Gatekeeper 会阻止运行。解决方法：

```bash
# 移除隔离属性
xattr -cr /Applications/Skiller.app
```

或在系统设置中：系统设置 → 隐私与安全性 → 仍要打开

#### Windows

**开发环境打包**:

```bash
npm run tauri:build
```

**输出位置**:

- `src-tauri/target/release/bundle/msi/` - MSI 安装包
- `src-tauri/target/release/bundle/nsis/` - NSIS 安装包

**支持架构**:

- x64 (64位)
- x86 (32位)

**注意事项**:

1. 需要安装 WebView2 Runtime（Windows 10/11 已预装）
2. 如需签名，需要购买代码签名证书并配置

**签名命令示例**:

```powershell
# 使用 signtool 签名
signtool sign /f "path\to\certificate.pfx" /p password /t http://timestamp.digicert.com src-tauri\target\release\bundle\msi\Skiller_1.1.0_x64.msi
```

#### Linux

**开发环境打包**:

```bash
npm run tauri:build
```

**输出位置**:

- `src-tauri/target/release/bundle/deb/` - DEB 包（Debian/Ubuntu）
- `src-tauri/target/release/bundle/appimage/` - AppImage（通用格式）
- `src-tauri/target/release/bundle/rpm/` - RPM 包（Fedora/RHEL）

**支持架构**:

- x64 (amd64)
- aarch64 (ARM64)

**注意事项**:

1. AppImage 是最通用的格式，无需安装即可运行
2. DEB/RPM 需要针对不同发行版打包

**安装命令示例**:

```bash
# DEB 包安装
sudo dpkg -i skiller_1.1.0_amd64.deb

# AppImage 运行
chmod +x Skiller_1.1.0_amd64.AppImage
./Skiller_1.1.0_amd64.AppImage

# RPM 包安装
sudo rpm -i skiller-1.1.0-1.x86_64.rpm
```

### 跨平台编译

> **警告**: Tauri 不支持真正的交叉编译。以下方案仅供参考，不保证能成功。

**推荐方案**: 使用 GitHub Actions 在各平台原生构建（见上文）。

**替代方案**:

1. **虚拟机/云服务器**: 在对应平台安装开发环境后构建
2. **Docker + cross**: Linux 交叉编译（配置复杂，不推荐）
   ```bash
   cargo install cross
   cross build --release --target x86_64-unknown-linux-gnu
   ```

### 为什么不支持交叉编译？

Tauri 依赖平台原生库：
- **Windows**: WebView2, MSVC Runtime, Windows SDK
- **macOS**: WebKit, Metal, Cocoa
- **Linux**: WebKitGTK, GTK, glib

这些库无法通过交叉编译工具链完整支持。

## GitHub Actions 自动化构建

项目已配置自动化构建流程，推送 tag 时自动构建全平台安装包。

### 触发方式

```bash
# 创建并推送标签
git tag v0.1.1
git push origin v0.1.1
```

### 构建产物

| 平台 | 产物格式 | 架构 |
|------|---------|------|
| macOS | `.dmg`, `.app` | aarch64, x64, universal |
| Windows | `.msi`, `.exe` | x64 |
| Linux | `.deb`, `.AppImage` | amd64 |

### 工作流配置

完整配置见 [`.github/workflows/release.yml`](./.github/workflows/release.yml)

**主要特性**:
- 自动缓存 Rust 依赖，加速构建
- 支持 macOS Universal Binary
- 自动创建 GitHub Release
- 支持草稿发布模式

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

## 数据库结构

应用使用 SQLite 存储，支持以下表：

- `skills` - Skill 存储
- `tags` - 标签存储
- `tag_groups` - 标签分组
- `skill_tags` - Skill-Tag 关联（多对多）
- `projects` - 项目存储
- `project_skills` - 项目-Skill 关联
- `repos` - 仓库存储
- `config` - 配置存储
- `tool_presets` - 工具预设

数据库文件位置：

| 平台 | 路径 |
|------|------|
| macOS | `~/Library/Application Support/com.skiller.desktop/skiller.db` |
| Windows | `%APPDATA%\com.skiller.desktop\skiller.db` |
| Linux | `~/.config/com.skiller.desktop/skiller.db` |

**说明**：

- 应用首次运行时会自动创建数据库及所需目录
- 数据库包含预置的 tag_groups（构建与分发、同步与仓库、文档与质量）和 tool_presets（Cursor、Claude Code、OpenCode）
- 所有数据存储在本地，无云端同步

**查看数据库**：

```bash
# macOS
ls -la ~/Library/Application\ Support/com.skiller.desktop/

# 查看数据库表结构
sqlite3 ~/Library/Application\ Support/com.skiller.desktop/skiller.db ".schema"

# 查看所有表
sqlite3 ~/Library/Application\ Support/com.skiller.desktop/skiller.db ".tables"

# 查看预置数据
sqlite3 ~/Library/Application\ Support/com.skiller.desktop/skiller.db "SELECT * FROM tag_groups;"
sqlite3 ~/Library/Application\ Support/com.skiller.desktop/skiller.db "SELECT * FROM tool_presets;"
```

**修改存储位置**：

如需修改数据库存储位置，可以编辑 `src-tauri/tauri.conf.json`：

```json
{
  "identifier": "com.skiller.desktop"  // 修改此值会改变存储目录
}
```

或修改 `src-tauri/src/main.rs` 中的路径逻辑。

## 安全说明

- ✅ 仅访问用户明确指定的目录
- ✅ 敏感配置通过环境变量注入
- ✅ 不记录 Skill 内容到日志
- ✅ 本地存储，无云端同步

## 许可证

MIT License

## 联系方式

- GitHub: [https://github.com/AFunc-OPC/Skiller](https://github.com/AFunc-OPC/Skiller)
- Homepage: [https://afunc-opc.github.io/home/](https://afunc-opc.github.io/home/)
- Issues: [https://github.com/AFunc-OPC/Skiller/issues](https://github.com/AFunc-OPC/Skiller/issues)

