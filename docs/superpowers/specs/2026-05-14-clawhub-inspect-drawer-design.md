# ClawHub Inspect Drawer Alignment Design

## Overview

Align the `ClawHub` skill detail experience with the official ClawHub `inspect <slug>` behavior.

The current implementation only supports a narrow inspect path: clicking browse cards or list rows opens a right-side drawer that shows basic metadata plus a `SKILL.md` preview. Menu-triggered skill entries do not open the same drawer, and the data model does not support version history, version-specific file lists, or on-demand file viewing.

This change upgrades the existing right-side drawer into a unified inspector surface used by all ClawHub skill entry points. It follows the official ClawHub HTTP API and CLI contract instead of the current ad hoc API-only `SKILL.md` file path.

## Goals

- Clicking a skill from the ClawHub menu opens the same right-side drawer used by browse cards and list rows.
- The drawer keeps the existing right-side inspector pattern used elsewhere in the app.
- The drawer exposes three tabs: `Overview`, `Versions`, and `Files`.
- The drawer behavior aligns with the official ClawHub `inspect <slug>` capability set.
- API-backed sources use official documented ClawHub HTTP API endpoints.
- CLI-backed sources use the documented `clawhub inspect` flags.
- `Versions` and `Files` data are loaded on demand, not prefetched when the drawer opens.

## Non-Goals

- No redesign of the broader ClawHub page layout, browse toolbar, or source sidebar.
- No pagination beyond the first page of version history.
- No addition of scan, moderation, download, or owner-profile workflows.
- No persistent caching across page reloads or app sessions.
- No refactor of ClawHub import behavior beyond preserving current compatibility with the upgraded drawer.

## Official Contract

This design treats the official ClawHub documentation as the source of truth.

### HTTP API

For API-backed sources, use the documented endpoints:

- `GET /api/v1/skills/{slug}`
- `GET /api/v1/skills/{slug}/versions`
- `GET /api/v1/skills/{slug}/versions/{version}`
- `GET /api/v1/skills/{slug}/file?path=...&version=...`

Implications:

- The current API-only `GET /api/v1/skills/{slug}/files/SKILL.md` path is treated as legacy implementation detail and should be removed from the new inspect flow.
- The detail payload from `GET /api/v1/skills/{slug}` should be modeled according to the documented wrapper shape rather than forced into the current flat `ClawhubSkillDetail` structure.

### CLI

For CLI-backed sources, use the documented inspect commands:

- `clawhub inspect <slug> --json`
- `clawhub inspect <slug> --versions --json`
- `clawhub inspect <slug> --version <version> --files --json`
- `clawhub inspect <slug> --version <version> --file <path>`

The frontend should experience the same logical capabilities regardless of whether the source is API-backed or CLI-backed.

## Options Considered

### Option A: Extend the existing ClawHub drawer and store incrementally

Keep the current `SkillDetailDrawer` concept and evolve it into a tabbed inspector with segmented state for overview, versions, files, and file content.

Pros:

- Smallest correct change.
- Preserves current drawer placement and interaction style.
- Keeps existing inspect and import entry points intact.
- Minimizes regression risk to browse, search, sort, and import flows.

Cons:

- Requires expanding the current single-detail state into a richer inspector state model.

### Option B: Replace the ClawHub drawer with a new dedicated inspector subsystem

Create a heavier inspector state model and component tree separate from the existing drawer implementation.

Pros:

- Potentially cleaner long-term separation if more ClawHub inspection features are added later.

Cons:

- Larger change than needed.
- Higher regression risk.
- Duplicates patterns the app already has.

### Option C: Make menu clicks open the current drawer only, then add inspect parity later

Limit this change to interaction consistency and defer versions/files work.

Pros:

- Fastest to ship.

Cons:

- Does not satisfy the requested CLI inspect alignment.

## Selected Approach

Use Option A.

The right behavior already exists in one narrow path, so the most pragmatic solution is to extend that path rather than replace it. The drawer remains the same conceptual surface, but its content and backing state become rich enough to support official inspect parity.

## Current Behavior

### Trigger path

- Browse cards and list rows can trigger `inspectSkill(sourceId, slug)`.
- Menu-originated skill selections do not consistently route into the same drawer workflow.

### Data model

- The frontend currently stores a single `skillDetail` object.
- The drawer only renders base metadata and optional `skill_md_content`.
- The store and Tauri layer have no explicit support for version history, version-specific file listing, or file-content reads.

### Backend contract mismatch

- API inspect currently assumes a flat detail shape and separately fetches `SKILL.md` from an undocumented path.
- This does not reflect the documented ClawHub HTTP API contract.

## Interaction Design

### Unified drawer entry

All ClawHub skill entry points should open the same drawer:

- menu skill selection
- browse card click
- browse list-row click

The drawer remains a right-side overlay and preserves current close behavior.

### Tabs

The drawer body is organized into three tabs:

- `Overview`
- `Versions`
- `Files`

The drawer always opens on `Overview`.

### Loading strategy

Use lazy loading by tab.

- Opening the drawer requests overview data only.
- First navigation to `Versions` requests version history.
- First navigation to `Files` requests the file list for the active version context.
- Clicking a file requests its raw text content.

This keeps initial drawer open fast and avoids loading data the user may never inspect.

### Version context

The drawer has a current version context.

- Initial context is the latest version.
- Selecting a version updates the active version context.
- `Overview` reflects the selected version when version-specific data is available.
- `Files` reflects the selected version's file list.
- Previously selected file content is cleared when the selected version changes.

The current tab does not auto-switch when a version is selected. The version change updates the current context in place.

### Drawer reset

Closing the drawer resets inspector UI state for the next open:

- active tab returns to `Overview`
- selected version returns to latest/default
- selected file path clears
- file content clears
- per-tab loading and errors reset with the new inspect session

## Content Design

### Overview tab

The overview tab presents the documented base inspect metadata.

Primary fields:

- skill name
- slug
- summary or description
- latest or selected version
- owner information when available
- created and updated timestamps
- downloads / stars-or-rating values when available from the mapped source payload
- platform metadata such as OS or systems restrictions when present

`SKILL.md` is not treated as a special-case overview payload. It is accessed through the `Files` tab like any other text file.

### Versions tab

The versions tab lists the first page of version history.

Each row should display, when present:

- version
- created timestamp
- changelog summary
- tag or latest marker

Selecting a row sets the current version context.

### Files tab

The files tab is split into:

- file list pane
- content pane

Behavior:

- The file list reflects the selected version context.
- No file is auto-opened on first entry.
- Clicking a file loads raw text content on demand.
- `SKILL.md` should render as Markdown when loaded successfully.
- Other text files should render in a plain-text or code-style viewer.
- Binary files, unsupported media, oversized files, and other unreadable content should display a clear explanatory state rather than failing silently.

## State Design

Extend the existing ClawHub store incrementally instead of replacing it.

### Required state segments

- drawer identity: selected source id + selected skill slug
- `overview`
- `versions`
- `files`
- `fileContent`
- `activeTab`
- `selectedVersion`
- `selectedFilePath`

Each data segment should track its own loading and error state so one failing tab does not collapse the entire drawer.

### Store behavior

- `inspectSkill(sourceId, slug)` opens a new inspect session and loads overview data.
- `loadSkillVersions(...)` is invoked only when `Versions` is first visited or explicitly refreshed.
- `loadSkillFiles(...)` is invoked only when `Files` is first visited or when the selected version changes.
- `readSkillFile(...)` is invoked only when a file is selected.
- `clearSkillDetail()` or its replacement should fully reset inspector session state.

## Backend Design

### Tauri commands

Keep the existing `clawhub_inspect` command for base overview loading, but add focused commands for the remaining official inspect capabilities:

- `clawhub_list_versions`
- `clawhub_inspect_version`
- `clawhub_list_files`
- `clawhub_read_file`

This preserves the current inspect entry point while making the new behavior composable and easier to test.

### Rust service behavior

For API-backed sources:

- map `GET /api/v1/skills/{slug}` into the frontend overview model
- map `GET /api/v1/skills/{slug}/versions` into version-history items
- map `GET /api/v1/skills/{slug}/versions/{version}` into version detail and file metadata
- map `GET /api/v1/skills/{slug}/file` into raw file-content reads

For CLI-backed sources:

- parse `clawhub inspect <slug> --json` for overview
- parse `clawhub inspect <slug> --versions --json` for version history
- parse `clawhub inspect <slug> --version <version> --files --json` for file lists
- execute `clawhub inspect <slug> --version <version> --file <path>` for raw file content

## Data Modeling

The current flat `ClawhubSkillDetail` shape is no longer sufficient as the single source for drawer rendering.

The frontend and Rust models should instead distinguish between:

- overview payload
- version history items
- version detail
- file list item
- file content result

The exact field names may follow repo conventions, but the model boundaries should remain separate so lazy loading and error isolation stay straightforward.

## Error Handling

- Overview failure prevents normal drawer rendering for that skill and shows an inspect-level error state.
- Versions failure affects only the `Versions` tab.
- Files failure affects only the `Files` tab.
- File read failure affects only the content pane for the selected file.
- Unsupported or too-large file content should render an explicit explanation such as text-only or size-limit messaging.
- API parsing must tolerate optional fields omitted by the documented payload.
- CLI parsing must tolerate missing optional fields and degrade gracefully.

## Testing

### Automated

- Menu skill click opens the ClawHub right drawer.
- Browse card click still opens the same drawer.
- Drawer defaults to `Overview`.
- `Versions` data is fetched only after the tab is opened.
- `Files` data is fetched only after the tab is opened.
- File content is fetched only after a file is clicked.
- Selecting a version resets file selection and file content state.
- API inspect parsing follows the documented wrapper response shape.
- API file reads use the documented `/file` endpoint contract.
- CLI inspect parsing covers overview, versions, files, and file-content flows.
- Existing import-button click-stop behavior does not regress.

### Manual

- Click a skill from the menu and confirm the drawer opens on the right.
- Open the same skill from card and list views and confirm the drawer behavior matches.
- Switch between tabs and confirm loading is lazy.
- Select different versions and verify file lists update.
- Open `SKILL.md` and confirm Markdown rendering still works.
- Open another text file and confirm plain-text rendering works.

## Files Expected To Change

- `src/components/ClawHub/SkillDetailDrawer.tsx`
- `src/components/ClawHub/SkillGrid.tsx`
- any ClawHub menu component that currently handles skill selection without opening the shared drawer
- `src/stores/clawhubStore.ts`
- `src/api/clawhub.ts`
- `src/types/index.ts`
- `src/components/ClawHub/ClawHubPage.test.tsx`
- additional ClawHub drawer/store tests as needed
- `src-tauri/src/commands/clawhub.rs`
- `src-tauri/src/services/clawhub_service.rs`
- `src-tauri/src/models/clawhub.rs`

## Acceptance Criteria

- Clicking a ClawHub menu skill opens the shared right-side drawer.
- The drawer contains `Overview`, `Versions`, and `Files` tabs.
- The drawer defaults to `Overview`.
- `Versions` and `Files` load lazily.
- API-backed sources use documented ClawHub HTTP API inspect endpoints.
- CLI-backed sources use documented `clawhub inspect` flags.
- `SKILL.md` is loaded through the file-view path, not an undocumented API route.
- Switching versions updates version context and resets file selection state.
- Existing browse and import flows continue to work.
