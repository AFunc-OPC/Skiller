# ClawHub Request Flow Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure entering the ClawHub page auto-selects the first enabled source and triggers exactly one `clawhub_explore` request per initial load or source change.

**Architecture:** Keep source selection in `ClawHubPage` and list loading in `SkillGrid`, but add a minimal page-level default-source selection effect and a grid-level guard that makes the initial explore effect idempotent under React StrictMode. Cover both behaviors with focused component tests.

**Tech Stack:** React 18, Zustand, Vitest, Testing Library

---

### Task 1: Lock the bug with tests

**Files:**
- Modify: `src/components/ClawHub/ClawHubPage.test.tsx`

- [ ] Add a test that renders `ClawHubPage` with enabled sources and `selectedSourceId: null`, then expects the first enabled source to become selected and `exploreSkills` to be called once.
- [ ] Run: `npm test -- src/components/ClawHub/ClawHubPage.test.tsx`
- [ ] Verify the new preload test fails before implementation.

### Task 2: Implement the minimal request-flow fix

**Files:**
- Modify: `src/components/ClawHub/ClawHubPage.tsx`
- Modify: `src/components/ClawHub/SkillGrid.tsx`

- [ ] Add a page effect that selects the first enabled source when no enabled source is currently selected.
- [ ] Add a small request guard in `SkillGrid` so the source-based explore effect does not duplicate the same request during StrictMode remounts.
- [ ] Keep sort and search behavior unchanged outside the duplicate-request fix.

### Task 3: Verify behavior

**Files:**
- Test: `src/components/ClawHub/ClawHubPage.test.tsx`

- [ ] Run: `npm test -- src/components/ClawHub/ClawHubPage.test.tsx`
- [ ] Confirm preload and single-request tests pass.
- [ ] Confirm no existing ClawHub page tests regress.
