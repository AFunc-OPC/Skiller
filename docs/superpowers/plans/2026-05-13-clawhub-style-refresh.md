# ClawHub Style Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the ClawHub page so it matches the existing Skiller workspace language while adding clearer sort and card/list browsing controls.

**Architecture:** Keep the existing ClawHub data flow and store APIs, then refine the page through targeted React markup updates and scoped CSS changes. Reuse patterns already established in `SkillCenter` for toolbar density, browse layout, and toggles, while preserving current source selection, search, inspect, and import behavior.

**Tech Stack:** React 18, TypeScript, Zustand, Vitest, Testing Library, global CSS in `src/index.css`

---

## File Map

- Modify: `src/components/ClawHub/ClawHubPage.tsx` - add the compact ClawHub header band structure and improved page framing.
- Modify: `src/components/ClawHub/SkillGrid.tsx` - adjust toolbar markup, add clearer card/list presentation structure, and keep sort/view controls prominent.
- Modify: `src/components/ClawHub/SourceSidebar.tsx` - tighten source rail presentation and active item hierarchy.
- Modify: `src/components/ClawHub/SkillDetailDrawer.tsx` - refresh drawer hierarchy and content grouping.
- Modify: `src/components/ClawHub/EmptyState.tsx` - align empty-state structure with the refreshed result area.
- Modify: `src/components/ClawHub/ClawHubPage.test.tsx` - cover refreshed browse chrome and confirm card/list metadata remains visible.
- Modify: `src/index.css` - update ClawHub-specific styles for layout, toolbar, cards, records, batch bar, drawer, and states.
- Test: `src/components/ClawHub/ClawHubPage.test.tsx`

### Task 1: Lock In Toolbar And Header Expectations

**Files:**
- Modify: `src/components/ClawHub/ClawHubPage.test.tsx`
- Test: `src/components/ClawHub/ClawHubPage.test.tsx`

- [ ] **Step 1: Write the failing test for the refreshed browse chrome**

```tsx
it('renders the ClawHub context band and browse controls for the selected source', async () => {
  useClawhubStore.setState({
    skills: [createSkill()],
  })

  render(<ClawHubPage />)

  expect(await screen.findByText('ClawHub')).toBeInTheDocument()
  expect(screen.getByText('Source A')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('搜索技能')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '卡片' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '列表' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the test to verify it fails for the new chrome expectations**

Run: `npm test -- src/components/ClawHub/ClawHubPage.test.tsx`
Expected: FAIL because the current page does not render the new context band or accessible card/list browse controls.

- [ ] **Step 3: Write the minimal test support changes for stable control queries**

```tsx
expect(screen.getByRole('button', { name: '卡片' })).toBeInTheDocument()
expect(screen.getByRole('button', { name: '列表' })).toBeInTheDocument()
```

Use role-based assertions only, so the implementation must expose clear labels instead of relying on `title` attributes.

- [ ] **Step 4: Run the test file again and confirm the failure is still the expected one**

Run: `npm test -- src/components/ClawHub/ClawHubPage.test.tsx`
Expected: FAIL on missing elements, not syntax errors or store setup issues.

- [ ] **Step 5: Commit the test-only red state**

```bash
git add src/components/ClawHub/ClawHubPage.test.tsx
git commit -m "test(clawhub): cover refreshed browse chrome"
```

### Task 2: Implement The Refreshed ClawHub Page Structure

**Files:**
- Modify: `src/components/ClawHub/ClawHubPage.tsx`
- Modify: `src/components/ClawHub/SkillGrid.tsx`
- Modify: `src/components/ClawHub/SourceSidebar.tsx`
- Modify: `src/components/ClawHub/EmptyState.tsx`
- Modify: `src/components/ClawHub/ClawHubPage.test.tsx`

- [ ] **Step 1: Add the compact context band to `ClawHubPage.tsx`**

```tsx
        ) : (
          <div className="clawhub-main-panel">
            <div className="clawhub-context-band">
              <div>
                <span className="clawhub-context-label">ClawHub</span>
                <h2 className="clawhub-context-title">{selectedSource.name}</h2>
                <p className="clawhub-context-description">{language === 'zh' ? '在应用内浏览、筛选并导入线上技能。' : 'Browse, filter, and import hosted skills without leaving the workspace.'}</p>
              </div>
            </div>
            <SkillGrid
              language={language}
              sourceId={selectedSourceId!}
              sourceName={selectedSource.name}
            />
          </div>
        )}
```

- [ ] **Step 2: Refactor `SkillGrid.tsx` toolbar markup to expose explicit browse controls**

```tsx
      <div className="clawhub-grid-toolbar">
        <div className="clawhub-search-bar">
          ...
        </div>

        <div className="clawhub-toolbar-actions">
          <label className="clawhub-sort-field">
            <span className="clawhub-toolbar-label">{language === 'zh' ? '排序' : 'Sort'}</span>
            <select
              value={sortOption}
              onChange={(e) => handleSortChange(e.target.value as SortOption)}
              className="clawhub-sort-select"
              aria-label={language === 'zh' ? '排序' : 'Sort'}
            >
              ...
            </select>
          </label>

          <div className="clawhub-view-toggle" role="group" aria-label={language === 'zh' ? '浏览模式' : 'Browse mode'}>
            <button aria-label={language === 'zh' ? '卡片' : 'Cards'} ... />
            <button aria-label={language === 'zh' ? '列表' : 'List'} ... />
          </div>
        </div>
      </div>
```

- [ ] **Step 3: Split card and record markup so list mode reads like records instead of compact cards**

```tsx
      {!skillsLoading && skills.length > 0 && viewMode === 'card' && (
        <div className="clawhub-grid card-view">
          {skills.map((skill) => (
            <article key={skill.slug} className="clawhub-skill-card card-view" ...>
              ...
            </article>
          ))}
        </div>
      )}

      {!skillsLoading && skills.length > 0 && viewMode === 'list' && (
        <div className="clawhub-record-list">
          {skills.map((skill) => (
            <article key={skill.slug} className="clawhub-skill-record" ...>
              ...
            </article>
          ))}
        </div>
      )}
```

- [ ] **Step 4: Tighten the source rail and empty-state markup to match the new browse surface**

```tsx
    <aside className="clawhub-sidebar glass-panel">
      <div className="clawhub-sidebar-header">
        <span className="clawhub-sidebar-label">{language === 'zh' ? '数据源' : 'Sources'}</span>
        <h3>{language === 'zh' ? '已连接目录' : 'Connected Catalogs'}</h3>
      </div>
      ...
    </aside>
```

```tsx
    <div className="clawhub-empty-state clawhub-result-empty-state">
      <div className="clawhub-empty-copy">
        <h3>{msg.title}</h3>
        <p>{msg.description}</p>
      </div>
    </div>
```

- [ ] **Step 5: Run the ClawHub page test file and verify all tests pass**

Run: `npm test -- src/components/ClawHub/ClawHubPage.test.tsx`
Expected: PASS with the refreshed structure and the existing metadata assertions still working.

- [ ] **Step 6: Commit the page structure refresh**

```bash
git add src/components/ClawHub/ClawHubPage.tsx src/components/ClawHub/SkillGrid.tsx src/components/ClawHub/SourceSidebar.tsx src/components/ClawHub/EmptyState.tsx src/components/ClawHub/ClawHubPage.test.tsx
git commit -m "feat(clawhub): refresh browse layout structure"
```

### Task 3: Refresh Drawer, Batch Bar, And ClawHub Styles

**Files:**
- Modify: `src/components/ClawHub/SkillDetailDrawer.tsx`
- Modify: `src/index.css`
- Test: `src/components/ClawHub/ClawHubPage.test.tsx`

- [ ] **Step 1: Add the failing test for the list-mode record affordance and drawer chrome text**

```tsx
it('shows list mode as record rows and keeps import affordances visible', async () => {
  const user = userEvent.setup()

  useClawhubStore.setState({
    skills: [createSkill()],
  })

  render(<ClawHubPage />)

  await user.click(await screen.findByRole('button', { name: '列表' }))

  expect(screen.getByText('Demo Skill')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /导入到技能中心/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the test file to verify the new affordance assertion fails first**

Run: `npm test -- src/components/ClawHub/ClawHubPage.test.tsx`
Expected: FAIL if the refreshed list mode structure or button labeling is not yet in place.

- [ ] **Step 3: Update `SkillDetailDrawer.tsx` grouping and apply the scoped CSS refresh in `src/index.css`**

```tsx
        <div className="clawhub-drawer-header">
          <div className="clawhub-drawer-title-block">
            <span className="clawhub-drawer-eyebrow">ClawHub</span>
            <div className="clawhub-drawer-title">
              <h2>{skill.name}</h2>
              <span className="clawhub-drawer-slug">{skill.slug}</span>
            </div>
          </div>
          ...
        </div>
```

```css
.clawhub-main-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
}

.clawhub-context-band {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.125rem;
  border: 1px solid rgba(16, 185, 129, 0.12);
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(255, 255, 255, 0.02));
}

.clawhub-grid-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  background: var(--bg-elevated);
}

.clawhub-record-list {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.clawhub-skill-record {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) repeat(3, minmax(72px, auto)) auto;
  gap: 0.875rem;
  align-items: center;
  padding: 0.875rem 1rem;
  border: 1px solid var(--border-soft);
  border-radius: 14px;
  background: var(--bg-elevated);
}
```

- [ ] **Step 4: Run the ClawHub test file, then run the full frontend test suite**

Run: `npm test -- src/components/ClawHub/ClawHubPage.test.tsx && npm test`
Expected: PASS for the targeted file first, then PASS for the full Vitest suite.

- [ ] **Step 5: Build the frontend bundle to catch CSS or TS regressions**

Run: `npm run build`
Expected: successful TypeScript compile and Vite build output.

- [ ] **Step 6: Commit the visual refresh implementation**

```bash
git add src/components/ClawHub/SkillDetailDrawer.tsx src/index.css src/components/ClawHub/ClawHubPage.test.tsx
git commit -m "feat(clawhub): polish browse styles and drawer"
```

## Self-Review

- Spec coverage check: toolbar, source rail, card mode, record mode, batch bar, drawer, responsive styling, empty/error/loading states, and tests are all covered across Tasks 1-3.
- Placeholder scan: no `TBD`, `TODO`, or vague "handle appropriately" steps remain.
- Type consistency: plan uses existing `SortOption`, `viewMode`, `ClawHubPage`, `SkillGrid`, and drawer component names from the current codebase.
