import { useState, useEffect, useRef, useMemo } from 'react'
import type { ComponentProps, ReactElement, ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components, ExtraProps } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { openUrl } from '@tauri-apps/plugin-opener'
import { USER_GUIDE_CONTENT, USER_GUIDE_CONTENT_EN } from '../../data/userGuide'
import './UserGuideModal.css'

interface Heading {
  id: string
  level: number
  text: string
}

type PreProps = ComponentProps<'pre'> & ExtraProps
type CodeProps = ComponentProps<'code'> & ExtraProps

interface UserGuideModalProps {
  isOpen: boolean
  onClose: () => void
  language: 'zh' | 'en'
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
  { label: '小', labelEn: 'S', value: 14 },
  { label: '中', labelEn: 'M', value: 16 },
  { label: '大', labelEn: 'L', value: 18 },
  { label: '特大', labelEn: 'XL', value: 20 },
]

const FONT_FAMILIES = [
  { label: '系统', labelEn: 'System', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' },
  { label: '衬线', labelEn: 'Serif', value: 'Georgia, "Times New Roman", "Songti SC", serif' },
  { label: '等宽', labelEn: 'Mono', value: '"JetBrains Mono", "Fira Code", "SF Mono", Monaco, monospace' },
]

export function UserGuideModal({
  isOpen,
  onClose,
  language,
}: UserGuideModalProps) {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [activeHeading, setActiveHeading] = useState<string | null>(null)
  const [showToc, setShowToc] = useState(true)
  const [fontSize, setFontSize] = useState(16)
  const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[0].value)
  const [showSettings, setShowSettings] = useState(false)
  const [collapsedCode, setCollapsedCode] = useState<Set<string>>(new Set())
  const modalRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const tocListRef = useRef<HTMLUListElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null)
  const headingElementsRef = useRef(new Map<string, HTMLHeadingElement>())
  const codeRenderIndexRef = useRef(0)

  const mdContent = language === 'zh' ? USER_GUIDE_CONTENT : USER_GUIDE_CONTENT_EN

  const codeBlocks = useMemo(() => {
    const regex = /```[^\n]*\n([\s\S]*?)```/g
    const result: { id: string; code: string }[] = []
    let match

    while ((match = regex.exec(mdContent)) !== null) {
      result.push({
        id: `code-${result.length}`,
        code: match[1] ?? '',
      })
    }

    return result
  }, [mdContent])

  useEffect(() => {
    if (isOpen) {
      triggerButtonRef.current = document.activeElement as HTMLButtonElement
      if (closeButtonRef.current) {
        closeButtonRef.current.focus()
      }
    } else {
      setHeadings([])
      setActiveHeading(null)
      setShowSettings(false)
      setCollapsedCode(new Set())
      headingElementsRef.current.clear()
    }
  }, [isOpen])

  useEffect(() => {
    const content = contentRef.current
    if (!content) {
      setHeadings([])
      headingElementsRef.current.clear()
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      const renderedHeadings = Array.from(
        content.querySelectorAll<HTMLHeadingElement>('.ug-content h1, .ug-content h2, .ug-content h3, .ug-content h4, .ug-content h5, .ug-content h6')
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
  }, [mdContent])

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
    if (!content) return

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
  }, [])

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

  const scrollToHeading = (id: string) => {
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
  }

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
      const btn = document.querySelector(`[data-code-id="${id}"]`)
      if (btn) {
        btn.setAttribute('data-copied', 'true')
        setTimeout(() => btn.removeAttribute('data-copied'), 2000)
      }
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  codeRenderIndexRef.current = 0

  const markdownComponents: Components = {
    pre: ({ children }: PreProps) => {
      const codeElement = children as ReactElement<{ children?: ReactNode }>
      const code = String(codeElement?.props?.children ?? '')
      const codeIndex = codeRenderIndexRef.current++
      const codeId = codeBlocks[codeIndex]?.id ?? `code-${codeIndex}`
      const isCollapsed = collapsedCode.has(codeId)

      return (
        <div className={`ug-code-block ${isCollapsed ? 'collapsed' : ''}`}>
          <div className="ug-code-header">
            <div className="ug-code-lang">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 8a1 1 0 01-1.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 111.414-1.414l3 3a1 1 0 010 1.414l-3 3z" clipRule="evenodd" />
              </svg>
              <span>{language === 'zh' ? '代码' : 'Code'}</span>
            </div>
            <div className="ug-code-actions">
              <button
                className="ug-code-action-btn"
                onClick={() => copyCode(code, codeId)}
                data-code-id={codeId}
                title={language === 'zh' ? '复制代码' : 'Copy code'}
              >
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
                <span>{language === 'zh' ? '复制' : 'Copy'}</span>
              </button>
              <button
                className="ug-code-action-btn"
                onClick={() => toggleCodeBlock(codeId)}
                title={isCollapsed ? (language === 'zh' ? '展开代码' : 'Expand') : (language === 'zh' ? '折叠代码' : 'Collapse')}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className={isCollapsed ? 'collapsed' : ''}>
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span>{isCollapsed ? (language === 'zh' ? '展开' : 'Expand') : (language === 'zh' ? '折叠' : 'Collapse')}</span>
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
    a: ({ href, children }) => {
      const handleClick = (e: React.MouseEvent) => {
        e.preventDefault()
        if (href) {
          openUrl(href)
        }
      }
      return (
        <a href={href} onClick={handleClick}>
          {children}
        </a>
      )
    },
  }

  if (!isOpen) return null

  return (
    <>
      <div className="pm-overlay" onClick={handleOverlayClick} aria-hidden="true" />
      
      <div
        ref={modalRef}
        className="pm-modal ug-modal"
        role="dialog"
        aria-modal="true"
        aria-label={language === 'zh' ? '使用手册' : 'User Guide'}
      >
        <div className="pm-modal-header ug-header">
          <div className="ug-header-left">
            <div className="ug-title-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ug-icon">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h2>{language === 'zh' ? '使用手册' : 'User Guide'}</h2>
            </div>
          </div>
          
          <div className="ug-header-actions">
            <button
              className="ug-settings-btn"
              onClick={() => setShowSettings(!showSettings)}
              title={language === 'zh' ? '阅读设置' : 'Reading Settings'}
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>
            {headings.length > 0 && (
              <button
                className={`ug-toc-toggle ${showToc ? 'active' : ''}`}
                onClick={() => setShowToc(!showToc)}
                title={showToc ? (language === 'zh' ? '隐藏目录' : 'Hide TOC') : (language === 'zh' ? '显示目录' : 'Show TOC')}
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
              aria-label={language === 'zh' ? '关闭' : 'Close'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="ug-settings-panel">
            <div className="ug-setting-group">
              <label className="ug-setting-label">{language === 'zh' ? '字号' : 'Font Size'}</label>
              <div className="ug-font-size-control">
                <button onClick={decreaseFontSize} disabled={fontSize <= 12} title={language === 'zh' ? '减小字号' : 'Decrease'}>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
                <span className="ug-font-size-value">{fontSize}px</span>
                <button onClick={increaseFontSize} disabled={fontSize >= 24} title={language === 'zh' ? '增大字号' : 'Increase'}>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div className="ug-font-size-presets">
                {FONT_SIZES.map(size => (
                  <button
                    key={size.value}
                    className={`ug-preset-btn ${fontSize === size.value ? 'active' : ''}`}
                    onClick={() => setFontSize(size.value)}
                  >
                    {language === 'zh' ? size.label : size.labelEn}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="ug-setting-group">
              <label className="ug-setting-label">{language === 'zh' ? '字体' : 'Font Family'}</label>
              <div className="ug-font-family-options">
                {FONT_FAMILIES.map(font => (
                  <button
                    key={font.label}
                    className={`ug-font-btn ${fontFamily === font.value ? 'active' : ''}`}
                    onClick={() => setFontFamily(font.value)}
                    style={{ fontFamily: font.value }}
                  >
                    {language === 'zh' ? font.label : font.labelEn}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="ug-container">
          {showToc && headings.length > 0 && (
            <nav className="ug-toc" aria-label={language === 'zh' ? '文档目录' : 'Table of Contents'}>
              <div className="ug-toc-header">
                <h3>{language === 'zh' ? '目录' : 'Contents'}</h3>
                <span className="ug-toc-count">{headings.length}</span>
              </div>
              <ul className="ug-toc-list" ref={tocListRef}>
                {headings.map((heading) => (
                  <li
                    key={heading.id}
                    className={`ug-toc-item level-${heading.level} ${activeHeading === heading.id ? 'active' : ''}`}
                  >
                    <button data-heading-id={heading.id} onClick={() => scrollToHeading(heading.id)}>
                      {heading.text}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="ug-body" ref={contentRef}>
            <div 
              className="ug-content" 
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
          </div>
        </div>
      </div>
    </>
  )
}
