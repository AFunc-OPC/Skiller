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

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleSelect?.(skill.id)
  }

  return (
    <div
      ref={setNodeRef}
      className={`droppable-skill-wrapper ${showDropIndicator ? 'drag-over' : ''} ${isSelected ? 'skill-selected' : ''}`}
      onClick={handleCardClick}
    >
      {showDropIndicator && (
        <div className="drop-tag-indicator">
          <span className="drop-tag-text">
            {t('dropToAddTagToSkill', language)}
          </span>
        </div>
      )}
      <div
        className={`skill-select-checkbox ${isSelected ? 'checked' : ''} ${hasSelection || isSelected ? 'visible' : ''}`}
        onClick={handleCheckboxClick}
      >
        {isSelected ? (
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
            <path fillRule="evenodd" d="M13.707 4.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-3-3a1 1 0 011.414-1.414L6 10.586l6.293-6.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : null}
      </div>
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
