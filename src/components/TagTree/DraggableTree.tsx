import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import type { TreeNode as TreeNodeType, Tag } from '../../types'
import { useTagTreeStore } from '../../stores/tagTreeStore'
import './TreeTheme.css'

interface DraggableTreeProps {
  children: React.ReactNode
  onMoveError?: (error: string) => void
  onMoveSuccess?: (message: string) => void
}

export function DraggableTree({ children, onMoveError, onMoveSuccess }: DraggableTreeProps) {
  const [activeTag, setActiveTag] = useState<Tag | null>(null)
  const { moveTag, tree } = useTagTreeStore()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const tag = findTagById(active.id as string, tree)
    setActiveTag(tag)
  }

  const handleDragOver = () => {
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    setActiveTag(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    try {
      const tagToMove = findTagById(activeId, tree)
      const targetName = overId === 'root' ? 'root level' : findTagById(overId, tree)?.name

      if (overId === 'root') {
        await moveTag(activeId, undefined)
      } else {
        await moveTag(activeId, overId)
      }

      if (tagToMove && onMoveSuccess) {
        onMoveSuccess(`Moved "${tagToMove.name}" to ${targetName}`)
      }
    } catch (error) {
      console.error('Failed to move tag:', error)
      if (onMoveError) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        onMoveError(errorMessage)
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {children}
      
      <DragOverlay>
        {activeTag && (
          <div className="tree-drag-overlay">
            {activeTag.name}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

function findTagById(id: string, nodes: TreeNodeType[]): Tag | null {
  for (const node of nodes) {
    if (node.tag.id === id) {
      return node.tag
    }
    const found = findTagById(id, node.children)
    if (found) return found
  }
  return null
}

export type { DraggableTreeProps }
