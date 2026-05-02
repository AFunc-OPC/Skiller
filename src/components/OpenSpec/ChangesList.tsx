import { useState, useMemo } from 'react'
import { Search, Plus, FolderOpen } from 'lucide-react'
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
      <mark>{match}</mark>
      {after}
    </>
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

  const inProgressChanges = filteredChanges.filter((c) => c.status === 'in_progress')
  const archivedChanges = filteredChanges.filter((c) => c.status === 'archived')

  if (loading) {
    return (
      <div className="os-changes-list">
        <div className="os-changes-header">
          <div className="os-search">
            <Search className="os-search-icon" />
            <input
              type="text"
              className="os-search-input"
              placeholder={language === 'zh' ? '搜索变更...' : 'Search changes...'}
              disabled
            />
          </div>
        </div>
        <div className="os-changes-content">
          <div className="os-empty-changes">
            <p>{language === 'zh' ? '加载中...' : 'Loading...'}</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="os-changes-list">
        <div className="os-changes-header">
          <div className="os-search">
            <Search className="os-search-icon" />
            <input
              type="text"
              className="os-search-input"
              placeholder={language === 'zh' ? '搜索变更...' : 'Search changes...'}
              disabled
            />
          </div>
        </div>
        <div className="os-changes-content">
          <div className="os-empty-changes">
            <p className="text-red-500">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="os-changes-list">
      <div className="os-changes-header">
        <div className="os-search">
          <Search className="os-search-icon" />
          <input
            type="text"
            className="os-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'zh' ? '搜索变更...' : 'Search changes...'}
          />
        </div>
      </div>

      <div className="os-changes-content">
        {filteredChanges.length === 0 ? (
          <div className="os-empty-changes">
            <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>
              {searchQuery
                ? language === 'zh'
                  ? '没有匹配的变更'
                  : 'No matching changes'
                : language === 'zh'
                  ? '暂无变更'
                  : 'No changes yet'}
            </p>
          </div>
        ) : (
          <>
            {inProgressChanges.map((change) => (
              <div
                key={change.id}
                className={`os-change-card ${selectedChangeId === change.id ? 'selected' : ''}`}
                onClick={() => onSelectChange(change.id)}
              >
                <div className="os-change-header">
                  <span className="os-change-name">
                    <HighlightText text={change.name} query={searchQuery} />
                  </span>
                  <span className="os-change-status in-progress">
                    {language === 'zh' ? '进行中' : 'In Progress'}
                  </span>
                </div>
                <div className="os-change-stage">
                  {language === 'zh' ? '当前阶段' : 'Stage'}: {change.currentStage}
                </div>
              </div>
            ))}

            {archivedChanges.length > 0 && inProgressChanges.length > 0 && (
              <div className="os-changes-divider">
                <span>{language === 'zh' ? '已归档' : 'Archived'}</span>
              </div>
            )}

            {archivedChanges.map((change) => (
              <div
                key={change.id}
                className={`os-change-card ${selectedChangeId === change.id ? 'selected' : ''}`}
                onClick={() => onSelectChange(change.id)}
              >
                <div className="os-change-header">
                  <span className="os-change-name">
                    <HighlightText text={change.name} query={searchQuery} />
                  </span>
                  <span className="os-change-status archived">
                    {language === 'zh' ? '已归档' : 'Archived'}
                  </span>
                </div>
                <div className="os-change-stage">
                  {language === 'zh' ? '当前阶段' : 'Stage'}: {change.currentStage}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="os-changes-footer">
        <button className="os-new-change-btn">
          <Plus className="w-4 h-4" />
          <span>{language === 'zh' ? '新建变更' : 'New Change'}</span>
        </button>
      </div>
    </div>
  )
}
