import { useState } from 'react'
import { Trash2, Ban, CheckCircle, Folder, Link, FileText, FolderOpen } from 'lucide-react'
import { Skill } from '../../types'
import { useAppStore } from '../../stores/appStore'
import { desktopApi } from '../../api/desktop'
import { SkillMarkdownPreview } from '../SkillCenter/SkillMarkdownPreview'

interface ProjectSkillCardProps {
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

export function ProjectSkillCard({
  skill,
  searchKeyword = '',
  isSelected,
  onSelect,
  onRemove,
  onToggleStatus,
  style,
}: ProjectSkillCardProps) {
  const { language } = useAppStore()
  const isDisabled = skill.status === 'disabled'
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    onSelect(e.target.checked)
  }

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation()
    action()
  }

  const handleOpenFolder = async () => {
    try {
      await desktopApi.openFolder(skill.file_path)
    } catch (error) {
      console.error('Failed to open folder:', error)
    }
  }

  return (
    <>
      <article
        className={`ps-card ${isDisabled ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}
        style={style}
      >
        <div className="ps-card-inner">
          <div className="ps-card-header">
            <label className="ps-checkbox-wrap" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={handleCheckboxChange}
                className="ps-checkbox"
              />
            </label>
            <div className="ps-card-title">
              <HighlightText text={skill.name} keyword={searchKeyword} />
              {skill.is_symlink && (
                <span title={language === 'zh' ? '软链接' : 'Symlink'}>
                  <Link className="w-3.5 h-3.5 ml-1.5 text-blue-500 inline-block" />
                </span>
              )}
            </div>
            <span className={`ps-status-badge ${isDisabled ? 'disabled' : 'available'}`}>
              {isDisabled
                ? (language === 'zh' ? '已禁用' : 'Disabled')
                : (language === 'zh' ? '可用' : 'Available')}
            </span>
          </div>

          {skill.description && (
            <div className="ps-card-desc">{skill.description}</div>
          )}

          <div className="ps-card-meta">
            <div className="ps-meta-item">
              <Folder className="w-3 h-3 flex-shrink-0" />
              <span className="ps-meta-text" title={skill.file_path}>
                <HighlightText text={skill.file_path} keyword={searchKeyword} />
              </span>
            </div>
          </div>

          <div className="ps-card-actions">
            <button
              className="ps-action-btn"
              onClick={(e) => handleActionClick(e, () => setIsPreviewOpen(true))}
              title={language === 'zh' ? '查看 SKILL.md' : 'View SKILL.md'}
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              className="ps-action-btn"
              onClick={(e) => handleActionClick(e, handleOpenFolder)}
              title={language === 'zh' ? '打开目录' : 'Open Directory'}
            >
              <FolderOpen className="w-4 h-4" />
            </button>
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
      </article>
      <SkillMarkdownPreview
        skillId={skill.file_path}
        skillName={skill.name}
        skillPath={skill.file_path}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </>
  )
}
