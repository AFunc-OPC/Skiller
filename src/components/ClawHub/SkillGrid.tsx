import { useState, useEffect, useRef } from 'react'
import { ArrowUpDown, CheckSquare, ListChecks, Square } from 'lucide-react'
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
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const debouncedSearch = useDebounce(localSearch, 300)
  const lastExploreRequestKeyRef = useRef<string | null>(null)
  const previousSearchRef = useRef(searchQuery)
  const sortDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sourceId || debouncedSearch.trim()) {
      return
    }

    const requestKey = `${sourceId}:${sortOption}`

    if (lastExploreRequestKeyRef.current === requestKey) {
      return
    }

    const timer = window.setTimeout(() => {
      lastExploreRequestKeyRef.current = requestKey
      void exploreSkills(sourceId)
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [debouncedSearch, exploreSkills, sourceId, sortOption])

  useEffect(() => {
    if (!sourceId || debouncedSearch === searchQuery) {
      previousSearchRef.current = searchQuery
      return
    }

    if (debouncedSearch.trim()) {
      lastExploreRequestKeyRef.current = null
      void searchSkills(sourceId, debouncedSearch)
      previousSearchRef.current = debouncedSearch
      return
    }

    if (previousSearchRef.current.trim()) {
      lastExploreRequestKeyRef.current = null
      void exploreSkills(sourceId)
    }

    previousSearchRef.current = debouncedSearch
  }, [debouncedSearch, exploreSkills, searchQuery, searchSkills, sourceId])

  useEffect(() => {
    if (!sortMenuOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setSortMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [sortMenuOpen])

  const handleInspect = (slug: string) => {
    inspectSkill(sourceId, slug)
  }

  const handleSortChange = (newSort: SortOption) => {
    setSortOption(newSort)
    setSortMenuOpen(false)
  }

  const handleToggleBatchMode = () => {
    setBatchMode(prev => !prev)
    setSelectedSlugs(new Set())
  }

  const handleToggleSelectAll = () => {
    if (selectedSlugs.size === skills.length) {
      setSelectedSlugs(new Set())
      return
    }

    setSelectedSlugs(new Set(skills.map(skill => skill.slug)))
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
  const allSkillsSelected = skills.length > 0 && selectedSlugs.size === skills.length

  const renderMeta = (skill: typeof skills[number]) => {
    const formattedUpdatedAt = formatClawhubDate(skill.updated_at)

    return (
      <>
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
      </>
    )
  }

  return (
    <div className="clawhub-skill-grid">
      <div className="clawhub-grid-toolbar">
        <div className="clawhub-grid-toolbar-main">
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
              aria-label={t('clawhubSearch', language)}
            />
            {localSearch && (
              <button className="clawhub-search-clear" onClick={() => { setLocalSearch('') }}>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 6L6 14M6 6l8 8" /></svg>
              </button>
            )}
          </div>
        </div>

        <div className="skill-actions clawhub-toolbar-actions">
          <div className="skill-multi-mode-wrap">
            <div className={`skill-multi-mode-cluster ${batchMode ? 'active' : ''}`}>
              <button
                className={`skill-multi-mode-trigger ${batchMode ? 'active' : ''}`}
                onClick={handleToggleBatchMode}
                title={language === 'zh' ? '批量选择' : 'Batch select'}
                aria-label={language === 'zh' ? '批量选择' : 'Batch select'}
                type="button"
              >
                <ListChecks className="w-4 h-4" />
                {batchMode && (
                  <span>{language === 'zh' ? '批量选择' : 'Batch select'}</span>
                )}
                {batchMode && (
                  <span className="skill-multi-selected-count">{selectedSlugs.size}</span>
                )}
              </button>

              {batchMode && (
                <div className="skill-multi-inline-actions">
                  <button
                    className={`skill-multi-action-btn ${allSkillsSelected ? 'selected' : 'neutral'}`}
                    onClick={handleToggleSelectAll}
                    disabled={skills.length === 0}
                    title={allSkillsSelected
                      ? (language === 'zh' ? '取消全选' : 'Deselect all')
                      : (language === 'zh' ? '全选' : 'Select all')}
                    aria-label={allSkillsSelected
                      ? (language === 'zh' ? '取消全选' : 'Deselect all')
                      : (language === 'zh' ? '全选' : 'Select all')}
                    type="button"
                  >
                    {allSkillsSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="sort-dropdown" ref={sortDropdownRef}>
            <button
              className="sort-dropdown-trigger"
              onClick={() => setSortMenuOpen(prev => !prev)}
              title={language === 'zh' ? '排序' : 'Sort'}
              aria-label={language === 'zh' ? '排序' : 'Sort'}
              type="button"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>

            {sortMenuOpen && (
              <div className="sort-dropdown-menu">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`sort-dropdown-item ${sortOption === option.value ? 'active' : ''}`}
                    onClick={() => handleSortChange(option.value)}
                    type="button"
                  >
                    <span className="sort-dropdown-check">
                      {sortOption === option.value && <span className="sort-dropdown-dot" />}
                    </span>
                    <span className="sort-dropdown-label">{option.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="skill-view-toggle" role="group" aria-label={language === 'zh' ? '浏览模式' : 'Browse mode'}>
            <button
              className={`skill-toggle-btn ${viewMode === 'card' ? 'active' : ''}`}
              onClick={() => setViewMode('card')}
              title={t('cardView', language)}
              aria-label={t('cardView', language)}
              type="button"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25">
                <rect x="3" y="3" width="6" height="6" rx="1" />
                <rect x="11" y="3" width="6" height="6" rx="1" />
                <rect x="3" y="11" width="6" height="6" rx="1" />
                <rect x="11" y="11" width="6" height="6" rx="1" />
              </svg>
            </button>
            <button
              className={`skill-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title={t('listView', language)}
              aria-label={t('listView', language)}
              type="button"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25">
                <path d="M7 5h10M7 10h10M7 15h10M3 5h.01M3 10h.01M3 15h.01" />
              </svg>
            </button>
          </div>
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

      {!skillsLoading && skills.length > 0 && viewMode === 'card' && (
        <div className="clawhub-grid card-view">
          {skills.map((skill) => (
            <article
              key={skill.slug}
              className={`clawhub-skill-card card-view ${selectedSkillSlug === skill.slug ? 'selected' : ''}`}
              onClick={() => handleInspect(skill.slug)}
            >
              {batchMode && (
                <div className="clawhub-card-checkbox" onClick={(e) => { e.stopPropagation(); toggleBatchSelection(skill.slug) }}>
                  <input type="checkbox" checked={selectedSlugs.has(skill.slug)} readOnly />
                </div>
              )}
              <div className="clawhub-card-content">
                <div className="clawhub-card-header">
                  <div>
                    <h4 className="clawhub-card-name">{skill.name}</h4>
                    <span className="clawhub-card-slug">{skill.slug}</span>
                  </div>
                </div>
                {skill.description && <p className="clawhub-card-desc">{skill.description}</p>}
                <div className="clawhub-card-meta">
                  {renderMeta(skill)}
                </div>
              </div>
              <div className="clawhub-card-actions" onClick={(e) => e.stopPropagation()}>
                <ImportButton language={language} slug={skill.slug} sourceId={sourceId} />
              </div>
            </article>
          ))}
        </div>
      )}

      {!skillsLoading && skills.length > 0 && viewMode === 'list' && (
        <div className="clawhub-record-list">
          {skills.map((skill) => (
            <article
              key={skill.slug}
              className={`clawhub-skill-record ${selectedSkillSlug === skill.slug ? 'selected' : ''}`}
              onClick={() => handleInspect(skill.slug)}
            >
              {batchMode && (
                <div className="clawhub-card-checkbox clawhub-record-checkbox" onClick={(e) => { e.stopPropagation(); toggleBatchSelection(skill.slug) }}>
                  <input type="checkbox" checked={selectedSlugs.has(skill.slug)} readOnly />
                </div>
              )}
              <div className="clawhub-record-main">
                <div className="clawhub-record-name-row">
                  <h4 className="clawhub-card-name">{skill.name}</h4>
                  <span className="clawhub-card-slug">{skill.slug}</span>
                </div>
                {skill.description && <p className="clawhub-record-desc" title={skill.description}>{skill.description}</p>}
              </div>
              <div className="clawhub-record-meta">
                {renderMeta(skill)}
              </div>
              <div className="clawhub-card-actions clawhub-record-actions" onClick={(e) => e.stopPropagation()}>
                <ImportButton language={language} slug={skill.slug} sourceId={sourceId} />
              </div>
            </article>
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
