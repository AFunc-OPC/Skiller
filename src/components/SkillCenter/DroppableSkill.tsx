import { useDroppable } from '@dnd-kit/core'
import { t } from '../../i18n'
import { Skill } from '../../types'
import { SkillCard } from './SkillCard'
import './DroppableSkill.css'

interface DroppableSkillCardProps {
  skill: Skill
  searchKeyword?: string
  onClick: () => void
  style?: React.CSSProperties
  language: 'zh' | 'en'
  enableDropHighlight?: boolean
}

export function DroppableSkillCard({
  skill,
  searchKeyword = '',
  onClick,
  style,
  language,
  enableDropHighlight = false,
}: DroppableSkillCardProps) {
  const { isOver, setNodeRef, active } = useDroppable({
    id: `skill-card-${skill.id}`,
    data: {
      type: 'skill',
      skill,
    },
  })

  const isDraggingTag = active?.data?.current?.type === 'tag-for-skill'
  const showDropIndicator = enableDropHighlight && isOver && isDraggingTag

  return (
    <div
      ref={setNodeRef}
      className={`droppable-skill-wrapper ${showDropIndicator ? 'drag-over' : ''}`}
    >
      {showDropIndicator && (
        <div className="drop-tag-indicator">
          <span className="drop-tag-text">
            {t('dropToAddTagToSkill', language)}
          </span>
        </div>
      )}
      <SkillCard
        skill={skill}
        searchKeyword={searchKeyword}
        onClick={onClick}
        style={style}
        language={language}
      />
    </div>
  )
}
