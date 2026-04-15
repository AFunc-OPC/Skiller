import { useMemo, useCallback, useState } from 'react'
import { FixedSizeList } from 'react-window'
import type { TreeNode } from '../../types'
import { useTagTreeStore } from '../../stores/tagTreeStore'
import './TreeTheme.css'

interface FlattenedNode {
  id: string
  name: string
  depth: number
  hasChildren: boolean
  tag: TreeNode['tag']
  children: TreeNode['children']
  skill_count?: number
}

interface RowProps {
  index: number
  style: React.CSSProperties
}

interface VirtualizedTreeProps {
  tree: TreeNode[]
  expandedIds: Set<string>
  height: number
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

function CopyButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      title="Copy ID"
      className={`tree-node-id-copy ${copied ? 'copied' : ''}`}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  )
}

export function VirtualizedTree({
  tree,
  expandedIds,
  height,
  onEdit,
  onDelete,
  onCreateChild,
}: VirtualizedTreeProps) {
  const { toggleExpanded, selectTag, selectedTagId } = useTagTreeStore()

  const flattenedNodes = useMemo(() => {
    const result: FlattenedNode[] = []
    
    const traverse = (nodes: TreeNode[], depth: number) => {
      for (const node of nodes) {
        result.push({
          id: node.tag.id,
          name: node.tag.name,
          depth,
          hasChildren: node.children.length > 0,
          tag: node.tag,
          children: node.children,
          skill_count: node.tag.skill_count,
        })
        
        if (expandedIds.has(node.tag.id) && node.children.length > 0) {
          traverse(node.children, depth + 1)
        }
      }
    }
    
    traverse(tree, 0)
    return result
  }, [tree, expandedIds])

  const Row = useCallback(({ index, style }: RowProps) => {
    const node = flattenedNodes[index]
    const isExpanded = expandedIds.has(node.id)
    const isSelected = selectedTagId === node.id

    const handleToggle = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (node.hasChildren) {
        toggleExpanded(node.id)
      }
    }

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      selectTag(node.id)
    }

    const handleAddChild = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (onCreateChild) {
        onCreateChild(node.id)
      }
    }

    const handleEdit = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (onEdit) {
        onEdit(node.id)
      }
    }

    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (onDelete) {
        onDelete(node.id)
      }
    }

    return (
      <div style={{ ...style, paddingLeft: node.depth * 24 }}>
        <div
          className={`tree-node-row ${isSelected ? 'selected' : ''}`}
          onClick={handleClick}
        >
          <div 
            className="tree-toggle"
            onClick={handleToggle}
          >
            {node.hasChildren ? <ChevronIcon expanded={isExpanded} /> : null}
          </div>

          <span className="tree-node-label">
            {node.name}
            {(node.skill_count ?? 0) > 0 && (
              <span className="tree-node-skill-count">{node.skill_count}</span>
            )}
            <span className="tree-node-id-wrapper">
              <span className="tree-node-id">{node.id}</span>
              <CopyButton id={node.id} />
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
      </div>
    )
  }, [flattenedNodes, expandedIds, selectedTagId, toggleExpanded, selectTag, onEdit, onDelete, onCreateChild])

  return (
    <FixedSizeList
      height={height}
      itemCount={flattenedNodes.length}
      itemSize={28}
      width="100%"
      overscanCount={10}
      className="tree-scroll-container"
    >
      {Row}
    </FixedSizeList>
  )
}
