import { useDndContext, useDroppable } from '@dnd-kit/core'
import { Language } from '../../stores/appStore'
import './DroppableSkill.css'

interface DroppableSkillAreaProps {
  children: React.ReactNode
  isDraggingTag: boolean
  language: Language
}

export function DroppableSkillArea({
  children,
  isDraggingTag,
  language,
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
      {showDropHint && (
        <div className="skill-area-drop-hint">
          <span className="skill-area-drop-text">
            {language === 'zh' ? '松开添加标签到技能' : 'Drop to add tag to skill'}
          </span>
        </div>
      )}
      {children}
    </div>
  )
}
