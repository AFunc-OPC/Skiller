import { useEffect } from 'react'
import { useClawhubStore } from '../../stores/clawhubStore'
import { useAppStore } from '../../stores/appStore'
import { t } from '../../i18n'
import { SourceSidebar } from './SourceSidebar'
import { SkillGrid } from './SkillGrid'

export function ClawHubPage() {
  const { language } = useAppStore()
  const {
    sources,
    selectedSourceId,
    fetchSources,
    selectSource,
    error,
    clearError,
  } = useClawhubStore()

  const enabledSources = sources.filter(s => s.is_enabled)
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
    if (selectedSource?.is_enabled) {
      return
    }

    const firstEnabledSource = enabledSources[0]

    if (firstEnabledSource) {
      selectSource(firstEnabledSource.id)
    }
  }, [enabledSources, selectedSource, selectSource])

  const handleSelectSource = (id: string | null) => {
    selectSource(id)
  }

  return (
    <div className="clawhub-layout">
      <SourceSidebar
        language={language}
        sources={enabledSources}
        selectedSourceId={selectedSourceId}
        onSelectSource={handleSelectSource}
      />
      <div className="clawhub-content">
        {error && (
          <div className="clawhub-error-banner" onClick={clearError}>
            {error}
          </div>
        )}
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
              <div className="clawhub-context-copy">
                <span className="clawhub-context-label">ClawHub</span>
                <h2 className="clawhub-context-title">{selectedSource.name}</h2>
                <p className="clawhub-context-description">
                  {language === 'zh'
                    ? '在应用内浏览、筛选并导入线上技能。'
                    : 'Browse, filter, and import hosted skills without leaving the workspace.'}
                </p>
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
    </div>
  )
}
