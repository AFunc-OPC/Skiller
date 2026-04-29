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
  isSelected?: boolean
  hasSelection?: boolean
  onToggleSelect?: (skillId: string) => void
}

export function DroppableSkillCard({
  skill,
  searchKeyword = '',
  onClick,
  style,
  language,
  enableDropHighlight = false,
  isSelected = false,
  hasSelection = false,
  onToggleSelect,
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

  const handleCardClick = () => {
    if (hasSelection && onToggleSelect) {
      onToggleSelect(skill.id)
    } else {
      onClick()
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={`droppable-skill-wrapper ${showDropIndicator ? 'drag-over' : ''} ${isSelected ? 'skill-selected' : ''}`}
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
        onClick={handleCardClick}
        style={style}
        language={language}
      />
    </div>
  )
}
