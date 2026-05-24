import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { ArrowUpDown, CheckSquare, Download, ListChecks, Square } from 'lucide-react'
import { useClawhubStore } from '../../stores/clawhubStore'
import { useAppStore } from '../../stores/appStore'
import { useSkillContext } from '../../contexts/SkillContext'
import { useTagTreeStore } from '../../stores/tagTreeStore'
import { t } from '../../i18n'
import type { TreeNode } from '../../types'
import { SkillDetailDrawer } from './SkillDetailDrawer'
import { ImportButton } from './ImportButton'
import { EmptyState } from './EmptyState'
import { formatClawhubDate } from './formatClawhubDate'

type SortOption = 'updated' | 'createdAt' | 'downloads' | 'stars' | 'installsCurrent' | 'installsAllTime' | 'trending'

interface SkillGridProps {
  language: 'zh' | 'en'
  sourceId: string
  sourceName: string
}

export function SkillGrid({ language, sourceId, sourceName }: SkillGridProps) {
  const {
    skills,
    skillsLoading,
    loadingMore,
    hasMore,
    cliLimitedTip,
    searchQuery,
    sortOption,
    selectedSkillSlug,
    skillOverview,
    detailLoading,
    exploreSkills,
    loadMoreSkills,
    searchSkills,
    setSortOption,
    setSearchQuery,
    inspectSkill,
    clearSkillDetail,
    importSkills,
    checkDuplicates,
    importing,
  } = useClawhubStore()
  const { updateSkillTags, refreshSkillData } = useSkillContext()
  const { tree: tagTree, fetchTree: fetchTagTree } = useTagTreeStore()

  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
  const [localSearch, setLocalSearch] = useState(searchQuery || '')
  const [batchMode, setBatchMode] = useState(false)
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set())
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [importConfirmOpen, setImportConfirmOpen] = useState(false)
  const [importConfirmData, setImportConfirmData] = useState<{ existing: string[]; newSlugs: string[] }>({ existing: [], newSlugs: [] })
  const [importingToCenter, setImportingToCenter] = useState(false)
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set())
  const [tagSearchKeyword, setTagSearchKeyword] = useState('')
  const [expandedTagIds, setExpandedTagIds] = useState<Set<string>>(new Set())
  const lastExploreRequestKeyRef = useRef<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const sortDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLocalSearch(searchQuery || '')
    setBatchMode(false)
    setSelectedSlugs(new Set())
    setSortMenuOpen(false)
    setImportConfirmOpen(false)
    setSelectedTagIds(new Set())
    setTagSearchKeyword('')
    setExpandedTagIds(new Set())
    lastExploreRequestKeyRef.current = null
  }, [sourceId])

  useEffect(() => {
    fetchTagTree()
  }, [fetchTagTree])

  const handleSearchSubmit = () => {
    const trimmed = localSearch.trim()
    if (!sourceId) return
    if (trimmed) {
      lastExploreRequestKeyRef.current = null
      setSearchQuery(trimmed)
      void searchSkills(sourceId, trimmed)
    } else if (searchQuery) {
      lastExploreRequestKeyRef.current = null
      setSearchQuery('')
      void exploreSkills(sourceId)
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchSubmit()
    }
  }

  const handleSearchClear = () => {
    setLocalSearch('')
    if (searchQuery && sourceId) {
      lastExploreRequestKeyRef.current = null
      setSearchQuery('')
      void exploreSkills(sourceId)
    }
  }

  useEffect(() => {
    if (!sourceId || searchQuery) {
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
  }, [searchQuery, exploreSkills, sourceId, sortOption])

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

  const handleImportToCenter = useCallback(async () => {
    if (selectedSlugs.size === 0) return
    try {
      const duplicates = await checkDuplicates(Array.from(selectedSlugs))
      const existingSlugs = duplicates.filter(d => d.exists).map(d => d.slug)
      const newSlugs = duplicates.filter(d => !d.exists).map(d => d.slug)
      const slugsWithoutCheck = Array.from(selectedSlugs).filter(s => !duplicates.some(d => d.slug === s))
      setImportConfirmData({ existing: existingSlugs, newSlugs: [...newSlugs, ...slugsWithoutCheck] })
      setSelectedTagIds(new Set())
      setTagSearchKeyword('')
      setExpandedTagIds(new Set())
      setImportConfirmOpen(true)
    } catch (error) {
      console.error('Failed to check duplicates:', error)
    }
  }, [selectedSlugs, checkDuplicates])

  const handleConfirmImport = useCallback(async () => {
    const allSlugs = [...importConfirmData.existing, ...importConfirmData.newSlugs]
    if (allSlugs.length === 0) return

    setImportingToCenter(true)
    setImportConfirmOpen(false)

    try {
      const overwrite = importConfirmData.existing.length > 0
      const results = await importSkills(sourceId, allSlugs, overwrite)
      const successSlugs = results.filter(r => r.success)

      if (selectedTagIds.size > 0 && successSlugs.length > 0) {
        const tagIds = Array.from(selectedTagIds)
        for (const result of successSlugs) {
          if (result.skill_id) {
            try {
              await updateSkillTags(result.skill_id, tagIds, { refresh: false })
            } catch (e) {
              console.error(`Failed to apply tags to skill ${result.slug}:`, e)
            }
          }
        }
      }

      await refreshSkillData()
      setSelectedSlugs(new Set())
      setSelectedTagIds(new Set())
    } catch (error) {
      console.error('Import failed:', error)
    } finally {
      setImportingToCenter(false)
    }
  }, [importConfirmData, selectedTagIds, importSkills, sourceId, updateSkillTags, refreshSkillData])

  const toggleTagSelection = useCallback((tagId: string) => {
    setSelectedTagIds(prev => {
      const next = new Set(prev)
      if (next.has(tagId)) {
        next.delete(tagId)
      } else {
        next.add(tagId)
      }
      return next
    })
  }, [])

  const toggleTagExpand = useCallback((tagId: string) => {
    setExpandedTagIds(prev => {
      const next = new Set(prev)
      if (next.has(tagId)) {
        next.delete(tagId)
      } else {
        next.add(tagId)
      }
      return next
    })
  }, [])

  const hasMatchingDescendant = useCallback((node: TreeNode, search: string): boolean => {
    if (!search.trim()) return true
    const searchLower = search.toLowerCase()
    for (const child of node.children) {
      if (child.tag.name.toLowerCase().includes(searchLower)) return true
      if (hasMatchingDescendant(child, search)) return true
    }
    return false
  }, [])

  const renderTagNode = useCallback((node: TreeNode, depth: number) => {
    const { tag } = node
    const isExpanded = expandedTagIds.has(tag.id)
    const isSelected = selectedTagIds.has(tag.id)
    const hasChildren = node.children.length > 0
    const matchesSearch = !tagSearchKeyword.trim() || tag.name.toLowerCase().includes(tagSearchKeyword.toLowerCase())

    if (tagSearchKeyword.trim() && !matchesSearch && !hasMatchingDescendant(node, tagSearchKeyword)) return null

    return (
      <div key={tag.id}>
        <div
          className={`repo-tag-node ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          <button
            className={`repo-tag-toggle ${!hasChildren ? 'invisible' : ''}`}
            onClick={() => toggleTagExpand(tag.id)}
          >
            {hasChildren && (
              <svg viewBox="0 0 24 24" className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                <path fill="currentColor" d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
          <button className="repo-tag-label" onClick={() => toggleTagSelection(tag.id)}>
            <span className="repo-tag-name">{tag.name}</span>
            {isSelected && (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
        {isExpanded && hasChildren && (
          <div>{node.children.map(child => renderTagNode(child, depth + 1))}</div>
        )}
      </div>
    )
  }, [expandedTagIds, selectedTagIds, tagSearchKeyword, hasMatchingDescendant, toggleTagExpand, toggleTagSelection])

  const sortOptions: Array<{ value: SortOption; label: string }> = [
    { value: 'updated', label: t('clawhubSortUpdated', language) },
    { value: 'createdAt', label: t('clawhubSortNewest', language) },
    { value: 'trending', label: t('clawhubSortTrending', language) },
    { value: 'downloads', label: t('clawhubSortDownloads', language) },
    { value: 'installsCurrent', label: t('clawhubSortInstallsCurrent', language) },
    { value: 'installsAllTime', label: t('clawhubSortInstallsAllTime', language) },
    { value: 'stars', label: t('clawhubSortStars', language) },
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
              ref={searchInputRef}
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={t('clawhubSearch', language)}
              className="clawhub-search-input"
              aria-label={t('clawhubSearch', language)}
            />
            {localSearch && (
              <button className="clawhub-search-clear" onClick={handleSearchClear}>
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
                  <button
                    className="skill-multi-action-btn export"
                    onClick={handleImportToCenter}
                    disabled={selectedSlugs.size === 0 || importing || importingToCenter}
                    title={language === 'zh' ? '导入到技能中心' : 'Import to Skill Center'}
                    aria-label={language === 'zh' ? '导入到技能中心' : 'Import to Skill Center'}
                    type="button"
                  >
                    {importingToCenter
                      ? <div className="clawhub-spinner-small" />
                      : <Download className="w-3.5 h-3.5" />}
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
              className={`clawhub-skill-card card-view ${batchMode && selectedSlugs.has(skill.slug) ? 'skill-selected' : ''} ${!batchMode && selectedSkillSlug === skill.slug ? 'selected' : ''}`}
              onClick={() => batchMode ? toggleBatchSelection(skill.slug) : handleInspect(skill.slug)}
            >
              <div className="clawhub-card-header">
                <div className="clawhub-card-title">
                  <h4 className="clawhub-card-name">{skill.name}</h4>
                  <span className="clawhub-card-slug">{skill.slug}</span>
                </div>
                <div className="clawhub-card-actions" onClick={(e) => e.stopPropagation()}>
                  <ImportButton language={language} slug={skill.slug} sourceId={sourceId} />
                </div>
              </div>
              <div className="clawhub-card-content">
                {skill.description && <p className="clawhub-card-desc" title={skill.description}>{skill.description}</p>}
                <div className="clawhub-card-meta">
                  {renderMeta(skill)}
                </div>
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
              className={`clawhub-skill-record ${batchMode && selectedSlugs.has(skill.slug) ? 'skill-selected' : ''} ${!batchMode && selectedSkillSlug === skill.slug ? 'selected' : ''}`}
              onClick={() => batchMode ? toggleBatchSelection(skill.slug) : handleInspect(skill.slug)}
            >
              <div className="clawhub-record-content">
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
              </div>
              <div className="clawhub-card-actions clawhub-record-actions" onClick={(e) => e.stopPropagation()}>
                <ImportButton language={language} slug={skill.slug} sourceId={sourceId} />
              </div>
            </article>
          ))}
        </div>
      )}

      {!skillsLoading && skills.length > 0 && (
        <div className="clawhub-load-more-footer">
          <span className="clawhub-load-more-count">
            {language === 'zh' ? `共 ${skills.length} 条` : `${skills.length} items`}
          </span>
          {cliLimitedTip && !searchQuery && (
            <>
              <span className="clawhub-load-more-divider" />
              <span className="clawhub-load-more-hint">{language === 'zh' ? 'CLI 模式至多展示 200 条数据，请使用搜索缩小范围' : 'CLI mode shows up to 200 items. Use search to narrow results'}</span>
            </>
          )}
          {hasMore && !searchQuery && (
            <>
              <span className="clawhub-load-more-divider" />
              <button
                className="clawhub-load-more-btn"
                onClick={() => loadMoreSkills(sourceId)}
                disabled={loadingMore}
              >
                {loadingMore
                  ? (language === 'zh' ? '加载中...' : 'Loading...')
                  : (language === 'zh' ? '加载更多' : 'Load More')}
              </button>
            </>
          )}
        </div>
      )}

      {importConfirmOpen && (
        <>
          <div className="repo-overlay" onClick={() => setImportConfirmOpen(false)} />
          <div className="repo-confirm-modal repo-import-confirm-modal">
            <div className="repo-confirm-icon repo-confirm-icon-warning">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <h3>{language === 'zh' ? '确认导入' : 'Confirm Import'}</h3>
            <div className="repo-import-confirm-content">
              {importConfirmData.existing.length > 0 && (
                <div className="repo-import-existing">
                  <p className="repo-import-section-title">
                    {language === 'zh'
                      ? `以下 ${importConfirmData.existing.length} 个技能已存在，导入后将覆盖：`
                      : `${importConfirmData.existing.length} skill(s) already exist and will be overwritten:`}
                  </p>
                  <ul className="repo-import-skill-list">
                    {importConfirmData.existing.map(slug => (
                      <li key={slug}>{slug}</li>
                    ))}
                  </ul>
                </div>
              )}
              {importConfirmData.newSlugs.length > 0 && (
                <div className="repo-import-new">
                  <p className="repo-import-section-title">
                    {language === 'zh'
                      ? `以下 ${importConfirmData.newSlugs.length} 个技能将新增：`
                      : `${importConfirmData.newSlugs.length} skill(s) will be added:`}
                  </p>
                  <ul className="repo-import-skill-list">
                    {importConfirmData.newSlugs.map(slug => (
                      <li key={slug}>{slug}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="repo-import-tag-section">
                <p className="repo-import-section-title">
                  {language === 'zh' ? '添加标签（可选）' : 'Add Tags (optional)'}
                </p>
                <div className="repo-import-tag-search">
                  <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
                    <circle cx="11" cy="11" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <input
                    type="text"
                    value={tagSearchKeyword}
                    onChange={(e) => setTagSearchKeyword(e.target.value)}
                    placeholder={language === 'zh' ? '搜索标签...' : 'Search tags...'}
                  />
                </div>
                <div className="repo-import-tag-tree">
                  {tagTree.length > 0 ? (
                    tagTree.map(node => renderTagNode(node, 0))
                  ) : (
                    <div className="repo-tag-empty">
                      {language === 'zh' ? '暂无可选标签' : 'No available tags'}
                    </div>
                  )}
                </div>
                {selectedTagIds.size > 0 && (
                  <div className="repo-import-selected-tags">
                    {language === 'zh'
                      ? `已选择 ${selectedTagIds.size} 个标签`
                      : `${selectedTagIds.size} tag${selectedTagIds.size > 1 ? 's' : ''} selected`}
                  </div>
                )}
              </div>
            </div>
            <div className="repo-confirm-actions">
              <button className="repo-btn-ghost" onClick={() => setImportConfirmOpen(false)}>
                {language === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                className="repo-btn-primary"
                onClick={handleConfirmImport}
              >
                {language === 'zh' ? '确认导入' : 'Confirm Import'}
              </button>
            </div>
          </div>
        </>
      )}

      {selectedSkillSlug && skillOverview && (
        <SkillDetailDrawer
          language={language}
          sourceId={sourceId}
          skill={skillOverview}
          loading={detailLoading}
          onClose={clearSkillDetail}
        />
      )}
    </div>
  )
}
