import { useAppStore } from '../../stores/appStore'
import type { Repo } from '../../types'

interface RepositoryListItemProps {
  repository: Repo
  query: string
  onClick: () => void
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

export function RepositoryListItem({ repository, query, onClick }: RepositoryListItemProps) {
  const { language } = useAppStore()
  const description = repository.description || (language === 'zh' ? '无简介' : 'No description')
  
  const truncateText = (text: string, maxLength: number = 80) => {
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
    <div className="repo-list-item" onClick={onClick}>
      <div className="repo-list-content">
        <div className="repo-list-row">
          <span className="repo-list-name">
            <span className="repo-list-name-text">
              <HighlightText text={repository.name} query={query} />
            </span>
            {repository.is_builtin && (
              <span className="repo-builtin-badge">
                {language === 'zh' ? '内置' : 'Built-in'}
              </span>
            )}
          </span>
          <span className="repo-list-desc">{truncateText(description, 50)}</span>
        </div>
        <div className="repo-list-meta">
          <span className="repo-list-url" title={repository.url}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" className="repo-meta-icon" strokeWidth="1.5">
              <path d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9.172 6.172a2 2 0 00-2.828 0l-3 3a2 2 0 102.828 2.828l1.5-1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <HighlightText text={truncateText(repository.url, 60)} query={query} />
          </span>
        </div>
        <div className="repo-list-meta">
          <span className="repo-list-path" title={localPath}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" className="repo-meta-icon" strokeWidth="1.5">
              <path d="M3 7h5l2 2h7v7H3z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 7l2-2h4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {truncateText(localPath, 50)}
          </span>
          <span className="repo-list-time">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" className="repo-meta-icon" strokeWidth="1.5">
              <circle cx="10" cy="10" r="8" />
              <path d="M10 6v4l2.828 2.828" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {formatDate(repository.last_sync)}
          </span>
        </div>
      </div>
    </div>
  )
}
