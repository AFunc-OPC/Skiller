---
archived-with: 2026-06-27-add-multiselect-expand-setting
status: final
status: final
---
# Multi-Select Expand Setting Design

**Date:** 2026-06-27
**Change:** `add-multiselect-expand-setting`

## Problem

The Skill Center toolbar has a multi-select mode button. Currently it always shows as an icon-only button (36px square). Clicking it enters multi-select mode, which expands the button to show "多选模式" text + selected count, and reveals inline action buttons (全选/标签/删除/导出/分发). The button also gets highlighted with `.active` class.

Users who frequently use batch operations want the button to be expanded by default (showing the text), so they can more easily identify and click it. However, the button should NOT be in multi-select mode by default — it should just be visually expanded. Clicking it should still be required to actually activate multi-select, indicated by the highlight.

The core challenge is that the current code couples button expansion with multi-select activation through a single boolean `multiSelectMode`.

## Design

### State Decoupling

Introduce a new state `multiSelectExpanded` that controls the button's visual expansion (icon+text vs icon-only), separate from `multiSelectMode` which controls actual multi-select activation.

```
┌──────────────────────────────────────────────────────────┐
│  multiSelectExpanded │ multiSelectMode │ Button appearance│
├──────────────────────┼────────────────┼─────────────────┤
│  false               │ false          │ Icon only        │ ← Setting OFF default
│  true                │ false          │ Icon + text      │ ← Setting ON default
│  true                │ true           │ Icon + text +    │ ← After click (active)
│                      │                │ highlight + count│
│  false               │ true           │ Impossible       │ ← Expanded is prerequisite
└──────────────────────────────────────────────────────────┘
```

**Inline action buttons:** Only visible when `multiSelectMode = true` (unchanged)
**Button `.active` class:** Only applied when `multiSelectMode = true` (unchanged)
**Selected count badge:** Only visible when `multiSelectMode = true` (unchanged)
**Button text ("多选模式"):** Visible when `multiSelectExpanded || multiSelectMode`

### Setting UI

A new toggle switch in Settings > General, placed after the Theme section. Uses the existing `.settings-toggle` pattern (same as ClawHubSourceSettings).

```
┌─────────────────────────────────────────────────────┐
│  技能中心                                            │
│  多选模式默认展开                        [ OFF/ON ]  │
│  开启后技能中心的多选模式按钮默认展开显示文字，      │
│  但仍需点击才进入多选模式                            │
└─────────────────────────────────────────────────────┘
```

**localStorage key:** `skillCenterMultiSelectExpanded` (value: `'true'` / `'false'` string)
**Default:** `false` (OFF — preserves current behavior)

### Toggle Behavior

`handleToggleMultiSelectMode` logic adjusts:

1. **Activating** (`multiSelectMode: false → true`): Set both `multiSelectMode = true` and `multiSelectExpanded = true`
2. **Deactivating** (`multiSelectMode: true → false`): Set `multiSelectMode = false`. Set `multiSelectExpanded` based on setting:
   - If setting ON: `multiSelectExpanded = true` (button stays expanded)
   - If setting OFF: `multiSelectExpanded = false` (button collapses)

### Initialization

`SkillCenter` reads `skillCenterMultiSelectExpanded` from localStorage on mount to initialize `multiSelectExpanded`. The `multiSelectMode` always starts as `false`.

### CSS

The existing `.skill-multi-mode-trigger` CSS already handles two states:
- Default (no `.active`): 36px square, icon only
- `.active`: expanded width, accent color, border

For the "expanded but not active" state, we need the button to show text without the `.active` highlight. The trigger button's text visibility is controlled by JSX conditional rendering (`{multiSelectExpanded && <span>...`), and the width auto-expands to fit content. The `.active` class is NOT applied, so the button keeps its default non-highlighted style.

No new CSS class needed — the existing default button style (border-soft, text-secondary) already provides a reasonable "expanded but inactive" appearance. The width naturally adjusts from `width: 36px` to `width: auto` when text is rendered (same as how `.active` currently expands it, just without the accent colors).

**CSS adjustment:** The base `.skill-multi-mode-trigger` has `width: 36px; min-width: 36px;`. The `.active` modifier sets `width: auto`. For the "expanded but not active" state, add an `.expanded` class to the trigger button that also sets `width: auto; min-width: 36px;` (without the accent colors). This class is applied when `multiSelectExpanded` is true but `multiSelectMode` is false. When `multiSelectMode` is true, the existing `.active` class handles both width and highlight.

## Components Affected

| File | Change |
|------|--------|
| `src/components/Settings/SettingsTabs.tsx` | New toggle section in General tab |
| `src/components/SkillCenter/SkillCenter.tsx` | New `multiSelectExpanded` state, adjust button rendering & toggle logic |
| `src/components/SkillCenter/SkillCenter.css` | Minor: width auto when expanded without active |
| `src/i18n/zh.ts` & `src/i18n/en.ts` | New i18n strings (if i18n keys needed) |

## Alternatives Considered

### A: Three-state enum for `multiSelectMode`

Replace `boolean` with `'inactive' | 'expanded' | 'active'`. Rejected because it touches all 12 references to `multiSelectMode` across the component, increasing risk and scope.

### B: Always show text, use setting to control highlight only

The setting would control whether the button is pre-highlighted. Rejected — this would mean multi-select is always active when setting is ON, which contradicts the requirement that clicking is needed to enter multi-select.

### C: Use CSS-only approach with a data attribute

Add `data-multiselect-expanded` attribute and control purely via CSS. Rejected because the text rendering is JSX conditional (`{multiSelectMode && <span>...`}), not CSS — we need React state to control whether the `<span>` is rendered.
