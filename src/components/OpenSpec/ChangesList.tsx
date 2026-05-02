import { useState, useMemo } from 'react'
import { Search, Archive, CheckCircle2, Circle, Loader2 } from 'lucide-react'
import type { OpenSpecChangeInfo } from '../../types'

interface ChangesListProps {
  changes: OpenSpecChangeInfo[]
  selectedChangeId: string | null
  loading: boolean
  error: string | null
  onSelectChange: (changeId: string) => void
  projectPath: string
  language: 'zh' | 'en'
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
      <mark className="os-highlight">{match}</mark>
      {after}
    </>
  )
}

function ProgressBadge({ 
  completed, 
  total, 
  status,
  language 
}: { 
  completed: number
  total: number
  status: string
  language: 'zh' | 'en'
}) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
  
  let color = '#6b7280'
  let label = language === 'zh' ? '无任务' : 'No tasks'
  
  if (status === 'complete') {
    color = '#10b981'
    label = language === 'zh' ? '已完成' : 'Complete'
  } else if (status === 'in-progress') {
    color = '#3b82f6'
    label = language === 'zh' ? '进行中' : 'In Progress'
  }

  return (
    <div className="os-progress-badge" style={{ '--progress-color': color } as React.CSSProperties}>
      <div className="os-progress-ring">
        <svg viewBox="0 0 24 24" className="w-5 h-5">
          <circle 
            cx="12" cy="12" r="10" 
            fill="none" 
            stroke="var(--border-soft)" 
            strokeWidth="2"
          />
          <circle 
            cx="12" cy="12" r="10" 
            fill="none" 
            stroke={color} 
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${percentage * 0.628} 100`}
            transform="rotate(-90 12 12)"
          />
        </svg>
      </div>
      <div className="os-progress-info">
        <span className="os-progress-label" style={{ color }}>{label}</span>
        {total > 0 && (
          <span className="os-progress-count">{completed}/{total}</span>
        )}
      </div>
    </div>
  )
}

export function ChangesList({
  changes,
  selectedChangeId,
  loading,
  error,
  onSelectChange,
  projectPath,
  language,
}: ChangesListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredChanges = useMemo(() => {
    if (!searchQuery.trim()) return changes
    const normalized = searchQuery.toLowerCase()
    return changes.filter((change) =>
      change.name.toLowerCase().includes(normalized)
    )
  }, [changes, searchQuery])

  const inProgressChanges = filteredChanges.filter((c) => c.status !== 'complete')
  const completedChanges = filteredChanges.filter((c) => c.status === 'complete')

  if (loading) {
    return (
      <div className="os-changes-list">
        <div className="os-changes-search">
          <Search className="os-search-icon" />
          <input
            type="text"
            className="os-search-input"
            placeholder={language === 'zh' ? '搜索...' : 'Search...'}
            disabled
          />
        </div>
        <div className="os-changes-body">
          <div className="os-loading-skeleton">
            {[1, 2, 3].map((i) => (
              <div key={i} className="os-skeleton-item">
                <div className="os-skeleton-line os-skeleton-title" />
                <div className="os-skeleton-line os-skeleton-meta" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="os-changes-list">
        <div className="os-changes-search">
          <Search className="os-search-icon" />
          <input
            type="text"
            className="os-search-input"
            placeholder={language === 'zh' ? '搜索...' : 'Search...'}
            disabled
          />
        </div>
        <div className="os-changes-body">
          <div className="os-error-state">
            <p>{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="os-changes-list">
      <div className="os-changes-search">
        <Search className="os-search-icon" />
        <input
          type="text"
          className="os-search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={language === 'zh' ? '搜索变更...' : 'Search changes...'}
        />
        {filteredChanges.length > 0 && (
          <span className="os-changes-count">{filteredChanges.length}</span>
        )}
      </div>

      <div className="os-changes-body">
        {filteredChanges.length === 0 ? (
          <div className="os-empty-state">
            <Circle className="os-empty-icon" />
            <p>
              {searchQuery
                ? language === 'zh' ? '无匹配结果' : 'No matches'
                : language === 'zh' ? '暂无变更' : 'No changes'}
            </p>
          </div>
        ) : (
          <>
            {inProgressChanges.map((change, index) => (
              <div
                key={change.name}
                className={`os-change-item ${selectedChangeId === change.name ? 'selected' : ''}`}
                onClick={() => onSelectChange(change.name)}
                style={{ '--delay': `${index * 30}ms` } as React.CSSProperties}
              >
                <div className="os-change-indicator">
                  {change.status === 'in-progress' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Circle className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="os-change-content">
                  <span className="os-change-name">
                    <HighlightText text={change.name} query={searchQuery} />
                  </span>
                  <ProgressBadge 
                    completed={change.completedTasks}
                    total={change.totalTasks}
                    status={change.status}
                    language={language}
                  />
                </div>
              </div>
            ))}

            {completedChanges.length > 0 && inProgressChanges.length > 0 && (
              <div className="os-changes-group archived">
                <div className="os-group-label">
                  <Archive className="w-3 h-3" />
                  <span>{language === 'zh' ? '已完成' : 'Completed'}</span>
                </div>
              </div>
            )}

            {completedChanges.map((change, index) => (
              <div
                key={change.name}
                className={`os-change-item archived ${selectedChangeId === change.name ? 'selected' : ''}`}
                onClick={() => onSelectChange(change.name)}
                style={{ '--delay': `${(inProgressChanges.length + index) * 30}ms` } as React.CSSProperties}
              >
                <div className="os-change-indicator">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="os-change-content">
                  <span className="os-change-name">
                    <HighlightText text={change.name} query={searchQuery} />
                  </span>
                  <ProgressBadge 
                    completed={change.completedTasks}
                    total={change.totalTasks}
                    status={change.status}
                    language={language}
                  />
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
