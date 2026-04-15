import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import type { ComponentProps, ReactElement, ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components, ExtraProps } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { skillApi } from '../../api/skill'
import { desktopApi } from '../../api/desktop'
import './SkillMarkdownPreview.css'

interface Heading {
  id: string
  level: number
  text: string
}

interface CodeBlockEntry {
  id: string
  code: string
}

type PreProps = ComponentProps<'pre'> & ExtraProps
type CodeProps = ComponentProps<'code'> & ExtraProps

interface SkillMarkdownPreviewProps {
  skillId?: string
  skillName: string
  skillPath?: string
  isOpen: boolean
  onClose: () => void
  content?: string
  title?: string
  icon?: 'file' | 'book'
}

function getSkillFolderPath(skillPath: string) {
  const normalized = skillPath.replace(/\\/g, '/')

  if (normalized.toLowerCase().endsWith('/skill.md')) {
    const lastSlashIndex = skillPath.lastIndexOf('/')
    const lastBackslashIndex = skillPath.lastIndexOf('\\')
    const separatorIndex = Math.max(lastSlashIndex, lastBackslashIndex)
    return separatorIndex >= 0 ? skillPath.slice(0, separatorIndex) : skillPath
  }

  return skillPath
}

function normalizeHeadingText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[`*_~]/g, '')
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section'
}

const FONT_SIZES = [
  { label: '小', value: 14 },
  { label: '中', value: 16 },
  { label: '大', value: 18 },
  { label: '特大', value: 20 },
]

const FONT_FAMILIES = [
  { label: '系统', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' },
  { label: '衬线', value: 'Georgia, "Times New Roman", "Songti SC", serif' },
  { label: '等宽', value: '"JetBrains Mono", "Fira Code", "SF Mono", Monaco, monospace' },
]

export function SkillMarkdownPreview({
  skillId,
  skillName,
  skillPath,
  isOpen,
  onClose,
  content: externalContent,
  title,
  icon = 'file',
}: SkillMarkdownPreviewProps) {
  const [mdContent, setMdContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [headings, setHeadings] = useState<Heading[]>([])
  const [activeHeading, setActiveHeading] = useState<string | null>(null)
  const [showToc, setShowToc] = useState(true)
  const [fontSize, setFontSize] = useState(16)
  const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[0].value)
  const [showSettings, setShowSettings] = useState(false)
  const [collapsedCode, setCollapsedCode] = useState<Set<string>>(new Set())
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview')
  const [copiedSource, setCopiedSource] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const tocListRef = useRef<HTMLUListElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null)
  const headingElementsRef = useRef(new Map<string, HTMLHeadingElement>())
  const codeRenderIndexRef = useRef(0)

  useEffect(() => {
    if (isOpen) {
      triggerButtonRef.current = document.activeElement as HTMLButtonElement
      if (externalContent) {
        setMdContent(externalContent)
      } else if (skillId) {
        loadMarkdownContent()
      }
      if (closeButtonRef.current) {
        closeButtonRef.current.focus()
      }
    } else {
      setMdContent(null)
      setHeadings([])
      setError(null)
      setActiveHeading(null)
      setShowSettings(false)
      setCollapsedCode(new Set())
      headingElementsRef.current.clear()
    }
  }, [isOpen, skillId, externalContent])

  useEffect(() => {
    const content = contentRef.current
    if (!content || !mdContent || viewMode !== 'preview') {
      setHeadings([])
      headingElementsRef.current.clear()
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      const renderedHeadings = Array.from(
        content.querySelectorAll<HTMLHeadingElement>('.sk-md-content h1, .sk-md-content h2, .sk-md-content h3, .sk-md-content h4, .sk-md-content h5, .sk-md-content h6')
      )

      const idCounts = new Map<string, number>()
      const nextHeadings: Heading[] = []
      const nextHeadingElements = new Map<string, HTMLHeadingElement>()

      renderedHeadings.forEach((element) => {
        const text = element.textContent?.trim() || 'section'
        const level = Number.parseInt(element.tagName.slice(1), 10)
        const baseId = normalizeHeadingText(text)
        const count = idCounts.get(baseId) ?? 0
        idCounts.set(baseId, count + 1)
        const id = count === 0 ? baseId : `${baseId}-${count + 1}`

        element.id = id
        nextHeadingElements.set(id, element)
        nextHeadings.push({ id, level, text })
      })

      headingElementsRef.current = nextHeadingElements
      setHeadings(nextHeadings)
      setActiveHeading((current) => {
        if (current && nextHeadingElements.has(current)) {
          return current
        }

        return nextHeadings[0]?.id ?? null
      })
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [mdContent, viewMode])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showSettings) {
          setShowSettings(false)
        } else {
          onClose()
        }
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose, showSettings])

  useEffect(() => {
    const handleTab = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && isOpen && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0] as HTMLElement
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleTab)
      return () => document.removeEventListener('keydown', handleTab)
    }
  }, [isOpen])

  useEffect(() => {
    const content = contentRef.current
    if (!content || !mdContent || viewMode !== 'preview') return

    const handleScroll = () => {
      const renderedHeadings = Array.from(
        content.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6')
      )
      if (renderedHeadings.length === 0) return

      const scrollTop = content.scrollTop
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

      if (activeId) {
        setActiveHeading(activeId)
      }
    }

    handleScroll()
    content.addEventListener('scroll', handleScroll)
    return () => content.removeEventListener('scroll', handleScroll)
  }, [mdContent, viewMode])

  useEffect(() => {
    if (!activeHeading || !tocListRef.current) return

    const activeButton = tocListRef.current.querySelector<HTMLButtonElement>(
      `[data-heading-id="${activeHeading}"]`
    )
    if (!activeButton) return

    activeButton.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'smooth',
    })
  }, [activeHeading])

  const codeBlocks = useMemo<CodeBlockEntry[]>(() => {
    if (!mdContent) return []

    const regex = /```[^\n]*\n([\s\S]*?)```/g
    const result: CodeBlockEntry[] = []
    let match

    while ((match = regex.exec(mdContent)) !== null) {
      result.push({
        id: `code-${result.length}`,
        code: match[1] ?? '',
      })
    }

    return result
  }, [mdContent])

  const loadMarkdownContent = async () => {
    if (!skillId) return
    setLoading(true)
    setError(null)
    try {
      const content = await skillApi.readSkillMdContent(skillId)
      setMdContent(content)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

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
      behavior: 'smooth'
    })
    setActiveHeading(id)
  }, [])

  const handleClose = () => {
    onClose()
    if (triggerButtonRef.current) {
      triggerButtonRef.current.focus()
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  const increaseFontSize = () => {
    setFontSize(prev => Math.min(prev + 2, 24))
  }

  const decreaseFontSize = () => {
    setFontSize(prev => Math.max(prev - 2, 12))
  }

  const toggleCodeBlock = (id: string) => {
    setCollapsedCode(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const copyCode = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(id)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  const copySource = async () => {
    if (!mdContent) return
    try {
      await navigator.clipboard.writeText(mdContent)
      setCopiedSource(true)
      setTimeout(() => setCopiedSource(false), 2000)
    } catch (err) {
      console.error('Failed to copy source:', err)
    }
  }

  const openSkillFolder = async () => {
    if (!skillPath) return
    try {
      await desktopApi.openFolder(getSkillFolderPath(skillPath))
    } catch (err) {
      console.error('Failed to open skill folder:', err)
    }
  }

  if (viewMode === 'preview') {
    codeRenderIndexRef.current = 0
  }

  const markdownComponents: Components = {
    pre: ({ children }: PreProps) => {
      const codeElement = children as ReactElement<{ children?: ReactNode }>
      const code = String(codeElement?.props?.children ?? '')
      const codeIndex = codeRenderIndexRef.current++
      const codeId = codeBlocks[codeIndex]?.id ?? `code-${codeIndex}`
      const isCollapsed = collapsedCode.has(codeId)

      return (
        <div className={`sk-md-code-block ${isCollapsed ? 'collapsed' : ''}`}>
          <div className="sk-md-code-header">
            <div className="sk-md-code-lang">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 8a1 1 0 01-1.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 111.414-1.414l3 3a1 1 0 010 1.414l-3 3z" clipRule="evenodd" />
              </svg>
              <span>代码</span>
            </div>
            <div className="sk-md-code-actions">
              <button
                className="sk-md-code-action-btn"
                onClick={() => copyCode(code, codeId)}
                title="复制代码"
              >
                {copiedCode === codeId ? (
                  <>
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>已复制</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                    </svg>
                    <span>复制</span>
                  </>
                )}
              </button>
              <button
                className="sk-md-code-action-btn"
                onClick={() => toggleCodeBlock(codeId)}
                title={isCollapsed ? '展开代码' : '折叠代码'}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className={isCollapsed ? 'collapsed' : ''}>
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span>{isCollapsed ? '展开' : '折叠'}</span>
              </button>
            </div>
          </div>
          {!isCollapsed && <pre>{children}</pre>}
        </div>
      )
    },
    code: ({ className, children }: CodeProps) => {
      return <code className={className}>{children}</code>
    },
  }

  if (!isOpen) return null

  return (
    <>
      <div className="pm-overlay" onClick={handleOverlayClick} aria-hidden="true" />
      
      <div
        ref={modalRef}
        className="pm-modal sk-md-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${title || 'SKILL.md'} - ${skillName}`}
      >
        <div className="pm-modal-header sk-md-header">
          <div className="sk-md-header-left">
            <div className="sk-md-title-wrapper">
              {icon === 'book' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sk-md-icon">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" fill="currentColor" className="sk-md-icon">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
              )}
              <h2>{title || 'SKILL.md'}</h2>
              <span className="sk-md-skill-name">{skillName}</span>
            </div>
          </div>
          
          <div className="sk-md-header-actions">
            <div className="sk-md-view-toggle">
              <button
                className={`sk-md-view-btn ${viewMode === 'preview' ? 'active' : ''}`}
                onClick={() => setViewMode('preview')}
                title="预览模式"
              >
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                <span>预览</span>
              </button>
              <button
                className={`sk-md-view-btn ${viewMode === 'source' ? 'active' : ''}`}
                onClick={() => setViewMode('source')}
                title="源码模式"
              >
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 8a1 1 0 01-1.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 111.414-1.414l3 3a1 1 0 010 1.414l-3 3z" clipRule="evenodd" />
                </svg>
                <span>源码</span>
              </button>
            </div>
            {skillPath && (
              <button
                className="sk-md-toolbar-btn"
                onClick={openSkillFolder}
                title="打开所在文件夹"
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 7h5l2 2h7v7H3z" />
                  <path d="M3 7l2-2h4" />
                </svg>
              </button>
            )}
            <button
              className="sk-md-settings-btn"
              onClick={() => setShowSettings(!showSettings)}
              title="阅读设置"
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>
            {headings.length > 0 && viewMode === 'preview' && (
              <button
                className={`sk-md-toc-toggle ${showToc ? 'active' : ''}`}
                onClick={() => setShowToc(!showToc)}
                title={showToc ? '隐藏目录' : '显示目录'}
              >
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            <button
              ref={closeButtonRef}
              className="pm-modal-close"
              onClick={handleClose}
              aria-label="关闭"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="sk-md-settings-panel">
            <div className="sk-md-setting-group">
              <label className="sk-md-setting-label">字号</label>
              <div className="sk-md-font-size-control">
                <button onClick={decreaseFontSize} disabled={fontSize <= 12} title="减小字号">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
                <span className="sk-md-font-size-value">{fontSize}px</span>
                <button onClick={increaseFontSize} disabled={fontSize >= 24} title="增大字号">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div className="sk-md-font-size-presets">
                {FONT_SIZES.map(size => (
                  <button
                    key={size.value}
                    className={`sk-md-preset-btn ${fontSize === size.value ? 'active' : ''}`}
                    onClick={() => setFontSize(size.value)}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="sk-md-setting-group">
              <label className="sk-md-setting-label">字体</label>
              <div className="sk-md-font-family-options">
                {FONT_FAMILIES.map(font => (
                  <button
                    key={font.label}
                    className={`sk-md-font-btn ${fontFamily === font.value ? 'active' : ''}`}
                    onClick={() => setFontFamily(font.value)}
                    style={{ fontFamily: font.value }}
                  >
                    {font.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="sk-md-container">
          {showToc && headings.length > 0 && !loading && !error && viewMode === 'preview' && (
            <nav className="sk-md-toc" aria-label="文档目录">
              <div className="sk-md-toc-header">
                <h3>目录</h3>
                <span className="sk-md-toc-count">{headings.length}</span>
              </div>
              <ul className="sk-md-toc-list" ref={tocListRef}>
                {headings.map((heading) => (
                  <li
                    key={heading.id}
                    className={`sk-md-toc-item level-${heading.level} ${activeHeading === heading.id ? 'active' : ''}`}
                  >
                    <button data-heading-id={heading.id} onClick={() => scrollToHeading(heading.id)}>
                      {heading.text}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="sk-md-body" ref={contentRef}>
            {loading && (
              <div className="sk-md-loading">
                <div className="sk-md-spinner" />
                <p>加载中...</p>
              </div>
            )}

            {error && (
              <div className="sk-md-error">
                <svg viewBox="0 0 24 24" fill="currentColor" className="sk-md-error-icon">
                  <path fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" clipRule="evenodd" />
                </svg>
                <p>{error}</p>
              </div>
            )}

            {!loading && !error && mdContent && viewMode === 'preview' && (
              <div 
                className="sk-md-content" 
                style={{ 
                  fontSize: `${fontSize}px`,
                  fontFamily: fontFamily
                }}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {mdContent}
                </ReactMarkdown>
              </div>
            )}

            {!loading && !error && mdContent && viewMode === 'source' && (
              <div className="sk-md-source-view">
                <div className="sk-md-source-toolbar">
                  <div className="sk-md-source-info">
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 8a1 1 0 01-1.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 111.414-1.414l3 3a1 1 0 010 1.414l-3 3z" clipRule="evenodd" />
                    </svg>
                    <span>Markdown 源码</span>
                    <span className="sk-md-source-stats">{mdContent.length} 字符</span>
                  </div>
                  <button
                    className="sk-md-copy-source-btn"
                    onClick={copySource}
                    title="复制全部源码"
                  >
                    {copiedSource ? (
                      <>
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>已复制</span>
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                        </svg>
                        <span>复制全部</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="sk-md-source-code">
                  <code>{mdContent}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
