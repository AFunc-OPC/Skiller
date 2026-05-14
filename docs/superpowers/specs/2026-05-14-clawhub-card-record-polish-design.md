# ClawHub Card And Record Polish Design

## Summary

Polish the `ClawHub` browse results so card mode and record mode behave more consistently during scanning. The change set is intentionally narrow: add hover tips to truncated card descriptions, give browse cards a stable height, and move record-row actions to the far right.

## Goals

- Make card-mode description truncation discoverable by showing the full text on hover.
- Keep browse cards visually aligned by giving cards a consistent height and bottom action placement.
- Make record mode easier to scan by pushing the action area to the right edge.

## Non-Goals

- No store, API, or backend changes.
- No redesign of `ClawHub` sorting, filtering, drawer behavior, or metadata content.
- No conversion of record mode into a strict table layout.

## Chosen Direction

Use the smallest possible React and CSS changes in the existing `SkillGrid` layout.

- Card descriptions in card mode should mirror record mode by exposing the full description through the native browser `title` tooltip.
- Card mode should use a stable card height so rows align cleanly even when descriptions differ in length.
- Card actions should remain visually anchored near the bottom of each card.
- Record rows should keep their current responsive structure, but the action cluster should shift to the far right.

## Component Changes

### Card Mode

Update the card-mode description node in `SkillGrid.tsx` to include `title={skill.description}` when a description exists.

Cards should keep the existing two-line truncation treatment, but the full text remains accessible on hover.

The card container should receive a stable height or minimum height large enough to absorb normal metadata and action content without row-to-row jitter. The content column should continue to grow while the action area remains separated at the bottom.

### Record Mode

Keep the existing record row structure and metadata content.

Adjust the row layout so `clawhub-card-actions clawhub-record-actions` sits on the far right side of the row on desktop widths. The layout should still allow wrapping on narrower widths rather than forcing overlap or unreadable compression.

## Layout Rules

- Card mode: cards in the same grid should read as equal-height items.
- Card mode: the import button should stay visually bottom-aligned within the card.
- Record mode: the action area should use the remaining horizontal space to align itself to the right edge.
- Responsive behavior should remain intact; if the row wraps on smaller widths, the action area may fall below the main content rather than overflowing.

## Accessibility And UX

- Native `title` tooltips are sufficient for this change; no custom tooltip component is needed.
- The added tooltip should not alter click behavior for cards.
- Action button placement changes must preserve the existing click-stop behavior so importing does not trigger card inspection.

## Testing Strategy

Manual verification is sufficient for this narrow polish task.

- Card mode: hover a truncated description and confirm the browser shows the full description.
- Card mode: verify cards render with a consistent height across varying description lengths.
- Record mode: verify the import action sits at the far right on desktop widths.
- Responsive check: narrow the page and confirm wrapped record rows remain readable and usable.

## Acceptance Criteria

The polish is complete when:

- card-mode descriptions show the full text in a native hover tip
- card-mode browse cards present a consistent height
- record-mode action buttons are right-aligned without breaking row readability
- no existing inspect or import interactions regress
