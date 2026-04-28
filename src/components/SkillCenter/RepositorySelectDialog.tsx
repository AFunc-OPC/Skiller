import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { X, GitBranch, Folder, Search, CheckSquare, Square, ArrowRight, AlertCircle, ExternalLink, Tag, Plus } from 'lucide-react'
import { Repo, TreeNode } from '../../types'
import { repoApi, ImportableSkill } from '../../api/repo'
import { useAppStore } from '../../stores/appStore'
import { useTagTreeStore } from '../../stores/tagTreeStore'
import './RepositorySelectDialog.css'

interface RepositorySelectDialogProps {
  isOpen: boolean
  onClose: () => void
  onImport: (repoId: string, skillPath: string) => Promise<void>
  onUpdateSkillTags?: (skillId: string, tags: string[]) => Promise<void>
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

function flattenTree(nodes: TreeNode[]): TreeNode['tag'][] {
  const result: TreeNode['tag'][] = []
  for (const node of nodes) {
    result.push(node.tag)
    result.push(...flattenTree(node.children))
  }
  return result
}

export function RepositorySelectDialog({
  isOpen,
  onClose,
  onImport,
  onUpdateSkillTags,
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
  const [repoSkillCounts, setRepoSkillCounts] = useState<Map<string, number>>(new Map())

  // Tag picker state
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set())
  const [tagSearch, setTagSearch] = useState('')
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [expandedTagIds, setExpandedTagIds] = useState<Set<string>>(new Set())
  const [creatingTag, setCreatingTag] = useState(false)
  const tagPickerRef = useRef<HTMLDivElement>(null)
  const tagSearchInputRef = useRef<HTMLInputElement>(null)

  const { language } = useAppStore()
  const { tree, createTag, fetchTree } = useTagTreeStore()

  const allTags = useMemo(() => flattenTree(tree), [tree])
  const getTagName = useCallback((tagId: string): string => {
    const tag = allTags.find(t => t.id === tagId)
    return tag?.name ?? tagId
  }, [allTags])

  useEffect(() => {
    if (isOpen) {
      setSelectedRepo(null)
      setRepoSearch('')
      setSkills([])
      setSkillSearch('')
      setSelectedSkills(new Set())
      setStage('idle')
      setError('')
      setRepoSkillCounts(new Map())
      setSelectedTagIds(new Set())
      setTagSearch('')
      setShowTagPicker(false)
      setExpandedTagIds(new Set())
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
      repoApi.listSkills(selectedRepo.id)
        .then(setSkills)
        .catch(err => setError(err instanceof Error ? err.message : String(err)))
        .finally(() => setSkillsLoading(false))
    }
  }, [selectedRepo])

  // Close tag picker on outside click
  useEffect(() => {
    if (!showTagPicker) return
    const handlePointerDown = (e: MouseEvent) => {
      if (tagPickerRef.current && !tagPickerRef.current.contains(e.target as Node)) {
        setShowTagPicker(false)
      }
    }
    window.addEventListener('mousedown', handlePointerDown)
    return () => window.removeEventListener('mousedown', handlePointerDown)
  }, [showTagPicker])

  // Focus search input when tag picker opens
  useEffect(() => {
    if (showTagPicker) {
      setTimeout(() => tagSearchInputRef.current?.focus(), 50)
    }
  }, [showTagPicker])

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

  const handleToggleTag = (tagId: string) => {
    const newSelected = new Set(selectedTagIds)
    if (newSelected.has(tagId)) {
      newSelected.delete(tagId)
    } else {
      newSelected.add(tagId)
    }
    setSelectedTagIds(newSelected)
  }

  const handleRemoveTag = (tagId: string) => {
    const newSelected = new Set(selectedTagIds)
    newSelected.delete(tagId)
    setSelectedTagIds(newSelected)
  }

  const handleToggleExpand = (tagId: string) => {
    const newExpanded = new Set(expandedTagIds)
    if (newExpanded.has(tagId)) {
      newExpanded.delete(tagId)
    } else {
      newExpanded.add(tagId)
    }
    setExpandedTagIds(newExpanded)
  }

  const handleCreateTag = async () => {
    const name = tagSearch.trim()
    if (!name || creatingTag) return
    setCreatingTag(true)
    try {
      const newTag = await createTag(name, 'group-build', undefined)
      setSelectedTagIds(prev => new Set([...prev, newTag.id]))
      setTagSearch('')
      await fetchTree()
    } catch (err) {
      console.error('Failed to create tag:', err)
    } finally {
      setCreatingTag(false)
    }
  }

  const hasMatchingDescendant = (node: TreeNode): boolean => {
    if (!tagSearch.trim()) return true
    const searchLower = tagSearch.toLowerCase()
    for (const child of node.children) {
      if (child.tag.name.toLowerCase().includes(searchLower)) return true
      if (hasMatchingDescendant(child)) return true
    }
    return false
  }

  const renderTreeNode = (node: TreeNode, depth: number): React.ReactNode => {
    const { tag } = node
    const isExpanded = expandedTagIds.has(tag.id)
    const isSelected = selectedTagIds.has(tag.id)
    const hasChildren = node.children.length > 0
    const matchesSearch = !tagSearch.trim() || tag.name.toLowerCase().includes(tagSearch.toLowerCase())

    if (tagSearch.trim() && !matchesSearch && !hasMatchingDescendant(node)) return null

    return (
      <div key={tag.id}>
        <div
          className={`sk-tree-node ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          <button
            className={`sk-tree-toggle ${!hasChildren ? 'invisible' : ''}`}
            onClick={() => handleToggleExpand(tag.id)}
          >
            {hasChildren && (
              <svg viewBox="0 0 24 24" className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                <path fill="currentColor" d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
          <button className="sk-tree-label" onClick={() => handleToggleTag(tag.id)}>
            <span className="sk-tree-name">{tag.name}</span>
            {isSelected && (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
        {isExpanded && hasChildren && (
          <div>{node.children.map(child => renderTreeNode(child, depth + 1))}</div>
        )}
      </div>
    )
  }

  // Show "Create" option when search text doesn't match any existing tag
  const exactMatch = allTags.some(t => t.name.toLowerCase() === tagSearch.trim().toLowerCase())
  const showCreateOption = tagSearch.trim().length > 0 && !exactMatch

  const handleImport = async () => {
    if (!selectedRepo || selectedSkills.size === 0) return

    setStage('submitting')
    setError('')

    try {
      const skillPaths = Array.from(selectedSkills)
      for (const skillPath of skillPaths) {
        await onImport(selectedRepo.id, skillPath)
        if (selectedTagIds.size > 0 && onUpdateSkillTags) {
          await onUpdateSkillTags(skillPath, Array.from(selectedTagIds))
        }
      }
      setStage('success')
      setTimeout(() => onClose(), 800)
    } catch (err) {
      setError((err as Error).message)
      setStage('error')
    }
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

        {/* Tag picker section */}
        <div className="ri-tag-section">
          <div className="ri-tag-label">
            <Tag className="w-3.5 h-3.5" />
            <span>{language === 'zh' ? '导入后添加标签' : 'Add tags on import'}</span>
          </div>
          <div className="ri-tag-content">
            {selectedTagIds.size > 0 && (
              <div className="ri-tag-chips">
                {Array.from(selectedTagIds).map(tagId => (
                  <span key={tagId} className="ri-tag-chip">
                    {getTagName(tagId)}
                    <button className="ri-tag-chip-remove" onClick={() => handleRemoveTag(tagId)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="ri-tag-picker-wrap" ref={tagPickerRef}>
              <button
                className="ri-tag-add-btn"
                onClick={() => setShowTagPicker(!showTagPicker)}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'zh' ? '选择标签' : 'Select tags'}</span>
              </button>
              {showTagPicker && (
                <div className="ri-tag-dropdown">
                  <div className="sk-dropdown-search">
                    <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
                      <circle cx="11" cy="11" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <input
                      ref={tagSearchInputRef}
                      type="text"
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      placeholder={language === 'zh' ? '搜索或创建标签...' : 'Search or create tag...'}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && showCreateOption) {
                          handleCreateTag()
                        }
                      }}
                    />
                  </div>
                  <div className="sk-dropdown-tree">
                    {showCreateOption && (
                      <button
                        className="ri-tag-create-option"
                        onClick={handleCreateTag}
                        disabled={creatingTag}
                      >
                        <Plus className="w-3 h-3" />
                        {language === 'zh' ? `创建标签 "${tagSearch.trim()}"` : `Create tag "${tagSearch.trim()}"`}
                      </button>
                    )}
                    {tree.length > 0 ? (
                      tree.map(node => renderTreeNode(node, 0))
                    ) : (
                      <div className="sk-empty-hint">{language === 'zh' ? '暂无可选标签' : 'No available tags'}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

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
    </>
  )
}
