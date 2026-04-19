import { useDraggable } from '@dnd-kit/core'
import { memo } from 'react'
import { t } from '../../i18n'
import type { TreeNode as TreeNodeType } from '../../types'
import { useAppStore } from '../../stores/appStore'
import { useTagTreeStore } from '../../stores/tagTreeStore'
import './TreeTheme.css'

interface DraggableTagNodeProps {
  node: TreeNodeType
  depth: number
  selectedTagId: string | null
  onSelectTag: (tagId: string) => void
  activeDragTagId?: string | null
  highlightDragged?: boolean
}

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
  >
    <path fill="currentColor" d="M9 5l7 7-7 7" />
  </svg>
)

export const DraggableTagNode = memo<DraggableTagNodeProps>(({ 
  node,
  depth,
  selectedTagId,
  onSelectTag,
  activeDragTagId = null,
  highlightDragged = false,
}) => {
  const { language } = useAppStore()
  const { expandedIds, toggleExpanded } = useTagTreeStore()
  const isExpanded = expandedIds.has(node.tag.id)
  const isSelected = selectedTagId === node.tag.id
  const isActiveDraggedTag = highlightDragged && activeDragTagId === node.tag.id
  const isDraggingThisTag = activeDragTagId === node.tag.id
  const shouldHighlight = isDraggingThisTag ? isActiveDraggedTag : isSelected
  const hasChildren = node.children.length > 0
  const skillCount = node.tag.skill_count || 0
  const dragHint = t('dragTagToSkillHint', language)

  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: `tag-${node.tag.id}`,
    data: {
      type: 'tag-for-skill',
      tag: node.tag,
    },
  })

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelectTag(node.tag.id)
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleExpanded(node.tag.id)
  }

  return (
    <div className="select-none">
      <div
        ref={setNodeRef}
        className={`
          tag-drag-node flex items-center gap-1 px-3 py-2 cursor-pointer rounded-lg transition-colors
          ${isDragging ? 'opacity-40' : ''}
          ${shouldHighlight
            ? 'bg-[var(--accent-mint)]/10 text-[var(--accent-mint)]'
            : 'hover:bg-[var(--border-soft)] text-[var(--text-secondary)]'}
        `}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={handleClick}
        aria-label={dragHint}
        {...attributes}
        {...listeners}
      >
        <button
          onClick={handleToggle}
          className={`
            w-4 h-4 flex items-center justify-center flex-shrink-0
            hover:text-[var(--text-primary)] transition-colors
            ${!hasChildren ? 'invisible' : ''}
          `}
        >
          {hasChildren && <ChevronIcon expanded={isExpanded} />}
        </button>

        <span className="flex-1 text-sm whitespace-nowrap truncate" title={node.tag.name}>
          {node.tag.name}
        </span>
        {skillCount > 0 && (
          <span className="text-xs text-[var(--text-secondary)]/60 flex-shrink-0 ml-1">
            {skillCount}
          </span>
        )}
        <span className="tag-drag-tooltip" role="tooltip">
          {dragHint}
        </span>
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
            <DraggableTagNode
              key={child.tag.id}
              node={child}
              depth={depth + 1}
              selectedTagId={selectedTagId}
              onSelectTag={onSelectTag}
              activeDragTagId={activeDragTagId}
              highlightDragged={highlightDragged}
            />
          ))}
        </div>
      )}
    </div>
  )
})

DraggableTagNode.displayName = 'DraggableTagNode'
