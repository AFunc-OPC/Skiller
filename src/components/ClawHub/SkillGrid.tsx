import { useState, useEffect, useCallback, useRef, memo } from 'react'
import { useClawhubStore } from '../../stores/clawhubStore'
import { useAppStore } from '../../stores/appStore'
import { t } from '../../i18n'
import { SkillDetailDrawer } from './SkillDetailDrawer'
import { ImportButton } from './ImportButton'
import { EmptyState } from './EmptyState'
import { useDebounce } from '../../hooks/useDebounce'
import { formatClawhubDate } from './formatClawhubDate'

type SortOption = 'newest' | 'updated' | 'downloads' | 'rating'

interface SkillGridProps {
  language: 'zh' | 'en'
  sourceId: string
  sourceName: string
}

export function SkillGrid({ language, sourceId, sourceName }: SkillGridProps) {
  const {
    skills,
    skillsLoading,
    searchQuery,
    sortOption,
    selectedSkillSlug,
    skillDetail,
    detailLoading,
    exploreSkills,
    searchSkills,
    setSortOption,
    setSearchQuery,
    inspectSkill,
    clearSkillDetail,
    importSkills,
  } = useClawhubStore()

  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
  const [localSearch, setLocalSearch] = useState('')
  const [batchMode, setBatchMode] = useState(false)
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set())
  const debouncedSearch = useDebounce(localSearch, 300)

  useEffect(() => {
    if (sourceId) {
      exploreSkills(sourceId)
    }
  }, [sourceId, sortOption])

  useEffect(() => {
    if (debouncedSearch !== searchQuery && sourceId) {
      if (debouncedSearch.trim()) {
        searchSkills(sourceId, debouncedSearch)
      } else {
        exploreSkills(sourceId)
      }
    }
  }, [debouncedSearch])

  const handleInspect = (slug: string) => {
    inspectSkill(sourceId, slug)
  }

  const handleSortChange = (newSort: SortOption) => {
    setSortOption(newSort)
  }

  const toggleBatchSelection = (slug: string) => {
    setSelectedSlugs(prev => {
      const next = new Set(prev)
      if (next.has(slug)) {
        next.delete(slug)
      } else {
        next.add(slug)
      }
      return next
    })
  }

  const sortOptions: Array<{ value: SortOption; label: string }> = [
    { value: 'newest', label: t('clawhubSortNewest', language) },
    { value: 'updated', label: t('clawhubSortUpdated', language) },
    { value: 'downloads', label: t('clawhubSortDownloads', language) },
    { value: 'rating', label: t('clawhubSortRating', language) },
  ]

  return (
    <div className="clawhub-skill-grid">
      <div className="clawhub-grid-header">
        <h3 className="clawhub-grid-title">{sourceName}</h3>
        <div className="clawhub-grid-controls">
          <div className="clawhub-search-bar">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="clawhub-search-icon">
              <circle cx="8.5" cy="8.5" r="4.5" />
              <path d="m12 12 4.5 4.5" />
            </svg>
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder={t('clawhubSearch', language)}
              className="clawhub-search-input"
            />
            {localSearch && (
              <button className="clawhub-search-clear" onClick={() => { setLocalSearch('') }}>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 6L6 14M6 6l8 8" /></svg>
              </button>
            )}
          </div>

          <div className="clawhub-sort">
            <select
              value={sortOption}
              onChange={(e) => handleSortChange(e.target.value as SortOption)}
              className="clawhub-sort-select"
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="clawhub-view-toggle">
            <button
              className={`clawhub-view-btn ${viewMode === 'card' ? 'active' : ''}`}
              onClick={() => setViewMode('card')}
              title={t('cardView', language)}
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25">
                <rect x="3" y="3" width="6" height="6" rx="1" />
                <rect x="11" y="3" width="6" height="6" rx="1" />
                <rect x="3" y="11" width="6" height="6" rx="1" />
                <rect x="11" y="11" width="6" height="6" rx="1" />
              </svg>
            </button>
            <button
              className={`clawhub-view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title={t('listView', language)}
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25">
                <path d="M7 5h10M7 10h10M7 15h10M3 5h.01M3 10h.01M3 15h.01" />
              </svg>
            </button>
          </div>

          <button
            className={`clawhub-batch-btn ${batchMode ? 'active' : ''}`}
            onClick={() => {
              setBatchMode(!batchMode)
              setSelectedSlugs(new Set())
            }}
          >
            {batchMode ? (language === 'zh' ? '取消选择' : 'Cancel') : (language === 'zh' ? '批量选择' : 'Batch')}
          </button>
        </div>
      </div>

      {skillsLoading && (
        <div className="clawhub-loading">
          <div className="clawhub-spinner" />
          <span>{t('clawhubLoading', language)}</span>
        </div>
      )}

      {!skillsLoading && skills.length === 0 && (
        <EmptyState language={language} type={searchQuery ? 'noResults' : 'noSkills'} />
      )}

      {!skillsLoading && skills.length > 0 && (
        <div className={`clawhub-grid ${viewMode === 'list' ? 'list-view' : 'card-view'}`}>
          {skills.map((skill) => (
            (() => {
              const formattedUpdatedAt = formatClawhubDate(skill.updated_at)
              return (
            <div
              key={skill.slug}
              className={`clawhub-skill-card ${selectedSkillSlug === skill.slug ? 'selected' : ''} ${viewMode}`}
              onClick={() => handleInspect(skill.slug)}
            >
              {batchMode && (
                <div className="clawhub-card-checkbox" onClick={(e) => { e.stopPropagation(); toggleBatchSelection(skill.slug) }}>
                  <input type="checkbox" checked={selectedSlugs.has(skill.slug)} readOnly />
                </div>
              )}
              <div className="clawhub-card-content">
                <h4 className="clawhub-card-name">{skill.name}</h4>
                <span className="clawhub-card-slug">{skill.slug}</span>
                {skill.description && <p className="clawhub-card-desc">{skill.description}</p>}
                <div className="clawhub-card-meta">
                  {skill.version && <span className="clawhub-card-version">v{skill.version}</span>}
                  {skill.downloads !== null && skill.downloads !== undefined && (
                    <span className="clawhub-card-downloads">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12">
                        <path d="M8 2v8M4 7l4 4 4-4" />
                      </svg>
                      {skill.downloads}
                    </span>
                  )}
                  {skill.rating !== null && skill.rating !== undefined && (
                    <span className="clawhub-card-rating">{skill.rating.toFixed(1)}</span>
                  )}
                  {formattedUpdatedAt && (
                    <span className="clawhub-card-updated-at">{formattedUpdatedAt}</span>
                  )}
                </div>
              </div>
              <div className="clawhub-card-actions" onClick={(e) => e.stopPropagation()}>
                <ImportButton language={language} slug={skill.slug} sourceId={sourceId} />
              </div>
            </div>
              )
            })()
          ))}
        </div>
      )}

      {batchMode && selectedSlugs.size > 0 && (
        <div className="clawhub-batch-bar">
          <span>{language === 'zh' ? `已选择 ${selectedSlugs.size} 项` : `${selectedSlugs.size} selected`}</span>
          <ImportButton
            language={language}
            slug={Array.from(selectedSlugs)}
            sourceId={sourceId}
            isBatch
          />
        </div>
      )}

      {selectedSkillSlug && skillDetail && (
        <SkillDetailDrawer
          language={language}
          sourceId={sourceId}
          skill={skillDetail}
          loading={detailLoading}
          onClose={clearSkillDetail}
        />
      )}
    </div>
  )
}
