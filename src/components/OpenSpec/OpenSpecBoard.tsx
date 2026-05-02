import { useEffect, useCallback } from 'react'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useOpenSpecStore } from '../../stores/openspecStore'
import { useAppStore } from '../../stores/appStore'
import { ChangesList } from './ChangesList'
import { WorkflowTimeline } from './WorkflowTimeline'
import { ArtifactPreview } from './ArtifactPreview'
import { ActionButtons } from './ActionButtons'
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
    hasOpenSpecDirectory,
    fetchChanges,
    selectChange,
    checkCli,
    checkOpenSpecDirectory,
    refresh,
  } = useOpenSpecStore()

  useEffect(() => {
    checkCli()
    checkOpenSpecDirectory(project.path)
  }, [checkCli, checkOpenSpecDirectory, project.path])

  useEffect(() => {
    if (cliStatus?.installed) {
      fetchChanges(project.path)
    }
  }, [cliStatus?.installed, fetchChanges, project.path])

  const selectedChange = changes.find((c) => c.id === selectedChangeId)

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
            <>
              <WorkflowTimeline
                currentStage={selectedChange.currentStage}
                language={language}
              />
              <ArtifactPreview
                projectPath={project.path}
                changeId={selectedChange.id}
                artifacts={selectedChange.artifacts}
                language={language}
              />
              <ActionButtons
                projectPath={project.path}
                change={selectedChange}
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
    </div>
  )
}
