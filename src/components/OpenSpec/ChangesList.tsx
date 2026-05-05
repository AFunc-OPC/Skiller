import { useState, useMemo } from 'react'
import { Search, Archive, CheckCircle2, Circle, Loader2, ChevronDown, ChevronRight, FolderOpen } from 'lucide-react'
import { t } from '../../i18n'
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

function StageBadge({ stage, language }: { stage: OpenSpecStage; language: 'zh' | 'en' }) {
  const stageKey = stage === 'proposal' ? 'openspecStageProposal' 
    : stage === 'apply' ? 'openspecStageApply' 
    : 'openspecStageArchive'
  const color = stage === 'proposal' ? '#6b7280' 
    : stage === 'apply' ? '#3b82f6' 
    : '#10b981'
  
  return (
    <span className="os-stage-badge" style={{ '--stage-color': color } as React.CSSProperties}>
      <span className="os-stage-dot" />
      <span className="os-stage-label-text">{t(stageKey, language)}</span>
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
            placeholder={t('openspecSearch', language)}
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
            placeholder={t('openspecSearch', language)}
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
          placeholder={t('openspecSearchChanges', language)}
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
                ? t('openspecNoMatches', language)
                : t('openspecNoChanges', language)}
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
                  <span>{t('openspecActive', language)}</span>
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
                  <span>{t('openspecArchived', language)}</span>
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
