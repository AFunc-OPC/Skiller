import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Search, FolderOpen, Trash2, Power, ArrowUpDown, Clock, Calendar, Type, FolderTree, ArrowUp, ArrowDown, Check } from 'lucide-react'
import { Skill, ToolPreset, SortOption, SORT_OPTIONS, SortField, SortOrder } from '../../types'
import { useAppStore } from '../../stores/appStore'
import { useSort } from '../../hooks/useSort'
import { ProjectSkillCard } from './ProjectSkillCard'
import { ProjectSkillListItem } from './ProjectSkillListItem'
import './ProjectSkill.css'

const SORT_ICON_MAP: Record<SortField, typeof Clock> = {
  updated_at: Clock,
  created_at: Calendar,
  name: Type,
  path: FolderTree,
}

interface ProjectSkillListProps {
  skills: Skill[]
  skillsByPreset: Record<string, Skill[]>
  toolPresets: ToolPreset[]
  selectedPresetId: string | null
  loading: boolean
  error: string | null
  onPresetChange: (presetId: string) => void
  onRemove: (skillId: string) => Promise<void>
  onToggleStatus: (skillId: string) => Promise<void>
  onBatchRemove: (skillIds: string[]) => Promise<void>
  onBatchToggle: (skillIds: string[]) => Promise<void>
  onImport: () => void
  onRetry?: () => void
}

export function ProjectSkillList({
  skills,
  skillsByPreset,
  toolPresets,
  selectedPresetId,
  loading,
  error,
  onPresetChange,
  onRemove,
  onToggleStatus,
  onBatchRemove,
  onBatchToggle,
  onImport,
  onRetry,
}: ProjectSkillListProps) {
  const { language } = useAppStore()
  const [searchKeyword, setSearchKeyword] = useState('')
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const sortDropdownRef = useRef<HTMLDivElement>(null)

  const { sortOption, setSortOption, sortData } = useSort({ storageKey: 'project-skill-sort-option' })

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

  const localizedSortOptions = useMemo(() => {
    const labels: Record<string, { zh: string; en: string }> = {
      'updated_at-desc': { zh: '更新时间最新', en: 'Updated (newest)' },
      'updated_at-asc': { zh: '更新时间最旧', en: 'Updated (oldest)' },
      'created_at-desc': { zh: '创建时间最新', en: 'Created (newest)' },
      'created_at-asc': { zh: '创建时间最旧', en: 'Created (oldest)' },
      'name-asc': { zh: '名称 A-Z', en: 'Name A-Z' },
      'name-desc': { zh: '名称 Z-A', en: 'Name Z-A' },
      'path-asc': { zh: '路径 A-Z', en: 'Path A-Z' },
      'path-desc': { zh: '路径 Z-A', en: 'Path Z-A' },
    }
    return SORT_OPTIONS.map(opt => ({
      ...opt,
      label: language === 'zh' ? labels[`${opt.field}-${opt.order}`].zh : labels[`${opt.field}-${opt.order}`].en,
    }))
  }, [language])

  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)
  const [batchRemoveConfirmOpen, setBatchRemoveConfirmOpen] = useState(false)
  const [pendingRemoveSkillId, setPendingRemoveSkillId] = useState<string | null>(null)
  const [pendingRemoveSkillName, setPendingRemoveSkillName] = useState<string>('')

  const currentPresetSkills = useMemo(() => {
    if (!selectedPresetId) return skills
    return skillsByPreset[selectedPresetId] || []
  }, [skills, skillsByPreset, selectedPresetId])

  const filteredSkills = useMemo(() => {
    const normalized = searchKeyword.trim().toLowerCase()
    const result = !normalized
      ? currentPresetSkills
      : currentPresetSkills.filter(
          (skill) =>
            skill.name.toLowerCase().includes(normalized) ||
            skill.file_path.toLowerCase().includes(normalized)
        )
    return sortData(result)
  }, [currentPresetSkills, searchKeyword, sortData])

  const selectedCount = selectedIds.size

  const handleSelect = useCallback((skillId: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (selected) {
        next.add(skillId)
      } else {
        next.delete(skillId)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedIds(new Set(filteredSkills.map((s) => s.id)))
    } else {
      setSelectedIds(new Set())
    }
  }, [filteredSkills])

  const handleBatchToggle = useCallback(async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    await onBatchToggle(ids)
    setSelectedIds(new Set())
  }, [selectedIds, onBatchToggle])

  const handleRemoveRequest = useCallback((skillId: string, skillName: string) => {
    setPendingRemoveSkillId(skillId)
    setPendingRemoveSkillName(skillName)
    setRemoveConfirmOpen(true)
  }, [])

  const handleConfirmRemove = useCallback(async () => {
    if (!pendingRemoveSkillId) return
    await onRemove(pendingRemoveSkillId)
    setPendingRemoveSkillId(null)
    setPendingRemoveSkillName('')
    setRemoveConfirmOpen(false)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(pendingRemoveSkillId)
      return next
    })
  }, [pendingRemoveSkillId, onRemove])

  const handleBatchRemoveRequest = useCallback(() => {
    setBatchRemoveConfirmOpen(true)
  }, [])

  const handleConfirmBatchRemove = useCallback(async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    await onBatchRemove(ids)
    setSelectedIds(new Set())
    setBatchRemoveConfirmOpen(false)
  }, [selectedIds, onBatchRemove])

  const selectedPreset = toolPresets.find(p => p.id === selectedPresetId)

  if (loading) {
    return (
      <div className="ps-loading">
        <div className="ps-loading-spinner" />
        <span>{language === 'zh' ? '加载技能列表...' : 'Loading skills...'}</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="ps-error">
        <span>{error}</span>
        {onRetry && (
          <button className="ps-btn-retry" onClick={onRetry}>
            {language === 'zh' ? '重试' : 'Retry'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="ps-container">
      <div className="ps-toolbar">
        <div className="ps-search">
          <Search className="ps-search-icon" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder={language === 'zh' ? '搜索技能...' : 'Search skills...'}
            className="ps-search-input"
          />
          {searchKeyword && (
            <button className="ps-search-clear" onClick={() => setSearchKeyword('')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="ps-actions">
          {selectedCount > 0 && (
            <div className="ps-batch-actions">
              <span className="ps-selected-count">
                {language === 'zh' ? `已选 ${selectedCount}` : `${selectedCount} selected`}
              </span>
              <button
                className="ps-btn-batch"
                onClick={handleBatchToggle}
                title={language === 'zh' ? '切换状态' : 'Toggle status'}
              >
                <Power className="w-4 h-4" />
              </button>
              <button
                className="ps-btn-batch ps-btn-remove"
                onClick={handleBatchRemoveRequest}
                title={language === 'zh' ? '批量移除' : 'Batch remove'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="ps-view-toggle">
            <button
              className={viewMode === 'card' ? 'ps-toggle active' : 'ps-toggle'}
              onClick={() => setViewMode('card')}
              title={language === 'zh' ? '卡片视图' : 'Card view'}
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <rect x="2" y="2" width="7" height="7" rx="1.5" />
                <rect x="11" y="2" width="7" height="7" rx="1.5" />
                <rect x="2" y="11" width="7" height="7" rx="1.5" />
                <rect x="11" y="11" width="7" height="7" rx="1.5" />
              </svg>
            </button>
            <button
              className={viewMode === 'list' ? 'ps-toggle active' : 'ps-toggle'}
              onClick={() => setViewMode('list')}
              title={language === 'zh' ? '列表视图' : 'List view'}
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <rect x="2" y="4" width="16" height="2" rx="0.5" />
                <rect x="2" y="9" width="16" height="2" rx="0.5" />
                <rect x="2" y="14" width="16" height="2" rx="0.5" />
              </svg>
            </button>
          </div>

          <button className="ps-btn-primary" onClick={onImport}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 4v12M4 10h12" strokeLinecap="round" />
            </svg>
            <span>{language === 'zh' ? '导入' : 'Import'}</span>
          </button>
        </div>
      </div>

      <div className="ps-filter-bar">
        <span className="ps-filter-label">{language === 'zh' ? '工具预设:' : 'Preset:'}</span>
        <div className="ps-preset-tabs">
          {[...toolPresets].sort((a, b) => {
            const countA = (skillsByPreset[a.id] || []).length
            const countB = (skillsByPreset[b.id] || []).length
            return countB - countA
          }).map((preset) => {
            const count = (skillsByPreset[preset.id] || []).length
            return (
              <button
                key={preset.id}
                className={`ps-preset-tab ${selectedPresetId === preset.id ? 'active' : ''}`}
                onClick={() => onPresetChange(preset.id)}
              >
                {preset.name}
                {count > 0 && <span className="ps-tab-count">{count}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {currentPresetSkills.length === 0 && !searchKeyword ? (
        <div className="ps-empty">
          <FolderOpen strokeWidth={1.5} />
          <p>
            {language === 'zh' 
              ? `${selectedPreset?.name || '此工具'} 预设下暂无技能` 
              : `No skills in ${selectedPreset?.name || 'this preset'}`}
          </p>
          <p className="ps-path-hint">
            {language === 'zh' 
              ? `路径: ${selectedPreset?.skill_path || '-'}` 
              : `Path: ${selectedPreset?.skill_path || '-'}`}
          </p>
          <button className="ps-btn-import" onClick={onImport}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 4v12M4 10h12" strokeLinecap="round" />
            </svg>
            <span>{language === 'zh' ? '从技能中心导入' : 'Import from Skill Center'}</span>
          </button>
        </div>
      ) : (
        <>
          <div className="ps-header">
            <label className="ps-checkbox-wrap">
              <input
                type="checkbox"
                checked={selectedCount === filteredSkills.length && filteredSkills.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="ps-checkbox"
              />
            </label>
            <span className="ps-count">
              {language === 'zh' ? (
                <>共 <strong>{filteredSkills.length}</strong> 个技能</>
              ) : (
                <><strong>{filteredSkills.length}</strong> skills</>
              )}
            </span>

            <div className="sort-dropdown ps-sort-dropdown" ref={sortDropdownRef}>
              <button
                className={`sort-dropdown-trigger ps-sort-trigger ${sortMenuOpen ? 'ps-sort-open' : ''}`}
                onClick={() => setSortMenuOpen(prev => !prev)}
                title={language === 'zh' ? '排序' : 'Sort'}
                type="button"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
              {sortMenuOpen && (
                <div className="sort-dropdown-menu">
                  {localizedSortOptions.map((option) => {
                    const Icon = SORT_ICON_MAP[option.field]
                    const isActive = sortOption.field === option.field && sortOption.order === option.order
                    return (
                      <button
                        key={`${option.field}-${option.order}`}
                        className={`sort-dropdown-item ps-sort-item ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          setSortOption(option)
                          setSortMenuOpen(false)
                        }}
                        type="button"
                      >
                        <span className="ps-sort-item-icon">
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <span className="sort-dropdown-label">{option.label}</span>
                        <span className="ps-sort-item-arrow">
                          {option.order === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        </span>
                        {isActive && <Check className="w-3.5 h-3.5 ps-sort-item-check" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {filteredSkills.length === 0 ? (
            <div className="ps-empty-search">
              <p>{language === 'zh' ? '没有匹配的技能' : 'No matching skills'}</p>
            </div>
          ) : viewMode === 'card' ? (
            <div className="ps-grid">
              {filteredSkills.map((skill, index) => (
                <ProjectSkillCard
                  key={skill.id}
                  skill={skill}
                  searchKeyword={searchKeyword}
                  isSelected={selectedIds.has(skill.id)}
                  onSelect={(selected) => handleSelect(skill.id, selected)}
                  onRemove={() => handleRemoveRequest(skill.id, skill.name)}
                  onToggleStatus={() => onToggleStatus(skill.id)}
                  style={{ animationDelay: `${index * 25}ms` }}
                />
              ))}
            </div>
          ) : (
            <div className="ps-list">
              {filteredSkills.map((skill, index) => (
                <ProjectSkillListItem
                  key={skill.id}
                  skill={skill}
                  searchKeyword={searchKeyword}
                  isSelected={selectedIds.has(skill.id)}
                  onSelect={(selected) => handleSelect(skill.id, selected)}
                  onRemove={() => handleRemoveRequest(skill.id, skill.name)}
                  onToggleStatus={() => onToggleStatus(skill.id)}
                  style={{ animationDelay: `${index * 20}ms` }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {removeConfirmOpen && (
        <>
          <div className="pm-overlay" onClick={() => setRemoveConfirmOpen(false)} />
          <div className="pm-confirm-modal">
            <div className="pm-confirm-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <h3>{language === 'zh' ? '确认移除' : 'Confirm Remove'}</h3>
            <p>
              {language === 'zh' 
                ? `确定要移除技能 "${pendingRemoveSkillName}" 吗？此操作将从项目中移除该技能。` 
                : `Are you sure you want to remove "${pendingRemoveSkillName}"? This action will remove the skill from the project.`}
            </p>
            <div className="pm-confirm-actions">
              <button className="pm-btn-ghost" onClick={() => setRemoveConfirmOpen(false)}>
                {language === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button className="pm-btn-danger" onClick={handleConfirmRemove}>
                {language === 'zh' ? '移除' : 'Remove'}
              </button>
            </div>
          </div>
        </>
      )}

      {batchRemoveConfirmOpen && (
        <>
          <div className="pm-overlay" onClick={() => setBatchRemoveConfirmOpen(false)} />
          <div className="pm-confirm-modal">
            <div className="pm-confirm-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <h3>{language === 'zh' ? '确认批量移除' : 'Confirm Batch Remove'}</h3>
            <p>
              {language === 'zh' 
                ? `确定要移除选中的 ${selectedIds.size} 个技能吗？此操作将从项目中移除这些技能。` 
                : `Are you sure you want to remove ${selectedIds.size} selected skills? This action will remove these skills from the project.`}
            </p>
            <div className="pm-confirm-actions">
              <button className="pm-btn-ghost" onClick={() => setBatchRemoveConfirmOpen(false)}>
                {language === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button className="pm-btn-danger" onClick={handleConfirmBatchRemove}>
                {language === 'zh' ? '移除' : 'Remove'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
