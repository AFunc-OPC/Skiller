import { useMemo, useState, useEffect, useRef } from 'react'
import { useFileSkillStore } from '../stores/fileSkillStore'
import { useProjectStore } from '../stores/projectStore'
import { useRepoStore } from '../stores/repoStore'
import { useTagTreeStore } from '../stores/tagTreeStore'
import { useAppStore } from '../stores/appStore'
import { useRepositoryStore } from '../stores/repositoryStore'
import { useSkillContext } from '../contexts/SkillContext'
import { ImportDropdown } from '../components/SkillCenter/ImportDropdown'
import { FileImportDialog } from '../components/SkillCenter/FileImportDialog'
import { NpxImportDialog } from '../components/SkillCenter/NpxImportDialog'
import { NpxFindDialog } from '../components/SkillCenter/NpxFindDialog'
import { RepositorySelectDialog } from '../components/SkillCenter/RepositorySelectDialog'
import { invoke } from '../api/tauri'

interface OverviewPageProps {
  onNavigate: (module: 'skills' | 'projects' | 'repos' | 'tags' | 'settings') => void
  onCreateProject: () => void
  onAddRepo: () => void
  onNavigateToRepository?: (repoId: string) => void
}

function StatCard({
  value,
  label,
  detail,
  status,
  onClick
}: {
  value: number | string
  label: string
  detail: string
  status?: 'success' | 'warning' | 'error'
  onClick?: () => void
}) {
  return (
    <button className={`ov-stat-card ${status ? `ov-stat-${status}` : ''}`} onClick={onClick}>
      <div className="ov-stat-main">
        <span className="ov-stat-value">{value}</span>
        <span className="ov-stat-label">{label}</span>
      </div>
      <span className="ov-stat-detail">{detail}</span>
    </button>
  )
}

function ActionCard({
  icon,
  title,
  description,
  onClick,
  accent
}: {
  icon: React.ReactNode
  title: string
  description: string
  onClick?: () => void
  accent: 'mint' | 'ink' | 'amber' | 'violet'
}) {
  return (
    <button className={`ov-action-card ov-accent-${accent}`} onClick={onClick}>
      <div className="ov-action-icon-wrap">
        <div className="ov-action-icon">{icon}</div>
        <div className="ov-action-icon-glow" />
      </div>
      <div className="ov-action-content">
        <h3 className="ov-action-title">{title}</h3>
        <p className="ov-action-desc">{description}</p>
      </div>
      <div className="ov-action-arrow">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </button>
  )
}

export function OverviewPage({ onNavigate, onCreateProject, onAddRepo, onNavigateToRepository }: OverviewPageProps) {
  const { language } = useAppStore()
  const { skills: fileSkills } = useFileSkillStore()
  const { projects } = useProjectStore()
  const { repos } = useRepoStore()
  const { tree } = useTagTreeStore()

  const {
    importSkillFromFile,
    prepareSkillImportFromNpx,
    confirmSkillImportFromNpx,
    cancelSkillImportFromNpx,
    importSkillFromRepository,
    checkToolAvailability,
    executeNativeNpxSkillsAdd,
    syncToSkiller,
  } = useSkillContext()

  const {
    repositories,
    loading: repositoriesLoading,
    fetchRepositories
  } = useRepositoryStore()

  const [importDialog, setImportDialog] = useState<'file' | 'npxFind' | 'npx' | 'repository' | null>(null)
  const [importMenuOpen, setImportMenuOpen] = useState(false)
  const closeTimerRef = useRef<number | null>(null)

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

  const stats = useMemo(() => {
    const availableCount = fileSkills.filter(s => s.status === 'available').length
    const disabledCount = fileSkills.filter(s => s.status === 'disabled').length
    
    const orphanSkills = fileSkills.filter(s => s.tags.length === 0).length
    
    const syncedRepos = repos.filter(r => r.last_sync).length
    const needsSync = repos.filter(r => !r.last_sync).length

    return {
      availableCount,
      disabledCount,
      orphanSkills,
      syncedRepos,
      needsSync
    }
  }, [fileSkills, repos])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return language === 'zh' ? '早上好' : 'Good Morning'
    if (hour < 18) return language === 'zh' ? '下午好' : 'Good Afternoon'
    return language === 'zh' ? '晚上好' : 'Good Evening'
  }

  const today = new Date()
  const dateStr = today.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const scheduleClose = () => {
    clearCloseTimer()
    closeTimerRef.current = window.setTimeout(() => {
      setImportMenuOpen(false)
    }, 150)
  }

  const handleImportType = (type: 'file' | 'npxFind' | 'npx' | 'repository') => {
    setImportMenuOpen(false)
    if (type === 'file') setImportDialog('file')
    else if (type === 'npxFind') setImportDialog('npxFind')
    else if (type === 'npx') setImportDialog('npx')
    else setImportDialog('repository')
  }

  useEffect(() => {
    return () => clearCloseTimer()
  }, [])

  return (
    <div className="ov-container">
      <section className="ov-hero">
        <div className="ov-hero-bg">
          <div className="ov-hero-gradient" />
          <div className="ov-hero-grid" />
          <div className="ov-hero-glow ov-glow-1" />
          <div className="ov-hero-glow ov-glow-2" />
        </div>
        
        <div className="ov-hero-content">
          <div className="ov-hero-header">
            <div className="ov-greeting-wrap">
              <span className="ov-greeting-eyebrow">{dateStr}</span>
              <h1 className="ov-greeting-title">
                {getGreeting()}
                <span className="ov-greeting-wave">👋</span>
              </h1>
            </div>
          </div>

          <div className="ov-stats-grid">
            <StatCard
              value={fileSkills.length}
              label={language === 'zh' ? '技能' : 'Skills'}
              detail={language === 'zh' 
                ? `${stats.availableCount} 可用 / ${stats.disabledCount} 禁用`
                : `${stats.availableCount} available / ${stats.disabledCount} disabled`
              }
              status={stats.availableCount > 0 ? 'success' : undefined}
              onClick={() => onNavigate('skills')}
            />
            
            <StatCard
              value={projects.length}
              label={language === 'zh' ? '项目' : 'Projects'}
              detail={language === 'zh'
                ? projects.length > 0 
                  ? `${projects.filter(p => p.skill_path).length} 个已配置技能路径`
                  : '暂无项目'
                : projects.length > 0 
                  ? `${projects.filter(p => p.skill_path).length} with skill path`
                  : 'No projects yet'
              }
              status={projects.length > 0 ? 'success' : 'warning'}
              onClick={() => onNavigate('projects')}
            />
            
            <StatCard
              value={tagCount}
              label={language === 'zh' ? '标签' : 'Tags'}
              detail={language === 'zh'
                ? stats.orphanSkills > 0 
                  ? `${stats.orphanSkills} 个技能无标签`
                  : '所有技能已分类'
                : stats.orphanSkills > 0 
                  ? `${stats.orphanSkills} skills without tags`
                  : 'All skills categorized'
              }
              status={stats.orphanSkills > 0 ? 'warning' : 'success'}
              onClick={() => onNavigate('tags')}
            />
            
            <StatCard
              value={`${stats.syncedRepos}/${repos.length}`}
              label={language === 'zh' ? '仓库' : 'Repos'}
              detail={language === 'zh'
                ? stats.needsSync > 0 
                  ? `${stats.needsSync} 个需要同步`
                  : repos.length > 0 
                    ? '全部已同步'
                    : '暂无仓库'
                : stats.needsSync > 0 
                  ? `${stats.needsSync} need sync`
                  : repos.length > 0 
                    ? 'All synced'
                    : 'No repos yet'
              }
              status={stats.needsSync > 0 ? 'warning' : repos.length > 0 ? 'success' : undefined}
              onClick={() => onNavigate('repos')}
            />
          </div>
        </div>
      </section>

      <section className="ov-actions-section">
        <div className="ov-section-header">
          <h2 className="ov-section-title">
            {language === 'zh' ? '快速开始' : 'Quick Actions'}
          </h2>
          <p className="ov-section-subtitle">
            {language === 'zh' ? '管理你的技能库' : 'Manage your skill library'}
          </p>
        </div>

        <div className="ov-actions-grid">
          <div 
            className="ov-action-import-wrap"
            onMouseEnter={() => {
              clearCloseTimer()
              setImportMenuOpen(true)
            }}
            onMouseLeave={scheduleClose}
          >
            <button
              type="button"
              className="ov-action-card ov-action-import-card ov-accent-mint"
              onClick={() => setImportMenuOpen(true)}
            >
              <div className="ov-action-icon-wrap">
                <div className="ov-action-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="ov-action-icon-glow" />
              </div>
              <div className="ov-action-content">
                <h3 className="ov-action-title">{language === 'zh' ? '导入技能' : 'Import Skill'}</h3>
                <p className="ov-action-desc">{language === 'zh' ? '从本地文件或 NPX 导入新技能' : 'Import from local file or NPX command'}</p>
              </div>
              <div className="ov-action-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </button>

            {importMenuOpen && (
              <div className="ov-import-dropdown">
                <ImportDropdown onSelect={handleImportType} language={language} />
              </div>
            )}
          </div>

          <ActionCard
            accent="ink"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title={language === 'zh' ? '新建项目' : 'New Project'}
            description={language === 'zh' ? '添加项目并配置技能路径' : 'Add project and configure skill path'}
            onClick={onCreateProject}
          />

          <ActionCard
            accent="amber"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 3v12M18 9a3 3 0 100 6 3 3 0 000-6zM6 21a3 3 0 100-6 3 3 0 000 6z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18 12a9 9 0 00-9-9" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 6a3 3 0 013 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title={language === 'zh' ? '添加仓库' : 'Add Repository'}
            description={language === 'zh' ? '连接在线技能仓库' : 'Connect online skill repository'}
            onClick={onAddRepo}
          />

          <ActionCard
            accent="violet"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title={language === 'zh' ? '管理标签' : 'Manage Tags'}
            description={language === 'zh' ? '组织和分类你的技能' : 'Organize and categorize skills'}
            onClick={() => onNavigate('tags')}
          />
        </div>
      </section>

      <FileImportDialog
        isOpen={importDialog === 'file'}
        onClose={() => setImportDialog(null)}
        onImport={importSkillFromFile}
      />

      <NpxImportDialog
        isOpen={importDialog === 'npx'}
        onClose={() => setImportDialog(null)}
        onPrepareImport={prepareSkillImportFromNpx}
        onConfirmImport={confirmSkillImportFromNpx}
        onCancelImport={cancelSkillImportFromNpx}
        onExecuteNative={executeNativeNpxSkillsAdd}
        onSyncToSkiller={syncToSkiller}
        checkTools={checkToolAvailability}
      />

      <RepositorySelectDialog
        isOpen={importDialog === 'repository'}
        onClose={() => setImportDialog(null)}
        onImport={importSkillFromRepository}
        repositories={repositories}
        loading={repositoriesLoading}
        onLoadRepositories={fetchRepositories}
        onNavigateToRepository={onNavigateToRepository}
        onAddRepository={onAddRepo}
      />

      <NpxFindDialog
        isOpen={importDialog === 'npxFind'}
        onClose={() => setImportDialog(null)}
        onSearchApi={async (keyword: string) => {
          try {
            const result = await invoke<{ success: boolean; skills: Array<{ name: string; description: string; repo: string; author: string; install_command: string; link: string; installs: number }>; error?: string }>('search_skills_sh_api', { keyword })
            return {
              success: result.success,
              skills: result.skills.map(s => ({
                name: s.name,
                description: s.description,
                repo: s.repo,
                author: s.author,
                install_command: s.install_command,
                link: s.link,
                installs: s.installs,
              })),
              error: result.error,
            }
          } catch (err) {
            return {
              success: false,
              skills: [],
              error: err instanceof Error ? err.message : String(err),
            }
          }
        }}
        onExecuteFind={async (keyword, requestId) => {
          try {
            const result = await invoke<{ success: boolean; skills: Array<{ name: string; description: string; repo: string; author: string; install_command: string; link: string; installs: number }>; error?: string }>('execute_npx_skills_find', { keyword, requestId })
            return {
              success: result.success,
              skills: result.skills.map(s => ({
                name: s.name,
                description: s.description,
                repo: s.repo,
                author: s.author,
                install_command: s.install_command,
                link: s.link,
                installs: s.installs,
              })),
              error: result.error,
            }
          } catch (err) {
            return {
              success: false,
              skills: [],
              error: err instanceof Error ? err.message : String(err),
            }
          }
        }}
        onPrepareImport={prepareSkillImportFromNpx}
        onConfirmImport={confirmSkillImportFromNpx}
        onCancelImport={cancelSkillImportFromNpx}
        checkNpx={async () => {
          const tools = await checkToolAvailability()
          return tools.npx
        }}
      />
    </div>
  )
}
