import { useDraggable, useDroppable } from '@dnd-kit/core'
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
  onTogglePin?: (tagId: string) => void
  // Reorder drag
  reorderOverId?: string | null
  reorderActiveId?: string | null
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
  onTogglePin,
  reorderOverId = null,
  reorderActiveId = null,
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
  const isPinned = !!node.tag.is_pinned
  const dragHint = t('dragTagToSkillHint', language)
  const isReorderActive = reorderActiveId === node.tag.id
  const isReorderOver = reorderOverId === node.tag.id && !isReorderActive

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

  // Separate draggable for the reorder handle, so dragging the body still works for tag-to-skill.
  const {
    attributes: reorderAttributes,
    listeners: reorderListeners,
    setNodeRef: setReorderHandleRef,
  } = useDraggable({
    id: `tag-reorder-${node.tag.id}`,
    data: {
      type: 'tag-reorder',
      tag: node.tag,
      parentId: node.tag.parent_id,
    },
  })

  const { setNodeRef: setReorderDropRef } = useDroppable({
    id: `tag-reorder-drop-${node.tag.id}`,
    data: {
      type: 'tag-reorder-drop',
      tagId: node.tag.id,
      parentId: node.tag.parent_id,
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

  const handleReorderPointerDown = (e: React.PointerEvent) => {
    // dnd-kit listener attached via reorderListeners handles the drag; stop propagation so the row click/select doesn't fire.
    e.stopPropagation()
  }

  const handleReorderKeyDown = (e: React.KeyboardEvent) => {
    // Allow activation via keyboard focus (dnd-kit handles Enter/Space to start drag)
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation()
    }
  }

  return (
    <div className="select-none">
      <div
        ref={(el) => {
          setNodeRef(el)
          setReorderDropRef(el)
        }}
        className={`
          tag-drag-node group/tag flex items-center gap-1 px-3 py-2 cursor-pointer rounded-lg transition-colors
          ${isDragging ? 'opacity-40' : ''}
          ${isReorderActive ? 'opacity-40' : ''}
          ${isReorderOver ? 'ring-2 ring-[var(--accent-mint)]/50 bg-[var(--accent-mint)]/5' : ''}
          ${shouldHighlight
            ? 'bg-[var(--accent-mint)]/10 text-[var(--accent-mint)]'
            : 'hover:bg-[var(--border-soft)] text-[var(--text-secondary)]'}
          ${isPinned ? 'tag-pinned' : ''}
        `}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={handleClick}
        aria-label={dragHint}
        {...attributes}
        {...listeners}
      >
        {isPinned && (
          <span
            className="flex-shrink-0 text-[var(--accent-mint)]"
            title={language === 'zh' ? '已置顶' : 'Pinned'}
          >
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor">
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
            </svg>
          </span>
        )}

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

        <span
          ref={setReorderHandleRef}
          {...reorderAttributes}
          {...reorderListeners}
          onPointerDown={handleReorderPointerDown}
          onKeyDown={handleReorderKeyDown}
          role="button"
          tabIndex={0}
          aria-label={language === 'zh' ? '拖拽排序' : 'Drag to reorder'}
          title={language === 'zh' ? '拖拽排序' : 'Drag to reorder'}
          className="tree-reorder-handle flex-shrink-0 w-4 h-4 flex items-center justify-center cursor-grab active:cursor-grabbing"
        >
          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor">
            <circle cx="9" cy="5" r="1.5" />
            <circle cx="15" cy="5" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="19" r="1.5" />
            <circle cx="15" cy="19" r="1.5" />
          </svg>
        </span>

        <span
          className="flex-1 text-sm whitespace-nowrap overflow-hidden text-ellipsis"
          title={node.tag.name}
        >
          {node.tag.name}
        </span>
        {skillCount > 0 && (
          <span className="text-xs text-[var(--text-secondary)]/60 flex-shrink-0 ml-1">
            {skillCount}
          </span>
        )}

        {(onEdit || onDelete || onCreateChild || onTogglePin) && (
          <div className="tree-node-actions">
            {onTogglePin && (
              <button
                onClick={(e) => { e.stopPropagation(); onTogglePin(node.tag.id) }}
                title={isPinned ? (language === 'zh' ? '取消置顶' : 'Unpin') : (language === 'zh' ? '置顶' : 'Pin')}
                className={`tree-action-btn ${isPinned ? 'active text-[var(--accent-mint)]' : ''}`}
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                </svg>
              </button>
            )}
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
              onTogglePin={onTogglePin}
              reorderOverId={reorderOverId}
              reorderActiveId={reorderActiveId}
            />
          ))}
        </div>
      )}
    </div>
  )
})

DraggableTagNode.displayName = 'DraggableTagNode'
