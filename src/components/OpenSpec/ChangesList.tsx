import { useState, useMemo } from 'react'
import { Search, Archive, CheckCircle2, Circle, Loader2, ChevronDown, ChevronRight, FolderOpen } from 'lucide-react'
import type { OpenSpecChangeInfo, OpenSpecStage } from '../../types'

interface ChangesListProps {
  changes: OpenSpecChangeInfo[]
  archivedChanges: OpenSpecChangeInfo[]
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

const STAGE_CONFIG: Record<OpenSpecStage, { color: string; label: { zh: string; en: string } }> = {
  proposal: { color: '#6b7280', label: { zh: '提案', en: 'Proposal' } },
  apply: { color: '#3b82f6', label: { zh: '实现', en: 'Apply' } },
  archive: { color: '#10b981', label: { zh: '归档', en: 'Archive' } },
}

function StageBadge({ stage, language }: { stage: OpenSpecStage; language: 'zh' | 'en' }) {
  const config = STAGE_CONFIG[stage] || STAGE_CONFIG.proposal
  return (
    <span className="os-stage-badge" style={{ '--stage-color': config.color } as React.CSSProperties}>
      <span className="os-stage-dot" />
      <span className="os-stage-label-text">{config.label[language]}</span>
    </span>
  )
}

export function ChangesList({
  changes,
  archivedChanges,
  selectedChangeId,
  loading,
  error,
  onSelectChange,
  projectPath,
  language,
}: ChangesListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCollapsed, setActiveCollapsed] = useState(false)
  const [archivedCollapsed, setArchivedCollapsed] = useState(true)

  const filteredChanges = useMemo(() => {
    if (!searchQuery.trim()) return changes
    const normalized = searchQuery.toLowerCase()
    return changes.filter((change) =>
      change.name.toLowerCase().includes(normalized)
    )
  }, [changes, searchQuery])

  const filteredArchivedChanges = useMemo(() => {
    if (!searchQuery.trim()) return archivedChanges
    const normalized = searchQuery.toLowerCase()
    return archivedChanges.filter((change) =>
      change.name.toLowerCase().includes(normalized)
    )
  }, [archivedChanges, searchQuery])

  if (loading) {
    return (
      <div className="os-changes-list">
        <div className="os-changes-search">
          <Search className="os-search-icon" />
          <input
            type="text"
            className="os-search-input"
            value={searchQuery}
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
            value={searchQuery}
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
        {filteredChanges.length + filteredArchivedChanges.length > 0 && (
          <span className="os-changes-count">{filteredChanges.length + filteredArchivedChanges.length}</span>
        )}
      </div>

      <div className="os-changes-body">
        {filteredChanges.length === 0 && filteredArchivedChanges.length === 0 ? (
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
            {filteredChanges.length > 0 && (
              <div className="os-changes-group active">
                <div 
                  className="os-group-label" 
                  onClick={() => setActiveCollapsed(!activeCollapsed)}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  {activeCollapsed ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                  <FolderOpen className="w-3 h-3" />
                  <span>{language === 'zh' ? '进行中' : 'Active'}</span>
                  <span className="os-group-count">({filteredChanges.length})</span>
                </div>
              </div>
            )}

            {!activeCollapsed && filteredChanges.map((change, index) => (
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
                  <div className="os-change-meta">
                    <StageBadge stage={change.currentStage} language={language} />
                    <span className="os-change-progress">
                      {change.completedTasks}/{change.totalTasks}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {filteredArchivedChanges.length > 0 && (
              <div className="os-changes-group archived">
                <div 
                  className="os-group-label" 
                  onClick={() => setArchivedCollapsed(!archivedCollapsed)}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  {archivedCollapsed ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                  <Archive className="w-3 h-3" />
                  <span>{language === 'zh' ? '已归档' : 'Archived'}</span>
                  <span className="os-group-count">({filteredArchivedChanges.length})</span>
                </div>
              </div>
            )}

            {!archivedCollapsed && filteredArchivedChanges.map((change, index) => (
              <div
                key={change.name}
                className={`os-change-item archived ${selectedChangeId === change.name ? 'selected' : ''}`}
                onClick={() => onSelectChange(change.name)}
                style={{ '--delay': `${(filteredChanges.length + index) * 30}ms` } as React.CSSProperties}
              >
                <div className="os-change-indicator">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="os-change-content">
                  <span className="os-change-name">
                    <HighlightText text={change.name} query={searchQuery} />
                  </span>
                  <div className="os-change-meta">
                    <StageBadge stage={change.currentStage} language={language} />
                    <span className="os-change-progress">
                      {change.completedTasks}/{change.totalTasks}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
