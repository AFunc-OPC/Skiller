import { useDndContext, useDroppable } from '@dnd-kit/core'
import './DroppableSkill.css'

interface DroppableSkillAreaProps {
  children: React.ReactNode
  isDraggingTag: boolean
}

export function DroppableSkillArea({
  children,
  isDraggingTag,
}: DroppableSkillAreaProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'skill-area',
    data: {
      type: 'skill-area',
    },
  })
  const { over } = useDndContext()

  const overId = typeof over?.id === 'string' ? over.id : ''
  const isOverSkillArea = overId === 'skill-area' || overId.startsWith('skill-card-') || overId.startsWith('skill-list-')
  const showDropHint = isDraggingTag && (isOver || isOverSkillArea)

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 overflow-y-auto p-4 skill-area-wrapper ${showDropHint ? 'skill-area-drag-over' : ''}`}
    >
      {children}
    </div>
  )
}
