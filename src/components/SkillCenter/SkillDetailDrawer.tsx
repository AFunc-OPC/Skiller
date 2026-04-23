import { useState, useEffect, useRef, useMemo } from 'react'
import { configApi } from '../../api/config'
import { desktopApi } from '../../api/desktop'
import { projectApi } from '../../api/project'
import { repoApi } from '../../api/repo'
import { useSkillContext } from '../../contexts/SkillContext'
import { useAppStore } from '../../stores/appStore'
import { Project, Skill, SkillDistributionMode, SkillDistributionTarget, Tag, ToolPreset, Repo } from '../../types'
import { SkillMarkdownPreview } from './SkillMarkdownPreview'

interface SkillDetailDrawerProps {
  skill: Skill | null
  isOpen: boolean
  onClose: () => void
  onToggleStatus: (skillId: string) => Promise<void>
  onDelete: (skillId: string) => Promise<void>
  onNavigateToRepository?: (repoId: string) => void
}

function buildTagTree(tags: Tag[]): Map<string | null, Tag[]> {
  const childrenMap = new Map<string | null, Tag[]>()
  
  tags.forEach(tag => {
    const parentId = tag.parent_id || null
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, [])
    }
    childrenMap.get(parentId)!.push(tag)
  })
  
  return childrenMap
}

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

function getSkillFolderName(skillPath: string): string {
  const normalized = skillPath.replace(/\/+$/, '')
  const parts = normalized.split('/')
  return parts[parts.length - 1] || skillPath
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

export function SkillDetailDrawer({ 
  skill, 
  isOpen, 
  onClose, 
  onToggleStatus, 
  onDelete,
  onNavigateToRepository
}: SkillDetailDrawerProps) {
  const { tags: allTags, getSkillTags, updateSkillTags, distributeSkill } = useSkillContext()
  const { language } = useAppStore()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [skillTags, setSkillTags] = useState<string[]>(skill?.tags || [])
  const [tagsLoading, setTagsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showTagDropdown, setShowTagDropdown] = useState(false)
  const [tagSearch, setTagSearch] = useState('')
  const [expandedTagIds, setExpandedTagIds] = useState<Set<string>>(new Set())
  const [toolPresets, setToolPresets] = useState<ToolPreset[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [distributionTarget, setDistributionTarget] = useState<SkillDistributionTarget>('global')
  const [distributionMode, setDistributionMode] = useState<SkillDistributionMode>('symlink')
  const [selectedPresetIds, setSelectedPresetIds] = useState<string[]>([])
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const [distributionLoading, setDistributionLoading] = useState(false)
  const [distributionError, setDistributionError] = useState('')
  const [distributionSuccess, setDistributionSuccess] = useState('')
  const [distributionPathCopied, setDistributionPathCopied] = useState(false)
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [showPresetDropdown, setShowPresetDropdown] = useState(false)
  const [projectSearch, setProjectSearch] = useState('')
  const [presetSearch, setPresetSearch] = useState('')
  const [repository, setRepository] = useState<Repo | null>(null)
  const [showMdPreview, setShowMdPreview] = useState(false)
  const tagDropdownRef = useRef<HTMLDivElement>(null)
  const projectDropdownRef = useRef<HTMLDivElement>(null)
  const presetDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (skill && isOpen) {
      const loadTags = async () => {
        setTagsLoading(true)
        try {
          const tags = await getSkillTags(skill.id)
          setSkillTags(tags)
        } catch (error) {
          console.error('Failed to load skill tags:', error)
          setSkillTags(skill.tags || [])
        } finally {
          setTagsLoading(false)
        }
      }
      loadTags()
    }
  }, [skill?.id, isOpen, getSkillTags])

  useEffect(() => {
    if (!skill || !isOpen) return

    const loadDistributionOptions = async () => {
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

    loadDistributionOptions()
  }, [skill, isOpen])

  useEffect(() => {
    if (!isOpen) return

    setDistributionTarget('global')
    setDistributionMode('symlink')
    setSelectedPresetIds([])
    setSelectedProjectIds([])
    setDistributionError('')
    setDistributionSuccess('')
    setDistributionPathCopied(false)
    setShowProjectDropdown(false)
    setShowPresetDropdown(false)
  }, [skill?.id, isOpen])

  useEffect(() => {
    if (!skill?.repo_id || !isOpen) {
      setRepository(null)
      return
    }

    const loadRepository = async () => {
      try {
        const repos = await repoApi.list()
        const repo = repos.find(r => r.id === skill.repo_id)
        setRepository(repo || null)
      } catch (error) {
        console.error('Failed to load repository:', error)
        setRepository(null)
      }
    }

    loadRepository()
  }, [skill?.repo_id, isOpen])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setShowTagDropdown(false)
        setTagSearch('')
      }

      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setShowProjectDropdown(false)
        setProjectSearch('')
      }

      if (presetDropdownRef.current && !presetDropdownRef.current.contains(e.target as Node)) {
        setShowPresetDropdown(false)
        setPresetSearch('')
      }
    }
    if (showTagDropdown || showProjectDropdown || showPresetDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPresetDropdown, showProjectDropdown, showTagDropdown])

  const handleToggleStatus = async () => {
    if (!skill || actionLoading) return
    setActionLoading(true)
    try {
      await onToggleStatus(skill.id)
    } catch (error) {
      console.error('Failed to toggle status:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!skill) return
    setActionLoading(true)
    try {
      await onDelete(skill.id)
      setShowDeleteConfirm(false)
      onClose()
    } catch (error) {
      console.error('Failed to delete skill:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCopyPath = async () => {
    if (!skill) return
    try {
      await navigator.clipboard.writeText(skill.file_path)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleOpenFolder = async () => {
    if (!skill) return
    try {
      await desktopApi.openFolder(skill.file_path)
    } catch (error) {
      console.error('Failed to open folder:', error)
    }
  }

  const handleToggleTag = async (tagId: string) => {
    if (!skill || tagsLoading) return
    
    const newTags = skillTags.includes(tagId)
      ? skillTags.filter(t => t !== tagId)
      : [...skillTags, tagId]
    
    setTagsLoading(true)
    try {
      await updateSkillTags(skill.id, newTags)
      setSkillTags(newTags)
    } catch (error) {
      console.error('Failed to update tags:', error)
    } finally {
      setTagsLoading(false)
    }
  }

  const handleToggleExpand = (tagId: string) => {
    setExpandedTagIds(prev => {
      const next = new Set(prev)
      if (next.has(tagId)) {
        next.delete(tagId)
      } else {
        next.add(tagId)
      }
      return next
    })
  }

  const childrenMap = useMemo(() => buildTagTree(allTags), [allTags])

  const getTagFullPath = useMemo(() => {
    const tagByIdMap = new Map(allTags.map(t => [t.id, t]))
    const pathCache = new Map<string, string[]>()
    
    const buildPath = (tagId: string): string[] => {
      if (pathCache.has(tagId)) return pathCache.get(tagId)!
      
      const tag = tagByIdMap.get(tagId)
      if (!tag) return [tagId]
      
      if (!tag.parent_id) {
        pathCache.set(tagId, [tag.name])
        return [tag.name]
      }
      
      const parentPath = buildPath(tag.parent_id)
      const fullPath = [...parentPath, tag.name]
      pathCache.set(tagId, fullPath)
      return fullPath
    }
    
    return buildPath
  }, [allTags])

  const renderTagNode = (tag: Tag, depth: number): React.ReactNode => {
    const children = childrenMap.get(tag.id) || []
    const hasChildren = children.length > 0
    const isExpanded = expandedTagIds.has(tag.id)
    const isSelected = skillTags.includes(tag.id)
    const matchesSearch = tagSearch.trim() && tag.name.toLowerCase().includes(tagSearch.toLowerCase())
    
    if (tagSearch.trim() && !matchesSearch && !hasChildren) return null
    if (tagSearch.trim() && !matchesSearch) {
      const hasMatchingDescendant = (t: Tag): boolean => {
        const childs = childrenMap.get(t.id) || []
        return childs.some(child => 
          child.name.toLowerCase().includes(tagSearch.toLowerCase()) || hasMatchingDescendant(child)
        )
      }
      if (!hasMatchingDescendant(tag)) return null
    }
    
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
          
          <button
            className="sk-tree-label"
            onClick={() => handleToggleTag(tag.id)}
          >
            <span className="sk-tree-name">{tag.name}</span>
            {isSelected && (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
        
        {isExpanded && hasChildren && (
          <div>
            {children.map(child => renderTagNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const rootTags = childrenMap.get(null) || []

  if (!skill || !isOpen) return null

  const isDisabled = skill.status === 'disabled'
  const selectedPreset = toolPresets.find((preset) => preset.id === selectedPresetIds[0]) || null
  const selectedProject = projects.find((project) => project.id === selectedProjectIds[0]) || null
  const selectedPresets = toolPresets.filter((preset) => selectedPresetIds.includes(preset.id))
  const selectedProjects = projects.filter((project) => selectedProjectIds.includes(project.id))
  const skillFolderName = getSkillFolderName(skill.file_path)
  const sourceLabels: Record<string, string> = {
    file: language === 'zh' ? '从文件导入' : 'Imported from file',
    npx: language === 'zh' ? '通过 npx 命令导入' : 'Installed via npx command',
    repository: language === 'zh' ? '从仓库导入' : 'Imported from repository'
  }
  const previewPath = selectedPreset
    ? distributionTarget === 'global'
      ? joinPath(expandTilde(selectedPreset.global_path), skillFolderName)
      : selectedProject
        ? joinPath(selectedProject.path, selectedPreset.skill_path, skillFolderName)
        : ''
    : ''
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
  const currentDestinationLabel = distributionTarget === 'global' ? (language === 'zh' ? '全局技能库' : 'Global Skill Library') : (language === 'zh' ? '项目技能目录' : 'Project Skill Directory')
  const currentBasePath = distributionTarget === 'global' 
    ? expandTilde(selectedPreset?.global_path || (language === 'zh' ? '未配置全局目录' : 'Global path not configured'))
    : selectedProject?.path || (language === 'zh' ? '未选择目标项目' : 'No target project selected')

  const handleCopyDistributionPreview = async () => {
    if (!previewPath) return

    try {
      await navigator.clipboard.writeText(previewPath)
      setDistributionPathCopied(true)
      setTimeout(() => setDistributionPathCopied(false), 1500)
    } catch (error) {
      console.error('Failed to copy distribution preview path:', error)
    }
  }

  const handleDistributeSkill = async () => {
    if (!skill || distributionDisabled) return

    setDistributionLoading(true)
    setDistributionError('')
    setDistributionSuccess('')

    try {
      const results: string[] = []
      const errors: string[] = []

      if (distributionTarget === 'global') {
        for (const presetId of selectedPresetIds) {
          try {
            const result = await distributeSkill({
              skill_id: skill.id,
              target: distributionTarget,
              project_id: undefined,
              preset_id: presetId,
              mode: distributionMode,
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
                skill_id: skill.id,
                target: distributionTarget,
                project_id: projectId,
                preset_id: presetId,
                mode: distributionMode,
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

      if (errors.length > 0) {
        setDistributionError(`${language === 'zh' ? '部分分发失败' : 'Some distributions failed'}: ${errors.join('; ')}`)
      }
      if (results.length > 0) {
        const successMsg = results.length === 1
          ? `${language === 'zh' ? '分发成功' : 'Distribution successful'}：${results[0]}`
          : `${language === 'zh' ? '成功分发' : 'Successfully distributed'} ${results.length} ${language === 'zh' ? '个目标' : 'targets'}`
        setDistributionSuccess(successMsg)
        setTimeout(() => {
          onClose()
        }, 1500)
      }
    } catch (error) {
      setDistributionError((error as Error).message)
    } finally {
      setDistributionLoading(false)
    }
  }

  return (
    <>
      <div className={`pm-overlay ${isOpen ? '' : 'pointer-events-none opacity-0'}`} onClick={onClose} />
      
      <aside className={`pm-drawer ${isOpen ? '' : 'translate-x-full'}`}>
        <div className="pm-drawer-header">
          <span className="pm-drawer-label">{language === 'zh' ? '技能详情' : 'Skill Detail'}</span>
          <div className="pm-drawer-header-actions">
            <button 
              className="pm-btn-delete"
              onClick={() => setShowDeleteConfirm(true)}
              title={language === 'zh' ? '删除技能' : 'Delete skill'}
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            <button className="pm-drawer-close" onClick={onClose}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="pm-drawer-basic">
          <div className="pm-drawer-info">
            <div className="pm-drawer-info-header">
              <div className="pm-drawer-info-title-row">
                <h3 className="pm-drawer-name">{skill.name}</h3>
                <button
                  onClick={handleToggleStatus}
                  disabled={actionLoading}
                  className={`sk-status-dot ${isDisabled ? 'off' : 'on'}`}
                  title={isDisabled ? (language === 'zh' ? '点击启用' : 'Click to enable') : (language === 'zh' ? '点击禁用' : 'Click to disable')}
                >
                  <span className="sk-dot" />
                  <span className="sk-dot-label">{isDisabled ? (language === 'zh' ? '已禁用' : 'Disabled') : (language === 'zh' ? '可用' : 'Available')}</span>
                </button>
              </div>
              <button
                onClick={() => setShowMdPreview(true)}
                className="sk-view-md-btn"
                title={language === 'zh' ? '查看 SKILL.md 文档' : 'View SKILL.md document'}
              >
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
                <span>{language === 'zh' ? '查看文档' : 'View Document'}</span>
              </button>
            </div>
            {skill.description ? (
              <p className="pm-drawer-desc expanded">{skill.description}</p>
            ) : null}
          </div>

          <div className="sk-meta-grid">
            {repository && (
              <div className="sk-meta-item">
                <span className="sk-meta-label">{language === 'zh' ? '所属仓库' : 'Repository'}</span>
                <button 
                  className="sk-meta-link"
                  onClick={() => onNavigateToRepository?.(repository.id)}
                  title={language === 'zh' ? '跳转到仓库详情' : 'Jump to repository details'}
                >
                  {repository.name}
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
            <div className="sk-meta-item">
              <span className="sk-meta-label">{language === 'zh' ? '来源' : 'Source'}</span>
              <span className="sk-meta-value">
                {skill.source_metadata ? (
                  <>
                    {skill.source_metadata.type === 'file' && (
                      <>{language === 'zh' ? '从文件导入' : 'Imported from file'} ({skill.source_metadata.original_path})</>
                    )}
                    {skill.source_metadata.type === 'npx' && (
                      <>{language === 'zh' ? '使用' : 'Using'} {skill.source_metadata.command} {language === 'zh' ? '安装' : 'installed'}</>
                    )}
                    {skill.source_metadata.type === 'repository' && (
                      <>
                        {language === 'zh' ? '从仓库导入' : 'Imported from repository'}
                        {skill.repo_id && onNavigateToRepository && (
                          <button
                            className="sk-meta-link sk-source-repo-link"
                            onClick={() => onNavigateToRepository(skill.repo_id!)}
                            title={language === 'zh' ? '查看仓库详情' : 'View repository details'}
                          >
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                            </svg>
                          </button>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <>{sourceLabels[skill.source] || skill.source}</>
                )}
              </span>
            </div>
            <div className="sk-meta-item">
              <span className="sk-meta-label">{language === 'zh' ? '更新时间' : 'Updated'}</span>
              <span className="sk-meta-value">{new Date(skill.updated_at).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}</span>
            </div>
            <div className="sk-meta-item">
              <span className="sk-meta-label">{language === 'zh' ? '创建时间' : 'Created'}</span>
              <span className="sk-meta-value">{new Date(skill.created_at).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}</span>
            </div>
          </div>

          <div className="pm-drawer-path-section">
            <label>{language === 'zh' ? '标签' : 'Tags'}</label>
            <div className="sk-tags-area">
              {skillTags.length > 0 && (
                <div className="sk-tags-list">
                  {skillTags.map((tag, i) => {
                    const path = getTagFullPath(tag)
                    const displayText = path.join(' / ')
                    
                    return (
                      <span key={i} className="sk-tag">
                        {displayText}
                        <button 
                          onClick={() => handleToggleTag(tag)} 
                          disabled={tagsLoading}
                          className="sk-tag-remove"
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}
              <div className="sk-tag-selector" ref={tagDropdownRef}>
                <button 
                  className="sk-tag-add-btn"
                  onClick={() => setShowTagDropdown(!showTagDropdown)}
                  disabled={tagsLoading}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  <span>{language === 'zh' ? '选择标签' : 'Select tags'}</span>
                </button>
                
                {showTagDropdown && (
                  <div className="sk-tag-dropdown-panel">
                    <div className="sk-dropdown-search">
                      <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
                        <circle cx="11" cy="11" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                        <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <input
                        type="text"
                        value={tagSearch}
                        onChange={(e) => setTagSearch(e.target.value)}
                        placeholder={language === 'zh' ? '搜索标签...' : 'Search tags...'}
                        autoFocus
                      />
                    </div>
                    <div className="sk-dropdown-tree">
                      {rootTags.length > 0 ? (
                        rootTags.map(tag => renderTagNode(tag, 0))
                      ) : (
                        <div className="sk-empty-hint">{language === 'zh' ? '暂无可选标签' : 'No available tags'}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pm-drawer-path-section">
            <label>{language === 'zh' ? '存储位置' : 'Storage Location'}</label>
            <div className="pm-drawer-path-row">
              <code className="pm-drawer-path">{skill.file_path}</code>
              <div className="pm-drawer-actions">
                <button 
                  onClick={handleCopyPath} 
                  className={copied ? 'pm-action-copied' : ''}
                  title={language === 'zh' ? '复制路径' : 'Copy path'}
                >
                  {copied ? (
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 6L9 13l-3-3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="7" y="7" width="10" height="10" rx="1" />
                      <path d="M3 13V4a1 1 0 011-1h9" />
                    </svg>
                  )}
                </button>
                <button onClick={handleOpenFolder} title={language === 'zh' ? '打开文件夹' : 'Open folder'}>
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 7h5l2 2h7v7H3z" />
                    <path d="M3 7l2-2h4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

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
                <span className="sk-distribution-header-title">{language === 'zh' ? '技能分发' : 'Skill Distribution'}</span>
                <span className="sk-distribution-header-desc">{language === 'zh' ? '将技能部署到目标环境' : 'Deploy skill to target environment'}</span>
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
                          name="distribution-target"
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
                                : `${language === 'zh' ? '已选择' : 'Selected'} ${selectedProjectIds.length} ${language === 'zh' ? '个项目' : 'projects'}`}
                          </strong>
                          <span>
                            {selectedProjectIds.length === 0
                              ? (language === 'zh' ? '点击选择' : 'Click to select')
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
                              : `${language === 'zh' ? '已选择' : 'Selected'} ${selectedPresetIds.length} ${language === 'zh' ? '个目录' : 'directories'}`}
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

                    return (
                      <label key={option.value} className={`sk-distribution-choice compact ${active ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name="distribution-mode"
                          aria-label={option.label}
                          checked={active}
                          onChange={() => setDistributionMode(option.value)}
                        />
                        <strong>{option.title}</strong>
                      </label>
                    )
                  })}
                </div>
              </div>

              {previewPath && (
                <div className="sk-distribution-preview-shell">
                  <div className="sk-distribution-preview-label">{language === 'zh' ? '目标路径' : 'Target Path'}</div>
                  <code>{previewPath}</code>
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
                    {distributionTarget === 'global' ? (language === 'zh' ? '全局' : 'Global') : (language === 'zh' ? '项目' : 'Project')} · {distributionMode === 'copy' ? (language === 'zh' ? '复制' : 'Copy') : (language === 'zh' ? '软链接' : 'Symlink')}
                  </strong>
                </div>
                <button
                  className="pm-btn-primary sk-distribution-submit"
                  onClick={handleDistributeSkill}
                  disabled={distributionDisabled}
                >
                  {distributionLoading ? (language === 'zh' ? '分发中...' : 'Distributing...') : (language === 'zh' ? '分发' : 'Distribute')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {showDeleteConfirm && (
        <>
          <div className="pm-overlay" onClick={() => setShowDeleteConfirm(false)} />
          <div className="pm-confirm-modal">
            <div className="pm-confirm-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <h3>{language === 'zh' ? '确认删除' : 'Confirm Delete'}</h3>
            <p>{language === 'zh' ? `确定要删除技能 "${skill.name}" 吗？此操作无法撤销。` : `Are you sure you want to delete skill "${skill.name}"? This action cannot be undone.`}</p>
            <div className="pm-confirm-actions">
              <button className="pm-btn-ghost" onClick={() => setShowDeleteConfirm(false)}>
                {language === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button className="pm-btn-danger" onClick={handleDelete} disabled={actionLoading}>
                {actionLoading ? (language === 'zh' ? '删除中...' : 'Deleting...') : (language === 'zh' ? '删除' : 'Delete')}
              </button>
            </div>
          </div>
        </>
      )}

      {skill && (
        <SkillMarkdownPreview
          skillId={skill.id}
          skillName={skill.name}
          skillPath={skill.file_path}
          isOpen={showMdPreview}
          onClose={() => setShowMdPreview(false)}
        />
      )}
    </>
  )
}
