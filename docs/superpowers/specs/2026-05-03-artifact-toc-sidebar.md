# Artifact Preview TOC Sidebar Design

## Summary

Add a collapsible table of contents (TOC) sidebar to the right side of `os-artifact-main` in `ArtifactPreview` component, similar to the TOC functionality in `SkillMarkdownPreview`. This sidebar will display a hierarchical outline of headings for markdown files, allowing users to navigate content quickly.

## Requirements

1. **File Type Detection**: Only show TOC for markdown files (`.md`, `.markdown`)
2. **Markdown Rendering**: Use `ReactMarkdown` with `remark-gfm` for markdown content rendering
3. **TOC Extraction**: Parse markdown headings (h1-h6) and display as hierarchical list
4. **Collapsible Sidebar**: Right sidebar that can be toggled via button in header
5. **Interactive Navigation**: Click TOC item to scroll to corresponding heading
6. **Active Heading Highlight**: Highlight current heading based on scroll position
7. **Preserve Existing Behavior**: Non-markdown files continue to show in `<pre>` block

## Design

### Component Changes

#### ArtifactPreview.tsx

1. **Add new state**:
   - `showToc: boolean` - control sidebar visibility
   - `headings: Heading[]` - extracted heading list
   - `activeHeading: string | null` - currently visible heading ID

2. **Add markdown detection**:
   ```typescript
   const isMarkdownFile = (filename: string) => 
     filename.endsWith('.md') || filename.endsWith('.markdown')
   ```

3. **Extract headings from content**:
   - Parse markdown content using regex to find headings
   - Generate unique IDs for each heading
   - Create `Heading` objects with `id`, `level`, `text`

4. **Render changes**:
   - Add TOC toggle button in `.os-content-header`
   - Conditionally render TOC sidebar for markdown files
   - Use `ReactMarkdown` for markdown content instead of `<pre>`
   - Track scroll position to update active heading

### UI Layout

```
┌────────────────────────────────────────────────────────────────┐
│ Sidebar │  Header: Title | Path | [Actions] | [TOC Toggle]    │
│ (files) ├──────────────────────────────┬───────────────────────┤
│         │                              │  TOC Sidebar          │
│         │                              │  ┌─────────────────┐  │
│         │  Markdown Content            │  │ # Main Title    │  │
│         │  (ReactMarkdown)             │  │   ## Section 1  │  │
│         │                              │  │   ## Section 2  │  │
│         │                              │  │     ### Subsec  │  │
│         │                              │  └─────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### CSS Changes (OpenSpec.css)

1. **Container layout**:
   ```css
   .os-artifact-main {
     display: flex;
     flex-direction: column;
   }
   
   .os-artifact-body {
     flex: 1;
     display: flex;
     overflow: hidden;
   }
   ```

2. **TOC Sidebar styles**:
   - Width: 240px (slightly narrower than SkillMarkdownPreview's 280px)
   - Background: `var(--bg-base)`
   - Border-left: 1px solid `var(--border-soft)`
   - Collapsed state: hidden with transition

3. **Markdown content styles**:
   - Reuse/adapt styles from `SkillMarkdownPreview.css`
   - Heading scroll margins for proper anchor positioning
   - Code blocks, tables, blockquotes styling

### Dependencies

- `react-markdown` (already installed)
- `remark-gfm` (already installed)

Both are already used in `SkillMarkdownPreview`.

## Implementation Tasks

1. Add heading extraction logic in `ArtifactPreview.tsx`
2. Add TOC sidebar component structure
3. Add markdown rendering with ReactMarkdown
4. Add TOC toggle button in header
5. Add scroll tracking for active heading
6. Add CSS styles for TOC sidebar and markdown content
7. Test with various markdown files

## Out of Scope

- Non-markdown file outline generation (code structure parsing)
- TOC persistence (remember collapse state)
- Multiple file simultaneous view
