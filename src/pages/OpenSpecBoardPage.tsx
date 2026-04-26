import { useEffect, useState, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { desktopApi } from '../api/desktop'
import { OpenSpecTerminalPanel } from '../components/OpenSpec/OpenSpecTerminalPanel'
import { useAppStore } from '../stores/appStore'
import { useOpenSpecStore } from '../stores/openspecStore'
import type { OpenSpecDocumentPreview, Project } from '../types'

type ChangeFilter = 'active' | 'archived' | 'all'
type ArtifactTab = 'overview' | 'proposal' | 'design' | 'tasks' | 'specs'

interface OpenSpecBoardPageProps {
  project: Project
  onBack: () => void
}

function getTerminalButtonLabel(language: 'zh' | 'en'): string {
  return language === 'zh' ? '打开 OpenSpec 终端' : 'Open OpenSpec Terminal'
}

export function OpenSpecBoardPage({ project, onBack }: OpenSpecBoardPageProps) {
  const { language } = useAppStore()
  const {
    snapshot,
    selectedChangeId,
    currentDetail,
    currentSpecDocument,
    loading,
    error,
    selectChange,
    fetchSnapshot,
    fetchDetail,
    fetchSpecDocument,
    clear,
  } = useOpenSpecStore()
  const [changeFilter, setChangeFilter] = useState<ChangeFilter>('active')
  const [activeArtifact, setActiveArtifact] = useState<ArtifactTab>('overview')
  const [selectedSpecPath, setSelectedSpecPath] = useState<string | null>(null)
  const [terminalOpen, setTerminalOpen] = useState(false)

  useEffect(() => {
    clear()
    setChangeFilter('active')
    setActiveArtifact('overview')
    setSelectedSpecPath(null)
    setTerminalOpen(false)
    void fetchSnapshot(project.id)

    return () => {
      clear()
    }
  }, [clear, fetchSnapshot, project.id])

  useEffect(() => {
    const handleFocus = () => {
      void fetchSnapshot(project.id)
    }

    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchSnapshot, project.id])

  useEffect(() => {
    if (snapshot?.state !== 'ready' || !selectedChangeId) {
      return
    }

    if (currentDetail?.change.id === selectedChangeId) {
      return
    }

    void fetchDetail(project.id, selectedChangeId)
  }, [currentDetail?.change.id, fetchDetail, project.id, selectedChangeId, snapshot?.state])

  useEffect(() => {
    setSelectedSpecPath(null)
  }, [currentDetail?.change.id])

  const getFilterLabel = (filter: ChangeFilter) => {
    if (language === 'zh') {
      if (filter === 'active') {
        return '进行中'
      }

      if (filter === 'archived') {
        return '已归档'
      }

      return '全部'
    }

    if (filter === 'active') {
      return 'Active'
    }

    if (filter === 'archived') {
      return 'Archived'
    }

    return 'All'
  }

  const getTaskProgressLabel = (completed: number, total: number) => {
    return language === 'zh'
      ? `${completed}/${total} 个任务`
      : `${completed}/${total} tasks`
  }

  const getValidationLabel = (message: string | null | undefined) => {
    return message ?? (language === 'zh' ? '无风险提示' : 'No validation warnings')
  }

  const getArtifactLabel = (tab: ArtifactTab) => {
    if (tab === 'overview') {
      return 'Overview'
    }

    return tab.charAt(0).toUpperCase() + tab.slice(1)
  }

  const getMissingArtifactLabel = (tab: Exclude<ArtifactTab, 'overview' | 'specs'>) => {
    if (language === 'zh') {
      if (tab === 'proposal') {
        return '当前 change 没有 proposal 文档。'
      }

      if (tab === 'design') {
        return '当前 change 没有 design 文档。'
      }

      return '当前 change 没有 tasks 文档。'
    }

    if (tab === 'proposal') {
      return 'This change does not have a proposal document.'
    }

    if (tab === 'design') {
      return 'This change does not have a design document.'
    }

    return 'This change does not have a tasks document.'
  }

  const renderMarkdownPreview = (
    document: OpenSpecDocumentPreview | null,
    emptyState: string,
  ): ReactNode => {
    if (!document) {
      return <p>{emptyState}</p>
    }

    return (
      <div className="osb-artifact-preview">
        <div className="osb-artifact-actions">
          <button type="button" onClick={() => void desktopApi.openPath(document.path)}>
            {language === 'zh' ? '打开原文件' : 'Open Original File'}
          </button>
        </div>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{document.content}</ReactMarkdown>
      </div>
    )
  }

  const renderArtifactPanel = (): ReactNode => {
    if (!currentDetail) {
      return <p>{language === 'zh' ? '当前没有已加载的 change 详情。' : 'No change detail is loaded yet.'}</p>
    }

    if (activeArtifact === 'overview') {
      return (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {currentDetail.overview_markdown}
        </ReactMarkdown>
      )
    }

    if (activeArtifact === 'proposal') {
      return renderMarkdownPreview(currentDetail.proposal, getMissingArtifactLabel('proposal'))
    }

    if (activeArtifact === 'design') {
      return renderMarkdownPreview(currentDetail.design, getMissingArtifactLabel('design'))
    }

    if (activeArtifact === 'tasks') {
      return renderMarkdownPreview(currentDetail.tasks, getMissingArtifactLabel('tasks'))
    }

    return (
      <div className="osb-specs-layout">
        <aside className="osb-specs-tree">
          {currentDetail.specs.length === 0 ? (
            <p>{language === 'zh' ? '当前 change 没有 spec 文档。' : 'This change does not have any spec documents.'}</p>
          ) : (
            currentDetail.specs.map((spec) => (
              <button
                key={spec.path}
                type="button"
                aria-pressed={selectedSpecPath === spec.path}
                className={selectedSpecPath === spec.path ? 'active' : undefined}
                onClick={() => {
                  setSelectedSpecPath(spec.path)
                  void fetchSpecDocument(project.id, currentDetail.change.id, spec.path)
                }}
              >
                {spec.title}
              </button>
            ))
          )}
        </aside>
        <section className="osb-spec-preview">
          {currentSpecDocument ? (
            <div className="osb-artifact-preview">
              <div className="osb-artifact-actions">
                <button type="button" onClick={() => void desktopApi.openPath(currentSpecDocument.path)}>
                  {language === 'zh' ? '打开原文件' : 'Open Original File'}
                </button>
              </div>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentSpecDocument.content}</ReactMarkdown>
            </div>
          ) : (
            <p>{language === 'zh' ? '请选择一个 spec 文件' : 'Select a spec document to preview.'}</p>
          )}
        </section>
      </div>
    )
  }

  const getEmptyListLabel = (filter: ChangeFilter) => {
    if (language === 'zh') {
      if (filter === 'active') {
        return '当前没有进行中的 changes。'
      }

      if (filter === 'archived') {
        return '当前没有已归档的 changes。'
      }

      return '当前没有可显示的 changes。'
    }

    if (filter === 'active') {
      return 'There are no active changes right now.'
    }

    if (filter === 'archived') {
      return 'There are no archived changes right now.'
    }

    return 'There are no changes to display right now.'
  }

  let content: ReactNode

  if (loading) {
    content = (
      <div className="osb-empty-state">
        <p>{language === 'zh' ? '加载 OpenSpec 看板中…' : 'Loading OpenSpec board...'}</p>
      </div>
    )
  } else if (error) {
    content = (
      <div className="osb-empty-state">
        <p role="alert">{error}</p>
      </div>
    )
  } else if (snapshot?.state === 'cli_unavailable') {
    content = (
      <div className="osb-empty-state">
        <h2>{language === 'zh' ? '未检测到 OpenSpec CLI' : 'OpenSpec CLI Not Available'}</h2>
        <p>{snapshot.cli_message ?? (language === 'zh' ? '当前环境无法执行 openspec 命令。' : 'The current environment cannot run the openspec command.')}</p>
        <button type="button" onClick={() => setTerminalOpen(true)}>
          {getTerminalButtonLabel(language)}
        </button>
      </div>
    )
  } else if (snapshot?.state === 'not_initialized') {
    content = (
      <div className="osb-empty-state">
        <h2>{language === 'zh' ? '当前项目尚未初始化 OpenSpec' : 'This Project Has Not Been Initialized for OpenSpec'}</h2>
        <p>{snapshot.cli_message ?? (language === 'zh' ? '可在当前项目目录中执行 openspec init。' : 'Run openspec init in this project directory.')}</p>
        <button type="button" onClick={() => setTerminalOpen(true)}>
          {getTerminalButtonLabel(language)}
        </button>
      </div>
    )
  } else if (snapshot?.state === 'ready_empty') {
    content = (
      <div className="osb-empty-state">
        <h2>{language === 'zh' ? '当前项目暂无 OpenSpec change' : 'No OpenSpec Changes Yet'}</h2>
        <p>
          {language === 'zh'
            ? 'OpenSpec 已可用，但还没有可展示的 changes。'
            : 'OpenSpec is available, but there are no changes to show yet.'}
        </p>
        <button type="button" onClick={() => setTerminalOpen(true)}>
          {getTerminalButtonLabel(language)}
        </button>
      </div>
    )
  } else if (snapshot?.state === 'ready') {
    const visibleChanges = changeFilter === 'archived'
      ? snapshot.archived_changes
      : changeFilter === 'all'
        ? [...snapshot.changes, ...snapshot.archived_changes]
        : snapshot.changes

    content = (
      <div className="osb-ready-state">
        <section className="osb-ready-summary">
          <h2>{language === 'zh' ? 'OpenSpec 看板已就绪' : 'OpenSpec Board Ready'}</h2>
          <p>
            {language === 'zh'
              ? `当前共有 ${snapshot.changes.length} 个进行中的 change，${snapshot.archived_changes.length} 个已归档 change。`
              : `There are ${snapshot.changes.length} active changes and ${snapshot.archived_changes.length} archived changes.`}
          </p>
        </section>
        <div className="osb-board-shell">
          <aside className="osb-change-list">
            <div className="osb-change-filters" role="group" aria-label={language === 'zh' ? 'Change 过滤' : 'Change filters'}>
              {(['active', 'archived', 'all'] as ChangeFilter[]).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  aria-pressed={changeFilter === filter}
                  className={changeFilter === filter ? 'active' : undefined}
                  onClick={() => setChangeFilter(filter)}
                >
                  {getFilterLabel(filter)}
                </button>
              ))}
            </div>
            {visibleChanges.length === 0 ? (
              <p>{getEmptyListLabel(changeFilter)}</p>
            ) : (
              visibleChanges.map((change) => (
                <button
                  key={change.id}
                  type="button"
                  aria-label={change.title}
                  className={change.id === selectedChangeId ? 'osb-change-card active' : 'osb-change-card'}
                  onClick={() => selectChange(change.id)}
                >
                  <strong>{change.title}</strong>
                  <span>{getTaskProgressLabel(change.task_progress.completed, change.task_progress.total)}</span>
                  <span>{getValidationLabel(change.validation?.message)}</span>
                </button>
              ))
            )}
          </aside>
          <section className="osb-detail-shell">
            <header className="osb-detail-header">
              <h2>{currentDetail?.change.title ?? (language === 'zh' ? '请选择一个 change' : 'Select a change')}</h2>
              <button
                type="button"
                disabled={!currentDetail}
                onClick={() => {
                  if (currentDetail) {
                    void fetchDetail(project.id, currentDetail.change.id)
                  }
                }}
              >
                {language === 'zh' ? '刷新当前 change' : 'Refresh Current Change'}
              </button>
            </header>
            <nav className="osb-artifact-tabs" aria-label={language === 'zh' ? 'Artifact 标签页' : 'Artifact tabs'}>
              {(['overview', 'proposal', 'design', 'tasks', 'specs'] as ArtifactTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  aria-pressed={activeArtifact === tab}
                  className={activeArtifact === tab ? 'active' : undefined}
                  onClick={() => setActiveArtifact(tab)}
                >
                  {getArtifactLabel(tab)}
                </button>
              ))}
            </nav>
            <article className="osb-overview-markdown">
              {renderArtifactPanel()}
            </article>
          </section>
        </div>
      </div>
    )
  } else {
    content = (
      <div className="osb-empty-state">
        <p>{language === 'zh' ? '暂无 OpenSpec 数据。' : 'No OpenSpec data yet.'}</p>
      </div>
    )
  }

  return (
    <div className="osb-page">
      <header className="osb-header">
        <button type="button" onClick={onBack}>
          {language === 'zh' ? '返回项目' : 'Back to Projects'}
        </button>
        <h1>{project.name} / OpenSpec</h1>
        <button type="button" onClick={() => void fetchSnapshot(project.id)}>
          {language === 'zh' ? '刷新' : 'Refresh'}
        </button>
      </header>
      <main className="osb-content">{content}</main>
      <OpenSpecTerminalPanel
        isOpen={terminalOpen}
        project={project}
        initialCommand="openspec init"
        language={language}
        onClose={() => setTerminalOpen(false)}
      />
    </div>
  )
}
