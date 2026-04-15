import { useDroppable } from '@dnd-kit/core'
import './TreeTheme.css'

interface DroppableZoneProps {
  id: string
  children?: React.ReactNode
}

export function DroppableZone({ id, children }: DroppableZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { type: id === 'root' ? 'root' : 'tag' },
  })

  return (
    <div
      ref={setNodeRef}
      className={`tree-droppable-zone ${isOver ? 'drag-active' : ''}`}
      style={id === 'root' && isOver ? { minHeight: '40px', borderRadius: '8px' } : undefined}
    >
      {children}
    </div>
  )
}
