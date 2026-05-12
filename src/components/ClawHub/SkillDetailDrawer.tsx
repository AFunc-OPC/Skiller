import { useState, memo } from 'react'
import { useClawhubStore } from '../../stores/clawhubStore'
import { t } from '../../i18n'
import type { ClawhubSkillDetail } from '../../types'
import { ImportButton } from './ImportButton'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface SkillDetailDrawerProps {
  language: 'zh' | 'en'
  sourceId: string
  skill: ClawhubSkillDetail
  loading: boolean
  onClose: () => void
}

export function SkillDetailDrawer({ language, sourceId, skill, loading, onClose }: SkillDetailDrawerProps) {
  return (
    <div className="clawhub-drawer-overlay" onClick={onClose}>
      <div className="clawhub-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="clawhub-drawer-header">
          <div className="clawhub-drawer-title">
            <h2>{skill.name}</h2>
            <span className="clawhub-drawer-slug">{skill.slug}</span>
          </div>
          <button className="clawhub-drawer-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="clawhub-drawer-content">
          {loading ? (
            <div className="clawhub-loading">
              <div className="clawhub-spinner" />
            </div>
          ) : (
            <>
              <div className="clawhub-drawer-meta">
                {skill.description && (
                  <p className="clawhub-drawer-desc">{skill.description}</p>
                )}
                <div className="clawhub-drawer-badges">
                  {skill.version && (
                    <span className="clawhub-badge">{t('clawhubVersion', language)}: v{skill.version}</span>
                  )}
                  {skill.downloads !== null && skill.downloads !== undefined && (
                    <span className="clawhub-badge">{t('clawhubDownloads', language)}: {skill.downloads}</span>
                  )}
                  {skill.rating !== null && skill.rating !== undefined && (
                    <span className="clawhub-badge">{t('clawhubSortRating', language)}: {skill.rating.toFixed(1)}</span>
                  )}
                </div>
              </div>

              <div className="clawhub-drawer-actions">
                <ImportButton language={language} slug={skill.slug} sourceId={sourceId} />
              </div>

              {skill.skill_md_content && (
                <div className="clawhub-drawer-preview">
                  <h4>SKILL.md</h4>
                  <div className="clawhub-drawer-markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {skill.skill_md_content}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}