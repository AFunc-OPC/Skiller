import { memo } from 'react'
import type { TreeNode as TreeNodeType } from '../../types'
import { useTagTreeStore } from '../../stores/tagTreeStore'

interface TreeNodeProps {
  node: TreeNodeType
  depth: number
  selectedTagId: string | null
  onSelectTag: (tagId: string) => void
  onEdit?: (tagId: string) => void
  onDelete?: (tagId: string) => void
  onCreateChild?: (parentId: string) => void
  highlightKeyword?: string
}

function HighlightText({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword.trim()) return <>{text}</>
  
  const lowerText = text.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()
  const index = lowerText.indexOf(lowerKeyword)
  
  if (index === -1) return <>{text}</>
  
  const before = text.slice(0, index)
  const match = text.slice(index, index + keyword.length)
  const after = text.slice(index + keyword.length)
  
  return (
    <>
      {before}
      <mark className="psi-highlight">{match}</mark>
      {after}
    </>
  )
}

export const TreeNode = memo<TreeNodeProps>(({ 
  node, 
  depth, 
  selectedTagId,
  onSelectTag,
  onEdit, 
  onDelete, 
  onCreateChild,
  highlightKeyword
}) => {
  const { expandedIds, toggleExpanded } = useTagTreeStore()
  const isExpanded = expandedIds.has(node.tag.id)
  const isSelected = selectedTagId === node.tag.id
  const hasChildren = node.children.length > 0
  const skillCount = node.tag.skill_count || 0

  const handleClick = () => {
    onSelectTag(node.tag.id)
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleExpanded(node.tag.id)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    onSelectTag(node.tag.id)
  }

  return (
    <div className="select-none">
      <div
        className={`
          flex items-center gap-1 px-3 py-2 cursor-pointer rounded-lg transition-colors
          ${isSelected 
            ? 'bg-[var(--accent-mint)]/10 text-[var(--accent-mint)]' 
            : 'hover:bg-[var(--border-soft)] text-[var(--text-secondary)]'}
        `}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        <button
          onClick={handleToggle}
          className={`
            w-4 h-4 flex items-center justify-center flex-shrink-0
            hover:text-[var(--text-primary)] transition-colors
            ${!hasChildren ? 'invisible' : ''}
          `}
        >
          {hasChildren && (
            <svg
              viewBox="0 0 24 24"
              className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            >
              <path
                fill="currentColor"
                d="M9 5l7 7-7 7"
              />
            </svg>
          )}
        </button>

        <span className="flex-1 text-sm whitespace-nowrap truncate" title={node.tag.name}>
          <HighlightText text={node.tag.name} keyword={highlightKeyword || ''} />
        </span>
        {skillCount > 0 && (
          <span className="text-xs text-[var(--text-secondary)]/60 flex-shrink-0 ml-1">{skillCount}</span>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div className="relative">
          {depth > 0 && (
            <div
              className="absolute w-px bg-[var(--border-soft)]"
              style={{ left: `${depth * 16 + 20}px`, top: 0, bottom: 0 }}
            />
          )}
          {node.children.map((child) => (
            <TreeNode
              key={child.tag.id}
              node={child}
              depth={depth + 1}
              selectedTagId={selectedTagId}
              onSelectTag={onSelectTag}
              onEdit={onEdit}
              onDelete={onDelete}
              onCreateChild={onCreateChild}
              highlightKeyword={highlightKeyword}
            />
          ))}
        </div>
      )}
    </div>
  )
})

TreeNode.displayName = 'TreeNode'
