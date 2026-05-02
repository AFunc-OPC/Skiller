import { useEffect, useCallback } from 'react'
import { ArrowLeft, RefreshCw, CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { useOpenSpecStore } from '../../stores/openspecStore'
import { useAppStore } from '../../stores/appStore'
import { ChangesList } from './ChangesList'
import { CliInstallPrompt } from './CliInstallPrompt'
import type { Project } from '../../types'
import './OpenSpec.css'

interface OpenSpecBoardProps {
  project: Project
  onBack: () => void
}

export function OpenSpecBoard({ project, onBack }: OpenSpecBoardProps) {
  const { language } = useAppStore()
  const {
    changes,
    selectedChangeId,
    cliStatus,
    loading,
    error,
    fetchChanges,
    selectChange,
    checkCli,
    refresh,
  } = useOpenSpecStore()

  useEffect(() => {
    checkCli()
  }, [checkCli])

  useEffect(() => {
    if (cliStatus?.installed) {
      fetchChanges(project.path)
    }
  }, [cliStatus?.installed, fetchChanges, project.path])

  const selectedChange = changes.find((c) => c.name === selectedChangeId)

  const handleRefresh = useCallback(() => {
    refresh(project.path)
  }, [refresh, project.path])

  const handleSelectChange = useCallback((changeId: string) => {
    selectChange(changeId)
  }, [selectChange])

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
            className="os-refresh-btn"
            onClick={handleRefresh}
            disabled={loading}
            title={language === 'zh' ? '刷新' : 'Refresh'}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="os-content">
        <aside className="os-sidebar">
          <ChangesList
            changes={changes}
            selectedChangeId={selectedChangeId}
            loading={loading}
            error={error}
            onSelectChange={handleSelectChange}
            projectPath={project.path}
            language={language}
          />
        </aside>

        <main className="os-main">
          {selectedChange ? (
            <div className="os-change-detail">
              <div className="os-detail-header">
                <h2 className="os-detail-title">{selectedChange.name}</h2>
                <div className="os-detail-status">
                  {selectedChange.status === 'complete' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : selectedChange.status === 'in-progress' ? (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                  <span className={`os-status-label os-status-${selectedChange.status}`}>
                    {selectedChange.status === 'complete' 
                      ? (language === 'zh' ? '已完成' : 'Complete')
                      : selectedChange.status === 'in-progress'
                        ? (language === 'zh' ? '进行中' : 'In Progress')
                        : (language === 'zh' ? '无任务' : 'No Tasks')}
                  </span>
                </div>
              </div>

              <div className="os-detail-progress">
                <div className="os-progress-header">
                  <span className="os-progress-label">
                    {language === 'zh' ? '任务进度' : 'Task Progress'}
                  </span>
                  <span className="os-progress-value">
                    {selectedChange.completedTasks} / {selectedChange.totalTasks}
                  </span>
                </div>
                <div className="os-progress-bar">
                  <div 
                    className="os-progress-fill"
                    style={{ 
                      width: `${selectedChange.totalTasks > 0 
                        ? (selectedChange.completedTasks / selectedChange.totalTasks) * 100 
                        : 0}%` 
                    }}
                  />
                </div>
              </div>

              <div className="os-detail-meta">
                <div className="os-meta-item">
                  <span className="os-meta-label">
                    {language === 'zh' ? '最后修改' : 'Last Modified'}
                  </span>
                  <span className="os-meta-value">
                    {new Date(selectedChange.lastModified).toLocaleString(
                      language === 'zh' ? 'zh-CN' : 'en-US'
                    )}
                  </span>
                </div>
              </div>
            </div>
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
    </div>
  )
}
