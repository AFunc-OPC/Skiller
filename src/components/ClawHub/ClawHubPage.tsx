import { useEffect, useState } from 'react'
import { useClawhubStore } from '../../stores/clawhubStore'
import { useAppStore } from '../../stores/appStore'
import { t } from '../../i18n'
import { SourceSidebar } from './SourceSidebar'
import { SkillGrid } from './SkillGrid'
import { AlertDialog } from '../AlertDialog'

function CopyButton({ text, language }: { text: string; language: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      console.error('Failed to copy')
    }
  }

  return (
    <button className="clawhub-copy-btn" onClick={handleCopy} title={copied ? (language === 'zh' ? '已复制' : 'Copied') : (language === 'zh' ? '复制' : 'Copy')}>
      {copied ? (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M13.5 4.5L6 12l-3-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="5" y="5" width="8" height="9" rx="1" />
          <path d="M3 11V3a1 1 0 011-1h6" strokeLinecap="round" />
        </svg>
      )}
    </button>
  )
}

export function ClawHubPage() {
  const { language } = useAppStore()
  const {
    sources,
    selectedSourceId,
    fetchSources,
    selectSource,
    error,
    clearError,
    alertDialog,
    clearAlertDialog,
  } = useClawhubStore()

  const selectedSource = sources.find(s => s.id === selectedSourceId)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchSources()
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [fetchSources])

  useEffect(() => {
    if (selectedSource) {
      return
    }

    const firstSource = sources[0]

    if (firstSource) {
      selectSource(firstSource.id)
    }
  }, [sources, selectedSource, selectSource])

  const handleSelectSource = (id: string | null) => {
    selectSource(id)
  }

  return (
    <div className="clawhub-layout">
      <SourceSidebar
        language={language}
        sources={sources}
        selectedSourceId={selectedSourceId}
        onSelectSource={handleSelectSource}
      />
      <div className="clawhub-content">
        {!selectedSource ? (
          <div className="clawhub-empty-state">
            <div className="clawhub-empty-icon">
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="24" cy="24" r="18" />
                <path d="M24 6a18 18 0 014 10 18 18 0 01-4 10 18 18 0 01-4-10A18 18 0 0124 6z" />
                <path d="M6 24h36" />
              </svg>
            </div>
            <h3>{t('clawhubSelectSource', language)}</h3>
            <p>{t('clawhubNoSources', language)}</p>
          </div>
        ) : (
          <div className="clawhub-main-panel">
            <div className="clawhub-context-band">
              <div className="clawhub-context-info">
                <span className="clawhub-context-label">ClawHub</span>
                <h2 className="clawhub-context-title">{selectedSource.name}</h2>
              </div>
              <div className="clawhub-context-url">
                <span className="clawhub-context-url-text" title={selectedSource.registry_url}>
                  {selectedSource.registry_url}
                </span>
                <CopyButton text={selectedSource.registry_url} language={language} />
              </div>
            </div>
            <SkillGrid
              language={language}
              sourceId={selectedSourceId!}
              sourceName={selectedSource.name}
            />
          </div>
        )}
      </div>
      {alertDialog && (
        <AlertDialog dialog={alertDialog} onClose={clearAlertDialog} confirmLabel={language === 'zh' ? '确定' : 'OK'} />
      )}
    </div>
  )
}
