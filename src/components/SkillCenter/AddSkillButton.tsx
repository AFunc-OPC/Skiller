import { useEffect, useRef } from 'react'
import { ImportDropdown } from './ImportDropdown'
import { Language } from '../../stores/appStore'

interface AddSkillButtonProps {
  open: boolean
  onOpen: () => void
  onClose: () => void
  onFileImport: () => void
  onNpxFindImport: () => void
  onNpxImport: () => void
  onRepoImport: () => void
  language: Language
}

export function AddSkillButton({
  open,
  onOpen,
  onClose,
  onFileImport,
  onNpxFindImport,
  onNpxImport,
  onRepoImport,
  language,
}: AddSkillButtonProps) {
  const closeTimerRef = useRef<number | null>(null)

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const scheduleClose = () => {
    clearCloseTimer()
    closeTimerRef.current = window.setTimeout(() => {
      onClose()
    }, 150)
  }

  useEffect(() => {
    return () => clearCloseTimer()
  }, [])

  const handleImportType = (type: 'file' | 'npxFind' | 'npx' | 'repository') => {
    onClose()
    if (type === 'file') onFileImport()
    else if (type === 'npxFind') onNpxFindImport()
    else if (type === 'npx') onNpxImport()
    else onRepoImport()
  }

  return (
    <div
      className="skill-add-wrap"
      onMouseEnter={() => {
        clearCloseTimer()
        onOpen()
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        onClick={onOpen}
        className="skill-add-btn"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="skill-add-icon-main">
          <path d="M10 4v12M4 10h12" strokeLinecap="round" />
        </svg>
        <span className="skill-add-text">{language === 'zh' ? '添加技能' : 'Add Skill'}</span>
        <svg viewBox="0 0 20 20" fill="currentColor" className={`skill-add-icon-chevron ${open ? 'open' : ''}`}>
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="skill-add-dropdown">
          <ImportDropdown onSelect={handleImportType} language={language} />
        </div>
      )}
    </div>
  )
}
