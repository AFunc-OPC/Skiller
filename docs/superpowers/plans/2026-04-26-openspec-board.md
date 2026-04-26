# OpenSpec Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a project-scoped OpenSpec board that opens from project details, shows aggregated change/status/file data for the current project, supports Markdown preview and file opening, and provides an OpenSpec-oriented terminal panel for initialization.

**Architecture:** Extend the existing module-switching app shell instead of introducing a router. Add a dedicated OpenSpec board feature slice on both sides: a Tauri OpenSpec aggregation service/command layer that produces stable view models, and a React page/state layer that renders project-scoped board states, file previews, and a terminal panel with explicit refresh boundaries.

**Tech Stack:** React 18, TypeScript, Zustand, Vitest, Tauri 2, Rust, serde/serde_json, existing shell utilities

---

### Task 1: Add Shared OpenSpec Types and API Surface

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/api/openspec.ts`
- Test: `src/pages/ProjectsPage.test.tsx`

- [ ] **Step 1: Write the failing test for the new entry callback from project details**

```tsx
it('shows an OpenSpec board entry in the project detail drawer', async () => {
  const user = userEvent.setup()

  vi.mocked(useProjectStore).mockReturnValue({
    projects: [
      {
        id: 'project-1',
        name: 'OpenSpec Demo',
        path: '/Users/demo/project',
        skill_path: '.skills',
        tool_preset_id: null,
        description: 'demo',
        icon: null,
        is_builtin: false,
        created_at: '2026-04-01T00:00:00Z',
        updated_at: '2026-04-01T00:00:00Z',
      },
    ],
    createProject: mocks.createProject,
    updateProject: mocks.updateProject,
    deleteProject: mocks.deleteProject,
    projectSkills: [],
    projectSkillsByPreset: {},
    projectSkillsLoading: false,
    projectSkillsError: null,
    toolPresets: [],
    selectedPresetId: null,
    fetchProjectSkillsByPresets: vi.fn(),
    fetchToolPresets: vi.fn(),
    selectPreset: vi.fn(),
    removeProjectSkill: vi.fn(),
    toggleProjectSkillStatus: vi.fn(),
    batchRemoveProjectSkills: vi.fn(),
    batchToggleProjectSkills: vi.fn(),
    clearProjectSkills: vi.fn(),
  })

  const onOpenOpenSpecBoard = vi.fn()
  render(<ProjectsPage onOpenOpenSpecBoard={onOpenOpenSpecBoard} />)

  await user.click(await screen.findByText('OpenSpec Demo'))
  await user.click(screen.getByRole('button', { name: '打开 OpenSpec 看板' }))

  expect(onOpenOpenSpecBoard).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'project-1', name: 'OpenSpec Demo' }),
  )
})
```

- [ ] **Step 2: Run the page test to verify it fails**

Run: `npm test -- src/pages/ProjectsPage.test.tsx`
Expected: FAIL because `ProjectsPage` does not accept `onOpenOpenSpecBoard` and no OpenSpec entry button exists.

- [ ] **Step 3: Add TypeScript types for OpenSpec board data**

```ts
export type OpenSpecProjectState = 'cli_unavailable' | 'not_initialized' | 'ready_empty' | 'ready'

export interface OpenSpecArtifactSummary {
  id: 'proposal' | 'design' | 'tasks' | 'specs'
  label: string
  exists: boolean
  path: string | null
  updated_at: string | null
}

export interface OpenSpecTaskProgress {
  total: number
  completed: number
}

export interface OpenSpecValidationSummary {
  level: 'ok' | 'warning' | 'critical' | 'error'
  message: string
}

export interface OpenSpecChangeSummary {
  id: string
  title: string
  archived: boolean
  path: string
  updated_at: string | null
  summary: string
  task_progress: OpenSpecTaskProgress
  artifacts: OpenSpecArtifactSummary[]
  validation: OpenSpecValidationSummary | null
}

export interface OpenSpecDocumentPreview {
  kind: 'markdown'
  title: string
  path: string
  updated_at: string | null
  content: string
}

export interface OpenSpecSpecFileSummary {
  path: string
  title: string
  updated_at: string | null
}

export interface OpenSpecChangeDetail {
  change: OpenSpecChangeSummary
  overview_markdown: string
  proposal: OpenSpecDocumentPreview | null
  design: OpenSpecDocumentPreview | null
  tasks: OpenSpecDocumentPreview | null
  specs: OpenSpecSpecFileSummary[]
}

export interface OpenSpecBoardSnapshot {
  project_id: string
  project_path: string
  state: OpenSpecProjectState
  cli_message: string | null
  changes: OpenSpecChangeSummary[]
  archived_changes: OpenSpecChangeSummary[]
}
```

- [ ] **Step 4: Add the frontend OpenSpec API wrapper**

```ts
import { invoke } from './tauri'
import type {
  OpenSpecBoardSnapshot,
  OpenSpecChangeDetail,
  OpenSpecDocumentPreview,
} from '../types'

export const openspecApi = {
  getBoardSnapshot: async (projectId: string): Promise<OpenSpecBoardSnapshot> => {
    return await invoke('get_openspec_board_snapshot', { projectId })
  },

  getChangeDetail: async (projectId: string, changeId: string): Promise<OpenSpecChangeDetail> => {
    return await invoke('get_openspec_change_detail', { projectId, changeId })
  },

  getSpecDocument: async (
    projectId: string,
    changeId: string,
    specPath: string,
  ): Promise<OpenSpecDocumentPreview> => {
    return await invoke('get_openspec_spec_document', { projectId, changeId, specPath })
  },
}
```

- [ ] **Step 5: Update `ProjectsPage` to accept the callback without changing behavior yet**

```tsx
interface ProjectsPageProps {
  onOpenOpenSpecBoard?: (project: Project) => void
}

export function ProjectsPage({ onOpenOpenSpecBoard }: ProjectsPageProps) {
  // existing body
}
```

- [ ] **Step 6: Run the page test again to confirm the button is still missing**

Run: `npm test -- src/pages/ProjectsPage.test.tsx`
Expected: FAIL with query error for `打开 OpenSpec 看板`.

- [ ] **Step 7: Commit the type and API groundwork**

```bash
git add src/types/index.ts src/api/openspec.ts src/pages/ProjectsPage.tsx src/pages/ProjectsPage.test.tsx
git commit -m "feat(openspec): add board types and frontend api"
```

### Task 2: Add Rust OpenSpec Models and Aggregation Helpers

**Files:**
- Create: `src-tauri/src/models/openspec.rs`
- Modify: `src-tauri/src/models/mod.rs`
- Create: `src-tauri/src/services/openspec_service.rs`
- Modify: `src-tauri/src/services/mod.rs`
- Test: `src-tauri/src/services/openspec_service.rs`

- [ ] **Step 1: Write the failing Rust test for task checkbox parsing**

```rust
#[cfg(test)]
mod tests {
    use super::parse_task_progress;

    #[test]
    fn parses_markdown_checkbox_progress() {
        let markdown = "- [x] create proposal\n- [ ] implement board\n- [x] add tests\n";
        let progress = parse_task_progress(markdown);

        assert_eq!(progress.total, 3);
        assert_eq!(progress.completed, 2);
    }
}
```

- [ ] **Step 2: Run the Rust test target to verify it fails**

Run: `cargo test parse_task_progress --manifest-path src-tauri/Cargo.toml`
Expected: FAIL because `openspec_service.rs` and `parse_task_progress` do not exist.

- [ ] **Step 3: Add Rust models for the OpenSpec board payloads**

```rust
use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct OpenSpecTaskProgress {
    pub total: usize,
    pub completed: usize,
}

#[derive(Debug, Serialize, Clone)]
pub struct OpenSpecArtifactSummary {
    pub id: String,
    pub label: String,
    pub exists: bool,
    pub path: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct OpenSpecValidationSummary {
    pub level: String,
    pub message: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct OpenSpecChangeSummary {
    pub id: String,
    pub title: String,
    pub archived: bool,
    pub path: String,
    pub updated_at: Option<String>,
    pub summary: String,
    pub task_progress: OpenSpecTaskProgress,
    pub artifacts: Vec<OpenSpecArtifactSummary>,
    pub validation: Option<OpenSpecValidationSummary>,
}

#[derive(Debug, Serialize, Clone)]
pub struct OpenSpecDocumentPreview {
    pub kind: String,
    pub title: String,
    pub path: String,
    pub updated_at: Option<String>,
    pub content: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct OpenSpecSpecFileSummary {
    pub path: String,
    pub title: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct OpenSpecChangeDetail {
    pub change: OpenSpecChangeSummary,
    pub overview_markdown: String,
    pub proposal: Option<OpenSpecDocumentPreview>,
    pub design: Option<OpenSpecDocumentPreview>,
    pub tasks: Option<OpenSpecDocumentPreview>,
    pub specs: Vec<OpenSpecSpecFileSummary>,
}

#[derive(Debug, Serialize, Clone)]
pub struct OpenSpecBoardSnapshot {
    pub project_id: String,
    pub project_path: String,
    pub state: String,
    pub cli_message: Option<String>,
    pub changes: Vec<OpenSpecChangeSummary>,
    pub archived_changes: Vec<OpenSpecChangeSummary>,
}
```

- [ ] **Step 4: Create the service helper skeleton and the first passing parser**

```rust
use crate::models::openspec::OpenSpecTaskProgress;

pub fn parse_task_progress(markdown: &str) -> OpenSpecTaskProgress {
    let mut total = 0;
    let mut completed = 0;

    for line in markdown.lines() {
        let trimmed = line.trim_start();
        if trimmed.starts_with("- [") {
            total += 1;
            if trimmed.starts_with("- [x]") || trimmed.starts_with("- [X]") {
                completed += 1;
            }
        }
    }

    OpenSpecTaskProgress { total, completed }
}
```

- [ ] **Step 5: Export the new Rust modules**

```rust
// src-tauri/src/models/mod.rs
pub mod openspec;

// src-tauri/src/services/mod.rs
pub mod openspec_service;
```

- [ ] **Step 6: Add small file helper tests for artifact existence and markdown loading**

```rust
#[test]
fn returns_none_for_missing_markdown_document() {
    let temp = tempfile::tempdir().unwrap();
    let missing = temp.path().join("proposal.md");

    let document = read_markdown_document(&missing, "Proposal").unwrap();

    assert!(document.is_none());
}
```

- [ ] **Step 7: Add the `tempfile` dev dependency if missing**

```toml
[dev-dependencies]
tempfile = "3.13"
```

- [ ] **Step 8: Run the Rust tests to verify the helpers pass**

Run: `cargo test openspec_service --manifest-path src-tauri/Cargo.toml`
Expected: PASS for parser/helper tests in `openspec_service.rs`.

- [ ] **Step 9: Commit the Rust model and helper layer**

```bash
git add src-tauri/Cargo.toml src-tauri/src/models/mod.rs src-tauri/src/models/openspec.rs src-tauri/src/services/mod.rs src-tauri/src/services/openspec_service.rs
git commit -m "feat(openspec): add board models and helper service"
```

### Task 3: Implement Rust Commands for Snapshot, Detail, Spec Preview, and File Opening

**Files:**
- Create: `src-tauri/src/commands/openspec.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/src/services/openspec_service.rs`
- Modify: `src-tauri/src/commands/desktop.rs`
- Test: `src-tauri/src/services/openspec_service.rs`

- [ ] **Step 1: Write the failing Rust test for project state detection**

```rust
#[test]
fn reports_not_initialized_when_project_has_no_openspec_dir() {
    let temp = tempfile::tempdir().unwrap();
    let state = detect_project_state(temp.path(), true);

    assert_eq!(state, "not_initialized");
}
```

- [ ] **Step 2: Run the state-detection test to verify it fails**

Run: `cargo test detect_project_state --manifest-path src-tauri/Cargo.toml`
Expected: FAIL because `detect_project_state` is not implemented.

- [ ] **Step 3: Implement CLI/state detection and snapshot assembly helpers**

```rust
pub fn detect_project_state(project_path: &Path, cli_available: bool) -> String {
    if !cli_available {
        return "cli_unavailable".to_string();
    }

    let openspec_dir = project_path.join("openspec");
    if !openspec_dir.exists() {
        return "not_initialized".to_string();
    }

    let changes_dir = openspec_dir.join("changes");
    if !changes_dir.exists() {
        return "not_initialized".to_string();
    }

    "ready".to_string()
}
```

- [ ] **Step 4: Add a generic shell runner for OpenSpec commands in the project directory**

```rust
fn run_openspec_json(project_path: &Path, args: &[&str]) -> Result<serde_json::Value, SkillerError> {
    let output = crate::utils::shell::get_shell_command("openspec")
        .current_dir(project_path)
        .args(args)
        .arg("--json")
        .output()?;

    if !output.status.success() {
        return Err(SkillerError::InvalidInput(String::from_utf8_lossy(&output.stderr).trim().to_string()));
    }

    Ok(serde_json::from_slice(&output.stdout)?)
}
```

- [ ] **Step 5: Implement board snapshot aggregation methods**

```rust
pub fn get_board_snapshot(conn: &Connection, project_id: &str) -> Result<OpenSpecBoardSnapshot, SkillerError> {
    let project = project_service::get_project_by_id(conn, project_id)?;
    let project_path = PathBuf::from(&project.path);
    let cli_available = check_command_available("openspec", "--version");
    let state = detect_project_state(&project_path, cli_available);

    if state == "cli_unavailable" || state == "not_initialized" {
        return Ok(OpenSpecBoardSnapshot {
            project_id: project.id,
            project_path: project.path,
            state,
            cli_message: Some("OpenSpec 不可用或当前项目尚未初始化".to_string()),
            changes: Vec::new(),
            archived_changes: Vec::new(),
        });
    }

    let changes = load_change_summaries(&project_path, false)?;
    let archived_changes = load_change_summaries(&project_path, true)?;
    let effective_state = if changes.is_empty() && archived_changes.is_empty() {
        "ready_empty".to_string()
    } else {
        "ready".to_string()
    };

    Ok(OpenSpecBoardSnapshot {
        project_id: project.id,
        project_path: project.path,
        state: effective_state,
        cli_message: None,
        changes,
        archived_changes,
    })
}
```

- [ ] **Step 6: Implement detail/document helpers and Tauri commands**

```rust
#[tauri::command]
pub fn get_openspec_board_snapshot(db: State<'_, DbConnection>, project_id: String) -> Result<OpenSpecBoardSnapshot, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    openspec_service::get_board_snapshot(&conn, &project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_openspec_change_detail(db: State<'_, DbConnection>, project_id: String, change_id: String) -> Result<OpenSpecChangeDetail, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    openspec_service::get_change_detail(&conn, &project_id, &change_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_openspec_spec_document(db: State<'_, DbConnection>, project_id: String, change_id: String, spec_path: String) -> Result<OpenSpecDocumentPreview, String> {
    let conn = get_connection(&db).map_err(|e| e.to_string())?;
    openspec_service::get_spec_document(&conn, &project_id, &change_id, &spec_path).map_err(|e| e.to_string())
}
```

- [ ] **Step 7: Extend desktop opening for individual files**

```rust
#[tauri::command]
pub async fn open_path(path: String, app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;

    let expanded_path = expand_tilde(&path);
    let _ = app.opener().open_path(&expanded_path, None::<&str>);
    Ok(())
}
```

- [ ] **Step 8: Register the commands and exports**

```rust
// src-tauri/src/commands/mod.rs
pub mod openspec;

// src-tauri/src/main.rs
skiller::commands::openspec::get_openspec_board_snapshot,
skiller::commands::openspec::get_openspec_change_detail,
skiller::commands::openspec::get_openspec_spec_document,
skiller::commands::desktop::open_path,
```

- [ ] **Step 9: Run the Rust tests and a compile check**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: PASS with the new OpenSpec aggregation and command tests.

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: PASS.

- [ ] **Step 10: Commit the backend command layer**

```bash
git add src-tauri/src/commands/mod.rs src-tauri/src/commands/openspec.rs src-tauri/src/commands/desktop.rs src-tauri/src/main.rs src-tauri/src/services/openspec_service.rs
git commit -m "feat(openspec): add board snapshot tauri commands"
```

### Task 4: Add Frontend Store and Board Page Shell

**Files:**
- Create: `src/stores/openspecStore.ts`
- Create: `src/pages/OpenSpecBoardPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/pages/ProjectsPage.tsx`
- Test: `src/pages/ProjectsPage.test.tsx`
- Test: `src/pages/OpenSpecBoardPage.test.tsx`

- [ ] **Step 1: Write the failing page-shell test for full-screen board rendering**

```tsx
it('renders the OpenSpec board page when activeProjectBoard is set', async () => {
  render(<App />)

  await userEvent.click(screen.getByRole('button', { name: '项目管理' }))
  // trigger callback in a mocked ProjectsPage
  mockedProjectsPageProps.onOpenOpenSpecBoard({
    id: 'project-1',
    name: 'OpenSpec Demo',
    path: '/Users/demo/project',
    skill_path: '.skills',
    tool_preset_id: null,
    description: null,
    icon: null,
    is_builtin: false,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
  })

  expect(await screen.findByText('OpenSpec Demo / OpenSpec')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the new frontend test to verify it fails**

Run: `npm test -- src/pages/OpenSpecBoardPage.test.tsx`
Expected: FAIL because the page/store do not exist.

- [ ] **Step 3: Add the OpenSpec Zustand store**

```ts
import { create } from 'zustand'
import { openspecApi } from '../api/openspec'
import type { OpenSpecBoardSnapshot, OpenSpecChangeDetail, OpenSpecDocumentPreview } from '../types'

interface OpenSpecState {
  snapshot: OpenSpecBoardSnapshot | null
  selectedChangeId: string | null
  currentDetail: OpenSpecChangeDetail | null
  currentSpecDocument: OpenSpecDocumentPreview | null
  loading: boolean
  error: string | null
  fetchSnapshot: (projectId: string) => Promise<void>
  fetchDetail: (projectId: string, changeId: string) => Promise<void>
  fetchSpecDocument: (projectId: string, changeId: string, specPath: string) => Promise<void>
  clear: () => void
}

export const useOpenSpecStore = create<OpenSpecState>((set) => ({
  snapshot: null,
  selectedChangeId: null,
  currentDetail: null,
  currentSpecDocument: null,
  loading: false,
  error: null,
  async fetchSnapshot(projectId) {
    set({ loading: true, error: null })
    try {
      const snapshot = await openspecApi.getBoardSnapshot(projectId)
      set({
        snapshot,
        selectedChangeId: snapshot.changes[0]?.id ?? null,
        loading: false,
      })
    } catch (error) {
      set({ loading: false, error: String(error) })
    }
  },
  async fetchDetail(projectId, changeId) {
    const detail = await openspecApi.getChangeDetail(projectId, changeId)
    set({ currentDetail: detail, selectedChangeId: changeId, currentSpecDocument: null })
  },
  async fetchSpecDocument(projectId, changeId, specPath) {
    const document = await openspecApi.getSpecDocument(projectId, changeId, specPath)
    set({ currentSpecDocument: document })
  },
  clear() {
    set({ snapshot: null, selectedChangeId: null, currentDetail: null, currentSpecDocument: null, loading: false, error: null })
  },
}))
```

- [ ] **Step 4: Add the first version of the board page shell**

```tsx
interface OpenSpecBoardPageProps {
  project: Project
  onBack: () => void
}

export function OpenSpecBoardPage({ project, onBack }: OpenSpecBoardPageProps) {
  const { snapshot, loading, error, fetchSnapshot } = useOpenSpecStore()

  useEffect(() => {
    void fetchSnapshot(project.id)
  }, [fetchSnapshot, project.id])

  return (
    <div className="osb-page">
      <header className="osb-header">
        <button onClick={onBack}>返回项目</button>
        <h1>{project.name} / OpenSpec</h1>
        <button onClick={() => void fetchSnapshot(project.id)}>刷新</button>
      </header>
      <main>
        {loading && <p>加载中…</p>}
        {error && <p>{error}</p>}
        {snapshot && <p>{snapshot.state}</p>}
      </main>
    </div>
  )
}
```

- [ ] **Step 5: Connect `App.tsx` with a board-specific full-screen view state**

```tsx
const [activeOpenSpecProject, setActiveOpenSpecProject] = useState<Project | null>(null)

if (activeOpenSpecProject) {
  return (
    <div className="app-shell">
      <div className="desktop-frame">
        <Sidebar ... />
        <main className="workspace">
          <div className="workspace-grid workspace-full no-rail">
            <section className="stage glass-panel">
              <OpenSpecBoardPage
                project={activeOpenSpecProject}
                onBack={() => setActiveOpenSpecProject(null)}
              />
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Wire `ProjectsPage` to render the entry button in the detail drawer**

```tsx
{onOpenOpenSpecBoard && (
  <button
    className="pm-btn-primary"
    onClick={() => onOpenOpenSpecBoard(selectedProject)}
  >
    {language === 'zh' ? '打开 OpenSpec 看板' : 'Open OpenSpec Board'}
  </button>
)}
```

- [ ] **Step 7: Run the page tests to verify the shell flow passes**

Run: `npm test -- src/pages/ProjectsPage.test.tsx src/pages/OpenSpecBoardPage.test.tsx`
Expected: PASS with the entry callback and page shell behavior.

- [ ] **Step 8: Commit the frontend board shell**

```bash
git add src/App.tsx src/pages/ProjectsPage.tsx src/stores/openspecStore.ts src/pages/OpenSpecBoardPage.tsx src/pages/ProjectsPage.test.tsx src/pages/OpenSpecBoardPage.test.tsx
git commit -m "feat(openspec): add board page shell"
```

### Task 5: Render Ready, Empty, and Error States in the Board Page

**Files:**
- Modify: `src/pages/OpenSpecBoardPage.tsx`
- Modify: `src/api/desktop.ts`
- Test: `src/pages/OpenSpecBoardPage.test.tsx`

- [ ] **Step 1: Write failing tests for the top-level board states**

```tsx
it('shows a not-initialized empty state with a terminal entry', async () => {
  mocks.fetchSnapshot.mockResolvedValue({
    project_id: 'project-1',
    project_path: '/Users/demo/project',
    state: 'not_initialized',
    cli_message: '当前项目尚未初始化 OpenSpec',
    changes: [],
    archived_changes: [],
  })

  renderBoard()

  expect(await screen.findByText('当前项目尚未初始化 OpenSpec')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '打开 OpenSpec 终端' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the board test file to verify the state assertions fail**

Run: `npm test -- src/pages/OpenSpecBoardPage.test.tsx`
Expected: FAIL because the page currently only renders raw `snapshot.state`.

- [ ] **Step 3: Add desktop file-opening support for documents**

```ts
openPath: async (path: string): Promise<void> => {
  return await invoke('open_path', { path })
},
```

- [ ] **Step 4: Implement explicit board state views**

```tsx
if (loading) {
  return <div className="osb-empty-state"><p>加载 OpenSpec 看板中…</p></div>
}

if (error) {
  return <div className="osb-empty-state"><p>{error}</p></div>
}

if (snapshot?.state === 'cli_unavailable') {
  return (
    <div className="osb-empty-state">
      <h2>未检测到 OpenSpec CLI</h2>
      <p>{snapshot.cli_message ?? '当前环境无法执行 openspec 命令。'}</p>
      <button onClick={onOpenTerminal}>打开 OpenSpec 终端</button>
    </div>
  )
}

if (snapshot?.state === 'not_initialized') {
  return (
    <div className="osb-empty-state">
      <h2>当前项目尚未初始化 OpenSpec</h2>
      <p>{snapshot.cli_message ?? '可在当前项目目录中执行 openspec init。'}</p>
      <button onClick={onOpenTerminal}>打开 OpenSpec 终端</button>
    </div>
  )
}

if (snapshot?.state === 'ready_empty') {
  return (
    <div className="osb-empty-state">
      <h2>当前项目暂无 OpenSpec change</h2>
      <p>OpenSpec 已可用，但还没有可展示的 changes。</p>
      <button onClick={onOpenTerminal}>打开 OpenSpec 终端</button>
    </div>
  )
}
```

- [ ] **Step 5: Keep the toolbar visible even for empty/error states**

```tsx
return (
  <div className="osb-page">
    <header className="osb-header">...</header>
    <section className="osb-content">{content}</section>
  </div>
)
```

- [ ] **Step 6: Run the board tests again**

Run: `npm test -- src/pages/OpenSpecBoardPage.test.tsx`
Expected: PASS for `cli_unavailable`, `not_initialized`, `ready_empty`, and generic error states.

- [ ] **Step 7: Commit the top-level state handling**

```bash
git add src/api/desktop.ts src/pages/OpenSpecBoardPage.tsx src/pages/OpenSpecBoardPage.test.tsx
git commit -m "feat(openspec): add board state views"
```

### Task 6: Implement Change List, Filters, and Detail Loading

**Files:**
- Modify: `src/pages/OpenSpecBoardPage.tsx`
- Modify: `src/stores/openspecStore.ts`
- Test: `src/pages/OpenSpecBoardPage.test.tsx`

- [ ] **Step 1: Write the failing test for default change selection and archived filtering**

```tsx
it('defaults to the first active change and can switch to archived changes', async () => {
  mocks.fetchSnapshot.mockResolvedValue({
    project_id: 'project-1',
    project_path: '/Users/demo/project',
    state: 'ready',
    cli_message: null,
    changes: [
      createChange('add-board', false),
      createChange('preview-files', false),
    ],
    archived_changes: [createChange('archived-change', true)],
  })
  mocks.fetchDetail.mockResolvedValue(createDetail('add-board'))

  renderBoard()

  expect(await screen.findByText('add-board')).toBeInTheDocument()
  expect(await screen.findByRole('heading', { name: 'add-board' })).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: '已归档' }))

  expect(await screen.findByText('archived-change')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the board test to verify it fails**

Run: `npm test -- src/pages/OpenSpecBoardPage.test.tsx`
Expected: FAIL because the ready-state board layout does not exist yet.

- [ ] **Step 3: Add view state for the current filter and detail loading**

```ts
const [changeFilter, setChangeFilter] = useState<'active' | 'archived' | 'all'>('active')

useEffect(() => {
  if (snapshot?.changes[0]?.id) {
    void fetchDetail(project.id, snapshot.changes[0].id)
  }
}, [fetchDetail, project.id, snapshot])
```

- [ ] **Step 4: Render the change list and summary cards**

```tsx
const visibleChanges = changeFilter === 'archived'
  ? snapshot.archived_changes
  : changeFilter === 'all'
    ? [...snapshot.changes, ...snapshot.archived_changes]
    : snapshot.changes

<aside className="osb-change-list">
  {visibleChanges.map((change) => (
    <button
      key={change.id}
      className={change.id === selectedChangeId ? 'osb-change-card active' : 'osb-change-card'}
      onClick={() => void fetchDetail(project.id, change.id)}
    >
      <strong>{change.title}</strong>
      <span>{change.task_progress.completed}/{change.task_progress.total} tasks</span>
      <span>{change.validation?.message ?? '无风险提示'}</span>
    </button>
  ))}
</aside>
```

- [ ] **Step 5: Render the detail overview panel for the selected change**

```tsx
<section className="osb-detail-shell">
  <header className="osb-detail-header">
    <h2>{currentDetail?.change.title}</h2>
    <button onClick={() => void fetchDetail(project.id, currentDetail!.change.id)}>刷新当前 change</button>
  </header>
  <article className="osb-overview-markdown">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>
      {currentDetail?.overview_markdown ?? ''}
    </ReactMarkdown>
  </article>
</section>
```

- [ ] **Step 6: Run the board tests again**

Run: `npm test -- src/pages/OpenSpecBoardPage.test.tsx`
Expected: PASS for active/archived/all filters, default selection, and detail loading.

- [ ] **Step 7: Commit the list/detail loading layer**

```bash
git add src/pages/OpenSpecBoardPage.tsx src/stores/openspecStore.ts src/pages/OpenSpecBoardPage.test.tsx
git commit -m "feat(openspec): add board change list and detail loading"
```

### Task 7: Add Artifact Tabs and Markdown/File Preview

**Files:**
- Modify: `src/pages/OpenSpecBoardPage.tsx`
- Test: `src/pages/OpenSpecBoardPage.test.tsx`

- [ ] **Step 1: Write the failing test for artifact tab switching and file preview**

```tsx
it('switches between proposal, design, tasks, and specs previews', async () => {
  mocks.fetchSnapshot.mockResolvedValue(createReadySnapshot())
  mocks.fetchDetail.mockResolvedValue(createDetail('add-board'))
  mocks.fetchSpecDocument.mockResolvedValue({
    kind: 'markdown',
    title: 'auth/spec.md',
    path: '/Users/demo/project/openspec/changes/add-board/specs/auth/spec.md',
    updated_at: '2026-04-26T12:00:00Z',
    content: '# Auth Spec',
  })

  renderBoard()

  await userEvent.click(await screen.findByRole('button', { name: 'Tasks' }))
  expect(await screen.findByText('Task list body')).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: 'Specs' }))
  await userEvent.click(screen.getByRole('button', { name: 'auth/spec.md' }))
  expect(await screen.findByText('Auth Spec')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/pages/OpenSpecBoardPage.test.tsx`
Expected: FAIL because artifact tabs and preview rendering are not implemented.

- [ ] **Step 3: Add local UI state for the selected artifact tab**

```ts
const [activeArtifact, setActiveArtifact] = useState<'overview' | 'proposal' | 'design' | 'tasks' | 'specs'>('overview')
```

- [ ] **Step 4: Render the artifact tabs and Markdown previews**

```tsx
<nav className="osb-artifact-tabs">
  {['overview', 'proposal', 'design', 'tasks', 'specs'].map((tab) => (
    <button key={tab} onClick={() => setActiveArtifact(tab as typeof activeArtifact)}>
      {tab === 'overview' ? 'Overview' : tab.charAt(0).toUpperCase() + tab.slice(1)}
    </button>
  ))}
</nav>

{activeArtifact === 'proposal' && currentDetail?.proposal && (
  <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentDetail.proposal.content}</ReactMarkdown>
)}
```

- [ ] **Step 5: Add the specs tree and preview loader**

```tsx
{activeArtifact === 'specs' && (
  <div className="osb-specs-layout">
    <aside>
      {currentDetail?.specs.map((spec) => (
        <button
          key={spec.path}
          onClick={() => void fetchSpecDocument(project.id, currentDetail.change.id, spec.path)}
        >
          {spec.title}
        </button>
      ))}
    </aside>
    <section>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {currentSpecDocument?.content ?? '请选择一个 spec 文件'}
      </ReactMarkdown>
    </section>
  </div>
)}
```

- [ ] **Step 6: Add “open original file” actions for each preview**

```tsx
<button onClick={() => void desktopApi.openPath(currentDetail.proposal!.path)}>
  打开原文件
</button>
```

- [ ] **Step 7: Run the board preview tests again**

Run: `npm test -- src/pages/OpenSpecBoardPage.test.tsx`
Expected: PASS for tab switching, spec file loading, and open-original-file actions.

- [ ] **Step 8: Commit the preview experience**

```bash
git add src/pages/OpenSpecBoardPage.tsx src/pages/OpenSpecBoardPage.test.tsx
git commit -m "feat(openspec): add artifact previews"
```

### Task 8: Add the OpenSpec Terminal Panel With Explicit Refresh Boundaries

**Files:**
- Create: `src/components/OpenSpec/OpenSpecTerminalPanel.tsx`
- Create: `src/api/openspecTerminal.ts`
- Create: `src-tauri/src/commands/openspec_terminal.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/main.rs`
- Modify: `src/pages/OpenSpecBoardPage.tsx`
- Test: `src/pages/OpenSpecBoardPage.test.tsx`

- [ ] **Step 1: Write the failing test for opening the terminal panel with a prefilled init command**

```tsx
it('opens an OpenSpec terminal panel prefilled with openspec init', async () => {
  mocks.fetchSnapshot.mockResolvedValue(createNotInitializedSnapshot())

  renderBoard()

  await userEvent.click(await screen.findByRole('button', { name: '打开 OpenSpec 终端' }))

  expect(screen.getByDisplayValue('openspec init')).toBeInTheDocument()
  expect(screen.getByText('/Users/demo/project')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the board test to verify it fails**

Run: `npm test -- src/pages/OpenSpecBoardPage.test.tsx`
Expected: FAIL because no terminal panel exists.

- [ ] **Step 3: Add a minimal command execution API instead of a full PTY**

```ts
import { invoke } from './tauri'

export const openspecTerminalApi = {
  execute: async (projectPath: string, command: string): Promise<{ stdout: string; stderr: string; success: boolean }> => {
    return await invoke('execute_openspec_terminal_command', { projectPath, command })
  },
}
```

- [ ] **Step 4: Implement a guarded Rust terminal command runner**

```rust
#[derive(Debug, Serialize)]
pub struct OpenSpecTerminalResult {
    pub stdout: String,
    pub stderr: String,
    pub success: bool,
}

#[tauri::command]
pub fn execute_openspec_terminal_command(project_path: String, command: String) -> Result<OpenSpecTerminalResult, String> {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
    let output = std::process::Command::new(shell)
        .current_dir(Path::new(&project_path))
        .args(["-i", "-l", "-c", &command])
        .output()
        .map_err(|error| error.to_string())?;

    Ok(OpenSpecTerminalResult {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        success: output.status.success(),
    })
}
```

- [ ] **Step 5: Add the terminal panel component with prefilled command editing**

```tsx
export function OpenSpecTerminalPanel({
  projectPath,
  initialCommand,
  isOpen,
  onClose,
}: {
  projectPath: string
  initialCommand: string
  isOpen: boolean
  onClose: () => void
}) {
  const [command, setCommand] = useState(initialCommand)
  const [output, setOutput] = useState('')

  if (!isOpen) return null

  return (
    <section className="osb-terminal-panel">
      <p>{projectPath}</p>
      <textarea value={command} onChange={(event) => setCommand(event.target.value)} />
      <button
        onClick={async () => {
          const result = await openspecTerminalApi.execute(projectPath, command)
          setOutput([result.stdout, result.stderr].filter(Boolean).join('\n'))
        }}
      >
        执行
      </button>
      <pre>{output || '等待执行...'}</pre>
    </section>
  )
}
```

- [ ] **Step 6: Wire the terminal panel into the board page and keep refresh explicit**

```tsx
const [terminalOpen, setTerminalOpen] = useState(false)

<button onClick={() => setTerminalOpen(true)}>打开 OpenSpec 终端</button>
<OpenSpecTerminalPanel
  isOpen={terminalOpen}
  projectPath={project.path}
  initialCommand="openspec init"
  onClose={() => setTerminalOpen(false)}
/>

<button onClick={() => void fetchSnapshot(project.id)}>刷新</button>
```

- [ ] **Step 7: Add a test that terminal output does not mutate snapshot state until refresh**

```tsx
it('does not update board state until refresh is pressed after terminal execution', async () => {
  mocks.executeTerminal.mockResolvedValue({ stdout: 'initialized', stderr: '', success: true })
  renderBoard()

  await userEvent.click(await screen.findByRole('button', { name: '打开 OpenSpec 终端' }))
  await userEvent.click(screen.getByRole('button', { name: '执行' }))

  expect(screen.getByText('initialized')).toBeInTheDocument()
  expect(mocks.fetchSnapshot).toHaveBeenCalledTimes(1)

  await userEvent.click(screen.getByRole('button', { name: '刷新' }))
  expect(mocks.fetchSnapshot).toHaveBeenCalledTimes(2)
})
```

- [ ] **Step 8: Run the relevant frontend and Rust tests**

Run: `npm test -- src/pages/OpenSpecBoardPage.test.tsx`
Expected: PASS.

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: PASS.

- [ ] **Step 9: Commit the terminal panel feature**

```bash
git add src/components/OpenSpec/OpenSpecTerminalPanel.tsx src/api/openspecTerminal.ts src/pages/OpenSpecBoardPage.tsx src/pages/OpenSpecBoardPage.test.tsx src-tauri/src/commands/mod.rs src-tauri/src/commands/openspec_terminal.rs src-tauri/src/main.rs
git commit -m "feat(openspec): add initialization terminal panel"
```

### Task 9: Add Styling, Focus Refresh, and Final Verification

**Files:**
- Modify: `src/index.css`
- Modify: `src/pages/OpenSpecBoardPage.tsx`
- Test: `src/pages/OpenSpecBoardPage.test.tsx`

- [ ] **Step 1: Write the failing test for focus-triggered refresh**

```tsx
it('refreshes the snapshot when the window regains focus', async () => {
  renderBoard()

  await screen.findByText('add-board')
  window.dispatchEvent(new Event('focus'))

  await waitFor(() => {
    expect(mocks.fetchSnapshot).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Run the focus-refresh test to verify it fails**

Run: `npm test -- src/pages/OpenSpecBoardPage.test.tsx`
Expected: FAIL because no focus listener exists.

- [ ] **Step 3: Add the focus-based refresh effect**

```tsx
useEffect(() => {
  const handleFocus = () => {
    void fetchSnapshot(project.id)
  }

  window.addEventListener('focus', handleFocus)
  return () => window.removeEventListener('focus', handleFocus)
}, [fetchSnapshot, project.id])
```

- [ ] **Step 4: Add dedicated board styles in `src/index.css`**

```css
.osb-page {
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100%;
  gap: 16px;
}

.osb-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
  min-height: 0;
}

.osb-terminal-panel {
  border-top: 1px solid var(--border-color);
  padding: 16px;
  background: rgba(15, 23, 42, 0.92);
  color: #e5f0ff;
}
```

- [ ] **Step 5: Add a mobile fallback layout rule**

```css
@media (max-width: 960px) {
  .osb-layout {
    grid-template-columns: 1fr;
  }

  .osb-change-list {
    max-height: 240px;
  }
}
```

- [ ] **Step 6: Run the full frontend and backend verification commands**

Run: `npm test`
Expected: PASS.

Run: `npm run build`
Expected: PASS.

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: PASS.

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: PASS.

- [ ] **Step 7: Commit the final integration pass**

```bash
git add src/index.css src/pages/OpenSpecBoardPage.tsx src/pages/OpenSpecBoardPage.test.tsx
git commit -m "feat(openspec): finalize board interactions"
```

## Plan Self-Review

- Spec coverage: the plan covers the project-detail entry, full-screen board page, top-level state handling, change overview and filters, file preview, original file opening, terminal-assisted initialization, explicit refresh behavior, and second-stage-safe boundaries. No spec section is left without at least one implementation task.
- Placeholder scan: no task includes `TBD`, `TODO`, “implement later”, or generic “write tests” language without concrete code and commands.
- Type consistency: frontend names use `OpenSpecBoardSnapshot`, `OpenSpecChangeDetail`, `OpenSpecDocumentPreview`, and `OpenSpecTaskProgress` consistently across the store, API, and page tasks; backend names use matching Rust structs under `models/openspec.rs` and service/command methods named `get_board_snapshot`, `get_change_detail`, and `get_spec_document`.
