import { useState, useEffect } from 'react'
import { X, GitBranch, Folder, Search, CheckSquare, Square, ArrowRight, AlertCircle, ExternalLink } from 'lucide-react'
import { Repo, Skill } from '../../types'
import { repoApi, ImportableSkill } from '../../api/repo'
import { useAppStore } from '../../stores/appStore'
import './RepositorySelectDialog.css'

interface RepositorySelectDialogProps {
  isOpen: boolean
  onClose: () => void
  onImport: (repoId: string, skillPath: string) => Promise<void>
  onDeleteSkill: (skillId: string) => Promise<void>
  existingSkills: Skill[]
  repositories: Repo[]
  loading?: boolean
  onLoadRepositories?: () => void
  onNavigateToRepository?: (repoId: string) => void
  onAddRepository?: () => void
}

type DialogStage = 'idle' | 'ready' | 'submitting' | 'success' | 'error'

function HighlightText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) {
    return <>{text}</>
  }

  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)

  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="highlight">{part}</mark>
        ) : (
          part
        )
      )}
    </>
  )
}

export function RepositorySelectDialog({ 
  isOpen, 
  onClose, 
  onImport, 
  onDeleteSkill,
  existingSkills,
  repositories,
  loading = false,
  onLoadRepositories,
  onNavigateToRepository,
  onAddRepository
}: RepositorySelectDialogProps) {
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null)
  const [repoSearch, setRepoSearch] = useState('')
  const [skills, setSkills] = useState<ImportableSkill[]>([])
  const [skillSearch, setSkillSearch] = useState('')
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set())
  const [skillsLoading, setSkillsLoading] = useState(false)
  const [stage, setStage] = useState<DialogStage>('idle')
  const [error, setError] = useState('')
  const [confirmOverwriteOpen, setConfirmOverwriteOpen] = useState(false)
  const [confirmOverwriteData, setConfirmOverwriteData] = useState<{
    existing: ImportableSkill[]
    newSkills: ImportableSkill[]
  }>({ existing: [], newSkills: [] })
  const [repoSkillCounts, setRepoSkillCounts] = useState<Map<string, number>>(new Map())
  const { language } = useAppStore()

  useEffect(() => {
    if (isOpen) {
      setSelectedRepo(null)
      setRepoSearch('')
      setSkills([])
      setSkillSearch('')
      setSelectedSkills(new Set())
      setStage('idle')
      setError('')
      setConfirmOverwriteOpen(false)
      setConfirmOverwriteData({ existing: [], newSkills: [] })
      setRepoSkillCounts(new Map())
      if (onLoadRepositories) {
        onLoadRepositories()
      }
    }
  }, [isOpen, onLoadRepositories])

  useEffect(() => {
    if (isOpen && repositories.length > 0) {
      const loadSkillCounts = async () => {
        const counts = new Map<string, number>()
        await Promise.all(
          repositories.map(async (repo) => {
            try {
              const count = await repoApi.getSkillCount(repo.id)
              counts.set(repo.id, count)
            } catch (err) {
              counts.set(repo.id, 0)
            }
          })
        )
        setRepoSkillCounts(counts)
      }
      loadSkillCounts()
    }
  }, [isOpen, repositories])

  useEffect(() => {
    if (selectedRepo) {
      setSkillsLoading(true)
      setSkills([])
      setSelectedSkills(new Set())
      setConfirmOverwriteOpen(false)
      setConfirmOverwriteData({ existing: [], newSkills: [] })
      repoApi.listSkills(selectedRepo.id)
        .then(setSkills)
        .catch(err => setError(err instanceof Error ? err.message : String(err)))
        .finally(() => setSkillsLoading(false))
    }
  }, [selectedRepo])

  if (!isOpen) return null

  const filteredRepos = repositories.filter(repo => {
    const searchLower = repoSearch.toLowerCase()
    return repo.name.toLowerCase().includes(searchLower) ||
           repo.url.toLowerCase().includes(searchLower) ||
           (repo.description && repo.description.toLowerCase().includes(searchLower))
  })

  const filteredSkills = skills.filter(skill => {
    const searchLower = skillSearch.toLowerCase()
    return skill.name.toLowerCase().includes(searchLower) ||
           skill.path.toLowerCase().includes(searchLower) ||
           (skill.description && skill.description.toLowerCase().includes(searchLower))
  })

  const allFilteredSelected = filteredSkills.length > 0 && 
    filteredSkills.every(skill => selectedSkills.has(skill.path))

  const handleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedSkills(new Set())
    } else {
      setSelectedSkills(new Set(filteredSkills.map(skill => skill.path)))
    }
  }

  const handleToggleSkill = (skillPath: string) => {
    const newSelected = new Set(selectedSkills)
    if (newSelected.has(skillPath)) {
      newSelected.delete(skillPath)
    } else {
      newSelected.add(skillPath)
    }
    setSelectedSkills(newSelected)
  }

  const executeImport = async (skillsToImport: ImportableSkill[], overwrite: boolean) => {
    if (!selectedRepo || skillsToImport.length === 0) return

    setStage('submitting')
    setError('')

    try {
      if (overwrite) {
        for (const skill of skillsToImport) {
          const existingSkill = existingSkills.find(item => item.name === skill.name)
          if (existingSkill) {
            await onDeleteSkill(existingSkill.id)
          }
        }
      }

      for (const skill of skillsToImport) {
        await onImport(selectedRepo.id, skill.path)
      }

      setConfirmOverwriteOpen(false)
      setStage('success')
      setTimeout(() => onClose(), 800)
    } catch (err) {
      setError((err as Error).message)
      setStage('error')
    }
  }

  const handleImport = async () => {
    if (!selectedRepo || selectedSkills.size === 0) return

    const skillsToImport = skills.filter(skill => selectedSkills.has(skill.path))
    const existingNames = new Set(existingSkills.map(skill => skill.name))
    const existing = skillsToImport.filter(skill => existingNames.has(skill.name))
    const newSkills = skillsToImport.filter(skill => !existingNames.has(skill.name))

    if (existing.length > 0) {
      setConfirmOverwriteData({ existing, newSkills })
      setConfirmOverwriteOpen(true)
      return
    }

    await executeImport(skillsToImport, false)
  }

  const getButtonLabel = () => {
    switch (stage) {
      case 'submitting':
        return (
          <>
            <span className="spinner" />
            {language === 'zh' ? '正在导入...' : 'Importing...'}
          </>
        )
      case 'success':
        return language === 'zh' ? '导入成功' : 'Import successful'
      default:
        return (
          <>
            {language === 'zh' ? '导入选中项' : 'Import Selected'}
            <ArrowRight className="w-3.5 h-3.5" />
          </>
        )
    }
  }

  return (
    <>
      <div className="repo-import-overlay" onClick={onClose} />
      <div className="repo-import-dialog">
        <div className="repo-import-header">
          <div className="repo-import-title">
            <div className="repo-import-title-icon">
              <GitBranch />
            </div>
            <h3>{language === 'zh' ? '从仓库导入技能' : 'Import Skill from Repository'}</h3>
          </div>
          <button onClick={onClose} className="repo-import-close">
            <X />
          </button>
        </div>

        <div className="repo-import-body">
          <div className="repo-import-left">
            <div className="repo-import-search">
              <div className="repo-import-search-field">
                <input
                  type="text"
                  placeholder={language === 'zh' ? '搜索仓库...' : 'Search repositories...'}
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  className="repo-import-search-input"
                />
                <Search className="repo-import-search-icon" />
              </div>
            </div>

            <div className="repo-import-list">
              {loading ? (
                <div className="repo-import-loading">
                  <div className="repo-import-loading-spinner" />
                  <span className="repo-import-loading-text">{language === 'zh' ? '加载仓库列表...' : 'Loading repository list...'}</span>
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="repo-import-empty">
                  <Folder className="repo-import-empty-icon" />
                  <div className="repo-import-empty-text">
                    {repositories.length === 0 
                      ? (language === 'zh' ? '暂无可用仓库' : 'No available repositories') 
                      : (language === 'zh' ? '未找到匹配的仓库' : 'No matching repositories')}
                  </div>
                  {repositories.length === 0 && (
                    <button 
                      className="repo-import-empty-action"
                      onClick={() => {
                        onClose()
                        onAddRepository?.()
                      }}
                    >
                      {language === 'zh' ? '去添加仓库' : 'Add Repository'}
                    </button>
                  )}
                </div>
              ) : (
                filteredRepos.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => setSelectedRepo(repo)}
                    className={`repo-item ${selectedRepo?.id === repo.id ? 'active' : ''}`}
                  >
                    <div className="repo-item-icon">
                      <Folder />
                    </div>
                    <div className="repo-item-content">
                      <div className="repo-item-name">
                        <HighlightText text={repo.name} highlight={repoSearch} />
                      </div>
                      <div className="repo-item-url">
                        <HighlightText text={repo.url} highlight={repoSearch} />
                      </div>
                      <div className="repo-item-meta">
                        <span className="repo-item-meta-item">
                          <GitBranch />
                          {repo.branch}
                        </span>
                        <span className="repo-item-meta-item">
                          {repoSkillCounts.has(repo.id) ? (
                            <>
                              <Folder />
                              {language === 'zh' ? `${repoSkillCounts.get(repo.id)} 个技能` : `${repoSkillCounts.get(repo.id)} skills`}
                            </>
                          ) : (
                            language === 'zh' ? '加载中...' : 'Loading...'
                          )}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="repo-import-right">
            {selectedRepo ? (
              <>
                <div className="repo-import-panel-header">
                  <div className="repo-import-panel-header-row">
                    <div className="repo-import-panel-header-left">
                      <div className="repo-import-panel-title">
                        {selectedRepo.name}
                      </div>
                      {selectedRepo.description && (
                        <div className="repo-import-panel-desc">
                          {selectedRepo.description}
                        </div>
                      )}
                    </div>
                    {onNavigateToRepository && (
                      <button
                        onClick={() => {
                          onNavigateToRepository(selectedRepo.id)
                          onClose()
                        }}
                        className="repo-import-navigate-btn"
                        title={language === 'zh' ? '在仓库管理中查看详情' : 'View details in repository management'}
                      >
                        <ExternalLink className="w-4 h-4" />
                        {language === 'zh' ? '查看详情' : 'View Details'}
                      </button>
                    )}
                  </div>
                  <div className="repo-import-panel-meta-row">
                    <span className="repo-import-panel-branch">
                      <GitBranch className="w-3 h-3" />
                      {selectedRepo.branch}
                    </span>
                    <span className="repo-import-panel-url-compact">{selectedRepo.url}</span>
                    {/* {selectedRepo.skill_relative_path && (
                      <>
                        <span className="repo-import-panel-separator">•</span>
                        <span className="repo-import-panel-path">
                          <Folder className="w-3 h-3" />
                          {selectedRepo.skill_relative_path}
                        </span>
                      </>
                    )} */}
                  </div>
                </div>

                <div className="repo-import-skills-toolbar">
                  <div className="repo-import-skills-search">
                    <div className="repo-import-search-field">
                      <input
                        type="text"
                        placeholder={language === 'zh' ? '搜索技能...' : 'Search skills...'}
                        value={skillSearch}
                        onChange={(e) => setSkillSearch(e.target.value)}
                        className="repo-import-search-input"
                      />
                      <Search className="repo-import-search-icon" />
                    </div>
                  </div>
                  <button
                    onClick={handleSelectAll}
                    disabled={filteredSkills.length === 0}
                    className={`repo-import-select-all ${allFilteredSelected ? 'all-selected' : ''}`}
                  >
                    {allFilteredSelected ? (
                      <>
                        <CheckSquare />
                        {language === 'zh' ? '已全选' : 'All selected'}
                      </>
                    ) : (
                      <>
                        <Square />
                        {language === 'zh' ? '全选' : 'Select All'}
                      </>
                    )}
                  </button>
                </div>

                <div className="repo-import-skills-list">
                  {skillsLoading ? (
                    <div className="repo-import-loading">
                      <div className="repo-import-loading-spinner" />
                      <span className="repo-import-loading-text">{language === 'zh' ? '加载技能列表...' : 'Loading skill list...'}</span>
                    </div>
                  ) : filteredSkills.length === 0 ? (
                    <div className="repo-import-empty">
                      <Folder className="repo-import-empty-icon" />
                      <div className="repo-import-empty-text">
                        {skills.length === 0 
                          ? (language === 'zh' ? '该仓库尚未同步或未找到可导入的技能' : 'Repository not synced or no importable skills found') 
                          : (language === 'zh' ? '未找到匹配的技能' : 'No matching skills')}
                      </div>
                      {skills.length === 0 && (
                        <div className="repo-import-empty-hint" style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                          {language === 'zh' ? '请先在仓库管理中同步该仓库' : 'Please sync this repository in repository management first'}
                        </div>
                      )}
                    </div>
                  ) : (
                    filteredSkills.map((skill) => (
                      <button
                        key={skill.path}
                        onClick={() => handleToggleSkill(skill.path)}
                        className={`skill-item ${selectedSkills.has(skill.path) ? 'selected' : ''}`}
                      >
                        <div className="skill-item-checkbox">
                          <CheckSquare />
                        </div>
                        <div className="skill-item-content">
                          <div className="skill-item-name">
                            <HighlightText text={skill.name} highlight={skillSearch} />
                          </div>
                          {skill.description && (
                            <div className="skill-item-desc">
                              <HighlightText text={skill.description} highlight={skillSearch} />
                            </div>
                          )}
                          <div className="skill-item-path">
                            <HighlightText text={skill.path} highlight={skillSearch} />
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="repo-import-placeholder">
                <GitBranch className="repo-import-placeholder-icon" />
                <div className="repo-import-placeholder-text">{language === 'zh' ? '选择一个仓库' : 'Select a repository'}</div>
                <div className="repo-import-placeholder-hint">{language === 'zh' ? '从左侧列表中选择仓库以查看可用技能' : 'Select a repository from the list to view available skills'}</div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="repo-import-error">
            <AlertCircle />
            <span>{error}</span>
          </div>
        )}

        <div className="repo-import-footer">
          <div className="repo-import-footer-info">
            {selectedSkills.size > 0 ? (
              <>{language === 'zh' ? `已选择 ${selectedSkills.size} 个技能` : `${selectedSkills.size} skills selected`}</>
            ) : (
              language === 'zh' ? '请选择要导入的技能' : 'Please select skills to import'
            )}
          </div>
          <div className="repo-import-footer-actions">
            <button onClick={onClose} className="repo-import-btn repo-import-btn-ghost">
              {language === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={handleImport}
              disabled={!selectedRepo || selectedSkills.size === 0 || stage === 'submitting'}
              className="repo-import-btn repo-import-btn-primary"
            >
              {getButtonLabel()}
            </button>
          </div>
        </div>
      </div>

      {confirmOverwriteOpen && (
        <>
          <div className="repo-import-confirm-overlay" onClick={() => setConfirmOverwriteOpen(false)} />
          <div className="repo-import-confirm-modal" role="dialog" aria-modal="true">
            <h4>{language === 'zh' ? '确认导入' : 'Confirm Import'}</h4>
            <div className="repo-import-confirm-content">
              {confirmOverwriteData.existing.length > 0 && (
                <div className="repo-import-confirm-group repo-import-confirm-existing">
                  <p>
                    {language === 'zh'
                      ? `以下 ${confirmOverwriteData.existing.length} 个技能已存在，导入后将覆盖：`
                      : `${confirmOverwriteData.existing.length} skill(s) already exist and will be overwritten:`}
                  </p>
                  <ul>
                    {confirmOverwriteData.existing.map(skill => (
                      <li key={skill.path}>{skill.name}</li>
                    ))}
                  </ul>
                </div>
              )}
              {confirmOverwriteData.newSkills.length > 0 && (
                <div className="repo-import-confirm-group repo-import-confirm-new">
                  <p>
                    {language === 'zh'
                      ? `以下 ${confirmOverwriteData.newSkills.length} 个技能将新增：`
                      : `${confirmOverwriteData.newSkills.length} skill(s) will be added:`}
                  </p>
                  <ul>
                    {confirmOverwriteData.newSkills.map(skill => (
                      <li key={skill.path}>{skill.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="repo-import-confirm-actions">
              <button
                className="repo-import-btn repo-import-btn-ghost"
                onClick={() => setConfirmOverwriteOpen(false)}
              >
                {language === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                className="repo-import-btn repo-import-btn-primary"
                onClick={() => executeImport([...confirmOverwriteData.existing, ...confirmOverwriteData.newSkills], true)}
              >
                {language === 'zh' ? '确认导入' : 'Confirm Import'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
