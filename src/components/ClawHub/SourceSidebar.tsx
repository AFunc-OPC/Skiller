import { memo } from 'react'
import { useAppStore } from '../../stores/appStore'
import { t } from '../../i18n'
import type { ClawhubSource } from '../../types'

interface SourceSidebarProps {
  language: 'zh' | 'en'
  sources: ClawhubSource[]
  selectedSourceId: string | null
  onSelectSource: (id: string | null) => void
}

export function SourceSidebar({ language, sources, selectedSourceId, onSelectSource }: SourceSidebarProps) {
  const handleGoToSettings = () => {
    const event = new CustomEvent('navigate-to-settings', { detail: { tab: 'clawhub' } })
    window.dispatchEvent(event)
  }

  return (
    <aside className="clawhub-sidebar glass-panel">
      <div className="clawhub-sidebar-header">
        <h3>{language === 'zh' ? '数据源' : 'Sources'}</h3>
      </div>
      
      <div className="clawhub-sidebar-list">
        {sources.length === 0 ? (
          <div className="clawhub-sidebar-empty">
            <p>{t('clawhubNoSources', language)}</p>
            <button className="pm-btn-primary" onClick={handleGoToSettings}>
              {t('clawhubGoToSettings', language)}
            </button>
          </div>
        ) : (
          sources.map((source) => (
            <button
              key={source.id}
              className={`clawhub-source-item ${selectedSourceId === source.id ? 'active' : ''}`}
              onClick={() => onSelectSource(source.id)}
            >
              <div className="clawhub-source-icon">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25">
                  <circle cx="10" cy="10" r="7.5" />
                  <path d="M2 10h16M10 2a13 13 0 014 8 13 13 0 01-4 8 13 13 0 01-4-8 13 13 0 014-8z" />
                </svg>
              </div>
              <div className="clawhub-source-info">
                <span className="clawhub-source-name">{source.name}</span>
                <span className="clawhub-source-type">
                  {source.connection_type === 'api' ? 'API' : 'CLI'}
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      {sources.length > 0 && (
        <div className="clawhub-sidebar-footer">
          <button className="clawhub-add-source-btn" onClick={handleGoToSettings}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 4v12M4 10h12" />
            </svg>
            {language === 'zh' ? '管理源' : 'Manage Sources'}
          </button>
        </div>
      )}
    </aside>
  )
}