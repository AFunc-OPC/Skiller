import { useAppStore } from '../../stores/appStore'
import type { Repo } from '../../types'

interface RepositoryCardProps {
  repository: Repo
  query: string
  onClick: () => void
  style?: React.CSSProperties
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  
  const normalizedQuery = query.toLowerCase()
  const lowerText = text.toLowerCase()
  const index = lowerText.indexOf(normalizedQuery)
  
  if (index === -1) return <>{text}</>
  
  const before = text.slice(0, index)
  const match = text.slice(index, index + query.length)
  const after = text.slice(index + query.length)
  
  return (
    <>
      {before}
      <mark className="repo-highlight">{match}</mark>
      {after}
    </>
  )
}

export function RepositoryCard({ repository, query, onClick, style }: RepositoryCardProps) {
  const { language } = useAppStore()
  const description = repository.description || (language === 'zh' ? '无简介' : 'No description')
  
  const truncateText = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text
    return `${text.slice(0, maxLength)}...`
  }
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return language === 'zh' ? '未同步' : 'Not synced'
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }
  
  const localPath = repository.local_path || `~/.skiller/repository/${repository.id}/`
  
  return (
    <article className="repo-card" onClick={onClick} style={style}>
      <div className="repo-card-inner">
        <div className="repo-card-header">
          <div className="repo-card-title">
            <HighlightText text={repository.name} query={query} />
          </div>
          {repository.is_builtin && (
            <span className="repo-builtin-badge">
              {language === 'zh' ? '内置' : 'Built-in'}
            </span>
          )}
        </div>
        {description && description !== (language === 'zh' ? '无简介' : 'No description') && (
          <div className="repo-card-desc">{truncateText(description, 80)}</div>
        )}
        <div className="repo-card-meta">
          <div className="repo-meta-item">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" className="w-3 h-3 flex-shrink-0" strokeWidth="1.5">
              <path d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9.172 6.172a2 2 0 00-2.828 0l-3 3a2 2 0 102.828 2.828l1.5-1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="repo-meta-text" title={repository.url}>
              <HighlightText text={truncateText(repository.url, 50)} query={query} />
            </span>
          </div>
          <div className="repo-meta-item">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" className="w-3 h-3 flex-shrink-0" strokeWidth="1.5">
              <path d="M3 7h5l2 2h7v7H3z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 7l2-2h4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="repo-meta-text" title={localPath}>
              <HighlightText text={truncateText(localPath, 40)} query={query} />
            </span>
          </div>
          <div className="repo-meta-item">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" className="w-3 h-3 flex-shrink-0" strokeWidth="1.5">
              <circle cx="10" cy="10" r="8" />
              <path d="M10 6v4l2.828 2.828" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="repo-meta-text">{formatDate(repository.last_sync)}</span>
          </div>
        </div>
      </div>
    </article>
  )
}
