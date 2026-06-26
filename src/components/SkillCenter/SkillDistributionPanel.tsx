import { useState, useEffect, useRef, useMemo } from 'react'
import { configApi } from '../../api/config'
import { distributionApi } from '../../api/distribution'
import { projectApi } from '../../api/project'
import { useSkillContext } from '../../contexts/SkillContext'
import { useAppStore } from '../../stores/appStore'
import type { ConflictInfo, Project, SkillDistributionTarget, SkillDistributionMode, ToolPreset } from '../../types'
import { DistributionConflictModal } from './DistributionConflictModal'

function joinPath(basePath: string, nestedPath?: string, skillPath?: string): string {
  const segments = [basePath, nestedPath, skillPath]
    .filter((s): s is string => Boolean(s))
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment, index) => {
      if (index === 0) return segment.replace(/\/+$/, '')
      return segment.replace(/^\/+|\/+$/g, '')
    })

  return segments.join('/')
}

function expandTilde(path: string): string {
  if (path.startsWith('~/') || path === '~') {
    return path
  }
  return path
}

function highlightText(text: string, search: string): React.ReactNode {
  if (!search.trim()) return text
  const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="sk-distribution-highlight">{part}</mark>
    ) : (
      part
    )
  )
}

export interface SkillDistributionPanelProps {
  skillIds: string[]
  skillNames?: string[]
  language?: string
  onSuccess?: () => void
  modeLocked?: SkillDistributionMode
}

export function SkillDistributionPanel({ skillIds, skillNames, language: languageProp, onSuccess, modeLocked }: SkillDistributionPanelProps){
  const { distributeSkill } = useSkillContext()
  const { language: storeLanguage } = useAppStore()
  const language = languageProp || storeLanguage

  const [toolPresets, setToolPresets] = useState<ToolPreset[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [distributionTarget, setDistributionTarget] = useState<SkillDistributionTarget>('project')
  const [distributionMode, setDistributionMode] = useState<SkillDistributionMode>(modeLocked || 'symlink')
  const [selectedPresetIds, setSelectedPresetIds] = useState<string[]>([])
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [showPresetDropdown, setShowPresetDropdown] = useState(false)
  const [projectSearch, setProjectSearch] = useState('')
  const [presetSearch, setPresetSearch] = useState('')
  const [distributionLoading, setDistributionLoading] = useState(false)
  const [distributionError, setDistributionError] = useState('')
  const [distributionSuccess, setDistributionSuccess] = useState('')
  const [distributionPathCopied, setDistributionPathCopied] = useState(false)
  const [skillChipsExpanded, setSkillChipsExpanded] = useState(false)
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([])
  const [showConflictModal, setShowConflictModal] = useState(false)

  const projectDropdownRef = useRef<HTMLDivElement>(null)
  const presetDropdownRef = useRef<HTMLDivElement>(null)

  const skillCount = skillIds.length
  const isBatch = skillCount > 1
  const batchSuffix = isBatch
    ? (language === 'zh' ? '（' + skillCount + ' 个技能）' : ' (' + skillCount + ' skills)')
    : ''

  const batchDistributeLabel = isBatch
    ? (language === 'zh' ? '分发 ' + skillCount + ' 个技能' : 'Distribute ' + skillCount + ' Skills')
    : (language === 'zh' ? '分发' : 'Distribute')

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [presetList, projectList] = await Promise.all([
          configApi.getToolPresets(),
          projectApi.list(),
        ])
        setToolPresets(presetList)
        setProjects(projectList)
      } catch (error) {
        console.error('Failed to load distribution options:', error)
      }
    }
    loadOptions()
  }, [])

  useEffect(() => {
    if (modeLocked) {
      setDistributionMode(modeLocked)
    }
  }, [modeLocked])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setShowProjectDropdown(false)
        setProjectSearch('')
      }
      if (presetDropdownRef.current && !presetDropdownRef.current.contains(e.target as Node)) {
        setShowPresetDropdown(false)
        setPresetSearch('')
      }
    }
    if (showProjectDropdown || showPresetDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProjectDropdown, showPresetDropdown])

  const selectedPreset = toolPresets.find((p) => p.id === selectedPresetIds[0]) || null
  const selectedProject = projects.find((p) => p.id === selectedProjectIds[0]) || null
  const selectedPresets = toolPresets.filter((p) => selectedPresetIds.includes(p.id))
  const selectedProjects = projects.filter((p) => selectedProjectIds.includes(p.id))

  const previewBasePath = useMemo(() => {
    if (!selectedPreset) return ''
    if (distributionTarget === 'global') {
      return expandTilde(selectedPreset.global_path)
    }
    if (!selectedProject) return ''
    return joinPath(selectedProject.path, selectedPreset.skill_path)
  }, [distributionTarget, selectedPreset, selectedProject])

  const globalPathMissing = distributionTarget === 'global' && selectedPresetIds.length === 0
  const projectMissing = distributionTarget === 'project' && selectedProjectIds.length === 0
  const presetMissing = selectedPresetIds.length === 0
  const distributionDisabled = distributionLoading || globalPathMissing || projectMissing || presetMissing

  const targetOptions: Array<{
    value: SkillDistributionTarget
    label: string
    title: string
    description: string
    icon: React.ReactNode
  }> = [
    {
      value: 'global',
      label: language === 'zh' ? '全局' : 'Global',
      title: language === 'zh' ? '全局技能库' : 'Global Skill Library',
      description: language === 'zh' ? '分发到系统统一目录，跨项目复用。' : 'Deploy to system-wide directory, reusable across projects.',
      icon: (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M3.5 10h13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M10 3.5c1.8 1.8 2.8 4.1 2.8 6.5S11.8 14.7 10 16.5C8.2 14.7 7.2 12.4 7.2 10S8.2 5.3 10 3.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      value: 'project',
      label: language === 'zh' ? '项目' : 'Project',
      title: language === 'zh' ? '项目技能目录' : 'Project Skill Directory',
      description: language === 'zh' ? '分发到指定项目，适合团队协作与项目隔离。' : 'Deploy to specified project, suitable for team collaboration and project isolation.',
      icon: (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M3.5 5.5A1.5 1.5 0 0 1 5 4h3l1.2 1.4h5.8a1.5 1.5 0 0 1 1.5 1.5V14A1.5 1.5 0 0 1 15 15.5H5A1.5 1.5 0 0 1 3.5 14v-8.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M6.5 9.5h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ),
    },
  ]

  const modeOptions: Array<{
    value: SkillDistributionMode
    label: string
    title: string
    description: string
  }> = [
    {
      value: 'copy',
      label: language === 'zh' ? '复制' : 'Copy',
      title: language === 'zh' ? '复制分发' : 'Copy Distribution',
      description: language === 'zh' ? '生成独立副本，目标目录可单独维护。' : 'Create independent copy, target directory can be maintained separately.',
    },
    {
      value: 'symlink',
      label: language === 'zh' ? '软链接' : 'Symlink',
      title: language === 'zh' ? '软链接分发' : 'Symlink Distribution',
      description: language === 'zh' ? '保持与源技能同步，适合本地迭代。' : 'Keep synchronized with source skill, suitable for local iteration.',
    },
  ]

  const handleDistribute = async () => {
    if (skillIds.length === 0 || distributionDisabled) return

    setDistributionLoading(true)
    setDistributionError('')
    setDistributionSuccess('')
    setConflicts([])

    try {
      const checkResult = await distributionApi.checkConflicts({
        skill_ids: skillIds,
        skill_names: skillNames || skillIds,
        target: distributionTarget,
        preset_ids: selectedPresetIds,
        project_ids: distributionTarget === 'project' ? selectedProjectIds : [],
      })

      const existingConflicts = checkResult.conflicts.filter(c => c.exists)
      if (existingConflicts.length > 0) {
        setConflicts(existingConflicts)
        setShowConflictModal(true)
        setDistributionLoading(false)
        return
      }

      await performDistribution(false)
    } catch (error) {
      setDistributionError((error as Error).message)
      setDistributionLoading(false)
    }
  }

  const performDistribution = async (overwrite: boolean) => {
    setDistributionLoading(true)
    setDistributionError('')
    setDistributionSuccess('')

    try {
      const results: string[] = []
      const errors: string[] = []

      for (const skillId of skillIds) {
        if (distributionTarget === 'global') {
          for (const presetId of selectedPresetIds) {
            try {
              const result = await distributeSkill({
                skill_id: skillId,
                target: distributionTarget,
                project_id: undefined,
                preset_id: presetId,
                mode: distributionMode,
                overwrite,
              })
              results.push(result.target_path)
            } catch (error) {
              const preset = toolPresets.find(p => p.id === presetId)
              errors.push(`${preset?.name || presetId}: ${(error as Error).message}`)
            }
          }
        } else {
          for (const projectId of selectedProjectIds) {
            for (const presetId of selectedPresetIds) {
              try {
                const result = await distributeSkill({
                  skill_id: skillId,
                  target: distributionTarget,
                  project_id: projectId,
                  preset_id: presetId,
                  mode: distributionMode,
                  overwrite,
                })
                results.push(result.target_path)
              } catch (error) {
                const project = projects.find(p => p.id === projectId)
                const preset = toolPresets.find(p => p.id === presetId)
                errors.push(`${project?.name || projectId}/${preset?.name || presetId}: ${(error as Error).message}`)
              }
            }
          }
        }
      }

      if (errors.length > 0) {
        setDistributionError(`${language === 'zh' ? '部分分发失败' : 'Some distributions failed'}: ${errors.join('; ')}`)
      }
      if (results.length > 0) {
        const successMsg = results.length === 1
          ? `${language === 'zh' ? '分发成功' : 'Distribution successful'}：${results[0]}`
          : `${language === 'zh' ? '成功分发' : 'Successfully distributed'} ${results.length} ${language === 'zh' ? '个目标' : 'targets'}`
        setDistributionSuccess(successMsg)
        if (onSuccess) {
          setTimeout(onSuccess, 1500)
        }
      }
    } catch (error) {
      setDistributionError((error as Error).message)
    } finally {
      setDistributionLoading(false)
      setShowConflictModal(false)
    }
  }

  const handleConflictConfirm = () => {
    performDistribution(true)
  }

  const handleConflictCancel = () => {
    setShowConflictModal(false)
    setConflicts([])
    setDistributionLoading(false)
  }

  const currentDestinationLabel = distributionTarget === 'global'
    ? (language === 'zh' ? '全局技能库' : 'Global Skill Library')
    : (language === 'zh' ? '项目技能目录' : 'Project Skill Directory')

  const currentBasePath = distributionTarget === 'global'
    ? expandTilde(selectedPreset?.global_path || (language === 'zh' ? '未配置全局目录' : 'Global path not configured'))
    : selectedProject?.path || (language === 'zh' ? '未选择目标项目' : 'No target project selected')

  return (
    <div className="sk-distribution-wrapper">
      <div className="sk-distribution-header">
        <div className="sk-distribution-header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 3v18M3 12h18" strokeLinecap="round" />
            <circle cx="12" cy="12" r="3" />
            <path d="M12 3a9 9 0 0 1 9 9M12 3a9 9 0 0 0-9 9M12 21a9 9 0 0 0 9-9M12 21a9 9 0 0 1-9-9" strokeDasharray="2 2" />
          </svg>
        </div>
        <div className="sk-distribution-header-text">
          <span className="sk-distribution-header-title">
            {language === 'zh' ? '技能分发' : 'Skill Distribution'}
          </span>
          <span className="sk-distribution-header-desc">
            {isBatch
              ? (language === 'zh' ? '将 ' + skillCount + ' 个技能部署到目标环境' : 'Deploy ' + skillCount + ' skills to target environment')
              : (language === 'zh' ? '将技能部署到目标环境' : 'Deploy skill to target environment')}
          </span>
          {skillNames && skillNames.length > 0 && (
            <div className="sk-distribution-skill-chips">
              {skillNames.slice(0, skillChipsExpanded ? skillNames.length : 5).map((name, i) => (
                <span key={i} className="sk-distribution-skill-chip">{name}</span>
              ))}
              {skillNames.length > 5 && !skillChipsExpanded && (
                <button
                  className="sk-distribution-skill-chip sk-distribution-skill-chip-more"
                  onClick={() => setSkillChipsExpanded(true)}
                >
                  +{skillNames.length - 5}
                </button>
              )}
              {skillChipsExpanded && skillNames.length > 5 && (
                <button
                  className="sk-distribution-skill-chip sk-distribution-skill-chip-collapse"
                  onClick={() => setSkillChipsExpanded(false)}
                >
                  {language === 'zh' ? '收起' : 'Less'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="sk-distribution-panel">
        <div className="sk-distribution-group">
          <span className="sk-distribution-label">{language === 'zh' ? '分发目标' : 'Distribution Target'}</span>
          <div className="sk-distribution-choice-grid">
            {targetOptions.map((option) => {
              const active = distributionTarget === option.value
              return (
                <label key={option.value} className={`sk-distribution-choice ${active ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name={`distribution-target-${isBatch ? 'batch' : 'single'}`}
                    aria-label={option.label}
                    checked={active}
                    onChange={() => setDistributionTarget(option.value)}
                  />
                  <strong>{option.title}</strong>
                </label>
              )
            })}
          </div>
        </div>

        <div className="sk-distribution-form-grid">
          {distributionTarget === 'project' && (
            <div className="sk-distribution-field">
              <span className="sk-distribution-label">{language === 'zh' ? '目标项目' : 'Target Project'}</span>
              <div className="sk-distribution-select" ref={projectDropdownRef}>
                <button
                  type="button"
                  className={`sk-distribution-select-trigger ${showProjectDropdown ? 'open' : ''}`}
                  aria-label={language === 'zh' ? '目标项目' : 'Target Project'}
                  aria-haspopup="listbox"
                  aria-expanded={showProjectDropdown}
                  onClick={() => setShowProjectDropdown((prev) => !prev)}
                >
                  <span className="sk-distribution-select-content">
                    <strong>
                      {selectedProjectIds.length === 0
                        ? (language === 'zh' ? '选择项目' : 'Select project')
                        : selectedProjectIds.length === 1
                          ? selectedProjects[0]?.name
                          : (language === 'zh' ? '已选择 ' : 'Selected ') + selectedProjectIds.length + (language === 'zh' ? ' 个项目' : ' projects')}
                    </strong>
                    <span>
                      {selectedProjectIds.length === 0
                        ? language === 'zh' ? '点击选择' : 'Click to select'
                        : selectedProjectIds.length === 1
                          ? selectedProjects[0]?.path
                          : selectedProjects.map(p => p.name).join(', ')}
                    </span>
                  </span>
                  <span className={`sk-distribution-select-chevron ${showProjectDropdown ? 'open' : ''}`}>
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>

                {showProjectDropdown && (
                  <div className="sk-distribution-select-panel" role="listbox" aria-label={language === 'zh' ? '目标项目列表' : 'Target project list'}>
                    {projects.length > 0 && (
                      <div className="sk-distribution-search">
                        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM1 9a8 8 0 1116 0A8 8 0 011 9z" fill="currentColor" />
                        </svg>
                        <input
                          type="text"
                          placeholder={language === 'zh' ? '搜索项目...' : 'Search projects...'}
                          value={projectSearch}
                          onChange={(e) => setProjectSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}
                    {projects.length > 0 ? (
                      (() => {
                        const filtered = projects.filter(p =>
                          p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
                          p.path.toLowerCase().includes(projectSearch.toLowerCase())
                        )
                        return filtered.length > 0 ? (
                          filtered.map((project) => {
                            const active = selectedProjectIds.includes(project.id)
                            return (
                              <button
                                key={project.id}
                                type="button"
                                role="option"
                                aria-selected={active}
                                className={`sk-distribution-select-option ${active ? 'active' : ''}`}
                                onClick={() => {
                                  setSelectedProjectIds(prev =>
                                    prev.includes(project.id)
                                      ? prev.filter(id => id !== project.id)
                                      : [...prev, project.id]
                                  )
                                }}
                              >
                                <span className="sk-distribution-checkbox">
                                  {active && (
                                    <svg viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </span>
                                <span className="sk-distribution-option-content">
                                  <strong>{highlightText(project.name, projectSearch)}</strong>
                                  <span>{highlightText(project.path, projectSearch)}</span>
                                </span>
                              </button>
                            )
                          })
                        ) : (
                          <div className="sk-distribution-select-empty">{language === 'zh' ? '无匹配结果' : 'No matches'}</div>
                        )
                      })()
                    ) : (
                      <div className="sk-distribution-select-empty">{language === 'zh' ? '暂无项目' : 'No projects'}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="sk-distribution-field">
            <span className="sk-distribution-label">{language === 'zh' ? '工具目录' : 'Tool Directory'}</span>
            <div className="sk-distribution-select" ref={presetDropdownRef}>
              <button
                type="button"
                className={`sk-distribution-select-trigger ${showPresetDropdown ? 'open' : ''}`}
                aria-label={language === 'zh' ? '工具目录' : 'Tool Directory'}
                aria-haspopup="listbox"
                aria-expanded={showPresetDropdown}
                onClick={() => setShowPresetDropdown((prev) => !prev)}
              >
                <span className="sk-distribution-select-content">
                  <strong>
                    {selectedPresetIds.length === 0
                      ? (language === 'zh' ? '选择目录' : 'Select directory')
                      : selectedPresetIds.length === 1
                        ? selectedPresets[0]?.name
                        : (language === 'zh' ? '已选择 ' : 'Selected ') + selectedPresetIds.length + (language === 'zh' ? ' 个目录' : ' directories')}
                  </strong>
                  <span>
                    {selectedPresetIds.length === 0
                      ? (language === 'zh' ? '点击选择' : 'Click to select')
                      : selectedPresetIds.length === 1
                        ? (distributionTarget === 'global'
                            ? selectedPresets[0]?.global_path
                            : selectedPresets[0]?.skill_path) || (language === 'zh' ? '点击选择' : 'Click to select')
                        : selectedPresets.map(p => p.name).join(', ')}
                  </span>
                </span>
                <span className={`sk-distribution-select-chevron ${showPresetDropdown ? 'open' : ''}`}>
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>

              {showPresetDropdown && (
                <div className="sk-distribution-select-panel" role="listbox" aria-label={language === 'zh' ? '工具目录列表' : 'Tool directory list'}>
                  {toolPresets.length > 0 && (
                    <div className="sk-distribution-search">
                      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <path d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM1 9a8 8 0 1116 0A8 8 0 011 9z" fill="currentColor" />
                      </svg>
                      <input
                        type="text"
                        placeholder={language === 'zh' ? '搜索目录...' : 'Search directories...'}
                        value={presetSearch}
                        onChange={(e) => setPresetSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                  {toolPresets.length > 0 ? (
                    (() => {
                      const filtered = toolPresets.filter(p =>
                        p.name.toLowerCase().includes(presetSearch.toLowerCase()) ||
                        (p.global_path && p.global_path.toLowerCase().includes(presetSearch.toLowerCase())) ||
                        (p.skill_path && p.skill_path.toLowerCase().includes(presetSearch.toLowerCase()))
                      )
                      return filtered.length > 0 ? (
                        filtered.map((preset) => {
                          const active = selectedPresetIds.includes(preset.id)
                          const pathText = distributionTarget === 'global' ? preset.global_path : preset.skill_path
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              role="option"
                              aria-selected={active}
                              className={`sk-distribution-select-option ${active ? 'active' : ''}`}
                              onClick={() => {
                                setSelectedPresetIds(prev =>
                                  prev.includes(preset.id)
                                    ? prev.filter(id => id !== preset.id)
                                    : [...prev, preset.id]
                                )
                              }}
                            >
                              <span className="sk-distribution-checkbox">
                                {active && (
                                  <svg viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </span>
                              <span className="sk-distribution-option-content">
                                <strong>{highlightText(preset.name, presetSearch)}</strong>
                                <span>{highlightText(pathText || '', presetSearch)}</span>
                              </span>
                            </button>
                          )
                        })
                      ) : (
                        <div className="sk-distribution-select-empty">{language === 'zh' ? '无匹配结果' : 'No matches'}</div>
                      )
                    })()
                  ) : (
                    <div className="sk-distribution-select-empty">{language === 'zh' ? '暂无目录' : 'No directories'}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="sk-distribution-group">
          <span className="sk-distribution-label">{language === 'zh' ? '分发模式' : 'Distribution Mode'}</span>
          <div className="sk-distribution-choice-grid compact">
            {modeOptions.map((option) => {
              const active = distributionMode === option.value
              const isDisabled = Boolean(modeLocked) && modeLocked !== option.value
              return (
                <label key={option.value} className={`sk-distribution-choice compact ${active ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}>
                  <input
                    type="radio"
                    name={`distribution-mode-${isBatch ? 'batch' : 'single'}`}
                    aria-label={option.label}
                    checked={active}
                    onChange={() => setDistributionMode(option.value)}
                    disabled={isDisabled}
                  />
                  <strong>{option.title}</strong>
                </label>
              )
            })}
          </div>
        </div>

        {previewBasePath && (
          <div className="sk-distribution-preview-shell">
            <div className="sk-distribution-preview-label">
              {language === 'zh' ? '目标路径' : 'Target Path'}
              {isBatch && (
                <span className="sk-distribution-preview-count">
                  {batchSuffix}
                </span>
              )}
            </div>
            <code>{previewBasePath}</code>
          </div>
        )}

        {(globalPathMissing || projectMissing || presetMissing || distributionError || distributionSuccess) && (
          <div className="sk-distribution-feedback-stack">
            {globalPathMissing && <p className="sk-distribution-hint">{language === 'zh' ? '请在工具预设中配置全局目录路径' : 'Please configure global directory path in tool presets'}</p>}
            {distributionTarget === 'project' && projectMissing && (
              <p className="sk-distribution-hint">{language === 'zh' ? '请选择目标项目' : 'Please select target project'}</p>
            )}
            {presetMissing && <p className="sk-distribution-hint">{language === 'zh' ? '请选择工具目录' : 'Please select tool directory'}</p>}
            {distributionError && <p className="sk-distribution-feedback error">{distributionError}</p>}
            {distributionSuccess && <p className="sk-distribution-feedback success">{distributionSuccess}</p>}
          </div>
        )}

        <div className="sk-distribution-submit-row">
          <div className="sk-distribution-submit-copy">
            <span>{language === 'zh' ? '当前方案' : 'Current Plan'}</span>
            <strong>
              {currentDestinationLabel} · {distributionMode === 'copy' ? (language === 'zh' ? '复制' : 'Copy') : (language === 'zh' ? '软链接' : 'Symlink')}
            </strong>
          </div>
          <button
            className="pm-btn-primary sk-distribution-submit"
            onClick={handleDistribute}
            disabled={distributionDisabled}
          >
            {distributionLoading
              ? (language === 'zh' ? '分发中...' : 'Distributing...')
              : batchDistributeLabel}
          </button>
        </div>
      </div>

      {showConflictModal && (
        <DistributionConflictModal
          conflicts={conflicts}
          onConfirm={handleConflictConfirm}
          onCancel={handleConflictCancel}
          loading={distributionLoading}
        />
      )}
    </div>
  )
}