import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useClawhubStore } from '../../stores/clawhubStore'
import type { ClawhubSkillOverview } from '../../types'
import { ImportButton } from './ImportButton'

interface SkillDetailDrawerProps {
  language: 'zh' | 'en'
  sourceId: string
  skill: ClawhubSkillOverview
  loading: boolean
  onClose: () => void
}

type DetailTab = 'overview' | 'versions' | 'files'

function formatTabLabel(tab: DetailTab) {
  if (tab === 'overview') return 'Overview'
  if (tab === 'versions') return 'Versions'
  return 'Files'
}

export function SkillDetailDrawer({ language, sourceId, skill, loading, onClose }: SkillDetailDrawerProps) {
  const {
    activeDetailTab,
    skillVersions,
    versionsLoading,
    skillFiles,
    filesLoading,
    fileContent,
    fileContentLoading,
    selectedVersion,
    selectedFilePath,
    setActiveDetailTab,
    loadSkillVersions,
    loadSkillFiles,
    readSkillFile,
    selectDetailVersion,
  } = useClawhubStore()

  const handleTabChange = (tab: DetailTab) => {
    setActiveDetailTab(tab)

    if (tab === 'versions' && !skillVersions && !versionsLoading) {
      void loadSkillVersions(sourceId, skill.slug)
    }

    if (tab === 'files' && !skillFiles && !filesLoading) {
      void loadSkillFiles(sourceId, skill.slug, selectedVersion ?? undefined)
    }
  }

  const handleVersionSelect = (version: string) => {
    selectDetailVersion(version)
    void loadSkillFiles(sourceId, skill.slug, version)
  }

  const handleFileSelect = (path: string) => {
    void readSkillFile(sourceId, skill.slug, path, selectedVersion ?? undefined)
  }

  return (
    <div className="clawhub-drawer-overlay" onClick={onClose}>
      <div className="clawhub-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="clawhub-drawer-header">
          <div className="clawhub-drawer-title-block">
            <span className="clawhub-drawer-eyebrow">ClawHub</span>
            <div className="clawhub-drawer-title">
              <h2>{skill.name}</h2>
              <span className="clawhub-drawer-slug">{skill.slug}</span>
            </div>
          </div>
          <button className="clawhub-drawer-close" onClick={onClose} aria-label="Close" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="clawhub-drawer-tabs" role="tablist" aria-label="ClawHub detail tabs">
          {(['overview', 'versions', 'files'] as DetailTab[]).map((tab) => (
            <button
              key={tab}
              role="tab"
              type="button"
              aria-selected={activeDetailTab === tab}
              className={`clawhub-drawer-tab ${activeDetailTab === tab ? 'active' : ''}`}
              onClick={() => handleTabChange(tab)}
            >
              {formatTabLabel(tab)}
            </button>
          ))}
        </div>

        <div className="clawhub-drawer-content">
          {loading ? (
            <div className="clawhub-loading">
              <div className="clawhub-spinner" />
            </div>
          ) : (
            <>
              {activeDetailTab === 'overview' && (
                <>
                  <div className="clawhub-drawer-meta">
                    {(skill.summary || skill.description) && (
                      <p className="clawhub-drawer-desc">{skill.summary || skill.description}</p>
                    )}
                    <div className="clawhub-drawer-badges">
                      {skill.version && (
                        <span className="clawhub-badge">Version: v{skill.version}</span>
                      )}
                      {skill.downloads !== null && skill.downloads !== undefined && (
                        <span className="clawhub-badge">Downloads: {skill.downloads}</span>
                      )}
                      {skill.rating !== null && skill.rating !== undefined && (
                        <span className="clawhub-badge">Rating: {skill.rating.toFixed(1)}</span>
                      )}
                      {skill.owner_name && (
                        <span className="clawhub-badge">Owner: {skill.owner_name}</span>
                      )}
                    </div>
                  </div>

                  <div className="clawhub-drawer-actions">
                    <ImportButton language={language} slug={skill.slug} sourceId={sourceId} />
                  </div>
                </>
              )}

              {activeDetailTab === 'versions' && (
                <div className="clawhub-drawer-section">
                  {versionsLoading && <div className="clawhub-loading"><div className="clawhub-spinner" /></div>}
                  {!versionsLoading && skillVersions && (
                    <div className="clawhub-drawer-list">
                      {skillVersions.map((versionItem) => (
                        <button
                          key={versionItem.version}
                          type="button"
                          className={`clawhub-drawer-list-item ${selectedVersion === versionItem.version ? 'active' : ''}`}
                          onClick={() => handleVersionSelect(versionItem.version)}
                        >
                          <span>{versionItem.version}</span>
                          {versionItem.is_latest && <span>latest</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeDetailTab === 'files' && (
                <div className="clawhub-drawer-files">
                  <div className="clawhub-drawer-file-list">
                    {filesLoading && <div className="clawhub-loading"><div className="clawhub-spinner" /></div>}
                    {!filesLoading && skillFiles && skillFiles.map((file) => (
                      <button
                        key={file.path}
                        type="button"
                        className={`clawhub-drawer-file-item ${selectedFilePath === file.path ? 'active' : ''}`}
                        onClick={() => handleFileSelect(file.path)}
                      >
                        {file.path}
                      </button>
                    ))}
                  </div>

                  <div className="clawhub-drawer-file-content">
                    {fileContentLoading && <div className="clawhub-loading"><div className="clawhub-spinner" /></div>}
                    {!fileContentLoading && fileContent?.content && fileContent.is_markdown && (
                      <div className="clawhub-drawer-markdown">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {fileContent.content}
                        </ReactMarkdown>
                      </div>
                    )}
                    {!fileContentLoading && fileContent?.content && !fileContent.is_markdown && (
                      <pre className="clawhub-drawer-plaintext">{fileContent.content}</pre>
                    )}
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
