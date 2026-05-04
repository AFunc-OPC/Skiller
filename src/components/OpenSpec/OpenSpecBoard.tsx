import { useEffect, useCallback, useState, useRef } from 'react'
import { ArrowLeft, RefreshCw, Settings } from 'lucide-react'
import { useOpenSpecStore } from '../../stores/openspecStore'
import { useAppStore } from '../../stores/appStore'
import { ChangesList } from './ChangesList'
import { WorkflowTimeline } from './WorkflowTimeline'
import { ArtifactPreview } from './ArtifactPreview'
import { CliInstallPrompt } from './CliInstallPrompt'
import { OpenSpecSettingsDialog } from './OpenSpecSettingsDialog'
import type { Project, OpenSpecChangeInfo, OpenSpecBoardSettings } from '../../types'
import './OpenSpec.css'

interface OpenSpecBoardProps {
  project: Project
  onBack: () => void
}

export function OpenSpecBoard({ project, onBack }: OpenSpecBoardProps) {
  const { language } = useAppStore()
  const {
    changes,
    archivedChanges,
    selectedChangeId,
    cliStatus,
    loading,
    error,
    hasOpenSpecDirectory,
    initialized,
    settings,
    fetchAllChanges,
    selectChange,
    checkOpenSpecDirectory,
    refresh,
    reset,
    loadSettings,
    saveSettings,
  } = useOpenSpecStore()
  
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    checkOpenSpecDirectory(project.path)
    loadSettings(project.id)
    
    return () => {
      reset()
      if (timerRef.current) clearInterval(timerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [project.path, project.id])

  useEffect(() => {
    if (hasOpenSpecDirectory && !initialized) {
      fetchAllChanges(project.path)
    }
  }, [hasOpenSpecDirectory, initialized, project.path])
  
  useEffect(() => {
    if (settings.autoRefreshInterval > 0 && !loading) {
      timerRef.current = setInterval(() => {
        refresh(project.path)
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
  }, [settings.autoRefreshInterval, project.path, loading])

  const allChanges = [...changes, ...archivedChanges]
  const selectedChange = allChanges.find((c) => c.name === selectedChangeId)
  const isSelectedChangeArchived = selectedChange ? archivedChanges.some((c) => c.name === selectedChange.name) : false

  const handleRefresh = useCallback(() => {
    refresh(project.path)
  }, [refresh, project.path])

  const handleSelectChange = useCallback((changeId: string) => {
    selectChange(changeId)
  }, [selectChange])
  
  const handleSaveSettings = useCallback((newSettings: OpenSpecBoardSettings) => {
    saveSettings(project.id, newSettings)
  }, [project.id, saveSettings])

  if (!cliStatus?.installed) {
    return (
      <div className="os-board">
        <div className="os-header">
          <button className="os-back-btn" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
            <span>{language === 'zh' ? '返回' : 'Back'}</span>
          </button>
          <h1 className="os-title">
            {project.name} - {language === 'zh' ? 'OpenSpec 看板' : 'OpenSpec Board'}
          </h1>
        </div>
        <div className="os-content">
          <CliInstallPrompt language={language} />
        </div>
      </div>
    )
  }

  return (
    <div className="os-board">
      <div className="os-header">
        <button className="os-back-btn" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
          <span>{language === 'zh' ? '返回' : 'Back'}</span>
        </button>
        <h1 className="os-title">
          {project.name} - {language === 'zh' ? 'OpenSpec 看板' : 'OpenSpec Board'}
        </h1>
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
      </div>
      
      <OpenSpecSettingsDialog
        isOpen={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
        language={language}
      />
    </div>
  )
}
