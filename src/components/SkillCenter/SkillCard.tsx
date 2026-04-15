import { Tag, Folder, Clock } from 'lucide-react'
import { Skill } from '../../types'
import { HighlightText } from './HighlightText'
import { useTagTreeStore } from '../../stores/tagTreeStore'
import { Language } from '../../stores/appStore'

interface SkillCardProps {
  skill: Skill
  searchKeyword?: string
  onClick: () => void
  style?: React.CSSProperties
  language: Language
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

export function SkillCard({ skill, searchKeyword = '', onClick, style, language }: SkillCardProps) {
  const isDisabled = skill.status === 'disabled'
  const { tree } = useTagTreeStore()
  
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
  
  return (
    <article 
      className={`pm-card ${isDisabled ? 'opacity-60' : ''}`} 
      onClick={onClick} 
      style={style}
    >
      <div className="pm-card-inner">
        <div className="pm-card-row">
          <div className="pm-card-title">
            <HighlightText text={skill.name} keyword={searchKeyword} />
          </div>
          <span className={`pm-status-badge ${isDisabled ? 'disabled' : 'available'}`}>
            {isDisabled ? (language === 'zh' ? '已禁用' : 'Disabled') : (language === 'zh' ? '可用' : 'Available')}
          </span>
        </div>
        
        {skill.description && (
          <div className="pm-card-desc">{skill.description}</div>
        )}
        
        {skill.tags.length > 0 && (
          <div className="pm-card-tags">
            <Tag className="w-3 h-3 flex-shrink-0 text-gray-400" />
            <div className="pm-tag-list">
              {skill.tags.slice(0, 2).map((tagId, i) => {
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
              {skill.tags.length > 2 && (
                <span className="pm-tag-more">+{skill.tags.length - 2}</span>
              )}
            </div>
          </div>
        )}
        
        <div className="pm-card-meta">
          <div className="pm-meta-item">
            <Folder className="w-3 h-3 flex-shrink-0" />
            <span className="pm-meta-text skill-path-scroll" title={skill.file_path}>
              <HighlightText text={skill.file_path} keyword={searchKeyword} />
            </span>
          </div>
          <div className="pm-meta-item">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span className="pm-meta-text">{new Date(skill.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </article>
  )
}
