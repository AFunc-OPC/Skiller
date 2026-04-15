import { useDraggable, useDroppable } from '@dnd-kit/core'
import { memo, useState } from 'react'
import type { TreeNode as TreeNodeType } from '../../types'
import { useTagTreeStore } from '../../stores/tagTreeStore'
import './TreeTheme.css'

interface DraggableTreeNodeProps {
  node: TreeNodeType
  depth: number
  onEdit?: (tagId: string) => void
  onDelete?: (tagId: string) => void
  onCreateChild?: (parentId: string) => void
}

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <div className={`tree-toggle-icon ${expanded ? 'expanded' : ''}`}>
    <svg viewBox="0 0 24 24">
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
)

const CopyIcon = () => (
  <svg viewBox="0 0 24 24">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

const CheckIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const DraggableTreeNode = memo<DraggableTreeNodeProps>(({
  node,
  depth,
  onEdit,
  onDelete,
  onCreateChild,
}) => {
  const { expandedIds, selectedTagId, toggleExpanded, selectTag } = useTagTreeStore()
  const isExpanded = expandedIds.has(node.tag.id)
  const isSelected = selectedTagId === node.tag.id
  const hasChildren = node.children.length > 0
  const [copied, setCopied] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
    isDragging,
  } = useDraggable({
    id: node.tag.id,
    data: node.tag,
  })

  const { isOver, setNodeRef: setDroppableRef } = useDroppable({
    id: node.tag.id,
    data: { type: 'tag', tag: node.tag },
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : {}

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    selectTag(node.tag.id)
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleExpanded(node.tag.id)
  }

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onCreateChild) {
      onCreateChild(node.tag.id)
    }
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onEdit) {
      onEdit(node.tag.id)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete) {
      onDelete(node.tag.id)
    }
  }

  const handleCopyId = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(node.tag.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="tree-node">
      <div
        ref={(el) => {
          setDraggableRef(el)
          setDroppableRef(el)
        }}
        style={{
          ...style,
          paddingLeft: depth * 24,
        }}
        className={`
          tree-node-row
          ${isDragging ? 'dragging' : ''}
          ${isOver && !isDragging ? 'drag-over' : ''}
          ${isSelected && !isDragging && !isOver ? 'selected' : ''}
        `}
        onClick={handleClick}
        {...attributes}
        {...listeners}
      >
        <div 
          className="tree-toggle"
          onClick={handleToggle}
        >
          {hasChildren ? <ChevronIcon expanded={isExpanded} /> : null}
        </div>

        <span className="tree-node-label">
          {node.tag.name}
          {(node.tag.skill_count ?? 0) > 0 && (
            <span className="tree-node-skill-count">{node.tag.skill_count}</span>
          )}
          <span className="tree-node-id-wrapper">
            <span className="tree-node-id">{node.tag.id}</span>
            <button
              onClick={handleCopyId}
              title="Copy ID"
              className={`tree-node-id-copy ${copied ? 'copied' : ''}`}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
          </span>
        </span>

        <div className="tree-node-actions">
          <button
            onClick={handleAddChild}
            title="Add child tag"
            className="tree-action-btn"
          >
            <svg viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </button>
          
          <button
            onClick={handleEdit}
            title="Edit tag"
            className="tree-action-btn"
          >
            <svg viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          
          <button
            onClick={handleDelete}
            title="Delete tag"
            className="tree-action-btn danger"
          >
            <svg viewBox="0 0 24 24">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="tree-branch-container">
          {node.children.map((child) => (
            <DraggableTreeNode
              key={child.tag.id}
              node={child}
              depth={depth + 1}
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

DraggableTreeNode.displayName = 'DraggableTreeNode'
