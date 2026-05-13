# ClawHub Style Refresh Design

## Summary

Refresh the `ClawHub` page so it feels native to the existing Skiller workspace instead of a separate marketplace surface. The chosen direction is a balanced browse workbench: keep the current source sidebar and skill browsing flow, but align the page more closely with `SkillCenter` by using a compact toolbar, a clearer browse panel structure, explicit sort and card/list mode controls, and more refined card and drawer styling.

## Goals

- Keep the current information architecture intact: source selection, skill browsing, search, sort, inspect, and import remain in place.
- Make `ClawHub` visually consistent with the app shell, `SkillCenter`, and the existing glass-panel workspace language.
- Add stronger browsing affordances by making sorting and card/list mode feel first-class.
- Improve hierarchy and scanability for source items, skill cards, record rows, and the detail drawer.
- Preserve light and dark theme support through existing design tokens and variables.

## Non-Goals

- No new backend behavior, API fields, or store changes beyond what styling support requires.
- No new discovery features such as recommendations, pagination redesign, tag filtering, or source analytics.
- No attempt to turn `ClawHub` into a separate branded marketplace distinct from the rest of the app.

## Chosen Direction

The approved direction is a `SkillCenter`-aligned workbench with a small amount of catalog polish.

This means:

- The page should read as a native two-pane workspace inside the existing stage panel.
- The toolbar should be compact and functional, not a hero section.
- The source rail should feel like browse navigation, not a decorative marketing sidebar.
- The content area should support two clear browsing modes: cards for discovery and records for faster scanning.
- Visual emphasis should come from spacing, contrast, borders, hover states, and metadata chips, not oversized branding.

## Page Structure

### Overall Layout

Keep the existing split between source navigation and the main content area, but tighten the framing so the page looks like one integrated browsing surface.

- Left rail: source list inside a restrained panel with a stronger active state and clearer source metadata.
- Right content: a stacked structure made of a compact header band, a toolbar row, the result area, and a contextual batch action bar.
- The entire content area should inherit the app's rounded panel language and use the same border softness and background elevation seen elsewhere.

### Header Band

Replace the current minimal title row with a compact context band that sits above the result grid.

Contents:

- `ClawHub` label and page title
- Short one-line description of the current browse purpose
- Small summary counters such as visible result count and imported count when available

The header band should stay visually secondary to the toolbar and results. It exists to orient the user, not dominate the page.

### Toolbar

The toolbar is the main control surface and should be styled closer to `SkillCenter`.

Controls:

- Search input with the same compact shape and focus treatment style used elsewhere in the app
- Sort dropdown as an explicit control adjacent to search
- Card/list view toggle as a compact segmented control
- Batch mode trigger with an active state that matches the app's existing action patterns

Behavioral intent:

- Search and sort should read as primary browse tools
- View mode should feel lightweight but obvious
- Batch mode should reveal a stronger selected state without disturbing layout stability

## Source Rail

The source sidebar should remain familiar, but with better hierarchy.

Required adjustments:

- Stronger active source treatment using the app accent color and subtle elevated background
- Better spacing between source name and source type
- Slightly improved source item density so the rail feels like navigation rather than a list of generic buttons
- Footer action for source management should match the surrounding panel language and avoid looking detached

Empty-state behavior stays the same, but the empty panel should visually match the rest of the workspace.

## Result Presentation

### Card Mode

Card mode is the default discovery surface.

Each card should present:

- Skill name as the primary line
- Slug as a secondary technical identifier
- Short description with controlled truncation
- Metadata row with version, downloads, rating, and updated time
- Clear import action area

Card styling should change in these ways:

- More refined padding and radius to match workspace cards
- Stronger hover and selected states using border, shadow, and accent tint rather than heavy background fills
- Better separation between content and actions
- Metadata chips should feel deliberate and readable, especially in dark mode

### Record/List Mode

List mode should become a real record view rather than just compressed cards.

The record view should emphasize:

- Faster comparison of multiple skills
- Consistent columns or column-like alignment for key metadata
- Clear but compact action placement

The exact implementation can remain responsive rather than building a rigid table, but it should visually read closer to a record list than a stacked card.

## Batch Selection Bar

Batch selection should remain contextual and persistent while active.

Design intent:

- Show selected count clearly
- Keep the import action anchored and easy to find
- Avoid covering important content in a way that feels modal

The bar should look like a native sticky utility surface inside the content panel, not a floating unrelated toast.

## Detail Drawer

The skill detail drawer should move closer to the app's inspector-style patterns.

Required improvements:

- Stronger title hierarchy and cleaner slug presentation
- Better spacing between description, metadata badges, action row, and markdown preview
- Metadata badges should match the refined chip style used in the refreshed cards
- The markdown preview section should feel like a readable document panel, not raw embedded content

The drawer remains a right-side overlay with the same underlying behavior.

## States

### Loading

- Loading should sit inside the content surface and not collapse layout
- Skeleton-like spacing can be mimicked with stable placeholders or refined spinner positioning, but layout jump should be minimized

### Empty Results

- Empty states should be centered inside the result area and match the app panel language
- The visual tone should stay utilitarian and calm, not overly illustrative

### Error Banner

- Error presentation remains dismissible
- Styling should be brought in line with the rest of the page so it reads like a native alert strip inside the workspace

## Responsive Behavior

Desktop remains the primary target, but the page should degrade cleanly.

- On narrower widths, toolbar controls may wrap, but search should remain visually dominant
- The source rail may narrow before the main content becomes cramped
- Card mode should reduce column count naturally
- Record mode may collapse some metadata beneath the primary line rather than forcing unreadable columns
- The detail drawer should preserve readability at smaller widths without overflowing content

## Visual Language

The page should continue using the existing app palette and panel system.

Guidelines:

- Reuse current surface tokens, border tokens, text colors, and accent mint states where possible
- Favor restrained gradients or soft accent tints only where they support hierarchy
- Avoid introducing a separate font system or a highly branded standalone aesthetic
- Keep motion subtle and functional: hover lift, focus glow, state transitions, drawer polish

## Testing Strategy

Implementation should be verified with component-level behavior tests and a quick UI regression pass.

Minimum coverage:

- Existing `ClawHubPage` tests updated if structure changes affect expectations
- New or updated tests for card/list mode switching if behavior or accessible labels change
- New or updated tests for sort control visibility and toolbar rendering if structure changes significantly
- Manual verification in light and dark themes for source selection, search, sort, batch mode, card mode, list mode, and drawer display

## Implementation Notes

- Prefer minimal structural changes in React components, with most work done through targeted markup refinement and CSS updates.
- Reuse patterns already established in `SkillCenter` where that reduces divergence.
- Avoid creating a separate `ClawHub` design system; this is a convergence task, not a new visual subsystem.
- Keep class naming local to `ClawHub` unless an extracted shared pattern is clearly justified.

## Acceptance Criteria

The refresh is complete when:

- `ClawHub` feels visually consistent with the existing Skiller workspace
- Sorting and card/list mode are prominent, readable, and native-looking
- Card mode and record mode are visually distinct and both useful
- The source rail, result area, batch bar, and drawer form a cohesive browsing flow
- The page remains usable in both themes and on smaller workspace widths
