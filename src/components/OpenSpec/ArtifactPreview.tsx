import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
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
  ExternalLink,
  Archive,
  List,
  Eye,
  Code2
} from 'lucide-react'
import { openspecApi } from '../../api/openspec'
import { useOpenSpecStore } from '../../stores/openspecStore'
import type { OpenSpecArtifactInfo, OpenSpecChangeInfo } from '../../types'

interface ArtifactPreviewProps {
  projectId: string
  projectPath: string
  changeId: string
  change: OpenSpecChangeInfo
  artifacts: OpenSpecArtifactInfo[]
  language: 'zh' | 'en'
}

interface Heading {
  id: string
  level: number
  text: string
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

function isMarkdownFile(filename: string): boolean {
  return filename.endsWith('.md') || filename.endsWith('.markdown')
}

function normalizeHeadingText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[`*_~]/g, '')
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section'
}

export function ArtifactPreview({
  projectId,
  projectPath,
  changeId,
  change,
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
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [showToc, setShowToc] = useState(true)
  const [activeHeading, setActiveHeading] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview')
  
  const contentRef = useRef<HTMLDivElement>(null)
  const headingElementsRef = useRef(new Map<string, HTMLHeadingElement>())
  
  const { executeAction, refresh } = useOpenSpecStore()
  
  const headings = useMemo<Heading[]>(() => {
    if (!content || !isMarkdownFile(activeFile || '')) return []
    
    const regex = /^(#{1,6})\s+(.+)$/gm
    const result: Heading[] = []
    const idCounts = new Map<string, number>()
    let match
    
    while ((match = regex.exec(content)) !== null) {
      const level = match[1]?.length ?? 1
      const text = match[2]?.trim() ?? ''
      const baseId = normalizeHeadingText(text)
      const count = idCounts.get(baseId) ?? 0
      idCounts.set(baseId, count + 1)
      const id = count === 0 ? baseId : `${baseId}-${count + 1}`
      
      result.push({ id, level, text })
    }
    
    return result
  }, [content, activeFile])

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
  
  useEffect(() => {
    const isMarkdown = isMarkdownFile(activeFile || '')
    if (!isMarkdown || viewMode !== 'preview') {
      headingElementsRef.current.clear()
      return
    }
    
    const contentEl = contentRef.current
    if (!contentEl) return
    
    const frameId = requestAnimationFrame(() => {
      const renderedHeadings = Array.from(
        contentEl.querySelectorAll<HTMLHeadingElement>('h1, h2, h3, h4, h5, h6')
      )
      
      const nextHeadingElements = new Map<string, HTMLHeadingElement>()
      renderedHeadings.forEach((element, index) => {
        const heading = headings[index]
        if (heading) {
          element.id = heading.id
          nextHeadingElements.set(heading.id, element)
        }
      })
      
      headingElementsRef.current = nextHeadingElements
    })
    
    return () => cancelAnimationFrame(frameId)
  }, [content, activeFile, headings, viewMode])
  
  useEffect(() => {
    const isMarkdown = isMarkdownFile(activeFile || '')
    if (!isMarkdown || headings.length === 0 || viewMode !== 'preview') return
    
    const contentEl = contentRef.current
    if (!contentEl) return
    
    const handleScroll = () => {
      const renderedHeadings = Array.from(
        contentEl.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6')
      )
      if (renderedHeadings.length === 0) return
      
      const scrollTop = contentEl.scrollTop
      const thresholdTop = scrollTop + 36
      let activeId = renderedHeadings[0].id
      
      for (let i = 0; i < renderedHeadings.length; i += 1) {
        const current = renderedHeadings[i]
        const next = renderedHeadings[i + 1]
        const currentTop = current.offsetTop
        const nextTop = next?.offsetTop ?? Number.POSITIVE_INFINITY
        
        if (thresholdTop >= currentTop && thresholdTop < nextTop) {
          activeId = current.id
          break
        }
      }
      
      setActiveHeading(activeId)
    }
    
    handleScroll()
    contentEl.addEventListener('scroll', handleScroll)
    return () => contentEl.removeEventListener('scroll', handleScroll)
  }, [activeFile, headings, viewMode])
  
  useEffect(() => {
    if (!activeHeading || headings.length === 0) return
    
    const tocList = document.querySelector('.os-toc-list')
    if (!tocList) return
    
    const activeButton = tocList.querySelector<HTMLButtonElement>(
      `[data-heading-id="${activeHeading}"]`
    )
    if (!activeButton) return
    
    activeButton.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'smooth',
    })
  }, [activeHeading, headings])
  
  const scrollToHeading = useCallback((id: string) => {
    const container = contentRef.current
    const element = headingElementsRef.current.get(id)
    if (!container || !element) return
    
    const containerRect = container.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()
    const offset = 24
    const offsetPosition = Math.max(
      container.scrollTop + (elementRect.top - containerRect.top) - offset,
      0,
    )
    
    container.scrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    })
    setActiveHeading(id)
  }, [])

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

  const handleArchive = async () => {
    setArchiving(true)
    try {
      const result = await executeAction(projectPath, 'archive', [changeId, '--yes'])
      if (result?.success) {
        refresh(projectId, projectPath)
      }
    } finally {
      setArchiving(false)
      setShowArchiveDialog(false)
    }
  }

  const canArchive = change.currentStage !== 'archive'

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
        
        {canArchive && (
          <div className="os-file-tree-footer">
            <button
              className="os-archive-btn"
              onClick={() => setShowArchiveDialog(true)}
              disabled={archiving}
            >
              {archiving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Archive className="w-4 h-4" />
              )}
              <span>
                {language === 'zh' ? '归档此变更' : 'Archive Change'}
              </span>
            </button>
          </div>
        )}
        
        {showArchiveDialog && (
          <div className="os-dialog-overlay" onClick={() => setShowArchiveDialog(false)}>
            <div className="os-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="os-dialog-header">
                <h3>{language === 'zh' ? '确认归档' : 'Confirm Archive'}</h3>
                <p>
                  {language === 'zh'
                    ? `确定要归档变更 "${changeId}" 吗？归档后将移至归档目录。`
                    : `Are you sure you want to archive "${changeId}"? It will be moved to the archive directory.`}
                </p>
              </div>
              <div className="os-dialog-footer">
                <button
                  className="os-action-btn secondary"
                  onClick={() => setShowArchiveDialog(false)}
                  disabled={archiving}
                >
                  {language === 'zh' ? '取消' : 'Cancel'}
                </button>
                <button
                  className="os-action-btn primary"
                  onClick={handleArchive}
                  disabled={archiving}
                >
                  {archiving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{language === 'zh' ? '归档中...' : 'Archiving...'}</span>
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4" />
                      <span>{language === 'zh' ? '确认归档' : 'Archive'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
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
              {isMarkdownFile(activeArtifact.name) && (
                <div className="os-view-toggle">
                  <button 
                    className={`os-view-btn ${viewMode === 'preview' ? 'active' : ''}`}
                    onClick={() => setViewMode('preview')}
                    title={language === 'zh' ? '预览模式' : 'Preview Mode'}
                  >
                    <Eye />
                  </button>
                  <button 
                    className={`os-view-btn ${viewMode === 'source' ? 'active' : ''}`}
                    onClick={() => setViewMode('source')}
                    title={language === 'zh' ? '源码模式' : 'Source Mode'}
                  >
                    <Code2 />
                  </button>
                </div>
              )}
              {isMarkdownFile(activeArtifact.name) && headings.length > 0 && viewMode === 'preview' && (
                <button 
                  className={`os-icon-action-btn ${showToc ? 'active' : ''}`}
                  onClick={() => setShowToc(!showToc)}
                  title={showToc 
                    ? (language === 'zh' ? '隐藏目录' : 'Hide TOC')
                    : (language === 'zh' ? '显示目录' : 'Show TOC')
                  }
                >
                  <List />
                </button>
              )}
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

        <div className="os-artifact-body">
          <div className="os-artifact-content" ref={contentRef}>
            {loading ? (
              <div className="os-artifact-loading">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{language === 'zh' ? '加载中...' : 'Loading...'}</span>
              </div>
            ) : error ? (
              <div className="os-artifact-error">
                <p>{error}</p>
              </div>
            ) : isMarkdownFile(activeFile || '') && viewMode === 'preview' ? (
              <div className="os-md-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            ) : (
              <pre className="os-content-code">{content}</pre>
            )}
          </div>
          
          {isMarkdownFile(activeFile || '') && showToc && headings.length > 0 && viewMode === 'preview' && (
            <nav className="os-toc-sidebar" aria-label="Table of contents">
              <div className="os-toc-header">
                <h3>{language === 'zh' ? '目录' : 'Contents'}</h3>
                <span className="os-toc-count">{headings.length}</span>
              </div>
              <ul className="os-toc-list">
                {headings.map((heading) => (
                  <li
                    key={heading.id}
                    className={`os-toc-item level-${heading.level} ${activeHeading === heading.id ? 'active' : ''}`}
                  >
                    <button 
                      data-heading-id={heading.id}
                      onClick={() => scrollToHeading(heading.id)}
                    >
                      {heading.text}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </main>
    </div>
  )
}
