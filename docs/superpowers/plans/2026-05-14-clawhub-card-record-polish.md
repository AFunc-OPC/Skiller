# ClawHub Card And Record Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish ClawHub browse results so card descriptions show hover tips, cards keep a stable height, and record rows use a left content block with a far-right action area.

**Architecture:** Keep the existing ClawHub data flow and component structure, then make the requested UI adjustments through one focused test update, a small `SkillGrid.tsx` markup change, and scoped `src/index.css` rules. Reuse the existing card and record class names, add one lightweight `clawhub-record-content` wrapper for the list layout, and keep the change local to ClawHub without introducing new state or abstractions.

**Tech Stack:** React 18, TypeScript, Vitest, Testing Library, global CSS in `src/index.css`

---

## File Map

- Modify: `src/components/ClawHub/ClawHubPage.test.tsx` - lock in the tooltip attribute and visible import button coverage across card and list modes.
- Modify: `src/components/ClawHub/SkillGrid.tsx` - add the native tooltip to card descriptions and group record content into one left-side wrapper.
- Modify: `src/index.css` - give cards a stable height, keep card actions anchored low, and lay out record rows as left content plus right actions.
- Test: `src/components/ClawHub/ClawHubPage.test.tsx`

### Task 1: Lock In The Requested Card And Record Behavior

**Files:**
- Modify: `src/components/ClawHub/ClawHubPage.test.tsx`
- Test: `src/components/ClawHub/ClawHubPage.test.tsx`

- [ ] **Step 1: Extend the existing ClawHub page test with the requested assertions**

```tsx
it('shows card description tooltips and keeps import affordances visible in list mode', async () => {
  const user = userEvent.setup()

  useClawhubStore.setState({
    skills: [createSkill({ description: 'A long card description for tooltip coverage' })],
  })

  render(<ClawHubPage />)

  const cardDescription = await screen.findByText('A long card description for tooltip coverage')
  expect(cardDescription).toHaveAttribute('title', 'A long card description for tooltip coverage')

  await user.click(screen.getByRole('button', { name: '列表' }))

  expect(screen.getAllByRole('button', { name: '导入到技能中心' }).length).toBeGreaterThan(0)
})
```

- [ ] **Step 2: Run the targeted test file and confirm the new tooltip assertion fails first**

Run: `npm test -- src/components/ClawHub/ClawHubPage.test.tsx`
Expected: FAIL because the card-mode description currently renders without a `title` attribute.

- [ ] **Step 3: Keep the test focused on stable DOM signals, not computed CSS**

```tsx
expect(cardDescription).toHaveAttribute('title', 'A long card description for tooltip coverage')
expect(screen.getAllByRole('button', { name: '导入到技能中心' }).length).toBeGreaterThan(0)
```

Use DOM assertions for tooltip and visible affordances. Leave card height and right alignment to manual verification because those are layout concerns owned by CSS.

- [ ] **Step 4: Run the targeted test file again to verify the failing state is still the intended one**

Run: `npm test -- src/components/ClawHub/ClawHubPage.test.tsx`
Expected: FAIL on the missing `title` attribute only, with no store setup or render errors.

- [ ] **Step 5: Commit the failing test update**

```bash
git add src/components/ClawHub/ClawHubPage.test.tsx
git commit -m "test(clawhub): cover card tooltip polish"
```

### Task 2: Implement Card Tooltip And Stable Card Layout

**Files:**
- Modify: `src/components/ClawHub/SkillGrid.tsx`
- Modify: `src/index.css`
- Test: `src/components/ClawHub/ClawHubPage.test.tsx`

- [ ] **Step 1: Add the native tooltip to the card description markup**

```tsx
{skill.description && (
  <p className="clawhub-card-desc" title={skill.description}>
    {skill.description}
  </p>
)}
```

- [ ] **Step 2: Give card-mode browse cards a stable height and keep actions near the bottom**

```css
.clawhub-skill-card {
  display: flex;
  flex-direction: column;
  min-height: 240px;
}

.clawhub-card-content {
  flex: 1;
}

.clawhub-card-actions {
  margin-top: auto;
}
```

Use a single stable `min-height` instead of adding new wrappers or JS measurement logic.

- [ ] **Step 3: Run the targeted test file and verify the tooltip coverage now passes**

Run: `npm test -- src/components/ClawHub/ClawHubPage.test.tsx`
Expected: PASS with the new tooltip assertion and the existing ClawHub page tests.

- [ ] **Step 4: Run a production build to catch any TypeScript or CSS regressions**

Run: `npm run build`
Expected: PASS with a completed Vite build output and no TypeScript errors.

- [ ] **Step 5: Commit the card polish implementation**

```bash
git add src/components/ClawHub/SkillGrid.tsx src/index.css src/components/ClawHub/ClawHubPage.test.tsx
git commit -m "style(clawhub): polish card tooltip and height"
```

### Task 3: Group Record Content On The Left And Keep Actions On The Right

**Files:**
- Modify: `src/components/ClawHub/SkillGrid.tsx`
- Modify: `src/index.css`
- Test: `src/components/ClawHub/ClawHubPage.test.tsx`

- [ ] **Step 1: Wrap the record main block and metadata in a shared left-side content container**

```tsx
<div className="clawhub-record-content">
  <div className="clawhub-record-main">
    <div className="clawhub-record-name-row">
      <h4 className="clawhub-card-name">{skill.name}</h4>
      <span className="clawhub-card-slug">{skill.slug}</span>
    </div>
    {skill.description && <p className="clawhub-record-desc" title={skill.description}>{skill.description}</p>}
  </div>
  <div className="clawhub-record-meta">
    {renderMeta(skill)}
  </div>
</div>
```

Use a single wrapper so the record name, description, and metadata behave as one left content block instead of three unrelated flex items.

- [ ] **Step 2: Update the record-row CSS to create an 80 percent content column and a right-edge action column**

```css
.clawhub-skill-record {
  display: flex;
  align-items: center;
  gap: 0;
  flex-wrap: wrap;
}

.clawhub-record-content {
  flex: 1 1 80%;
  min-width: 0;
}

.clawhub-record-actions {
  margin-left: auto;
  flex: 0 0 auto;
  align-self: center;
  justify-content: flex-end;
  padding: 0.75rem 1.25rem;
}
```

Keep wrapping enabled so the action area can still drop below the content on narrow widths instead of overflowing.

- [ ] **Step 3: Preserve the mobile fallback in the existing responsive block**

```css
@media (max-width: 1100px) {
  .clawhub-record-content {
    flex-basis: 100%;
  }

  .clawhub-record-actions {
    margin-left: 0;
    justify-content: flex-start;
    width: 100%;
  }
}
```

This keeps the desktop alignment change local while preserving readable wrapped rows on smaller widths.

- [ ] **Step 4: Re-run the targeted ClawHub test file to confirm the record view still exposes import actions**

Run: `npm test -- src/components/ClawHub/ClawHubPage.test.tsx`
Expected: PASS and the list-mode import button assertions remain green.

- [ ] **Step 5: Manually verify the requested layout polish in the app**

Run: `npm run dev`
Expected: The ClawHub card view shows browser-native hover tips on descriptions, cards read as equal-height items, and record rows present one left content block with the action button pinned to the far right at desktop widths while remaining usable when the window narrows.

- [ ] **Step 6: Commit the record alignment polish**

```bash
git add src/components/ClawHub/SkillGrid.tsx src/index.css
git commit -m "style(clawhub): align record actions to the right"
```
