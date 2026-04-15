import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useSkillStore } from './stores/skillStore'
import { useFileSkillStore } from './stores/fileSkillStore'
import { useProjectStore } from './stores/projectStore'
import { useRepoStore } from './stores/repoStore'
import { useAppStore } from './stores/appStore'
import { useTagTreeStore } from './stores/tagTreeStore'
import { SkillProvider } from './contexts/SkillContext'
import { SkillCenter } from './components/SkillCenter'
import { t } from './i18n'
import { TagGovernancePage } from './pages/TagGovernancePage'
import { ProjectsPage } from './pages/ProjectsPage'
import { OverviewPage } from './pages/OverviewPage'
import { RepositoryManagementPage, RepositoryAddDialog } from './components/RepositoryManagement'
import { isTauriEnvironment } from './api/tauri'
import { ToolPresetSettings, SettingsTabs } from './components/Settings'
import { desktopApi } from './api/desktop'
import { SkillMarkdownPreview } from './components/SkillCenter/SkillMarkdownPreview'
import { USER_GUIDE_CONTENT, USER_GUIDE_CONTENT_EN } from './data/userGuide'

type ModuleKey = 'overview' | 'skills' | 'projects' | 'repos' | 'tags' | 'settings'
type IconName = ModuleKey | 'sun' | 'moon' | 'search' | 'grid' | 'list' | 'plus' | 'x' | 'chevron-left' | 'chevron-right'

const modules: Array<{ key: ModuleKey; titleZh: string; titleEn: string; noteZh: string; noteEn: string }> = [
  { key: 'overview', titleZh: '总览', titleEn: 'Overview', noteZh: '核心指标与流程', noteEn: 'Metrics and flow' },
  { key: 'skills', titleZh: '技能中心', titleEn: 'Skill Center', noteZh: '技能集中管理与分发', noteEn: 'Centralized management and distribution of skills' },
  { key: 'projects', titleZh: '项目管理', titleEn: 'Projects', noteZh: '项目、技能分配', noteEn: 'Project and skill allocation' },
  { key: 'repos', titleZh: '仓库管理', titleEn: 'Repos', noteZh: '远程/本地技能仓库管理\n注意:当前仅做技能仓库管理', noteEn: 'Remote/local skill repository management\nNote: At present, only skill warehouse management is done.' },
  { key: 'tags', titleZh: '标签治理', titleEn: 'Tag Governance', noteZh: '分组与标签\n推荐:可为您的技能赋于标签，更便于管理', noteEn: 'Groups and links\nRecommended: You can assign tags to your skills for better management' },
  { key: 'settings', titleZh: '设置', titleEn: 'Settings', noteZh: '语言、主题、路径预设', noteEn: 'Locale, theme, path presets' },
]

const Icon = memo(function Icon({ name }: { name: IconName }) {
  switch (name) {
    case 'overview':
      return <svg viewBox="0 0 24 24"><path d="M4 18V7l5 3 4-5 7 5v8" /></svg>
    case 'skills':
      return <svg viewBox="0 0 24 24"><path d="M5 6.5h14M5 12h14M5 17.5h9" /></svg>
    case 'projects':
      return <svg viewBox="0 0 24 24"><path d="M4 7.5h7l2 2H20v8.5H4z" /></svg>
    case 'repos':
      return <svg viewBox="0 0 24 24"><path d="M6 6.5h12v11H6z" /><path d="M9 9.5h6M9 13h6" /></svg>
    case 'tags':
      return <svg viewBox="0 0 24 24"><path d="M5 8V4h4l10 10-5 5z" /><circle cx="8.5" cy="7.5" r="1" /></svg>
    case 'settings':
      return <svg viewBox="0 0 24 24"><path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z" /><path d="M4 13.2v-2.4l2.1-.7.8-1.9-1-2 1.7-1.7 2 1 1.9-.8.7-2.1h2.4l.7 2.1 1.9.8 2-1 1.7 1.7-1 2 .8 1.9 2.1.7v2.4l-2.1.7-.8 1.9 1 2-1.7 1.7-2-1-1.9.8-.7 2.1h-2.4l-.7-2.1-1.9-.8-2 1-1.7-1.7 1-2-.8-1.9z" /></svg>
    case 'sun':
      return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.4M12 19.1v2.4M21.5 12h-2.4M4.9 12H2.5M18.7 5.3l-1.7 1.7M7 17l-1.7 1.7M18.7 18.7 17 17M7 7 5.3 5.3" /></svg>
    case 'moon':
      return <svg viewBox="0 0 24 24"><path d="M16.9 14.7A6.9 6.9 0 0 1 9.3 7.1 8.5 8.5 0 1 0 16.9 14.7Z" /></svg>
    case 'search':
      return <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="5.5" /><path d="m16 16 4 4" /></svg>
    case 'grid':
      return <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
    case 'list':
      return <svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
    case 'plus':
      return <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
    case 'x':
      return <svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
    case 'chevron-left':
      return <svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6" /></svg>
    case 'chevron-right':
      return <svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></svg>
    default:
      return null
  }
})

const APP_LOGO_SVG = (
  <svg viewBox="0 0 140 44" preserveAspectRatio="xMinYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg" className="app-logo-merged">
    <defs>
      <linearGradient id="logo-grad-bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="50%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <linearGradient id="logo-grad-s" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <filter id="logo-glow-merged" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <rect x="0" y="2" width="36" height="36" rx="9" fill="url(#logo-grad-bg)" />
    <path 
      d="M12 18L18 15L24 18V26L18 29L12 26V22L18 25L24 22" 
      stroke="white" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      fill="none"
      opacity="0.95"
    />
    <circle cx="18" cy="22" r="2.25" fill="white" opacity="0.9" />
    <text 
      x="44" 
      y="30" 
      fontFamily="Sora, system-ui, -apple-system, sans-serif" 
      fontSize="26" 
      fontWeight="700"
      letterSpacing="-0.02em"
    >
      <tspan fill="url(#logo-grad-s)">S</tspan><tspan className="logo-text-rest" fill="#374151">killer</tspan>
    </text>
  </svg>
)

interface SidebarProps {
  isCollapsed: boolean
  activeModule: ModuleKey
  onToggleCollapse: () => void
  onModuleChange: (module: ModuleKey) => void
  onOpenUserGuide: () => void
  language: 'zh' | 'en'
  fileSkillsCount: number
  reposCount: number
  tagsCount: number
  projectsCount: number
}

const Sidebar = memo(function Sidebar({
  isCollapsed,
  activeModule,
  onToggleCollapse,
  onModuleChange,
  onOpenUserGuide,
  language,
  fileSkillsCount,
  reposCount,
  tagsCount,
  projectsCount,
}: SidebarProps) {
  const appStamp = t('appStamp', language)
  const [hoveredModule, setHoveredModule] = useState<{ note: string; title: string } | null>(null)

  return (
    <aside className={`sidebar glass-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <button 
        className="sidebar-toggle" 
        onClick={onToggleCollapse}
        title={isCollapsed ? (language === 'zh' ? '展开菜单' : 'Expand') : (language === 'zh' ? '收起菜单' : 'Collapse')}
      >
        <Icon name={isCollapsed ? 'chevron-right' : 'chevron-left'} />
      </button>
      <div className="app-logo">
        <div className="app-logo-mark">
          {APP_LOGO_SVG}
          <div className="app-logo-shine" />
        </div>
        <div className="app-logo-meta" />
      </div>
      
      <nav className="nav-stack">
        {modules.map((item) => {
          const title = language === 'zh' ? item.titleZh : item.titleEn
          const note = language === 'zh' ? item.noteZh : item.noteEn
          let displayTitle = title
          let countDisplay = ''
          if (item.key === 'skills') {
            countDisplay = fileSkillsCount.toString()
          } else if (item.key === 'repos') {
            countDisplay = reposCount.toString()
          } else if (item.key === 'tags') {
            countDisplay = tagsCount.toString()
          } else if (item.key === 'projects') {
            countDisplay = projectsCount.toString()
          }
          return (
            <button
              key={item.key}
              className={activeModule === item.key ? 'nav-item active' : 'nav-item'}
              onClick={() => onModuleChange(item.key)}
              onMouseEnter={() => setHoveredModule({ title, note })}
              onMouseLeave={() => setHoveredModule(null)}
            >
              <span className="nav-icon"><Icon name={item.key} /></span>
              <span className="nav-title">{displayTitle}</span>
              {countDisplay && <span className="nav-count">{countDisplay}</span>}
            </button>
          )
        })}
      </nav>
      
      <div className="nav-footer">
        {!isCollapsed && hoveredModule && (
          <div className="nav-tooltip-bar">
            {/* <div className="nav-tooltip-title">{hoveredModule.title}</div> */}
            <div className="nav-tooltip-note">{hoveredModule.note}</div>
          </div>
        )}
        <button 
          className="nav-user-guide-btn"
          onClick={onOpenUserGuide}
          title={language === 'zh' ? '使用手册' : 'User Guide'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="nav-user-guide-text">{language === 'zh' ? '使用手册' : 'User Guide'}</span>
        </button>

      </div>
    </aside>
  )
})

function App() {
  const { language, theme, setLanguage, setTheme } = useAppStore()
  const { fetchSkills, fetchTags, fetchTagGroups } = useSkillStore()
  const { skills: fileSkills, fetchSkills: fetchFileSkills } = useFileSkillStore()
  const { projects, fetchProjects, createProject } = useProjectStore()
  const { repos, fetchRepos } = useRepoStore()
  const { tree, fetchTree } = useTagTreeStore()
  
  const [activeModule, setActiveModule] = useState<ModuleKey>('overview')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [userGuideOpen, setUserGuideOpen] = useState(false)
  const [openAddRepoDialog, setOpenAddRepoDialog] = useState(false)
  const [pendingRepositoryDetailId, setPendingRepositoryDetailId] = useState<string | null>(null)
  
  const [projectCreateOpen, setProjectCreateOpen] = useState(false)
  const [newProjectPath, setNewProjectPath] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')

  const tagCount = useMemo(() => {
    const countAll = (nodes: typeof tree): number => {
      let count = 0
      for (const node of nodes) {
        count++
        if (node.children.length > 0) {
          count += countAll(node.children)
        }
      }
      return count
    }
    return countAll(tree)
  }, [tree])
  
  const projectCount = projects.length
  
  useEffect(() => {
    if (!isTauriEnvironment()) {
      return
    }

    fetchSkills()
    fetchTags()
    fetchTagGroups()
    fetchProjects()
    fetchRepos()
    fetchTree()
    fetchFileSkills()
  }, [fetchProjects, fetchRepos, fetchSkills, fetchTagGroups, fetchTags, fetchTree, fetchFileSkills])
  
  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  }, [language, theme])

  const handleSelectProjectFolder = async () => {
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

  const handleCreateProject = async () => {
    if (!newProjectPath || !newProjectName) return
    try {
      await createProject(
        newProjectName,
        newProjectPath,
        '.skills',
        newProjectDescription.trim() || undefined,
      )
      setProjectCreateOpen(false)
      setNewProjectPath('')
      setNewProjectName('')
      setNewProjectDescription('')
    } catch (error) {
      console.error('Failed to create project:', error)
    }
  }

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev)
  }, [])

  const handleModuleChange = useCallback((module: ModuleKey) => {
    setActiveModule(module)
  }, [])

  const handleCreateProjectFromOverview = useCallback(() => {
    setProjectCreateOpen(true)
  }, [])

  const handleAddRepo = useCallback(() => {
    setOpenAddRepoDialog(true)
  }, [])

  const handleNavigateToAddRepo = useCallback(() => {
    setActiveModule('repos')
    setOpenAddRepoDialog(true)
  }, [])

  const handleNavigateToRepository = useCallback((repoId: string) => {
    setPendingRepositoryDetailId(repoId)
    setActiveModule('repos')
  }, [])

  const handlePendingRepositoryDetailHandled = useCallback(() => {
    setPendingRepositoryDetailId(null)
  }, [])

  const handleOpenUserGuide = useCallback(() => {
    setUserGuideOpen(true)
  }, [])

  const renderContent = () => {
    switch (activeModule) {
      case 'skills':
        return (
          <SkillProvider>
            <SkillCenter 
              onNavigateToRepository={handleNavigateToRepository}
              onNavigateToAddRepo={handleNavigateToAddRepo}
            />
          </SkillProvider>
        )
      
      case 'projects':
        return (
          <SkillProvider>
            <ProjectsPage />
          </SkillProvider>
        )
      
      case 'repos':
        return (
          <SkillProvider>
            <RepositoryManagementPage 
              onNavigateToSkillCenter={(skillId) => {
                setActiveModule('skills')
              }}
              openAddDialog={openAddRepoDialog}
              onAddDialogClose={() => setOpenAddRepoDialog(false)}
              pendingRepositoryDetailId={pendingRepositoryDetailId}
              onPendingRepositoryDetailHandled={handlePendingRepositoryDetailHandled}
            />
          </SkillProvider>
        )
      
      case 'tags':
        return (
          <div className="content-grid single-grid" style={{ height: '100%' }}>
            <TagGovernancePage />
          </div>
        )
      
      case 'settings':
        return (
          <div className="content-grid single-grid">
            <section className="panel settings-panel">
              <SettingsTabs language={language} setLanguage={setLanguage} theme={theme} setTheme={setTheme} />
            </section>
          </div>
        )
      
      default:
        return (
          <SkillProvider>
            <OverviewPage
              onNavigate={(module) => setActiveModule(module)}
              onCreateProject={handleCreateProjectFromOverview}
              onAddRepo={handleAddRepo}
              onNavigateToRepository={handleNavigateToRepository}
            />
          </SkillProvider>
        )
    }
  }
  
  return (
    <div className="app-shell">
      <div className="desktop-frame">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          activeModule={activeModule}
          onToggleCollapse={handleToggleSidebar}
          onModuleChange={handleModuleChange}
          onOpenUserGuide={handleOpenUserGuide}
          language={language}
          fileSkillsCount={fileSkills.length}
          reposCount={repos.length}
          tagsCount={tagCount}
          projectsCount={projectCount}
        />
        
        <main className="workspace">
          <div className="workspace-grid workspace-full no-rail">
            <section className="stage glass-panel">
              {renderContent()}
            </section>
          </div>
        </main>
      </div>

      {projectCreateOpen && (
        <>
          <div className="pm-overlay" onClick={() => setProjectCreateOpen(false)} />
          <div className="pm-modal">
            <div className="pm-modal-header">
              <h2>{language === 'zh' ? '新建项目' : 'New Project'}</h2>
              <button className="pm-modal-close" onClick={() => setProjectCreateOpen(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="pm-modal-body">
              <div 
                className="pm-dropzone"
                onClick={handleSelectProjectFolder}
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
              <button className="pm-btn-ghost" onClick={() => setProjectCreateOpen(false)}>
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

      <SkillMarkdownPreview
        isOpen={userGuideOpen}
        onClose={() => setUserGuideOpen(false)}
        skillName={language === 'zh' ? '使用手册' : 'User Guide'}
        content={language === 'zh' ? USER_GUIDE_CONTENT : USER_GUIDE_CONTENT_EN}
        title={language === 'zh' ? '使用手册' : 'User Guide'}
        icon="book"
      />

      {activeModule !== 'repos' && (
        <RepositoryAddDialog
          isOpen={openAddRepoDialog}
          onClose={() => setOpenAddRepoDialog(false)}
        />
      )}
    </div>
  )
}

export default App
