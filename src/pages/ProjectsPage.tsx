import { useCallback, useMemo, useState, useRef, useEffect } from 'react'
import { Folder, Clock } from 'lucide-react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useProjectStore } from '../stores/projectStore'
import { useAppStore } from '../stores/appStore'
import { desktopApi } from '../api/desktop'
import { useSort } from '../hooks/useSort'
import { SortDropdown } from '../components/shared'
import { ProjectSkillList, ProjectSkillImportDialog } from '../components/ProjectSkill'
import { distributionApi } from '../api/distribution'
import { configApi } from '../api/config'
import type { Project, DistributeSkillRequest, SkillDistributionMode } from '../types'

type ViewMode = 'card' | 'list'

const SUPPORTED_IMAGE_FORMATS = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml', 'image/webp']
const MAX_ICON_SIZE = 10 * 1024 * 1024

const LIGHT_COLORS = [
  '#FFE4E1', // 浅红
  '#FFE4B5', // 浅橙
  '#FFFACD', // 浅黄
  '#E0FFE0', // 浅绿
  '#E0FFFF', // 浅青
  '#E6E6FA', // 浅紫
  '#FFE4F3', // 浅粉
  '#F0FFF0', // 蜜瓜绿
  '#F5F5DC', // 米色
  '#E8E8E8', // 浅灰
  '#B0E0E6', // 粉蓝
  '#AFEEEE', // 苍白青
  '#98FB98', // 淡绿
  '#DDA0DD', // 梅红
  '#FFB6C1', // 浅粉红
  '#FFDAB9', // 桃色
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

function getProjectColor(name: string): string {
  const hash = hashString(name)
  return LIGHT_COLORS[hash % LIGHT_COLORS.length]
}

function isBase64Image(str: string | null): boolean {
  if (!str) return false
  return str.startsWith('data:image/')
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
      <mark className="pm-highlight">{match}</mark>
      {after}
    </>
  )
}

function ProjectIcon({ project, size = 'md' }: { project: Project; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'pm-icon-sm' : size === 'lg' ? 'pm-icon-lg' : 'pm-icon-md'
  const bgColor = getProjectColor(project.name)
  
  if (isBase64Image(project.icon)) {
    return (
      <div className={`pm-icon pm-icon-image ${sizeClass}`}>
        <img src={project.icon!} alt={project.name} />
      </div>
    )
  }
  
  const displayText = project.icon || project.name.charAt(0).toUpperCase()
  return (
    <div 
      className={`pm-icon ${sizeClass}`}
      style={{ backgroundColor: bgColor }}
    >
      {displayText}
    </div>
  )
}

function ProjectCard({ project, query, onClick, style }: { project: Project; query: string; onClick: () => void; style?: React.CSSProperties }) {
  const { language } = useAppStore()
  const description = project.description || (language === 'zh' ? '—' : '—')
  
  const truncatePath = (path: string) => {
    if (path.length <= 36) return path
    return `...${path.slice(-33)}`
  }
  
  return (
    <article className="pm-card" onClick={onClick} style={style}>
      <div className="pm-card-inner">
        <div className="pm-card-row">
          <ProjectIcon project={project} size="sm" />
          <div className="pm-card-title">
            <HighlightText text={project.name} query={query} />
          </div>
          {project.is_builtin && (
            <span className="pm-builtin-badge">
              {language === 'zh' ? '内置' : 'Built-in'}
            </span>
          )}
        </div>
        <div className="pm-card-desc">{description}</div>
        <div className="pm-card-meta">
          <div className="pm-meta-item">
            <Folder className="w-3 h-3 flex-shrink-0" />
            <span className="pm-meta-text skill-path-scroll" title={project.path}>
              <HighlightText text={truncatePath(project.path)} query={query} />
            </span>
          </div>
          <div className="pm-meta-item">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span className="pm-meta-text">{new Date(project.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </article>
  )
}

function ProjectListItem({ project, query, onClick }: { project: Project; query: string; onClick: () => void }) {
  const { language } = useAppStore()
  const description = project.description || (language === 'zh' ? '—' : '—')
  
  const truncatePath = (path: string) => {
    if (path.length <= 50) return path
    return `...${path.slice(-47)}`
  }
  
  return (
    <div className="pm-list-item" onClick={onClick}>
      <ProjectIcon project={project} size="sm" />
      <div className="pm-list-content">
        <div className="pm-list-row">
          <span className="pm-list-name">
            <HighlightText text={project.name} query={query} />
          </span>
          {project.is_builtin && (
            <span className="pm-builtin-badge">
              {language === 'zh' ? '内置' : 'Built-in'}
            </span>
          )}
          <span className="pm-list-desc">{description}</span>
        </div>
        <div className="pm-list-meta-row">
          <div className="pm-list-meta-item">
            <Folder className="w-3 h-3 flex-shrink-0" />
            <span className="skill-path-scroll" title={project.path}>
              <HighlightText text={truncatePath(project.path)} query={query} />
            </span>
          </div>
          <div className="pm-list-meta-item">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span>{new Date(project.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ProjectsPage() {
  const { language } = useAppStore()
  const {
    projects,
    createProject,
    updateProject,
    deleteProject,
    projectSkills,
    projectSkillsByPreset,
    projectSkillsLoading,
    projectSkillsError,
    toolPresets,
    selectedPresetId,
    fetchProjectSkillsByPresets,
    fetchToolPresets,
    selectPreset,
    removeProjectSkill,
    toggleProjectSkillStatus,
    batchRemoveProjectSkills,
    batchToggleProjectSkills,
    clearProjectSkills,
  } = useProjectStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const { sortOption, setSortOption, sortData } = useSort({
    storageKey: 'projects-sort-option'
  })
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [newProjectPath, setNewProjectPath] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [iconDragOver, setIconDragOver] = useState(false)
  const [iconError, setIconError] = useState<string | null>(null)
  const [descExpanded, setDescExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  
  const filteredProjects = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    let result = projects
    if (normalized) {
      result = result.filter((project) => 
        project.name.toLowerCase().includes(normalized) ||
        project.path.toLowerCase().includes(normalized)
      )
    }
    return sortData(result)
  }, [projects, query, sortData])
  
  useEffect(() => {
    if (selectedProject) {
      const updated = projects.find(p => p.id === selectedProject.id)
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedProject)) {
        setSelectedProject(updated)
      }
    }
  }, [projects, selectedProject])
  
  useEffect(() => {
    let unlisten: (() => void) | null = null

    const setupListener = async () => {
      unlisten = await getCurrentWindow().onDragDropEvent((event) => {
        const payload = event.payload

        if (payload.type === 'enter' || payload.type === 'over') {
          setDragOver(true)
          return
        }

        if (payload.type === 'leave') {
          setDragOver(false)
          return
        }

        setDragOver(false)
        if (payload.paths.length === 0) {
          return
        }

        const path = payload.paths[0]
        const folderName = path.split('/').pop() || path.split('\\').pop() || 'New Project'
        setNewProjectPath(path)
        setNewProjectName(folderName)
        setCreateModalOpen(true)
      })
    }

    setupListener()

    return () => {
      unlisten?.()
    }
  }, [])
  
  const openProjectDrawer = useCallback((project: Project) => {
    setSelectedProject(project)
    setDrawerOpen(true)
    setIconError(null)
    setDescExpanded(false)
    setCopied(false)
    fetchToolPresets()
    fetchProjectSkillsByPresets(project.id)
  }, [fetchProjectSkillsByPresets, fetchToolPresets])
  
  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
    setSelectedProject(null)
    setEditingField(null)
    setIconDragOver(false)
    setIconError(null)
    setDescExpanded(false)
    clearProjectSkills()
  }, [clearProjectSkills])
  
  const handleSelectFolder = async () => {
    try {
      const folderPath = await desktopApi.selectFolder()
      if (folderPath) {
        setNewProjectPath(folderPath)
        const folderName = folderPath.split('/').pop() || folderPath.split('\\').pop() || 'New Project'
        setNewProjectName(folderName)
      }
    } catch (error) {
      console.error('Failed to select folder:', error)
    }
  }
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])
  
  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])
  
  const handleCreateProject = async () => {
    if (!newProjectPath || !newProjectName) return
    
    try {
      await createProject(
        newProjectName,
        newProjectPath,
        '.skills',
        newProjectDescription.trim() || undefined,
      )
      setCreateModalOpen(false)
      setNewProjectPath('')
      setNewProjectName('')
      setNewProjectDescription('')
    } catch (error) {
      console.error('Failed to create project:', error)
    }
  }
  
  const handleCopyPath = async () => {
    if (selectedProject) {
      try {
        await navigator.clipboard.writeText(selectedProject.path)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      } catch (error) {
        console.error('Failed to copy:', error)
      }
    }
  }
  
  const handleOpenFolder = async () => {
    if (selectedProject) {
      try {
        await desktopApi.openFolder(selectedProject.path)
      } catch (error) {
        console.error('Failed to open folder:', error)
      }
    }
  }
  
  const handleEditField = (field: string, value: string) => {
    setEditingField(field)
    setEditValue(value)
  }
  
  const handleSaveEdit = async () => {
    if (!selectedProject || !editingField) return
    
    try {
      await updateProject(selectedProject.id, {
        [editingField]: editValue,
      })
      setEditingField(null)
    } catch (error) {
      console.error('Failed to update project:', error)
    }
  }
  
  const handleDeleteProject = async () => {
    if (!selectedProject) return
    
    try {
      await deleteProject(selectedProject.id)
      setDeleteConfirmOpen(false)
      closeDrawer()
    } catch (error) {
      console.error('Failed to delete project:', error)
    }
  }
  
  const processImageFile = useCallback(async (file: File): Promise<string> => {
    if (!SUPPORTED_IMAGE_FORMATS.includes(file.type)) {
      throw new Error(language === 'zh' 
        ? `不支持的格式。支持: PNG, JPG, GIF, SVG, WebP` 
        : `Unsupported format. Supported: PNG, JPG, GIF, SVG, WebP`)
    }
    
    if (file.size > MAX_ICON_SIZE) {
      throw new Error(language === 'zh' 
        ? `图片太大，最大 10MB` 
        : `Image too large, max 10MB`)
    }
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
        } else {
          reject(new Error('Failed to read file'))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }, [language])
  
  const handleIconDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIconDragOver(false)
    setIconError(null)
    
    const file = e.dataTransfer.files[0]
    if (!file) return
    
    try {
      const base64 = await processImageFile(file)
      await updateProject(selectedProject!.id, { icon: base64 })
    } catch (error) {
      setIconError(error instanceof Error ? error.message : 'Failed to process image')
    }
  }, [selectedProject, updateProject, processImageFile])
  
  const handleIconDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIconDragOver(true)
  }, [])
  
  const handleIconDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIconDragOver(false)
  }, [])
  
  const handleIconFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setIconError(null)
    try {
      const base64 = await processImageFile(file)
      await updateProject(selectedProject!.id, { icon: base64 })
    } catch (error) {
      setIconError(error instanceof Error ? error.message : 'Failed to process image')
    }
    
    e.target.value = ''
  }, [selectedProject, updateProject, processImageFile])
  
  const handleClearIcon = useCallback(async () => {
    if (!selectedProject) return
    try {
      await updateProject(selectedProject.id, { icon: null })
    } catch (error) {
      console.error('Failed to clear icon:', error)
    }
  }, [selectedProject, updateProject])

  const handleRemoveSkill = useCallback(async (skillId: string) => {
    if (!selectedProject) return
    await removeProjectSkill(selectedProject.id, skillId)
  }, [selectedProject, removeProjectSkill])

  const handleToggleSkillStatus = useCallback(async (skillId: string) => {
    if (!selectedProject) return
    await toggleProjectSkillStatus(selectedProject.id, skillId)
  }, [selectedProject, toggleProjectSkillStatus])

  const handleBatchRemoveSkills = useCallback(async (skillIds: string[]) => {
    if (!selectedProject) return
    await batchRemoveProjectSkills(selectedProject.id, skillIds)
  }, [selectedProject, batchRemoveProjectSkills])

  const handleBatchToggleSkills = useCallback(async (skillIds: string[]) => {
    if (!selectedProject) return
    await batchToggleProjectSkills(selectedProject.id, skillIds)
  }, [selectedProject, batchToggleProjectSkills])

  const handleImportSkills = useCallback(async (skillIds: string[], presetIds: string[], forceOverwrite: boolean) => {
    if (!selectedProject) return

    const presets = await configApi.getToolPresets()
    
    for (const presetId of presetIds) {
      const preset = presets.find(p => p.id === presetId)
      if (!preset) {
        throw new Error(language === 'zh' ? '未找到工具预设' : 'Tool preset not found')
      }

      for (const skillId of skillIds) {
        const request: DistributeSkillRequest = {
          skill_id: skillId,
          target: 'project',
          preset_id: presetId,
          project_id: selectedProject.id,
          mode: 'copy' as SkillDistributionMode,
        }
        await distributionApi.distribute(request)
      }
    }

    await fetchProjectSkillsByPresets(selectedProject.id)
  }, [selectedProject, language, fetchProjectSkillsByPresets])
  
  return (
    <div className="pm-page">
      <div className="pm-toolbar">
        <div className="pm-search">
          <svg className="pm-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="6" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={language === 'zh' ? '搜索项目' : 'Search projects'}
            className="pm-search-input"
          />
          {query && (
            <button className="pm-search-clear" onClick={() => setQuery('')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        <div className="pm-actions">
          <SortDropdown
            sortOption={sortOption}
            onSortChange={setSortOption}
          />
          
          <div className="pm-view-toggle">
            <button
              className={viewMode === 'card' ? 'pm-toggle active' : 'pm-toggle'}
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
              className={viewMode === 'list' ? 'pm-toggle active' : 'pm-toggle'}
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
          
          <button className="pm-btn-primary" onClick={() => setCreateModalOpen(true)}>
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>{language === 'zh' ? '新建' : 'New'}</span>
          </button>
        </div>
      </div>
      
      <div className="pm-content">
        {filteredProjects.length > 0 ? (
          viewMode === 'card' ? (
            <div className="pm-grid">
              {filteredProjects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  query={query}
                  onClick={() => openProjectDrawer(project)}
                  style={{ animationDelay: `${index * 30}ms` }}
                />
              ))}
            </div>
          ) : (
            <div className="pm-list">
              {filteredProjects.map((project) => (
                <ProjectListItem
                  key={project.id}
                  project={project}
                  query={query}
                  onClick={() => openProjectDrawer(project)}
                />
              ))}
            </div>
          )
        ) : (
          <div className="pm-empty">
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="8" y="8" width="32" height="32" rx="4" strokeDasharray="4 2" />
              <circle cx="24" cy="24" r="6" />
            </svg>
            <p>{language === 'zh' ? '没有匹配的项目' : 'No matching projects'}</p>
          </div>
        )}
      </div>
      
      {createModalOpen && (
        <>
          <div className="pm-overlay" onClick={() => setCreateModalOpen(false)} />
          <div className="pm-modal">
            <div className="pm-modal-header">
              <h2>{language === 'zh' ? '新建项目' : 'New Project'}</h2>
              <button className="pm-modal-close" onClick={() => setCreateModalOpen(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="pm-modal-body">
              <div 
                className={`pm-dropzone ${dragOver ? 'active' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={handleSelectFolder}
              >
                <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M16 8v16M8 16h16" strokeLinecap="round" />
                  <rect x="4" y="4" width="24" height="24" rx="4" />
                </svg>
                <p>{newProjectPath || (language === 'zh' ? '选择或拖入文件夹' : 'Select or drop folder')}</p>
              </div>
              
              <div className="pm-field">
                <label htmlFor="new-project-name">{language === 'zh' ? '名称' : 'Name'}</label>
                <input
                  id="new-project-name"
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder={language === 'zh' ? '项目名称' : 'Project name'}
                />
              </div>

              <div className="pm-field">
                <label htmlFor="new-project-description">{language === 'zh' ? '描述' : 'Description'}</label>
                <textarea
                  id="new-project-description"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder={language === 'zh' ? '项目描述（可选）' : 'Project description (optional)'}
                  rows={3}
                />
              </div>
            </div>
            <div className="pm-modal-footer">
              <button className="pm-btn-ghost" onClick={() => setCreateModalOpen(false)}>
                {language === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button 
                className="pm-btn-primary"
                onClick={handleCreateProject}
                disabled={!newProjectPath || !newProjectName}
              >
                {language === 'zh' ? '创建' : 'Create'}
              </button>
            </div>
          </div>
        </>
      )}
      
      {drawerOpen && selectedProject && (
        <>
          <div className="pm-overlay" onClick={closeDrawer} />
          <aside className="pm-drawer">
            <div className="pm-drawer-header">
              <span className="pm-drawer-label">{language === 'zh' ? '项目详情' : 'Details'}</span>
              <div className="pm-drawer-header-actions">
                {!selectedProject.is_builtin && (
                  <button 
                    className="pm-btn-delete"
                    onClick={() => setDeleteConfirmOpen(true)}
                    title={language === 'zh' ? '删除项目' : 'Delete project'}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
                <button className="pm-drawer-close" onClick={closeDrawer}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="pm-drawer-body">
              <div className="pm-drawer-sidebar">
                <div className="pm-drawer-meta">
                <div className="pm-drawer-icon-wrap">
                  <div 
                    className={`pm-drawer-icon-area ${iconDragOver ? 'drag-over' : ''}`}
                    onDrop={handleIconDrop}
                    onDragOver={handleIconDragOver}
                    onDragLeave={handleIconDragLeave}
                  >
                    {isBase64Image(selectedProject.icon) ? (
                      <img src={selectedProject.icon!} alt={selectedProject.name} className="pm-drawer-icon-img" />
                    ) : (
                      <div 
                        className="pm-drawer-icon" 
                        onClick={() => fileInputRef.current?.click()}
                        style={{ backgroundColor: getProjectColor(selectedProject.name) }}
                      >
                        {selectedProject.icon || selectedProject.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="pm-drawer-icon-overlay" onClick={(e) => e.stopPropagation()}>
                      <div className="pm-icon-actions">
                        <button 
                          className="pm-icon-action-btn" 
                          onClick={() => fileInputRef.current?.click()}
                          title={language === 'zh' ? '更换图标' : 'Change icon'}
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor">
                            <path d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 5.293A1 1 0 015.586 5.5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" />
                          </svg>
                        </button>
                        {isBase64Image(selectedProject.icon) && (
                          <button 
                            className="pm-icon-action-btn pm-icon-action-delete" 
                            onClick={handleClearIcon}
                            title={language === 'zh' ? '清除图标' : 'Clear icon'}
                          >
                            <svg viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <div className="pm-icon-hint">
                        PNG/JPG/GIF/SVG/WebP
                        <br />
                        ≤ 10MB
                      </div>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/svg+xml,image/webp"
                    onChange={handleIconFileSelect}
                    style={{ display: 'none' }}
                  />
                </div>
                
                <div className="pm-drawer-info">
                  {editingField === 'name' ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleSaveEdit}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                      className="pm-drawer-input"
                      autoFocus
                    />
                  ) : (
                    <h3 className="pm-drawer-name" onClick={() => handleEditField('name', selectedProject.name)}>
                      {selectedProject.name}
                    </h3>
                  )}
                  
                  {editingField === 'description' ? (
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleSaveEdit}
                      className="pm-drawer-textarea"
                      placeholder={language === 'zh' ? '添加描述' : 'Add description'}
                      autoFocus
                      rows={3}
                    />
                  ) : (
                    <div className="pm-drawer-desc-wrap">
                      <p 
                        className={`pm-drawer-desc ${descExpanded ? 'expanded' : ''}`}
                        onClick={() => handleEditField('description', selectedProject.description || '')}
                      >
                        {selectedProject.description || (language === 'zh' ? '点击添加描述' : 'Click to add description')}
                      </p>
                      {selectedProject.description && selectedProject.description.length > 80 && (
                        <button 
                          className="pm-desc-toggle"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDescExpanded(!descExpanded)
                          }}
                        >
                          {descExpanded 
                            ? (language === 'zh' ? '收起' : 'Collapse') 
                            : '...'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {iconError && (
                <div className="pm-icon-error">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{iconError}</span>
                </div>
              )}
              
              <div className="pm-drawer-path-section">
                <label>{language === 'zh' ? '路径' : 'Path'}</label>
                <div className="pm-drawer-path-row">
                  <code className="pm-drawer-path">{selectedProject.path}</code>
                  <div className="pm-drawer-actions">
                    <button 
                      onClick={handleCopyPath} 
                      className={copied ? 'pm-action-copied' : ''}
                      title={language === 'zh' ? '复制' : 'Copy'}
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
                    <button onClick={handleOpenFolder} title={language === 'zh' ? '打开' : 'Open'}>
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 7h5l2 2h7v7H3z" />
                        <path d="M3 7l2-2h4" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div className="sk-meta-grid">
                <div className="sk-meta-item">
                  <span className="sk-meta-label">{language === 'zh' ? '添加时间' : 'Created'}</span>
                  <span className="sk-meta-value">{new Date(selectedProject.created_at).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}</span>
                </div>
                <div className="sk-meta-item">
                  <span className="sk-meta-label">{language === 'zh' ? '更新时间' : 'Updated'}</span>
                  <span className="sk-meta-value">{new Date(selectedProject.updated_at).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}</span>
                </div>
              </div>
            </div>
            
            <div className="pm-drawer-main">
              <div className="pm-drawer-section">
                <div className="pm-drawer-section-header">
                  <h4>{language === 'zh' ? '项目技能' : 'Project Skills'}</h4>
                </div>
                <ProjectSkillList
                  skills={projectSkills}
                  skillsByPreset={projectSkillsByPreset}
                  toolPresets={toolPresets}
                  selectedPresetId={selectedPresetId}
                  loading={projectSkillsLoading}
                  error={projectSkillsError}
                  onPresetChange={selectPreset}
                  onRemove={handleRemoveSkill}
                  onToggleStatus={handleToggleSkillStatus}
                  onBatchRemove={handleBatchRemoveSkills}
                  onBatchToggle={handleBatchToggleSkills}
                  onImport={() => setImportDialogOpen(true)}
                  onRetry={() => selectedProject && fetchProjectSkillsByPresets(selectedProject.id)}
                />
              </div>
            </div>
          </div>
        </aside>
        </>
      )}

      <ProjectSkillImportDialog
        isOpen={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        projectId={selectedProject?.id || ''}
        onImport={handleImportSkills}
      />
      
      {deleteConfirmOpen && (
        <>
          <div className="pm-overlay" onClick={() => setDeleteConfirmOpen(false)} />
          <div className="pm-confirm-modal">
            <div className="pm-confirm-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <h3>{language === 'zh' ? '确认删除' : 'Confirm Delete'}</h3>
            <p>
              {language === 'zh' 
                ? `确定要删除项目 "${selectedProject?.name}" 吗？此操作无法撤销。` 
                : `Are you sure you want to delete "${selectedProject?.name}"? This action cannot be undone.`}
            </p>
            <div className="pm-confirm-actions">
              <button className="pm-btn-ghost" onClick={() => setDeleteConfirmOpen(false)}>
                {language === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button className="pm-btn-danger" onClick={handleDeleteProject}>
                {language === 'zh' ? '删除' : 'Delete'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
