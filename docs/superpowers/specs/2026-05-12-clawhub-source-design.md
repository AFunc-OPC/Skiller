# ClawHub Source Integration Design

## Overview

Add a ClawHub source configuration and browsing feature to Skiller. Users can configure multiple ClawHub data sources (each with its own registry URL, token, and connection type), browse and search skills from those sources, and import individual or batches of skills into the local Skill Center.

## Approach

**Approach A: Lightweight Proxy Layer** (selected)

A new `clawhub_service` in the Rust backend dispatches requests based on each source's `connection_type` — either directly calling ClawHub REST API or invoking the `clawhub` CLI with `--json` output. The frontend adds a first-class sidebar menu "ClawHub" with source tabs and skill browsing.

This combines the speed and zero-dependency advantage of API mode with the full-featured fallback of CLI mode, while keeping the browsing/import experience unified.

## Data Model

### `clawhub_sources` table (SQLite)

| Field | Type | Description |
|---|---|---|
| id | TEXT (uuid) | Primary key |
| name | TEXT | Display name, e.g. "ClawHub Official" |
| registry_url | TEXT | API base URL, e.g. `https://clawhub.ai` |
| token | TEXT | Auth token (AES-256 encrypted at rest, decrypted in memory only) |
| connection_type | TEXT | `'api'` or `'cli'` |
| cli_path | TEXT (nullable) | Path to `clawhub` executable (CLI mode only) |
| is_enabled | BOOLEAN | Whether the source appears in tabs |
| sort_order | INTEGER | Tab display order |
| created_at | DATETIME | Creation timestamp |
| updated_at | DATETIME | Update timestamp |

### Connection types

- **API mode**: Rust backend makes HTTP requests to `${registry_url}/api/v1/...` with `Authorization: Bearer <token>`
- **CLI mode**: Rust backend invokes `clawhub` commands with `CLAWHUB_REGISTRY=<registry_url>` environment variable; token is pre-configured via `clawhub login --token` or written to clawhub's config.json

## Settings UI

A new tab "ClawHub Source" in the existing `SettingsTabs` component:

- Source list (sortable, enable/disable toggle, delete)
- "Add Source" dialog (name, URL, token, connection type, CLI path)
- "Test Connection" button per source — verifies token and connectivity
- Sources with `is_enabled=false` are hidden from the ClawHub menu tabs

## ClawHub Menu UI

### Sidebar entry

New first-class menu item "ClawHub" in the app sidebar, positioned between Skills and Projects (or after Skills). Icon: `Globe` or similar network icon.

### Page layout

```
┌────────┬───────────────────────────────────┐
│ 源 A   │  [搜索栏]              [排序下拉] │
│ 源 B   │───────────────────────────────────│
│ +添加   │                                   │
│        │  技能卡片网格                       │
│        │  (similar to Skill Center)         │
│        │                                   │
│        │                    ┌──────────────┤
│        │                    │ 技能详情抽屉   │
│        │                    │ (右侧滑出)    │
│        │                    └──────────────┤
└────────┴───────────────────────────────────┘
```

### Source list (left panel)

- Vertical list, one item per enabled source
- Selected source highlighted, click to switch
- `+Add` button at the bottom → navigates to Settings > ClawHub Source tab
- Empty state when no sources are enabled: "请先在设置中添加 ClawHub 源"

### Skill grid (main area)

- Card grid / list view toggle (reuse SkillCenter patterns)
- API mode: `/api/v1/skills?sort=newest&limit=25`
- CLI mode: `clawhub explore --json --registry <url>`
- Sort options: newest, updated, downloads, rating

### Search

- Search bar with real-time filtering
- API mode: `/api/v1/search?q=<query>`
- CLI mode: `clawhub search <query> --json`
- Search replaces the explore list; clearing search returns to default
- Keyword highlighting (reuse `HighlightText` component)

### Skill detail drawer

- Slides in from the right (reuse `SkillDetailDrawer` style)
- Shows: name, slug, version, description, downloads, rating, created/updated timestamps
- SKILL.md content preview (reuse `SkillMarkdownPreview` component)
- API mode: `GET /api/v1/skills/<slug>` + `--file SKILL.md`
- CLI mode: `clawhub inspect <slug> --json` + `clawhub inspect <slug> --file SKILL.md`
- "Import to Skill Center" button at the bottom

## Import Flow

### Single import

- "Import to Skill Center" button in skill detail drawer
- Import icon button on each skill card (direct import without opening detail)
- Import process:
  1. API mode: `GET /api/v1/download` → download zip → Rust extracts to local skill directory
  2. CLI mode: `clawhub install <slug>` → install to temp dir → copy to skill directory
  3. Write skill metadata with source tag `clawhub:<source_id>:<slug>`
  4. Register in Skill Center (reuse existing FileSkill import logic)
  5. Button changes to "Already Imported ✓" (grayed out)

### Batch import

- Multi-select mode on skill cards (reuse SkillCenter batch select pattern)
- Batch action bar appears: "N selected | [Import to Skill Center]"
- Progress display during import (N/M), processes one at a time
- Imported skills show "Already Imported" badge

### Duplicate detection

- Before import, check if a skill with the same slug or name already exists in Skill Center
- If duplicate found: confirmation dialog — "该技能已存在，是否覆盖更新？[覆盖] [取消]"

## Backend Architecture

### New Rust modules

```
src-tauri/src/
├── commands/
│   ├── mod.rs              # + pub mod clawhub;
│   └── clawhub.rs          # Tauri IPC command handlers
├── services/
│   ├── mod.rs              # + pub mod clawhub_service;
│   └── clawhub_service.rs  # Core business logic
├── models/
│   ├── mod.rs              # + pub mod clawhub;
│   └── clawhub.rs          # ClawhubSource model
├── db/
│   └── migrations/         # New migration for clawhub_sources table
```

### Tauri IPC commands

| Command | Description |
|---|---|
| `clawhub_list_sources` | List all source configs |
| `clawhub_add_source` | Add a new source |
| `clawhub_update_source` | Update source config |
| `clawhub_delete_source` | Delete a source |
| `clawhub_test_connection` | Test connectivity and token validity |
| `clawhub_explore` | Browse skill list (source_id, sort, limit) |
| `clawhub_search` | Search skills (source_id, query) |
| `clawhub_inspect` | Get skill detail (source_id, slug) |
| `clawhub_import_skills` | Batch import skills (source_id + slug array) |

### Service layer

`clawhub_service` dispatches based on source `connection_type`:

- **API mode**: Constructs HTTP requests to `${registry_url}/api/v1/...` with Bearer token
- **CLI mode**: Assembles `clawhub` commands with `--json` flag, sets `CLAWHUB_REGISTRY` env var, executes and parses stdout

## Frontend Structure

```
src/
├── api/
│   └── clawhub.ts                    # ClawHub IPC API wrappers
├── stores/
│   └── clawhubStore.ts               # Zustand store
├── components/
│   ├── ClawHub/
│   │   ├── ClawHubPage.tsx            # Main page (source sidebar + content)
│   │   ├── SourceSidebar.tsx          # Left source list
│   │   ├── SkillGrid.tsx             # Skill card grid
│   │   ├── SkillDetailDrawer.tsx      # Skill detail drawer
│   │   ├── ImportButton.tsx           # Import button (single + batch)
│   │   └── EmptyState.tsx             # Empty state prompt
│   └── Settings/
│       └── ClawhubSourceSettings.tsx  # Source config tab
```

## i18n

All new UI strings added to `src/i18n/zh.ts` under a new `clawhub` namespace, with both `zh` and `en` translations.

## Error Handling

- Network errors (API mode): show toast with error message, option to retry
- CLI not found (CLI mode): show guidance toast "请先安装 clawhub CLI"
- Token invalid: show "认证失败，请检查 token 配置" toast
- Import failure: per-item error in batch progress, continue with remaining items