---
archived-with: 2026-06-27-add-repo-skill-distribution
status: final
---
# Repository Skill Distribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Distribute Now" button to the repository detail drawer that distributes selected repository skills directly via copy mode, reusing the existing SkillDistributionPanel.

**Architecture:** The `SkillDistributionPanel` gains a `modeLocked` prop to disable symlink mode. `BatchDistributionModal` passes it through. `RepositoryDetailDrawer` adds a distribute button next to "Sync Now" and opens the modal with selected skills' `file_path` values as distribution sources.

**Tech Stack:** React, TypeScript, Tauri, Vitest, Testing Library

---

```yaml
---
change: add-repo-skill-distribution
design-doc: docs/superpowers/specs/2026-06-27-repo-skill-distribution-design.md
base-ref: bc0725ae8df79b447e14f51ac8c8f789292809f4
---
```

### Task 1: Add modeLocked prop to SkillDistributionPanel

**Files:**
- Modify: `src/components/SkillCenter/SkillDistributionPanel.tsx:43-50` (props interface)
- Modify: `src/components/SkillCenter/SkillDistributionPanel.tsx:55-58` (state init)
- Modify: `src/components/SkillCenter/SkillDistributionPanel.tsx:86-100` (useEffect area)
- Modify: `src/components/SkillCenter/SkillDistributionPanel.tsx:587-606` (mode selector UI)

- [ ] **Step 1: Add modeLocked to props interface**

In `src/components/SkillCenter/SkillDistributionPanel.tsx`, update the `SkillDistributionPanelProps` interface:

```typescript
export interface SkillDistributionPanelProps {
  skillIds: string[]
  skillNames?: string[]
  language?: string
  onSuccess?: () => void
  modeLocked?: SkillDistributionMode
}
```

- [ ] **Step 2: Destructure modeLocked and init distributionMode**

Update the function signature and state initialization:

```typescript
export function SkillDistributionPanel({ skillIds, skillNames, language: languageProp, onSuccess, modeLocked }: SkillDistributionPanelProps){
  const { distributeSkill } = useSkillContext()
  const { language: storeLanguage } = useAppStore()
  const language = languageProp || storeLanguage

  const [toolPresets, setToolPresets] = useState<ToolPreset[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [distributionTarget, setDistributionTarget] = useState<SkillDistributionTarget>('project')
  const [distributionMode, setDistributionMode] = useState<SkillDistributionMode>(modeLocked || 'symlink')
```

- [ ] **Step 3: Add useEffect to sync modeLocked**

Add after the existing `useEffect` that loads options (after line ~100, before the `handleClickOutside` effect):

```typescript
  useEffect(() => {
    if (modeLocked) {
      setDistributionMode(modeLocked)
    }
  }, [modeLocked])
```

- [ ] **Step 4: Disable non-matching mode options in the selector**

Replace the mode selector map block (lines ~590-604):

```typescript
            {modeOptions.map((option) => {
              const active = distributionMode === option.value
              const isLocked = Boolean(modeLocked)
              const isDisabled = isLocked && modeLocked !== option.value
              return (
                <label key={option.value} className={`sk-distribution-choice compact ${active ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}>
                  <input
                    type="radio"
                    name={`distribution-mode-${isBatch ? 'batch' : 'single'}`}
                    aria-label={option.label}
                    checked={active}
                    onChange={() => setDistributionMode(option.value)}
                    disabled={isDisabled}
                  />
                  <strong>{option.title}</strong>
                </label>
              )
            })}
```

- [ ] **Step 5: Add disabled CSS style**

In `src/index.css`, after the `.sk-distribution-choice.active` rule (around line 5109), add:

```css
.sk-distribution-choice.disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/SkillCenter/SkillDistributionPanel.tsx src/index.css
git commit -m "feat: add modeLocked prop to SkillDistributionPanel"
```

---

### Task 2: Pass modeLocked through BatchDistributionModal

**Files:**
- Modify: `src/components/SkillCenter/BatchDistributionModal.tsx`

- [ ] **Step 1: Add modeLocked to interface and pass through**

Replace the entire file content:

```typescript
import { useAppStore } from '../../stores/appStore'
import { SkillDistributionPanel } from './SkillDistributionPanel'
import type { SkillDistributionMode } from '../../types'

interface BatchDistributionModalProps {
  skillIds: string[]
  skillNames: string[]
  isOpen: boolean
  onClose: () => void
  modeLocked?: SkillDistributionMode
}

export function BatchDistributionModal({ skillIds, skillNames, isOpen, onClose, modeLocked }: BatchDistributionModalProps) {
  const { language } = useAppStore()

  if (!isOpen) return null

  return (
    <>
      <div className="pm-overlay" onClick={onClose} />
      <div className="pm-modal sk-batch-distribution-modal" role="dialog" aria-modal="true" aria-labelledby="batch-dist-title">
        <div className="pm-modal-header">
          <h2 id="batch-dist-title">
            {language === 'zh' ? '批量分发技能' : 'Batch Distribute Skills'}
          </h2>
          <button className="pm-modal-close" onClick={onClose} aria-label={language === 'zh' ? '关闭' : 'Close'}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="pm-modal-body sk-batch-distribution-body">
          <SkillDistributionPanel
            skillIds={skillIds}
            skillNames={skillNames}
            onSuccess={onClose}
            modeLocked={modeLocked}
          />
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SkillCenter/BatchDistributionModal.tsx
git commit -m "feat: pass modeLocked through BatchDistributionModal"
```

---

### Task 3: Add Distribute button to RepositoryDetailDrawer

**Files:**
- Modify: `src/components/RepositoryManagement/RepositoryDetailDrawer.tsx`

- [ ] **Step 1: Add import for BatchDistributionModal**

Add to the imports at the top of the file (after the existing SkillMarkdownPreview import, around line 11):

```typescript
import { BatchDistributionModal } from '../SkillCenter/BatchDistributionModal'
```

- [ ] **Step 2: Add distributeModalOpen state**

Add to the state declarations (after `importConfirmOpen` / `importConfirmData` state, around line 82-83):

```typescript
  const [distributeModalOpen, setDistributeModalOpen] = useState(false)
```

- [ ] **Step 3: Add the Distribute Now button in the sync block**

In the `repo-sync-block` div, after the sync button's closing `</button>` (around line 925) and before the `{syncError && (` block, add the distribute button. The sync block should wrap both buttons in a row container:

Replace:
```jsx
            </button>

            {syncError && (
```

With:
```jsx
            </button>

            <button
              className="repo-btn-primary repo-distribute-btn"
              onClick={() => setDistributeModalOpen(true)}
              disabled={selectedSkillIds.size === 0 || repositorySkills.length === 0}
              title={language === 'zh' ? '分发选中的仓库技能' : 'Distribute selected repository skills'}
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path d="M13 7H4a2 2 0 00-2 2v6a2 2 0 002 2h9a2 2 0 002-2V9a2 2 0 00-2-2zm-4 9v-3" />
                <path d="M11.293 3.293a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L13 6.414V11a1 1 0 11-2 0V6.414L9.707 7.707a1 1 0 01-1.414-1.414l3-3z" />
                <path d="M5 12a1 1 0 100 2h3a1 1 0 100-2H5z" />
              </svg>
              {language === 'zh' ? '立即分发' : 'Distribute Now'}
              {selectedSkillIds.size > 0 && <span className="repo-import-count">({selectedSkillIds.size})</span>}
            </button>

            {syncError && (
```

- [ ] **Step 4: Add style for distribute button row**

In `src/index.css`, after the `.repo-sync-btn` rule (around line 9336), add:

```css
.repo-distribute-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  background: var(--bg-base);
  color: var(--accent-mint);
  border: 1px solid color-mix(in srgb, var(--accent-mint) 30%, var(--border-soft));
  border-radius: 8px;
  transition: all 0.2s;
  cursor: pointer;
}

.repo-distribute-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent-mint) 8%, var(--bg-base));
  border-color: var(--accent-mint);
}

.repo-distribute-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.repo-distribute-btn svg {
  width: 18px;
  height: 18px;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/RepositoryManagement/RepositoryDetailDrawer.tsx src/index.css
git commit -m "feat: add Distribute Now button to repository detail drawer"
```

---

### Task 4: Wire up BatchDistributionModal in RepositoryDetailDrawer

**Files:**
- Modify: `src/components/RepositoryManagement/RepositoryDetailDrawer.tsx`

- [ ] **Step 1: Compute selected skills for distribution**

Add a `useMemo` after `filteredSkills` (around line 390) to compute distribution props:

```typescript
  const selectedSkillsForDistribution = useMemo(() => {
    return repositorySkills.filter(s => selectedSkillIds.has(s.id))
  }, [repositorySkills, selectedSkillIds])
```

- [ ] **Step 2: Render BatchDistributionModal at the bottom of the component**

Before the final closing `</>` (after the `previewSkill` block, around line 1289), add:

```jsx
      {distributeModalOpen && selectedSkillsForDistribution.length > 0 && (
        <BatchDistributionModal
          skillIds={selectedSkillsForDistribution.map(s => s.file_path)}
          skillNames={selectedSkillsForDistribution.map(s => s.name)}
          isOpen={distributeModalOpen}
          onClose={() => setDistributeModalOpen(false)}
          modeLocked="copy"
        />
      )}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/RepositoryManagement/RepositoryDetailDrawer.tsx
git commit -m "feat: wire up BatchDistributionModal in repository detail drawer"
```

---

### Task 5: Test modeLocked in SkillDistributionPanel

**Files:**
- Create: `src/components/SkillCenter/SkillDistributionPanel.test.tsx`

- [ ] **Step 1: Write test file**

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { SkillDistributionPanel } from './SkillDistributionPanel'
import type { DistributeSkillResult, Project, SkillDistributionMode, ToolPreset } from '../../types'

const mocks = vi.hoisted(() => ({
  getToolPresets: vi.fn<() => Promise<ToolPreset[]>>(),
  listProjects: vi.fn<() => Promise<Project[]>>(),
  distributeSkill: vi.fn<(request: unknown) => Promise<DistributeSkillResult>>(),
  checkConflicts: vi.fn<() => Promise<{ conflicts: { skill_id: string; skill_name: string; target_path: string; target_label: string; exists: boolean }[] }>>(),
}))

vi.mock('../../api/config', () => ({
  configApi: { getToolPresets: mocks.getToolPresets },
}))

vi.mock('../../api/project', () => ({
  projectApi: { list: mocks.listProjects },
}))

vi.mock('../../api/distribution', () => ({
  distributionApi: { checkConflicts: mocks.checkConflicts },
}))

vi.mock('../../contexts/SkillContext', () => ({
  useSkillContext: () => ({ distributeSkill: mocks.distributeSkill }),
}))

vi.mock('../../stores/appStore', () => ({
  useAppStore: () => ({ language: 'zh' }),
}))

const preset: ToolPreset = {
  id: 'preset-1',
  name: 'OpenCode',
  skill_path: '.opencode/skills',
  global_path: '~/.config/opencode/skills',
}

const project: Project = {
  id: 'proj-1',
  name: 'Project Alpha',
  path: '/workspace/project-alpha',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('SkillDistributionPanel modeLocked', () => {
  beforeEach(() => {
    mocks.getToolPresets.mockResolvedValue([preset])
    mocks.listProjects.mockResolvedValue([project])
    mocks.distributeSkill.mockResolvedValue({ target_path: '/target', target: 'project', mode: 'copy' })
    mocks.checkConflicts.mockResolvedValue({ conflicts: [] })
  })

  it('locks mode to copy when modeLocked="copy"', () => {
    render(
      <SkillDistributionPanel
        skillIds={['/skills/demo']}
        skillNames={['demo']}
        modeLocked="copy"
      />
    )

    const copyRadio = screen.getByRole('radio', { name: '复制' })
    const symlinkRadio = screen.getByRole('radio', { name: '软链接' })

    expect(copyRadio).toBeChecked()
    expect(symlinkRadio).toBeDisabled()
  })

  it('allows switching modes when modeLocked is not provided', () => {
    render(
      <SkillDistributionPanel
        skillIds={['/skills/demo']}
        skillNames={['demo']}
      />
    )

    const copyRadio = screen.getByRole('radio', { name: '复制' })
    const symlinkRadio = screen.getByRole('radio', { name: '软链接' })

    expect(symlinkRadio).not.toBeDisabled()
    expect(copyRadio).not.toBeDisabled()
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run src/components/SkillCenter/SkillDistributionPanel.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/SkillCenter/SkillDistributionPanel.test.tsx
git commit -m "test: add modeLocked tests for SkillDistributionPanel"
```

---

### Task 6: Verify build and lint

**Files:**
- None (verification only)

- [ ] **Step 1: Run TypeScript type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 4: Run lint**

Run: `npm run lint` (or `npx eslint src/ --ext .ts,.tsx`)
Expected: No errors
