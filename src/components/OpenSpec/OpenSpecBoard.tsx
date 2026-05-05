import { useEffect, useCallback, useState, useRef } from 'react'
import { ArrowLeft, RefreshCw, Settings, FolderOpen, Copy, Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useOpenSpecStore } from '../../stores/openspecStore'
import { useAppStore } from '../../stores/appStore'
import { ChangesList } from './ChangesList'
import { WorkflowTimeline } from './WorkflowTimeline'
import { ArtifactPreview } from './ArtifactPreview'
import { CliInstallPrompt } from './CliInstallPrompt'
import { OpenSpecSettingsDialog } from './OpenSpecSettingsDialog'
import { OpenSpecInitDialog } from './OpenSpecInitDialog'
import { OpenSpecSuspendButton } from './OpenSpecSuspendButton'
import { SuspendedBoardItem } from './OpenSpecSuspendedSidebar'
import { desktopApi } from '../../api/desktop'
import type { Project, OpenSpecChangeInfo, OpenSpecBoardSettings, SuspendedOpenSpecBoard } from '../../types'
import './OpenSpec.css'

interface OpenSpecBoardProps {
  project: Project
  onBack: () => void
  onSwitchProject?: (projectId: string) => void
  initialState?: {
    selectedChangeId?: string | null
    settings?: OpenSpecBoardSettings
  }
}

export function OpenSpecBoard({ project, onBack, onSwitchProject, initialState }: OpenSpecBoardProps) {
  const { language, suspendedBoards, suspendOpenSpecBoard, removeSuspendedBoard } = useAppStore()
  const {
    getProjectState,
    setCurrentProject,
    fetchAllChanges,
    selectChange,
    checkOpenSpecDirectory,
    initOpenSpec,
    refresh,
    resetProject,
    loadSettings,
    saveSettings,
    pauseAutoRefresh,
    resumeAutoRefresh,
    cliStatus,
  } = useOpenSpecStore()
  
  const projectState = getProjectState(project.id)
  const {
    changes,
    archivedChanges,
    selectedChangeId,
    loading,
    error,
    hasOpenSpecDirectory,
    initialized,
    settings,
    initLoading,
    initError,
    isPaused,
  } = projectState
  
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [initDialogDismissed, setInitDialogDismissed] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [copied, setCopied] = useState(false)
  const [projectSidebarCollapsed, setProjectSidebarCollapsed] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)
  const isSwitchingProjectRef = useRef(false)

  const handleCopyPath = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(project.path)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }, [project.path])

  const handleOpenFolder = useCallback(async () => {
    try {
      await desktopApi.openFolder(project.path)
    } catch (error) {
      console.error('Failed to open folder:', error)
    }
  }, [project.path])

  useEffect(() => {
    const init = async () => {
      setCurrentProject(project.id)
      await checkOpenSpecDirectory(project.id, project.path)
      if (initialState?.settings) {
        await loadSettings(project.id)
        await new Promise(resolve => setTimeout(resolve, 0))
        if (initialState.selectedChangeId !== undefined) {
          selectChange(project.id, initialState.selectedChangeId)
        }
      } else {
        await loadSettings(project.id)
      }
      if (initialState?.settings || initialState?.selectedChangeId !== undefined) {
        resumeAutoRefresh(project.id)
      }
    }
    init()
    
    return () => {
      if (!isSwitchingProjectRef.current) {
        resetProject(project.id)
        setInitDialogDismissed(false)
      }
      if (timerRef.current) clearInterval(timerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [project.path, project.id])

  useEffect(() => {
    if (hasOpenSpecDirectory && !initialized) {
      fetchAllChanges(project.id, project.path)
    }
  }, [hasOpenSpecDirectory, initialized, project.id, project.path])
  
  useEffect(() => {
    if (settings.autoRefreshInterval > 0 && !loading && initialized && !isPaused) {
      timerRef.current = setInterval(() => {
        refresh(project.id, project.path)
      }, settings.autoRefreshInterval * 1000)
      
      setCountdown(settings.autoRefreshInterval)
      countdownRef.current = setInterval(() => {
        setCountdown(c => c > 0 ? c - 1 : settings.autoRefreshInterval)
      }, 1000)
      
      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
        if (countdownRef.current) clearInterval(countdownRef.current)
      }
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
      setCountdown(0)
    }
  }, [settings.autoRefreshInterval, project.id, project.path, loading, initialized, isPaused])

  const allChanges = [...changes, ...archivedChanges]
  const selectedChange = allChanges.find((c) => c.name === selectedChangeId)
  const isSelectedChangeArchived = selectedChange ? archivedChanges.some((c) => c.name === selectedChange.name) : false

  const handleRefresh = useCallback(() => {
    refresh(project.id, project.path)
  }, [refresh, project.id, project.path])

  const handleSelectChange = useCallback((changeId: string) => {
    selectChange(project.id, changeId)
  }, [project.id, selectChange])
  
  const handleSaveSettings = useCallback((newSettings: OpenSpecBoardSettings) => {
    saveSettings(project.id, newSettings)
  }, [project.id, saveSettings])

  const handleInit = useCallback(async (tools: string[]) => {
    await initOpenSpec(project.id, project.path, tools)
  }, [project.id, project.path, initOpenSpec])

  const handleInitClose = useCallback(() => {
    setInitDialogDismissed(true)
    resetProject(project.id)
  }, [project.id, resetProject])

  const handleBack = useCallback(() => {
    isSwitchingProjectRef.current = true
    suspendOpenSpecBoard(
      {
        id: project.id,
        name: project.name,
        path: project.path,
        icon: project.icon,
      },
      {
        selectedChangeId,
        settings,
      }
    )
    pauseAutoRefresh(project.id)
    onBack()
  }, [project.id, project.name, project.path, project.icon, selectedChangeId, settings, suspendOpenSpecBoard, pauseAutoRefresh, onBack])

  const handleExit = useCallback(() => {
    removeSuspendedBoard(project.id)
    pauseAutoRefresh(project.id)
    onBack()
  }, [project.id, removeSuspendedBoard, pauseAutoRefresh, onBack])

  const handleSuspend = useCallback(() => {
    isSwitchingProjectRef.current = true
    onBack()
  }, [onBack])

  const handleSwitchProject = useCallback((projectId: string) => {
    if (onSwitchProject && projectId !== project.id) {
      isSwitchingProjectRef.current = true
      suspendOpenSpecBoard(
        {
          id: project.id,
          name: project.name,
          path: project.path,
          icon: project.icon,
        },
        {
          selectedChangeId,
          settings,
        }
      )
      pauseAutoRefresh(project.id)
      onSwitchProject(projectId)
    }
  }, [onSwitchProject, project.id, project.name, project.path, project.icon, selectedChangeId, settings, suspendOpenSpecBoard, pauseAutoRefresh])

  const currentBoard: SuspendedOpenSpecBoard = {
    projectId: project.id,
    projectName: project.name,
    projectIcon: project.icon,
    projectPath: project.path,
    suspendedAt: Date.now(),
    state: {
      selectedChangeId,
      settings,
    },
  }

  const allBoards = suspendedBoards.some(b => b.projectId === project.id)
    ? suspendedBoards.map(board => board.projectId === project.id ? currentBoard : board)
    : [currentBoard, ...suspendedBoards]

  if (!cliStatus?.installed) {
    const isSuspended = suspendedBoards.some(b => b.projectId === project.id)
    
    return (
      <div className="os-board">
        <div className="os-header">
          {/* <button className="os-back-btn" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4" />
            <span>{language === 'zh' ? '返回' : 'Back'}</span>
          </button> */}
          <button className="os-exit-btn" onClick={handleExit}>
            <X className="w-4 h-4" />
            <span>{language === 'zh' ? '退出' : 'Exit'}</span>
          </button>
          <OpenSpecSuspendButton
            project={project}
            selectedChangeId={selectedChangeId}
            settings={settings}
            onSuspend={handleSuspend}
            isSuspended={isSuspended}
          />
          <div className="os-title">
            <h1>{project.name} - {language === 'zh' ? 'OpenSpec 看板' : 'OpenSpec Board'}</h1>
            <div className="os-title-path-row">
              <code className="os-title-path">{project.path}</code>
              <div className="os-title-path-actions">
                <button
                  onClick={handleCopyPath}
                  className={copied ? 'os-action-copied' : ''}
                  title={language === 'zh' ? '复制路径' : 'Copy path'}
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={handleOpenFolder}
                  title={language === 'zh' ? '打开文件夹' : 'Open folder'}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="os-content">
          <CliInstallPrompt language={language} />
        </div>
      </div>
    )
  }

  const isSuspended = suspendedBoards.some(b => b.projectId === project.id)
  
  return (
    <div className="os-board">
      <div className="os-header">
        {/* <button className="os-back-btn" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4" />
          <span>{language === 'zh' ? '返回' : 'Back'}</span>
        </button> */}
        <button className="os-exit-btn" onClick={handleExit}>
          <X className="w-4 h-4" />
          <span>{language === 'zh' ? '退出' : 'Exit'}</span>
        </button>
        <OpenSpecSuspendButton
          project={project}
          selectedChangeId={selectedChangeId}
          settings={settings}
          onSuspend={handleSuspend}
          isSuspended={isSuspended}
        />
        <div className="os-title">
          <h1>{project.name} - {language === 'zh' ? 'OpenSpec 看板' : 'OpenSpec Board'}</h1>
          <div className="os-title-path-row">
            <code className="os-title-path">{project.path}</code>
            <div className="os-title-path-actions">
              <button
                onClick={handleCopyPath}
                className={copied ? 'os-action-copied' : ''}
                title={language === 'zh' ? '复制路径' : 'Copy path'}
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={handleOpenFolder}
                title={language === 'zh' ? '打开文件夹' : 'Open folder'}
              >
                <FolderOpen className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
        <div className="os-header-actions">
          <div className="os-cli-status">
            <span className="os-cli-indicator installed" />
            <span className="os-cli-version">{cliStatus.version || 'OpenSpec'}</span>
          </div>
          <button
            className={`os-refresh-btn ${loading ? 'is-loading' : ''}`}
            onClick={handleRefresh}
            disabled={loading}
            title={language === 'zh' ? '刷新' : 'Refresh'}
          >
            <RefreshCw className="w-4 h-4" />
            {countdown > 0 && !loading && (
              <span className="os-countdown-badge">{countdown}s</span>
            )}
          </button>
          <button
            className="os-refresh-btn"
            onClick={() => setSettingsDialogOpen(true)}
            title={language === 'zh' ? '设置' : 'Settings'}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="os-content">
        {loading && (
          <div className="os-loading-overlay">
            <div className="os-loading-spinner">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span>{language === 'zh' ? '加载中...' : 'Loading...'}</span>
            </div>
          </div>
        )}
        <aside className={`os-sidebar ${loading ? 'os-content-loading' : ''}`}>
          <ChangesList
            changes={changes}
            archivedChanges={archivedChanges}
            selectedChangeId={selectedChangeId}
            loading={loading}
            error={error}
            onSelectChange={handleSelectChange}
            projectPath={project.path}
            language={language}
          />
        </aside>

        <main className={`os-main ${loading ? 'os-content-loading' : ''}`}>
          {selectedChange ? (
            <>
              <WorkflowTimeline
                currentStage={selectedChange.currentStage}
                completedTasks={selectedChange.completedTasks}
                totalTasks={selectedChange.totalTasks}
                artifacts={selectedChange.artifacts}
                status={selectedChange.status}
                language={language}
                isArchived={isSelectedChangeArchived}
              />
              <ArtifactPreview
                key={`${selectedChange.name}-${selectedChange.lastModified}`}
                projectId={project.id}
                projectPath={project.path}
                changeId={selectedChange.name}
                change={selectedChange}
                artifacts={selectedChange.artifacts}
                language={language}
              />
            </>
          ) : (
            <div className="os-empty-main">
              <p>
                {language === 'zh'
                  ? '选择一个变更查看详情'
                  : 'Select a change to view details'}
              </p>
            </div>
          )}
        </main>

        {allBoards.length > 1 && (
          <aside className={`os-board-sidebar ${projectSidebarCollapsed ? 'collapsed' : ''}`}>
            <div className="os-board-sidebar-content">
              <div className="os-board-sidebar-header">
                <span>{language === 'zh' ? '项目' : 'Projects'}</span>
                <span className="os-board-sidebar-count">{allBoards.length}</span>
              </div>
              <div className="os-board-sidebar-list">
                {allBoards.map(board => (
                  <SuspendedBoardItem
                    key={board.projectId}
                    board={board}
                    isActive={board.projectId === project.id}
                    onClick={() => handleSwitchProject(board.projectId)}
                  />
                ))}
              </div>
            </div>
            <button
              className="os-board-sidebar-toggle"
              onClick={() => setProjectSidebarCollapsed(c => !c)}
              title={projectSidebarCollapsed 
                ? (language === 'zh' ? '展开' : 'Expand')
                : (language === 'zh' ? '收起' : 'Collapse')
              }
            >
              {projectSidebarCollapsed ? (
                <ChevronLeft className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </aside>
        )}
      </div>
      
      <OpenSpecSettingsDialog
        isOpen={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
        language={language}
      />

      <OpenSpecInitDialog
        isOpen={!hasOpenSpecDirectory && cliStatus?.installed === true && !initDialogDismissed}
        onClose={handleInitClose}
        onInit={handleInit}
        loading={initLoading}
        error={initError}
        language={language}
      />
    </div>
  )
}
