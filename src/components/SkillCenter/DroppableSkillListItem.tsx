import { useDroppable } from '@dnd-kit/core'
import { Clock, Folder, Tag } from 'lucide-react'
import { t } from '../../i18n'
import { Skill } from '../../types'
import { HighlightText } from './HighlightText'
import { useTagTreeStore } from '../../stores/tagTreeStore'
import { Language } from '../../stores/appStore'
import './DroppableSkill.css'

interface DroppableSkillListItemProps {
  skill: Skill
  searchKeyword?: string
  onSkillClick: (skill: Skill) => void
  language: Language
  enableDropHighlight?: boolean
  isSelected?: boolean
  hasSelection?: boolean
  onToggleSelect?: (skillId: string) => void
}

const STATUS_COLORS = [
  { bg: '#E0F2F1', text: '#00695C' },
  { bg: '#E8EAF6', text: '#283593' },
  { bg: '#FFF3E0', text: '#E65100' },
  { bg: '#F3E5F5', text: '#6A1B9A' },
  { bg: '#E1F5FE', text: '#0277BD' },
  { bg: '#FBE9E7', text: '#D84315' },
]

function getTagColor(tagId: string): { bg: string; text: string } {
  let hash = 0
  for (let i = 0; i < tagId.length; i++) {
    const char = tagId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return STATUS_COLORS[Math.abs(hash) % STATUS_COLORS.length]
}

export function DroppableSkillListItem({
  skill,
  searchKeyword = '',
  onSkillClick,
  language,
  enableDropHighlight = false,
  isSelected = false,
  hasSelection = false,
  onToggleSelect,
}: DroppableSkillListItemProps) {
  const { tree } = useTagTreeStore()
  const { isOver, setNodeRef, active } = useDroppable({
    id: `skill-list-${skill.id}`,
    data: {
      type: 'skill',
      skill,
    },
  })

  const isDraggingTag = active?.data?.current?.type === 'tag-for-skill'
  const showDropIndicator = enableDropHighlight && isOver && isDraggingTag
  const isDisabled = skill.status === 'disabled'

  const getTagName = (tagId: string): string => {
    const findTag = (nodes: typeof tree): string | null => {
      for (const node of nodes) {
        if (node.tag.id === tagId) return node.tag.name
        const found = findTag(node.children)
        if (found) return found
      }
      return null
    }
    return findTag(tree) || tagId
  }

  const handleItemClick = () => {
    if (hasSelection && onToggleSelect) {
      onToggleSelect(skill.id)
    } else {
      onSkillClick(skill)
    }
  }

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleSelect?.(skill.id)
  }

  return (
    <div
      ref={setNodeRef}
      onClick={handleItemClick}
      className={`droppable-skill-list-item pm-list-item ${isDisabled ? 'opacity-60' : ''} ${showDropIndicator ? 'drag-over' : ''} ${isSelected ? 'skill-selected' : ''}`}
    >
      {showDropIndicator && (
        <div className="drop-tag-indicator-list">
          {t('dropToAddTagToSkill', language)}
        </div>
      )}
      <div
        className={`skill-select-checkbox list-mode ${isSelected ? 'checked' : ''} ${hasSelection || isSelected ? 'visible' : ''}`}
        onClick={handleCheckboxClick}
      >
        {isSelected ? (
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
            <path fillRule="evenodd" d="M13.707 4.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-3-3a1 1 0 011.414-1.414L6 10.586l6.293-6.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : null}
      </div>
      <div className="pm-list-content">
        <div className="pm-list-row">
          <span className="pm-list-name">
            <HighlightText text={skill.name} keyword={searchKeyword} />
          </span>
          <span className="pm-list-desc">
            {skill.description || '-'}
          </span>
          <span className={`pm-status-badge ${isDisabled ? 'disabled' : 'available'}`}>
            {isDisabled ? (language === 'zh' ? '已禁用' : 'Disabled') : (language === 'zh' ? '可用' : 'Available')}
          </span>
        </div>

        <div className="pm-list-meta-row">
          <div className="pm-list-meta-item">
            <Folder className="w-3 h-3 flex-shrink-0" />
            <span className="skill-path-scroll" title={skill.file_path}>
              <HighlightText text={skill.file_path} keyword={searchKeyword} />
            </span>
          </div>
          <div className="pm-list-meta-item">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span>{new Date(skill.updated_at).toLocaleDateString()}</span>
          </div>
        </div>

        {skill.tags.length > 0 && (
          <div className="pm-list-tags">
            <Tag className="w-3 h-3 flex-shrink-0 text-gray-400" />
            <div className="pm-tag-list">
              {skill.tags.map((tagId, i) => {
                const color = getTagColor(tagId)
                return (
                  <span
                    key={i}
                    className="pm-tag-chip"
                    style={{ backgroundColor: color.bg, color: color.text }}
                  >
                    {getTagName(tagId)}
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
