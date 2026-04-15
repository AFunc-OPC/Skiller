import { Trash2, Ban, CheckCircle, Folder } from 'lucide-react'
import { Skill } from '../../types'
import { useAppStore } from '../../stores/appStore'

interface ProjectSkillListItemProps {
  skill: Skill
  searchKeyword?: string
  isSelected: boolean
  onSelect: (selected: boolean) => void
  onRemove: () => void
  onToggleStatus: () => void
  style?: React.CSSProperties
}

function HighlightText({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword.trim()) return <>{text}</>

  const normalizedKeyword = keyword.toLowerCase()
  const lowerText = text.toLowerCase()
  const index = lowerText.indexOf(normalizedKeyword)

  if (index === -1) return <>{text}</>

  const before = text.slice(0, index)
  const match = text.slice(index, index + keyword.length)
  const after = text.slice(index + keyword.length)

  return (
    <>
      {before}
      <mark className="pm-highlight">{match}</mark>
      {after}
    </>
  )
}

export function ProjectSkillListItem({
  skill,
  searchKeyword = '',
  isSelected,
  onSelect,
  onRemove,
  onToggleStatus,
  style,
}: ProjectSkillListItemProps) {
  const { language } = useAppStore()
  const isDisabled = skill.status === 'disabled'

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    onSelect(e.target.checked)
  }

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation()
    action()
  }

  return (
    <div 
      className={`ps-list-item ${isDisabled ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}
      style={style}
    >
      <label className="ps-checkbox-wrap" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          className="ps-checkbox"
        />
      </label>
      <div className="ps-list-content">
        <div className="ps-list-row">
          <span className="ps-list-name">
            <HighlightText text={skill.name} keyword={searchKeyword} />
          </span>
          <span className="ps-list-desc">
            {skill.description || (language === 'zh' ? '—' : '—')}
          </span>
          <span className={`ps-status-badge ${isDisabled ? 'disabled' : 'available'}`}>
            {isDisabled
              ? (language === 'zh' ? '已禁用' : 'Disabled')
              : (language === 'zh' ? '可用' : 'Available')}
          </span>
        </div>
        <div className="ps-list-meta-row">
          <div className="ps-list-meta-item">
            <Folder className="w-3 h-3 flex-shrink-0" />
            <span className="skill-path-scroll" title={skill.file_path}>
              <HighlightText text={skill.file_path} keyword={searchKeyword} />
            </span>
          </div>
        </div>
      </div>
      <div className="ps-list-actions">
        <button
          className="ps-action-btn"
          onClick={(e) => handleActionClick(e, onToggleStatus)}
          title={isDisabled
            ? (language === 'zh' ? '启用' : 'Enable')
            : (language === 'zh' ? '禁用' : 'Disable')}
        >
          {isDisabled
            ? <CheckCircle className="w-4 h-4" />
            : <Ban className="w-4 h-4" />}
        </button>
        <button
          className="ps-action-btn ps-action-danger"
          onClick={(e) => handleActionClick(e, onRemove)}
          title={language === 'zh' ? '移除' : 'Remove'}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
