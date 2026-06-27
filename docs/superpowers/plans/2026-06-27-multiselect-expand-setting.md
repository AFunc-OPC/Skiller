---
archived-with: 2026-06-27-add-multiselect-expand-setting
status: final
---
# Multi-Select Expand Setting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a setting in Settings > General to control whether the Skill Center multi-select button is expanded by default, decoupling button visual expansion from multi-select activation.

**Architecture:** Introduce a new `multiSelectExpanded` state in `SkillCenter.tsx` that controls button text visibility, separate from `multiSelectMode` which controls activation. A toggle in `SettingsTabs.tsx` persists to localStorage and initializes the expanded state.

**Tech Stack:** React, TypeScript, CSS, localStorage

---

```yaml
---
change: add-multiselect-expand-setting
design-doc: docs/superpowers/specs/2026-06-27-multiselect-expand-setting-design.md
base-ref: bc0725ae8df79b447e14f51ac8c8f789292809f4
---
```

### Task 1: Add i18n keys for the setting

**Files:**
- Modify: `src/i18n/zh.ts` (zh object, around line 37 after `settingsLead`)
- Modify: `src/i18n/zh.ts` (en object, around line 342 after `settingsLead`)

- [ ] **Step 1: Add zh keys**

In `src/i18n/zh.ts`, after the `settingsLead` line (line 37), add:

```typescript
  multiSelectExpandTitle: '多选模式默认展开',
  multiSelectExpandHint: '开启后技能中心的多选模式按钮默认展开显示文字，但仍需点击才进入多选模式。',
```

- [ ] **Step 2: Add en keys**

In `src/i18n/zh.ts`, after the `settingsLead` line in the `en` object (line 342), add:

```typescript
  multiSelectExpandTitle: 'Multi-select Expanded by Default',
  multiSelectExpandHint: 'When enabled, the Skill Center multi-select button shows expanded text by default, but still requires a click to enter multi-select mode.',
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: PASS (no type errors)

- [ ] **Step 4: Commit**

```bash
git add src/i18n/zh.ts
git commit -m "feat: add i18n keys for multi-select expand setting"
```

### Task 2: Add the toggle setting in SettingsTabs

**Files:**
- Modify: `src/components/Settings/SettingsTabs.tsx` (after theme section, before closing `</div>` of general tab at line 185)

- [ ] **Step 1: Add multiSelectExpand state and localStorage logic**

In `src/components/Settings/SettingsTabs.tsx`, inside the `SettingsTabs` function (after `const [activeTab, setActiveTab] = useState...` at line 61), add:

```typescript
  const [multiSelectExpand, setMultiSelectExpand] = useState(() => {
    return localStorage.getItem('skillCenterMultiSelectExpanded') === 'true'
  })

  const handleToggleMultiSelectExpand = () => {
    const next = !multiSelectExpand
    setMultiSelectExpand(next)
    localStorage.setItem('skillCenterMultiSelectExpanded', String(next))
  }
```

- [ ] **Step 2: Add the toggle UI in the General tab**

In the General tab section, after the theme `settings-card` closing `</div>` (line 184) and before the general tab's closing `</div>` (line 185), add:

```tsx
              <div className="settings-section-header">
                <div>
                  <h2 className="settings-section-title">{t('multiSelectExpandTitle', language)}</h2>
                  <p className="settings-section-desc">
                    {language === 'zh' ? '技能中心 > 多选模式默认展开' : 'Skill Center > Multi-select expanded by default'}
                  </p>
                  <p className="settings-section-desc" style={{ fontSize: '0.8125rem', opacity: 0.7, marginTop: '0.25rem' }}>
                    {t('multiSelectExpandHint', language)}
                  </p>
                </div>
                <label className="settings-toggle" title={t('multiSelectExpandTitle', language)}>
                  <input
                    type="checkbox"
                    checked={multiSelectExpand}
                    onChange={handleToggleMultiSelectExpand}
                  />
                  <span className="settings-toggle-slider" />
                </label>
              </div>
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/Settings/SettingsTabs.tsx
git commit -m "feat: add multi-select expand toggle in General settings"
```

### Task 3: Add multiSelectExpanded state and adjust toggle logic in SkillCenter

**Files:**
- Modify: `src/components/SkillCenter/SkillCenter.tsx` (state at line 104, handler at line 231)

- [ ] **Step 1: Add multiSelectExpanded state**

In `src/components/SkillCenter/SkillCenter.tsx`, after line 104 (`const [multiSelectMode, setMultiSelectMode] = useState(false)`), add:

```typescript
  const [multiSelectExpanded, setMultiSelectExpanded] = useState(() => {
    return localStorage.getItem('skillCenterMultiSelectExpanded') === 'true'
  })
```

- [ ] **Step 2: Adjust handleToggleMultiSelectMode**

Replace the `handleToggleMultiSelectMode` function (lines 231-239):

```typescript
  const handleToggleMultiSelectMode = useCallback(() => {
    setMultiSelectMode(prev => {
      const next = !prev
      if (next) {
        setMultiSelectExpanded(true)
      } else {
        handleClearSelection()
        const settingEnabled = localStorage.getItem('skillCenterMultiSelectExpanded') === 'true'
        setMultiSelectExpanded(settingEnabled)
      }
      return next
    })
  }, [handleClearSelection])
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/SkillCenter/SkillCenter.tsx
git commit -m "feat: add multiSelectExpanded state and adjust toggle logic"
```

### Task 4: Update button rendering to use multiSelectExpanded for text visibility

**Files:**
- Modify: `src/components/SkillCenter/SkillCenter.tsx` (button rendering at lines 562-576)

- [ ] **Step 1: Update trigger button className and text rendering**

Replace lines 562-576 (the cluster div and trigger button):

```tsx
              <div className={`skill-multi-mode-cluster ${multiSelectMode ? 'active' : ''}`}>
                <button
                  className={`skill-multi-mode-trigger ${multiSelectExpanded ? 'expanded' : ''} ${multiSelectMode ? 'active' : ''}`}
                  onClick={handleToggleMultiSelectMode}
                  title={language === 'zh' ? '多选模式' : 'Multi-select'}
                  aria-label={language === 'zh' ? '多选模式' : 'Multi-select'}
                >
                  <ListChecks className="w-4 h-4" />
                  {multiSelectExpanded && (
                    <span>{language === 'zh' ? '多选模式' : 'Multi-select'}</span>
                  )}
                  {multiSelectMode && (
                    <span className="skill-multi-selected-count">{selectedSkillIds.size}</span>
                  )}
                </button>
```

Key changes:
- Trigger button gets `expanded` class when `multiSelectExpanded` is true (controls width)
- Text span condition changed from `multiSelectMode` to `multiSelectExpanded`
- Count badge condition stays `multiSelectMode` (only show when active)
- `.active` class stays on `multiSelectMode` (highlight only when active)

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/SkillCenter/SkillCenter.tsx
git commit -m "feat: update button rendering to use multiSelectExpanded for text visibility"
```

### Task 5: Add CSS for .expanded class

**Files:**
- Modify: `src/components/SkillCenter/SkillCenter.css` (after `.skill-multi-mode-trigger.active` block, around line 1764)

- [ ] **Step 1: Add .expanded class**

In `src/components/SkillCenter/SkillCenter.css`, after the `.skill-multi-mode-trigger.active` rule block (after line 1764), add:

```css
.skill-multi-mode-trigger.expanded {
  width: auto;
  min-width: 36px;
}
```

This allows the button to auto-size to fit the text when expanded but not active. When `.active` is also present, the existing `.active` rule already sets `width: auto` and adds the highlight colors.

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/SkillCenter/SkillCenter.css
git commit -m "feat: add .expanded CSS class for multi-select trigger button"
```

### Task 6: Run build and tests

**Files:**
- None (verification only)

- [ ] **Step 1: Run frontend build**

Run: `npm run build`
Expected: PASS (no errors)

- [ ] **Step 2: Run frontend tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 3: Fix any issues found**

If build or tests fail, fix the issues and re-run.

- [ ] **Step 4: Commit any fixes if needed**

```bash
git add -A
git commit -m "fix: resolve build/test issues for multi-select expand setting"
```
