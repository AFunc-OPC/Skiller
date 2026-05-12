import { memo } from 'react'
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
    selectSource,
    exploreSkills,
    searchSkills,
    searchQuery,
    skillsLoading,
    error,
    clearError,
  } = useClawhubStore()

  const enabledSources = sources.filter(s => s.is_enabled)
  const selectedSource = sources.find(s => s.id === selectedSourceId)

  const handleSelectSource = (id: string | null) => {
    selectSource(id)
    if (id) {
      exploreSkills(id)
    }
  }

  const handleSearch = (query: string) => {
    if (selectedSourceId) {
      searchSkills(selectedSourceId, query)
    }
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
          <SkillGrid
            language={language}
            sourceId={selectedSourceId!}
            sourceName={selectedSource.name}
          />
        )}
      </div>
    </div>
  )
}