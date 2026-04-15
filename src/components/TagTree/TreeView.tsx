import { useEffect, useState, useRef } from 'react'
import { useTagTreeStore } from '../../stores/tagTreeStore'
import { DraggableTreeNode } from './DraggableTreeNode'
import { DroppableZone } from './DroppableZone'
import { VirtualizedTree } from './VirtualizedTree'
import './TreeTheme.css'

interface TreeViewProps {
  onEdit?: (tagId: string) => void
  onDelete?: (tagId: string) => void
  onCreateChild?: (parentId: string) => void
  virtualizationThreshold?: number
}

export function TreeView({
  onEdit,
  onDelete,
  onCreateChild,
  virtualizationThreshold = 100,
}: TreeViewProps) {
  const { tree, loading, error, fetchTree, collapseAll, expandAll, expandedIds, selectTag } = useTagTreeStore()
  const [totalNodeCount, setTotalNodeCount] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(600)

  useEffect(() => {
    fetchTree()
  }, [fetchTree])

  useEffect(() => {
    const countVisibleNodes = (nodes: typeof tree): number => {
      let count = 0
      for (const node of nodes) {
        count++
        if (expandedIds.has(node.tag.id) && node.children.length > 0) {
          count += countVisibleNodes(node.children)
        }
      }
      return count
    }
    
    setTotalNodeCount(countVisibleNodes(tree))
  }, [tree, expandedIds])

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight)
      }
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      selectTag(null)
    }
  }

  if (loading) {
    return (
      <div className="tree-loading">
        <div className="tree-loading-spinner" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="tree-empty-state">
        <div className="tree-empty-title" style={{ color: '#c55a5a' }}>{error}</div>
        <button
          onClick={() => fetchTree()}
          className="tree-toolbar-btn"
          style={{ marginTop: '0.5rem' }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (tree.length === 0) {
    return (
      <DroppableZone id="root">
        <div className="tree-empty-state">
          <div className="tree-empty-icon">
            <svg viewBox="0 0 24 24">
              <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z" />
            </svg>
          </div>
          <div className="tree-empty-title">No tags yet</div>
          <div className="tree-empty-desc">Create your first tag to get started</div>
        </div>
      </DroppableZone>
    )
  }

  const useVirtualization = totalNodeCount >= virtualizationThreshold

  return (
    <div className="tree-view-container flex flex-col h-full">
      <div className="tree-toolbar">
        <div className="tree-toolbar-actions">
          <button onClick={expandAll} className="tree-toolbar-btn">
            Expand All
          </button>
          <span style={{ color: 'var(--tree-border)', margin: '0 0.25rem' }}>|</span>
          <button onClick={collapseAll} className="tree-toolbar-btn">
            Collapse All
          </button>
        </div>
        
        {useVirtualization && (
          <div className="tree-toolbar-info">
            {totalNodeCount} tags · Virtual scrolling
          </div>
        )}
      </div>

      <div ref={containerRef} className="flex-1 overflow-hidden" onClick={handleContainerClick}>
        <DroppableZone id="root">
          {useVirtualization ? (
            <div className="h-full" onClick={(e) => e.stopPropagation()}>
              <VirtualizedTree
                tree={tree}
                expandedIds={expandedIds}
                height={containerHeight}
                onEdit={onEdit}
                onDelete={onDelete}
                onCreateChild={onCreateChild}
              />
            </div>
          ) : (
            <div className="tree-scroll-container overflow-auto h-full py-1" onClick={(e) => e.stopPropagation()}>
              {tree.map((node) => (
                <DraggableTreeNode
                  key={node.tag.id}
                  node={node}
                  depth={0}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onCreateChild={onCreateChild}
                />
              ))}
            </div>
          )}
        </DroppableZone>
      </div>
    </div>
  )
}
