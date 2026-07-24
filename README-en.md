# Skiller - Tauri Application Framework

**Version**: v0.2.0<br/>
**Status**: In Development<br/>
**GitHub**: [https://github.com/AFunc-OPC/Skiller](https://github.com/AFunc-OPC/Skiller)<br/>
**Homepage**: [https://afunc-opc.github.io/home/](https://afunc-opc.github.io/home/)<br/>
📄 **中文版**: [README.md](./README.md)<br/>

## Overview

Skiller is a cross-platform desktop application framework built on Tauri 2.x, providing ready-to-use infrastructure: internationalization (Chinese/English), light/dark theme switching, log system, persistent configuration, and SQLite storage. It can serve as a starter template for various desktop applications.

## Tech Stack

| Layer        | Technology   | Version | Notes                            |
| ------------ | ------------ | ------- | -------------------------------- |
| Backend      | Tauri        | 2.x     | Cross-platform desktop framework |
| Runtime      | Rust         | 1.75+   | High-performance backend         |
| Frontend     | React        | 18.x    | Modern UI                        |
| Build Tool   | Vite         | 5.x     | Fast HMR                         |
| UI Framework | Tailwind CSS | 3.x     | Atomic CSS                       |
| State Mgmt   | Zustand      | 4.x     | Lightweight state management     |
| Database     | SQLite       | 3.x     | WAL mode, local storage          |

## Framework Features

- ✅ **Internationalization** - Chinese/English bilingual, extensible
- ✅ **Light/Dark Theme** - Follow system or manual switching
- ✅ **Log System** - View, filter, export, and clear runtime logs
- ✅ **Persistent Configuration** - Key-value config storage based on SQLite
- ✅ **Desktop Integration** - Folder selection, open local directories
- ✅ **Sora Font** - Self-hosted locally, works offline

## Project Structure

```
skiller/
├── src-tauri/                    # Tauri backend (Rust)
│   ├── src/
│   │   ├── main.rs              # Application entry
│   │   ├── lib.rs               # Library entry
│   │   ├── commands/            # Tauri command layer
│   │   │   ├── config.rs        # Config read/write commands
│   │   │   ├── log.rs           # Log query/export commands
│   │   │   └── desktop.rs       # Desktop interaction commands
│   │   ├── services/            # Business service layer
│   │   ├── db/                  # Database layer
│   │   ├── models/              # Data models
│   │   └── utils/               # Utility functions
│   ├── Cargo.toml               # Rust dependencies
│   └── tauri.conf.json          # Tauri configuration
│
├── src/                          # Frontend source (React + TypeScript)
│   ├── main.tsx                 # Application entry
│   ├── App.tsx                  # Root component (sidebar + routing)
│   ├── index.css                # Global styles + Sora font
│   ├── api/                     # API wrappers
│   │   ├── tauri.ts             # Tauri invoke wrapper
│   │   ├── config.ts            # Config API
│   │   ├── log.ts               # Log API
│   │   └── desktop.ts           # Desktop API
│   ├── stores/                  # State management
│   │   ├── appStore.ts          # Language/theme
│   │   └── logStore.ts          # Log state
│   ├── components/              # Components
│   │   ├── Settings/            # Settings module
│   │   │   ├── SettingsTabs.tsx # Settings tabs
│   │   │   ├── LogPanel/        # Log panel
│   │   │   └── About.tsx        # About page
│   │   └── ...
│   ├── pages/                   # Pages
│   ├── i18n/                    # Internationalization
│   ├── hooks/                   # Custom Hooks
│   └── types/                   # Type definitions
│
├── public/fonts/                  # Local font files
├── package.json                   # Frontend dependencies
├── tsconfig.json                  # TypeScript configuration
├── vite.config.ts                 # Vite configuration
└── tailwind.config.js             # Tailwind configuration
```

## Getting Started

### Environment Requirements

#### All Platforms

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **Rust**: 1.75 or higher, recommended to install via `rustup`
- **Git**: For pulling repositories and some dependency scenarios

Verify your versions first:

```bash
node -v
npm -v
rustc -V
cargo -V
```

### Platform Dependency Installation

#### macOS

1. Install Xcode Command Line Tools:

```bash
xcode-select --install
```

2. Install Node.js (if not installed, use Homebrew):

```bash
brew install node
```

3. Install Rust:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Note: macOS does not require additional WebKit/GTK runtime libraries; the system includes WebView.

#### Windows

1. Install Node.js LTS.
2. Install Rust: Visit `https://rustup.rs/` or use `winget install Rustlang.Rustup`.
3. Install Microsoft Visual Studio C++ Build Tools, at least include:

- Desktop development with C++
- MSVC v143 Build Tools
- Windows 10/11 SDK

4. Ensure WebView2 Runtime is installed.

Optional `winget` examples:

```powershell
winget install OpenJS.NodeJS.LTS
winget install Rustlang.Rustup
winget install Microsoft.VisualStudio.2022.BuildTools
winget install Microsoft.EdgeWebView2Runtime
```

#### Linux

The following commands apply to Ubuntu/Debian-based systems:

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

### Install Project Dependencies

Run in the project root directory:

```bash
npm install
```

Rust dependencies will be automatically downloaded and compiled on first `cargo build` or `npm run tauri:dev`.

### Development and Running

#### Option A: Step-by-step Debugging (Recommended)

Suitable for first startup, troubleshooting environment issues, distinguishing frontend and Tauri native issues.

1. Start frontend only:

```bash
npm run dev
```

Visit `http://localhost:5173` to confirm the page loads. Note this is only frontend debugging, Tauri API cannot be called.

2. Build Rust backend separately:

```bash
cd src-tauri
cargo build
cd ..
```

3. Start the full desktop application:

```bash
npm run tauri:dev
```

#### Option B: Start Full Application Directly

```bash
npm run tauri:dev
```

This command will first start Vite, then launch the Tauri development window. First-time compilation of Rust dependencies typically takes 5-15 minutes.

#### Database Default Paths by Platform

- **macOS**: `~/Library/Application Support/com.skiller.desktop/skiller.db`
- **Windows**: `%APPDATA%\com.skiller.desktop\skiller.db`
- **Linux**: `~/.config/com.skiller.desktop/skiller.db`

## Build and Release

### Quick Build Commands

```bash
# Build for current platform (auto-detect)
npm run tauri:build

# macOS universal binary (Intel + Apple Silicon, macOS only)
npm run tauri:build:mac

# macOS single architecture (macOS only)
npm run tauri:build:mac-arm    # Apple Silicon (M1/M2/M3)
npm run tauri:build:mac-x64    # Intel
```

> **Important**: Tauri does not support cross-compilation. Windows and Linux versions must be built natively on the respective platform or use GitHub Actions for automated builds.

### One-Click Cross-Platform Build (Recommended)

Use GitHub Actions to automatically build installers for all platforms:

1. Create and push a Git tag:

   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

2. GitHub Actions automatically builds:

   - **macOS**: `.dmg` (aarch64 + x64 + universal)
   - **Windows**: `.msi` + `.exe` (NSIS)
   - **Linux**: `.deb` + `.AppImage`

3. Download installers from GitHub Releases page

See [`.github/workflows/release.yml`](./.github/workflows/release.yml) for detailed configuration.

## Development Guide

### Coding Standards

- **Rust**: Follow Rust official coding standards
- **TypeScript**: Use ESLint + Prettier
- **Component naming**: PascalCase
- **File naming**: kebab-case

### Commit Standards

```
feat: New feature
fix: Bug fix
docs: Documentation update
style: Code formatting
refactor: Refactoring
test: Testing related
chore: Build tools, dependency updates
```

### Branch Management

- `main`: Main branch, stable releases
- `develop`: Development branch
- `feature/*`: Feature branches
- `hotfix/*`: Emergency fix branches

## License

MIT License

## Contact

- GitHub: [https://github.com/AFunc-OPC/Skiller](https://github.com/AFunc-OPC/Skiller)
- Homepage: [https://afunc-opc.github.io/home/](https://afunc-opc.github.io/home/)
- Issues: [https://github.com/AFunc-OPC/Skiller/issues](https://github.com/AFunc-OPC/Skiller/issues)
