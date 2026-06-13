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
  onEdit?: (tagId: string) => void
  onDelete?: (tagId: string) => void
  onCreateChild?: (parentId: string) => void
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
  onEdit,
  onDelete,
  onCreateChild,
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
          tag-drag-node group/tag flex items-center gap-1 px-3 py-2 cursor-pointer rounded-lg transition-colors
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

        <span className="flex-1 text-sm whitespace-nowrap overflow-hidden text-ellipsis" title={node.tag.name}>
          {node.tag.name}
        </span>
        {skillCount > 0 && (
          <span className="text-xs text-[var(--text-secondary)]/60 flex-shrink-0 ml-1">
            {skillCount}
          </span>
        )}

        {(onEdit || onDelete || onCreateChild) && (
          <div className="tree-node-actions">
            {onCreateChild && (
              <button
                onClick={(e) => { e.stopPropagation(); onCreateChild(node.tag.id) }}
                title={language === 'zh' ? '添加子标签' : 'Add child tag'}
                className="tree-action-btn"
              >
                <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
              </button>
            )}
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(node.tag.id) }}
                title={language === 'zh' ? '编辑' : 'Edit'}
                className="tree-action-btn"
              >
                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(node.tag.id) }}
                title={language === 'zh' ? '删除' : 'Delete'}
                className="tree-action-btn danger"
              >
                <svg viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            )}
          </div>
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
              onEdit={onEdit}
              onDelete={onDelete}
              onCreateChild={onCreateChild}
            />
          ))}
        </div>
      )}
    </div>
  )
})

DraggableTagNode.displayName = 'DraggableTagNode'
