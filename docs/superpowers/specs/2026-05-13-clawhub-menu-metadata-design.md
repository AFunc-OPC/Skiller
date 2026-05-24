# ClawHub Menu Request And Metadata Design

## Overview

Fix two regressions in the ClawHub browsing experience:

- Selecting a source in the ClawHub menu currently triggers the skill list request twice.
- Skill cards and list rows do not fully show the expected metadata.

This change is intentionally narrow. It covers duplicate list requests and metadata display for downloads, rating, and updated time. Author information is explicitly out of scope.

## Goals

- A source switch triggers one list fetch.
- Card view shows downloads, rating, and updated time.
- List view shows downloads, rating, and updated time.
- Updated time is rendered as an absolute date such as `2026-05-13`.
- Missing metadata remains hidden instead of rendering empty placeholders.

## Non-Goals

- Add or display author information.
- Redesign the ClawHub page layout.
- Refactor the ClawHub store beyond what is required to remove the duplicate request.
- Change search, import, or detail drawer behavior outside the metadata fields covered here.

## Current Behavior

### Duplicate requests

The current source-switch path triggers `exploreSkills` in two places:

- `src/components/ClawHub/ClawHubPage.tsx` calls `exploreSkills(id)` from the source selection handler.
- `src/components/ClawHub/SkillGrid.tsx` calls `exploreSkills(sourceId)` in an effect that reacts to `sourceId` changes.

When a user clicks a source, both paths run and produce two requests for the same list data.

### Missing metadata

The current card and list rendering path only reliably shows a subset of metadata. `downloads` is partially rendered, while `rating` and `updated_at` are not surfaced in the grid item UI. Some fields may also be missing from parts of the parsing chain depending on the source type.

## Options Considered

### Option A: Remove the extra UI trigger and complete the metadata chain

Keep list loading owned by `SkillGrid`. Source selection only updates store state. Fill in missing metadata rendering and ensure `rating` and `updated_at` survive the API and CLI parsing chain.

Pros:

- Smallest correct change.
- Matches the current page and grid responsibilities.
- Low risk to search and sorting behavior.

Cons:

- Does not further centralize loading logic in the store.

### Option B: Move all fetch orchestration into the store

Introduce a single store-level action for source changes and list refresh so UI components never call `exploreSkills` directly.

Pros:

- State flow becomes more centralized.

Cons:

- Larger change than needed for the reported bugs.
- Higher regression risk for search and sort interactions.

### Option C: Keep both triggers and add request de-duplication

Leave the current UI behavior in place and suppress duplicate in-flight requests in the store or API layer.

Pros:

- Small UI diff.

Cons:

- Preserves the incorrect trigger flow.
- Easier to regress later because the root cause remains.

## Selected Approach

Use Option A.

The fix should remove the redundant request at the source instead of masking it. At the same time, metadata rendering should be completed with minimal UI change so both card and list views expose the same three fields: downloads, rating, and updated time.

## Design

### Request flow

- `ClawHubPage` source selection updates `selectedSourceId` only.
- `SkillGrid` remains the owner of list loading for `sourceId` and sort changes.
- Search keeps using the existing debounced search flow.
- Clearing search continues to restore the explore list through the existing `exploreSkills` path.

This preserves current responsibilities while ensuring a source click results in one fetch.

### Metadata rendering

Both card and list variants will display these fields when present:

- `downloads`
- `rating`
- `updated_at`

Rendering rules:

- `downloads`: show raw numeric value.
- `rating`: show the numeric value returned by the backend, using a compact display suitable for the existing metadata row.
- `updated_at`: render as an absolute date string in `YYYY-MM-DD` form.
- Missing values: hide the individual metadata item.

The existing version badge remains unchanged.

### Data model and parsing

The following chain must preserve metadata for both API and CLI sources:

- Rust backend models for skill list items.
- API response parsing for explore and search.
- CLI response parsing for explore and search.
- Frontend TypeScript types used by the store and UI.

Required outcome:

- `downloads`, `rating`, and `updated_at` must be available on the frontend list item model regardless of source type.

### Date normalization

`updated_at` may arrive in different formats depending on API and CLI responses. The UI layer should format it into `YYYY-MM-DD` only after parsing confirms it is a valid date value. Invalid or missing values should not render.

## Error Handling

- If `rating` or `updated_at` is absent for a skill, the rest of the item still renders normally.
- If a date value cannot be parsed, suppress only the updated-time badge instead of failing the whole item.
- The duplicate-request fix must not alter existing error banner behavior.

## Testing

### Automated

- Add or update tests that prove selecting a source triggers one explore request.
- Add or update tests for metadata rendering in card and list views.
- Add or update tests for date formatting to `YYYY-MM-DD`.
- Add or update tests that missing metadata values are safely omitted.

### Manual

- Open ClawHub and switch between sources while observing that only one list request is made per click.
- Confirm card view shows downloads, rating, and updated time when present.
- Confirm list view shows downloads, rating, and updated time when present.
- Confirm skills with partial metadata still render without empty labels or broken layout.

## Files Expected To Change

- `src/components/ClawHub/ClawHubPage.tsx`
- `src/components/ClawHub/SkillGrid.tsx`
- `src/stores/clawhubStore.ts` if small state adjustments are needed
- `src/api/clawhub.ts` only if type flow needs alignment
- `src/types` definitions for ClawHub skill list items
- `src-tauri/src/models/clawhub.rs`
- `src-tauri/src/services/clawhub_service.rs`

## Acceptance Criteria

- Clicking a ClawHub source produces one list request.
- Card view shows downloads, rating, and updated date when available.
- List view shows downloads, rating, and updated date when available.
- Updated date uses `YYYY-MM-DD`.
- Missing metadata does not render empty placeholders.
- Author information remains unchanged and out of scope.
