import { useState, useMemo, useCallback } from 'react'
import { Search, FolderOpen, Trash2, Power } from 'lucide-react'
import { Skill, ToolPreset } from '../../types'
import { useAppStore } from '../../stores/appStore'
import { ProjectSkillCard } from './ProjectSkillCard'
import { ProjectSkillListItem } from './ProjectSkillListItem'
import './ProjectSkill.css'

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
    if (!normalized) return currentPresetSkills
    return currentPresetSkills.filter(
      (skill) =>
        skill.name.toLowerCase().includes(normalized) ||
        skill.file_path.toLowerCase().includes(normalized)
    )
  }, [currentPresetSkills, searchKeyword])

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
            type="search"
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
          {toolPresets.map((preset) => {
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
