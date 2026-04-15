import { FileX } from 'lucide-react'
import './SkillCenter.css'

interface EmptyStateProps {
  message?: string
  description?: string
}

export function EmptyState({ 
  message = '暂无技能', 
  description = '点击添加按钮导入技能' 
}: EmptyStateProps) {
  return (
    <div className="sc-empty-state">
      <div className="sc-empty-state-icon">
        <FileX />
      </div>
      <div className="sc-empty-state-title">{message}</div>
      {description && <div className="sc-empty-state-desc">{description}</div>}
    </div>
  )
}
