# npx skills find Dialog Lag Fix Design

## Background

The Skill Center provides an `npx skills find` search mode in `NpxFindDialog`. When users search through the local `npx` command, the dialog shows live logs emitted from the Tauri backend. In practice, the dialog becomes visibly sluggish during searches with more output.

The lag is caused by a combination of frontend and backend behavior:

- The frontend appends one log line per progress event and re-renders the whole dialog on every line.
- Every log update triggers scroll and layout work in the dialog body and terminal area.
- The displayed terminal output is rebuilt from the full `logs` array each time.
- The Rust backend recompiles the ANSI-stripping regex for every output line.
- `npx` itself has cold-start overhead, so extra UI work is especially noticeable.

## Goals

- Reduce perceived lag while `npx skills find` is running.
- Preserve live progress visibility for the user.
- Keep the existing search result parsing and import workflow unchanged.
- Improve the search-state experience without redesigning the dialog.

## Non-Goals

- No protocol change to the `npx-find-progress` event payload.
- No rewrite of the search dialog structure or result list layout.
- No attempt to optimize `npx` package resolution or upstream CLI behavior.
- No changes to the install/import command flow outside this dialog.

## Approach Options

### Option 1: Minimal batching only

Batch frontend log updates and cache the backend regex, while keeping the rest of the dialog behavior mostly unchanged.

Pros:

- Smallest code change.
- Likely enough to reduce the worst spikes.

Cons:

- Leaves unnecessary scroll/layout work in place.
- Improves performance more than overall interaction quality.

### Option 2: Localized performance fix plus lightweight UX polish

Batch frontend log updates, simplify scroll behavior, cache the backend regex, and tighten search-state behavior to avoid extra UI churn.

Pros:

- Best balance of impact and risk.
- Directly addresses both render pressure and perceived instability.
- Keeps current flow and data contracts intact.

Cons:

- Slightly more moving pieces than Option 1.

### Option 3: Replace log rendering model entirely

Split logs into a dedicated component or virtualized view and redesign progress rendering around aggregated output.

Pros:

- Highest long-term ceiling.

Cons:

- Too large for the current bug scope.
- Higher regression risk for a targeted fix.

## Recommended Design

Use Option 2.

This fix should stay local to the current implementation while addressing the actual hot paths that cause the dialog to stall.

## Detailed Design

### Frontend: batched log ingestion

`NpxFindDialog` will stop calling `setLogs` for every progress event.

Instead:

- Event listeners will push incoming lines into a mutable buffer stored in a `ref`.
- A short flush cadence will periodically move buffered lines into React state in batches.
- Flush state will start when a search begins and stop cleanly when the search completes, fails, or the dialog resets.

Expected effect:

- Fewer renders during active search.
- Lower CPU usage in the renderer process.
- Preserved near-real-time feedback, with slightly coalesced log updates.

### Frontend: simpler terminal scrolling

The dialog currently performs nested `requestAnimationFrame` scheduling and computes element offsets on each log change.

This will be simplified to terminal-only autoscroll behavior:

- When logs are flushed, only the terminal body scroll position is advanced to the bottom.
- The parent dialog body will no longer be force-scrolled on every log update.
- Any one-time visibility adjustment should happen at search start rather than on every line.

Expected effect:

- Less layout thrashing.
- Fewer forced measurements.
- More stable dialog interaction while logs stream in.

### Frontend: lighter search-state handling

Search start and finish behavior will be tightened to avoid unnecessary churn:

- Search mode state remains unchanged.
- Existing success and error banners remain unchanged.
- Log resets still happen at search start, but subsequent updates are batched.
- Searching state should clearly disable repeated submissions without adding extra log noise.

This keeps the current workflow intact while reducing unnecessary UI updates.

### Backend: cache ANSI stripping regex

`execute_npx_skills_find` currently compiles the ANSI-removal regex inside the helper used for each line.

This will be changed so the regex is initialized once and reused for all lines.

Expected effect:

- Lower per-line CPU overhead in the Rust process.
- Better scaling when command output is verbose.

### Data flow and compatibility

The following will remain unchanged:

- `execute_npx_skills_find` command name and return structure.
- `npx-find-progress` event name and payload shape.
- Search result parsing behavior.
- Import-selected workflow after search.

This keeps the fix low-risk and avoids touching unrelated integrations.

## Error Handling

- Buffered logs must be flushed before final search completion UI is shown, so the user still sees the latest progress context.
- Cleanup on dialog close or mode reset must stop any pending flush timer and clear buffered lines.
- If search fails, the dialog should still show the final error and recent log output without waiting on another event.

## Testing Strategy

### Manual verification

- Search with `npx skills find` on a keyword that produces multiple output lines.
- Confirm the dialog remains responsive while logs stream.
- Confirm the terminal still updates during search.
- Confirm success, empty-result, and failure states still render correctly.
- Confirm importing selected results still works after a search.
- Confirm closing or switching mode during/after a search does not leave stale logs or timers behind.

### Automated verification

- Add or update focused frontend tests only if there is already a practical test seam for the dialog behavior.
- Run the relevant frontend test suite if touched.
- Run a project build or targeted checks sufficient to catch typing or Rust compile regressions.

## Risks and Mitigations

- Risk: batched logs may feel less immediate.
  Mitigation: keep flush intervals short so the terminal still feels live.

- Risk: cleanup bugs could leave timers running after dialog close.
  Mitigation: centralize flush start/stop and call cleanup from reset/unmount paths.

- Risk: scroll behavior changes might hide the terminal unexpectedly.
  Mitigation: only remove repeated parent-body scrolling, not terminal autoscroll itself.

## Implementation Scope

In scope:

- `src/components/SkillCenter/NpxFindDialog.tsx`
- Small supporting updates if needed in shared styles for terminal behavior
- `src-tauri/src/commands/skill_file.rs`

Out of scope:

- `NpxImportDialog` performance work unless the same helper extraction is trivial and clearly safe
- Repository import and file import flows
- Broader Skill Center rendering refactors

## Success Criteria

- The `npx skills find` dialog no longer shows obvious UI stutter during active search on typical output.
- Search logs remain readable and feel live.
- Search results and follow-up import behavior remain unchanged from the user's perspective.
- The change stays local and does not alter external command contracts.
