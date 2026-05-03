import { useState, useEffect } from 'react'
import { 
  FileText, 
  FileCode, 
  FileCheck, 
  ListTodo, 
  Sparkles, 
  Settings, 
  Loader2, 
  FolderOpen,
  ChevronRight,
  Folder,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react'
import { openspecApi } from '../../api/openspec'
import type { OpenSpecArtifactInfo } from '../../types'

interface ArtifactPreviewProps {
  projectPath: string
  changeId: string
  artifacts: OpenSpecArtifactInfo[]
  language: 'zh' | 'en'
}

const TYPE_CONFIG: Record<string, { 
  icon: typeof FileText
  color: string
  label: { zh: string; en: string }
}> = {
  config: { 
    icon: Settings, 
    color: '#6b7280',
    label: { zh: '配置', en: 'Config' }
  },
  proposal: { 
    icon: Sparkles, 
    color: '#a855f7',
    label: { zh: '提案', en: 'Proposal' }
  },
  design: { 
    icon: FileCode, 
    color: '#3b82f6',
    label: { zh: '设计', en: 'Design' }
  },
  tasks: { 
    icon: ListTodo, 
    color: '#f59e0b',
    label: { zh: '任务', en: 'Tasks' }
  },
  spec: { 
    icon: FileCheck, 
    color: '#10b981',
    label: { zh: '规格', en: 'Spec' }
  },
}

const CATEGORY_CONFIG: Record<string, { 
  label: { zh: string; en: string }
  order: number
}> = {
  config: { label: { zh: '配置文件', en: 'Config' }, order: 0 },
  root: { label: { zh: '工作流文件', en: 'Workflow' }, order: 1 },
  specs: { label: { zh: '规格文档', en: 'Specs' }, order: 2 },
}

export function ArtifactPreview({
  projectPath,
  changeId,
  artifacts,
  language,
}: ArtifactPreviewProps) {
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['config', 'root', 'specs'])
  )

  const groupedArtifacts = artifacts.reduce((acc, artifact) => {
    const cat = artifact.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(artifact)
    return acc
  }, {} as Record<string, OpenSpecArtifactInfo[]>)

  const sortedCategories = Object.keys(groupedArtifacts).sort(
    (a, b) => (CATEGORY_CONFIG[a]?.order ?? 99) - (CATEGORY_CONFIG[b]?.order ?? 99)
  )

  useEffect(() => {
    if (artifacts.length > 0 && !activeFile) {
      const firstCategory = sortedCategories[0]
      if (firstCategory && groupedArtifacts[firstCategory]?.length > 0) {
        setActiveFile(groupedArtifacts[firstCategory][0].name)
      }
    }
  }, [artifacts, activeFile])

  useEffect(() => {
    if (!activeFile) return

    const fetchContent = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await openspecApi.readArtifact(projectPath, changeId, activeFile)
        setContent(result)
      } catch (err) {
        setError(String(err))
      } finally {
        setLoading(false)
      }
    }

    fetchContent()
  }, [projectPath, changeId, activeFile])

  const activeArtifact = artifacts.find((a) => a.name === activeFile)

  const handleOpenInFileManager = async () => {
    if (!activeArtifact) return
    const { desktopApi } = await import('../../api/desktop')
    const parentDir = activeArtifact.path.substring(0, activeArtifact.path.lastIndexOf('/'))
    desktopApi.openFolder(parentDir)
  }

  const handleOpenFile = async () => {
    if (!activeArtifact) return
    const { desktopApi } = await import('../../api/desktop')
    desktopApi.openFile(activeArtifact.path)
  }

  const handleCopyPath = async () => {
    if (!activeArtifact) return
    try {
      await navigator.clipboard.writeText(activeArtifact.path)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy path:', err)
    }
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  if (artifacts.length === 0) {
    return (
      <div className="os-artifact-preview os-artifact-empty">
        <div className="os-empty-main">
          <FolderOpen className="w-8 h-8 mb-2 opacity-50" />
          <p>{language === 'zh' ? '暂无产物文件' : 'No artifacts yet'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="os-artifact-preview">
      <aside className="os-artifact-sidebar">
        <div className="os-sidebar-header">
          <FolderOpen className="os-sidebar-icon" />
          <span>{language === 'zh' ? '产物目录' : 'Artifacts'}</span>
        </div>
        <nav className="os-file-tree">
          {sortedCategories.map((category) => {
            const categoryArtifacts = groupedArtifacts[category]
            const catConfig = CATEGORY_CONFIG[category]
            const isExpanded = expandedCategories.has(category)

            return (
              <div key={category} className="os-file-group">
                <button 
                  className="os-group-header"
                  onClick={() => toggleCategory(category)}
                >
                  <ChevronRight className={`os-group-chevron ${isExpanded ? 'expanded' : ''}`} />
                  <Folder className="os-group-icon" />
                  <span>{catConfig?.label[language] || category}</span>
                  <span className="os-group-count">{categoryArtifacts.length}</span>
                </button>
                
                {isExpanded && categoryArtifacts.map((artifact) => {
                  const config = TYPE_CONFIG[artifact.type] || TYPE_CONFIG.config
                  const Icon = config.icon
                  const isActive = activeFile === artifact.name

                  return (
                    <button
                      key={artifact.name}
                      className={`os-file-item ${isActive ? 'active' : ''}`}
                      onClick={() => setActiveFile(artifact.name)}
                      title={artifact.path}
                    >
                      <Icon 
                        className="os-file-icon" 
                        style={{ color: isActive ? config.color : undefined }}
                      />
                      <span className="os-file-name">{artifact.displayName}</span>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </nav>
      </aside>

      <main className="os-artifact-main">
        {activeArtifact && (
          <header className="os-content-header">
            <div className="os-content-title">
              {(() => {
                const config = TYPE_CONFIG[activeArtifact.type] || TYPE_CONFIG.config
                const Icon = config.icon
                return (
                  <>
                    <Icon className="os-title-icon" style={{ color: config.color }} />
                    <span>{activeArtifact.displayName}</span>
                  </>
                )
              })()}
            </div>
            <div className="os-content-actions">
              <span className="os-file-path" title={activeArtifact.path}>
                {activeArtifact.path}
              </span>
              <button 
                className={`os-icon-action-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopyPath}
                title={language === 'zh' ? '复制路径' : 'Copy Path'}
              >
                {copied ? <Check /> : <Copy />}
              </button>
              <button 
                className="os-icon-action-btn" 
                onClick={handleOpenFile}
                title={language === 'zh' ? '打开文件' : 'Open File'}
              >
                <ExternalLink />
              </button>
              <button 
                className="os-icon-action-btn" 
                onClick={handleOpenInFileManager}
                title={language === 'zh' ? '在文件夹中显示' : 'Reveal in Folder'}
              >
                <FolderOpen />
              </button>
            </div>
          </header>
        )}

        <div className="os-artifact-content">
          {loading ? (
            <div className="os-artifact-loading">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{language === 'zh' ? '加载中...' : 'Loading...'}</span>
            </div>
          ) : error ? (
            <div className="os-artifact-error">
              <p>{error}</p>
            </div>
          ) : (
            <pre className="os-content-code">{content}</pre>
          )}
        </div>
      </main>
    </div>
  )
}
