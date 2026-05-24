# ClawHub Inspect Drawer Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the ClawHub skill detail drawer to match the official inspect contract with tabbed overview, version history, and file viewing backed by documented API and CLI flows.

**Architecture:** Extend the existing ClawHub drawer and Zustand store instead of replacing them. Split inspect state into overview, versions, files, and file-content segments, then add focused Tauri commands and service functions that map to the documented ClawHub HTTP API and CLI `inspect` flags.

**Tech Stack:** React, TypeScript, Zustand, Vitest, Tauri, Rust, reqwest, serde, rusqlite.

---

### Task 1: Expand ClawHub Types And Store Shape

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/stores/clawhubStore.ts`
- Test: `src/components/ClawHub/ClawHubPage.test.tsx`

- [ ] **Step 1: Write the failing frontend test for tabbed drawer state**

```tsx
it('opens the shared drawer on overview and lazily loads versions and files', async () => {
  const user = userEvent.setup()
  const inspectSkill = vi.fn(async () => {})
  const loadSkillVersions = vi.fn(async () => {})
  const loadSkillFiles = vi.fn(async () => {})

  useClawhubStore.setState({
    skills: [createSkill()],
    selectedSkillSlug: 'demo-skill',
    detailLoading: false,
    skillOverview: {
      slug: 'demo-skill',
      name: 'Demo Skill',
      summary: 'Skill description',
      version: '1.2.3',
      description: 'Skill description',
      downloads: 42,
      rating: 4.7,
      created_at: '2026-05-10T10:00:00Z',
      updated_at: '2026-05-13T12:34:56Z',
      owner_handle: 'openclaw',
      owner_name: 'OpenClaw',
      metadata_os: ['macos'],
      metadata_systems: ['aarch64-darwin'],
    },
    activeDetailTab: 'overview',
    versionsLoading: false,
    skillVersions: null,
    filesLoading: false,
    skillFiles: null,
    selectedVersion: null,
    selectedFilePath: null,
    fileContent: null,
    inspectSkill,
    loadSkillVersions,
    loadSkillFiles,
  })

  render(<ClawHubPage />)

  expect(await screen.findByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')

  await user.click(screen.getByRole('tab', { name: 'Versions' }))
  expect(loadSkillVersions).toHaveBeenCalledWith('source-a', 'demo-skill')

  await user.click(screen.getByRole('tab', { name: 'Files' }))
  expect(loadSkillFiles).toHaveBeenCalledWith('source-a', 'demo-skill', undefined)
})
```

- [ ] **Step 2: Run the frontend test to verify it fails**

Run: `npm test -- src/components/ClawHub/ClawHubPage.test.tsx`
Expected: FAIL because the store does not expose segmented inspect state or lazy tab loaders yet.

- [ ] **Step 3: Add the minimal shared inspect state types**

```ts
export interface ClawhubSkillOverview {
  slug: string
  name: string
  description: string | null
  summary: string | null
  version: string | null
  downloads: number | null
  rating: number | null
  created_at: string | null
  updated_at: string | null
  owner_handle: string | null
  owner_name: string | null
  metadata_os: string[] | null
  metadata_systems: string[] | null
}

export interface ClawhubSkillVersionItem {
  version: string
  created_at: string | null
  changelog: string | null
  is_latest: boolean
}

export interface ClawhubSkillFileEntry {
  path: string
  size: number | null
  content_type: string | null
}

export interface ClawhubSkillFileContent {
  path: string
  content: string | null
  is_markdown: boolean
}
```

- [ ] **Step 4: Add the minimal store state and actions for lazy inspect tabs**

```ts
type ClawhubDetailTab = 'overview' | 'versions' | 'files'

interface ClawhubState {
  skillOverview: ClawhubSkillOverview | null
  activeDetailTab: ClawhubDetailTab
  skillVersions: ClawhubSkillVersionItem[] | null
  versionsLoading: boolean
  skillFiles: ClawhubSkillFileEntry[] | null
  filesLoading: boolean
  fileContent: ClawhubSkillFileContent | null
  fileContentLoading: boolean
  selectedVersion: string | null
  selectedFilePath: string | null
  loadSkillVersions: (sourceId: string, slug: string) => Promise<void>
  loadSkillFiles: (sourceId: string, slug: string, version?: string) => Promise<void>
  readSkillFile: (sourceId: string, slug: string, path: string, version?: string) => Promise<void>
  setActiveDetailTab: (tab: ClawhubDetailTab) => void
  selectDetailVersion: (version: string | null) => void
}
```

- [ ] **Step 5: Run the frontend test to verify it passes**

Run: `npm test -- src/components/ClawHub/ClawHubPage.test.tsx`
Expected: PASS for the new tab-state expectations, even though the drawer UI is still incomplete.

### Task 2: Add Frontend Drawer Tests For Official Inspect Behavior

**Files:**
- Modify: `src/components/ClawHub/ClawHubPage.test.tsx`
- Modify: `src/components/ClawHub/SkillDetailDrawer.tsx`
- Test: `src/components/ClawHub/ClawHubPage.test.tsx`

- [ ] **Step 1: Write the failing test for file loading and version switching**

```tsx
it('loads file content on click and resets file selection when the version changes', async () => {
  const user = userEvent.setup()
  const readSkillFile = vi.fn(async () => {})
  const loadSkillFiles = vi.fn(async () => {})

  useClawhubStore.setState({
    skills: [createSkill()],
    selectedSkillSlug: 'demo-skill',
    skillOverview: createOverview(),
    activeDetailTab: 'files',
    selectedVersion: '1.2.3',
    skillFiles: [
      { path: 'SKILL.md', size: 1200, content_type: 'text/markdown' },
      { path: 'notes.txt', size: 50, content_type: 'text/plain' },
    ],
    filesLoading: false,
    fileContent: null,
    fileContentLoading: false,
    selectedFilePath: null,
    readSkillFile,
    loadSkillFiles,
    skillVersions: [
      { version: '1.2.3', created_at: '2026-05-13T12:34:56Z', changelog: 'Latest', is_latest: true },
      { version: '1.2.2', created_at: '2026-05-10T10:00:00Z', changelog: 'Previous', is_latest: false },
    ],
  })

  render(<ClawHubPage />)

  await user.click(screen.getByRole('button', { name: 'SKILL.md' }))
  expect(readSkillFile).toHaveBeenCalledWith('source-a', 'demo-skill', 'SKILL.md', '1.2.3')

  await user.click(screen.getByRole('tab', { name: 'Versions' }))
  await user.click(screen.getByRole('button', { name: /1.2.2/ }))
  expect(loadSkillFiles).toHaveBeenCalledWith('source-a', 'demo-skill', '1.2.2')
  expect(useClawhubStore.getState().selectedFilePath).toBeNull()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/ClawHub/ClawHubPage.test.tsx`
Expected: FAIL because the current drawer has no tabs, no file pane, and no version selection UI.

- [ ] **Step 3: Implement the minimal drawer tab UI and event wiring**

```tsx
<div className="clawhub-drawer-tabs" role="tablist" aria-label="ClawHub detail tabs">
  <button role="tab" aria-selected={activeTab === 'overview'} onClick={() => setActiveDetailTab('overview')}>Overview</button>
  <button role="tab" aria-selected={activeTab === 'versions'} onClick={() => handleTabChange('versions')}>Versions</button>
  <button role="tab" aria-selected={activeTab === 'files'} onClick={() => handleTabChange('files')}>Files</button>
</div>
```

- [ ] **Step 4: Run the drawer test to verify it passes**

Run: `npm test -- src/components/ClawHub/ClawHubPage.test.tsx`
Expected: PASS for lazy file read and version-switch reset behavior.

### Task 3: Add Rust Tests For Official API Parsing

**Files:**
- Modify: `src-tauri/src/models/clawhub.rs`
- Modify: `src-tauri/src/services/clawhub_service.rs`
- Test: `src-tauri/src/models/clawhub.rs`
- Test: `src-tauri/src/services/clawhub_service.rs`

- [ ] **Step 1: Write the failing Rust test for documented skill detail wrapper parsing**

```rust
#[test]
fn parses_documented_skill_detail_wrapper_into_overview() {
    let body = serde_json::json!({
        "skill": {
            "slug": "demo-skill",
            "displayName": "Demo Skill",
            "summary": "Skill description",
            "stats": { "installsAllTime": 42, "stars": 4.7 },
            "createdAt": 1746871200,
            "updatedAt": 1747139696
        },
        "latestVersion": { "version": "1.2.3", "createdAt": 1747139696, "changelog": "Latest" },
        "metadata": { "os": ["macos"], "systems": ["aarch64-darwin"] },
        "owner": { "handle": "openclaw", "displayName": "OpenClaw", "image": null }
    }).to_string();

    let overview = parse_skill_overview_response(&body).unwrap();

    assert_eq!(overview.slug, "demo-skill");
    assert_eq!(overview.name, "Demo Skill");
    assert_eq!(overview.version.as_deref(), Some("1.2.3"));
    assert_eq!(overview.downloads, Some(42));
    assert_eq!(overview.rating, Some(4.7));
    assert_eq!(overview.owner_handle.as_deref(), Some("openclaw"));
}
```

- [ ] **Step 2: Run the Rust test to verify it fails**

Run: `cargo test parses_documented_skill_detail_wrapper_into_overview --manifest-path src-tauri/Cargo.toml`
Expected: FAIL because the current inspect parser still expects a flat response.

- [ ] **Step 3: Add the minimal documented response models and parser**

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClawhubApiSkillDetailResponse {
    pub skill: ClawhubCliItem,
    #[serde(default)]
    pub latest_version: Option<ClawhubApiVersionSummary>,
    #[serde(default)]
    pub metadata: Option<ClawhubApiSkillMetadata>,
    #[serde(default)]
    pub owner: Option<ClawhubApiOwner>,
}
```

- [ ] **Step 4: Run the Rust test to verify it passes**

Run: `cargo test parses_documented_skill_detail_wrapper_into_overview --manifest-path src-tauri/Cargo.toml`
Expected: PASS.

### Task 4: Add Rust Tests For Version And File Parsing

**Files:**
- Modify: `src-tauri/src/models/clawhub.rs`
- Modify: `src-tauri/src/services/clawhub_service.rs`
- Test: `src-tauri/src/models/clawhub.rs`
- Test: `src-tauri/src/services/clawhub_service.rs`

- [ ] **Step 1: Write the failing Rust tests for versions and files**

```rust
#[test]
fn parses_cli_versions_into_version_items() {
    let body = serde_json::json!({
        "versions": [
            { "version": "1.2.3", "createdAt": 1747139696, "changelog": "Latest", "tags": ["latest"] },
            { "version": "1.2.2", "createdAt": 1746871200, "changelog": "Previous", "tags": [] }
        ]
    }).to_string();

    let versions = parse_skill_versions_response(&body).unwrap();
    assert_eq!(versions.len(), 2);
    assert!(versions[0].is_latest);
}

#[test]
fn parses_version_detail_files_into_file_entries() {
    let body = serde_json::json!({
        "version": {
            "version": "1.2.3",
            "files": [
                { "path": "SKILL.md", "size": 1200, "contentType": "text/markdown" },
                { "path": "notes.txt", "size": 50, "contentType": "text/plain" }
            ]
        }
    }).to_string();

    let files = parse_skill_files_response(&body).unwrap();
    assert_eq!(files[0].path, "SKILL.md");
    assert_eq!(files[1].content_type.as_deref(), Some("text/plain"));
}
```

- [ ] **Step 2: Run the Rust tests to verify they fail**

Run: `cargo test parse_skill_ --manifest-path src-tauri/Cargo.toml`
Expected: FAIL because there are no documented version/file parsers yet.

- [ ] **Step 3: Add the minimal parser functions and models for versions/files**

```rust
pub fn parse_skill_versions_response(body: &str) -> Result<Vec<ClawhubSkillVersionItem>, SkillerError> {
    // parse documented API or CLI JSON into shared version items
}

pub fn parse_skill_files_response(body: &str) -> Result<Vec<ClawhubSkillFileEntry>, SkillerError> {
    // parse documented version detail or CLI files JSON into shared file items
}
```

- [ ] **Step 4: Run the Rust tests to verify they pass**

Run: `cargo test parse_skill_ --manifest-path src-tauri/Cargo.toml`
Expected: PASS.

### Task 5: Add API Wrappers And Tauri Commands For Versions And Files

**Files:**
- Modify: `src/api/clawhub.ts`
- Modify: `src-tauri/src/commands/clawhub.rs`
- Modify: `src-tauri/src/services/clawhub_service.rs`
- Modify: `src-tauri/src/models/clawhub.rs`
- Test: `src/components/ClawHub/ClawHubPage.test.tsx`
- Test: `src-tauri` cargo tests from Tasks 3 and 4

- [ ] **Step 1: Write the failing frontend expectation for file content loading**

```tsx
expect(readSkillFile).toHaveBeenCalledWith('source-a', 'demo-skill', 'SKILL.md', '1.2.3')
```

- [ ] **Step 2: Run the targeted test to verify it fails because the API wrapper is missing**

Run: `npm test -- src/components/ClawHub/ClawHubPage.test.tsx`
Expected: FAIL because `readSkillFile` and related wrappers do not exist end-to-end.

- [ ] **Step 3: Add the minimal frontend and Tauri command wrappers**

```ts
listVersions: async (sourceId: string, slug: string) => invoke('clawhub_list_versions', { sourceId, slug }),
inspectVersion: async (sourceId: string, slug: string, version: string) => invoke('clawhub_inspect_version', { sourceId, slug, version }),
listFiles: async (sourceId: string, slug: string, version?: string) => invoke('clawhub_list_files', { sourceId, slug, version }),
readFile: async (sourceId: string, slug: string, path: string, version?: string) => invoke('clawhub_read_file', { sourceId, slug, path, version }),
```

- [ ] **Step 4: Run frontend and Rust tests to verify they pass**

Run: `npm test -- src/components/ClawHub/ClawHubPage.test.tsx && cargo test --manifest-path src-tauri/Cargo.toml`
Expected: PASS for the new wrappers and parsers.

### Task 6: Finish Drawer Rendering And Reset Behavior

**Files:**
- Modify: `src/components/ClawHub/SkillDetailDrawer.tsx`
- Modify: `src/components/ClawHub/SkillGrid.tsx`
- Modify: `src/stores/clawhubStore.ts`
- Modify: `src/types/index.ts`
- Test: `src/components/ClawHub/ClawHubPage.test.tsx`

- [ ] **Step 1: Write the failing test for close-reset behavior**

```tsx
it('resets active tab and selected file when the drawer closes', async () => {
  const user = userEvent.setup()
  useClawhubStore.setState({
    skills: [createSkill()],
    selectedSkillSlug: 'demo-skill',
    skillOverview: createOverview(),
    activeDetailTab: 'files',
    selectedFilePath: 'SKILL.md',
    skillFiles: [{ path: 'SKILL.md', size: 1200, content_type: 'text/markdown' }],
  })

  render(<ClawHubPage />)
  await user.click(screen.getByRole('button', { name: /close/i }))

  expect(useClawhubStore.getState().selectedSkillSlug).toBeNull()
  expect(useClawhubStore.getState().activeDetailTab).toBe('overview')
  expect(useClawhubStore.getState().selectedFilePath).toBeNull()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/ClawHub/ClawHubPage.test.tsx`
Expected: FAIL because the current close handler only clears `skillDetail` and `selectedSkillSlug`.

- [ ] **Step 3: Implement the minimal reset behavior and final drawer rendering**

```ts
clearSkillDetail: () => {
  set({
    selectedSkillSlug: null,
    skillOverview: null,
    activeDetailTab: 'overview',
    skillVersions: null,
    skillFiles: null,
    fileContent: null,
    selectedVersion: null,
    selectedFilePath: null,
    detailLoading: false,
    versionsLoading: false,
    filesLoading: false,
    fileContentLoading: false,
  })
}
```

- [ ] **Step 4: Run the full targeted frontend suite to verify it passes**

Run: `npm test -- src/components/ClawHub/ClawHubPage.test.tsx`
Expected: PASS for overview, lazy tabs, file reads, version switching, and close reset.

### Task 7: Verification

**Files:**
- Modify: `src/components/ClawHub/ClawHubPage.test.tsx` if any final fixes are required
- Modify: `src/components/ClawHub/SkillDetailDrawer.tsx` if any final fixes are required
- Modify: `src/stores/clawhubStore.ts` if any final fixes are required
- Modify: `src-tauri/src/services/clawhub_service.rs` if any final fixes are required

- [ ] **Step 1: Run the targeted frontend tests**

Run: `npm test -- src/components/ClawHub/ClawHubPage.test.tsx`
Expected: PASS.

- [ ] **Step 2: Run the targeted Rust tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml clawhub`
Expected: PASS for the ClawHub model and service tests.

- [ ] **Step 3: Run a TypeScript build-level verification if available**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/stores/clawhubStore.ts src/api/clawhub.ts src/components/ClawHub/SkillDetailDrawer.tsx src/components/ClawHub/SkillGrid.tsx src/components/ClawHub/ClawHubPage.test.tsx src-tauri/src/commands/clawhub.rs src-tauri/src/services/clawhub_service.rs src-tauri/src/models/clawhub.rs docs/superpowers/specs/2026-05-14-clawhub-inspect-drawer-design.md docs/superpowers/plans/2026-05-14-clawhub-inspect-drawer-alignment.md
git commit -m "feat(clawhub): align detail drawer with inspect flows"
```
