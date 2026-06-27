---
archived-with: 2026-06-27-add-repo-skill-distribution
status: final
status: final
---
# Design: Repository Skill Distribution

**Date**: 2026-06-27
**Change**: add-repo-skill-distribution
**Status**: Approved

## Overview

Add a "Distribute Now" button to the repository detail drawer that allows distributing selected repository skills directly to a target environment (global or project), without requiring prior import to the Skill Center. Only copy distribution is supported; symlink is disabled.

## Background

The repository detail drawer (`RepositoryDetailDrawer.tsx`) currently has:
- A "Sync Now" button that pulls the git repo and scans for skills
- A skill list with checkboxes and an "Import to Skill Center" button

The Skill Center has a mature distribution system:
- `SkillDistributionPanel` — full distribution UI with target/mode/preset selection
- `BatchDistributionModal` — modal wrapper for batch distribution
- `distributionApi.distribute()` — calls Tauri `distribute_skill` command

Key insight: The backend `distribute_skill` function (`distribution_service.rs:227`) treats `skill_id` as a file path:
```rust
let source_path = PathBuf::from(&request.skill_id);
if !source_path.is_dir() { ... }
```

Repository skills have a `file_path` field pointing to the local clone directory. This path can be passed directly as `skill_id` — no import needed.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              RepositoryDetailDrawer                         │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │  立即同步     │  │  立即分发     │ ← new button           │
│  └──────────────┘  └──────────────┘                        │
│                                                             │
│  ☐ skill-a  (file_path: /repo/.clone/skills/skill-a)       │
│  ☐ skill-b  (file_path: /repo/.clone/skills/skill-b)       │
│                                                             │
│  selectedSkillIds → filter → file_paths as skillIds        │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│         BatchDistributionModal                              │
│  (existing, + modeLocked prop passthrough)                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  SkillDistributionPanel                              │   │
│  │  (existing, + modeLocked prop)                       │   │
│  │                                                      │   │
│  │  skillIds = ["/repo/.clone/skills/skill-a", ...]    │   │
│  │  skillNames = ["skill-a", ...]                       │   │
│  │  modeLocked = "copy"                                 │   │
│  │                                                      │   │
│  │  Target: [Global] [Project]      ← unchanged         │   │
│  │  Preset:  [ dropdown ]            ← unchanged         │   │
│  │  Mode:    [Copy ✓] [Symlink ✗]   ← symlink disabled  │   │
│  │                                                      │   │
│  │  → distributeSkill({ skill_id: file_path, ... })    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│         Backend: distribute_skill                           │
│  source_path = PathBuf::from(skill_id)  ← file_path        │
│  copy_directory(source_path, target_path)                   │
└─────────────────────────────────────────────────────────────┘
```

## Component Changes

### 1. SkillDistributionPanelProps (modified)

```typescript
export interface SkillDistributionPanelProps {
  skillIds: string[]
  skillNames?: string[]
  language?: string
  onSuccess?: () => void
  modeLocked?: SkillDistributionMode  // NEW
}
```

**modeLocked behavior:**
- When provided, `distributionMode` initializes to the locked value
- A `useEffect` with `[modeLocked]` dependency syncs `distributionMode` — only fires when `modeLocked` prop changes, not on every render
- In the mode selector UI, non-matching options render with `disabled` attribute on the `<input>` radio and a `disabled` CSS class on the `<label>` wrapper
- When `modeLocked` is undefined, behavior is unchanged (backward compatible — no useEffect fires, no disabled attributes)

### 2. BatchDistributionModalProps (modified)

```typescript
interface BatchDistributionModalProps {
  skillIds: string[]
  skillNames: string[]
  isOpen: boolean
  onClose: () => void
  modeLocked?: SkillDistributionMode  // NEW
}
```

Passes `modeLocked` through to `SkillDistributionPanel`.

### 3. RepositoryDetailDrawer (modified)

**New state:**
- `distributeModalOpen: boolean` — controls the distribution modal visibility

**New button:**
- Placed in `repo-sync-block`, after the sync button
- Disabled when `selectedSkillIds.size === 0` or `repositorySkills.length === 0`
- Icon: share/distribute icon (arrow-up-from-box or similar)
- Label: "立即分发" / "Distribute Now"

**Modal rendering:**
- At the bottom of the component, conditionally render `BatchDistributionModal`
- `skillIds` = selected skills' `file_path` values
- `skillNames` = selected skills' `name` values
- `modeLocked = "copy"`
- `onClose` = `() => setDistributeModalOpen(false)`

## Data Flow

```
1. User opens repository detail drawer
2. Repository skills are fetched (fetchRepositorySkills)
3. User selects skills via checkboxes → selectedSkillIds updated
4. User clicks "Distribute Now"
5. RepositoryDetailDrawer computes:
   - selectedSkills = repositorySkills.filter(s => selectedSkillIds.has(s.id))
   - skillIds = selectedSkills.map(s => s.file_path)
   - skillNames = selectedSkills.map(s => s.name)
6. BatchDistributionModal opens with these props + modeLocked="copy"
7. SkillDistributionPanel renders with locked copy mode
8. User selects target (global/project) and preset
9. Panel calls distributeSkill({ skill_id: file_path, mode: 'copy', ... })
10. SkillContext.distributeSkill → distributionApi.distribute → Tauri distribute_skill
11. Backend: PathBuf::from(skill_id) → copy_directory(source, target)
12. Result/success returned to panel → user sees success message
13. Modal closes after delay (onSuccess callback)
```

## Error Handling

- **No skills selected**: Button is disabled, no action possible
- **Source directory missing** (repo not synced): Backend returns `ValidationError("Skill source directory does not exist")`, displayed in panel's error feedback area
- **Target path conflict**: Existing `checkConflicts` flow runs, showing `DistributionConflictModal` with overwrite option
- **Partial failures**: Panel collects errors per skill/target and displays them in the feedback area

## Testing

- `SkillDistributionPanel` with `modeLocked="copy"`: verify symlink option is disabled
- `SkillDistributionPanel` without `modeLocked`: verify both modes selectable (regression)
- `RepositoryDetailDrawer`: distribute button disabled when no skills selected
- `RepositoryDetailDrawer`: distribute button enabled when skills selected
- `BatchDistributionModal`: modeLocked prop passed through to panel

## Files Changed

| File | Change |
|------|--------|
| `src/components/SkillCenter/SkillDistributionPanel.tsx` | Add `modeLocked` prop, disable non-matching mode options |
| `src/components/SkillCenter/BatchDistributionModal.tsx` | Add `modeLocked` prop, pass through to panel |
| `src/components/RepositoryManagement/RepositoryDetailDrawer.tsx` | Add distribute button, modal rendering, state |
| CSS (wherever repo-sync-block styles live) | Style for distribute button |

No backend changes. No new dependencies.
