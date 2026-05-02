import { useState, useEffect } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { openspecApi } from '../../api/openspec'
import type { OpenSpecArtifactInfo } from '../../types'

interface ArtifactPreviewProps {
  projectPath: string
  changeId: string
  artifacts: OpenSpecArtifactInfo[]
  language: 'zh' | 'en'
}

export function ArtifactPreview({
  projectPath,
  changeId,
  artifacts,
  language,
}: ArtifactPreviewProps) {
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sortedArtifacts = [...artifacts].sort((a, b) => {
    const order = ['proposal', 'design', 'tasks', 'spec']
    return order.indexOf(a.type) - order.indexOf(b.type)
  })

  useEffect(() => {
    if (sortedArtifacts.length > 0 && !activeTab) {
      setActiveTab(sortedArtifacts[0].name)
    }
  }, [sortedArtifacts, activeTab])

  useEffect(() => {
    if (!activeTab) return

    const fetchContent = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await openspecApi.readArtifact(projectPath, changeId, activeTab)
        setContent(result)
      } catch (err) {
        setError(String(err))
      } finally {
        setLoading(false)
      }
    }

    fetchContent()
  }, [projectPath, changeId, activeTab])

  const activeArtifact = artifacts.find((a) => a.name === activeTab)

  const handleOpenInFileManager = async () => {
    if (!activeArtifact) return
    const { desktopApi } = await import('../../api/desktop')
    const parentDir = activeArtifact.path.substring(0, activeArtifact.path.lastIndexOf('/'))
    desktopApi.openFolder(parentDir)
  }

  if (artifacts.length === 0) {
    return (
      <div className="os-artifact-preview">
        <div className="os-empty-main">
          <FileText className="w-8 h-8 mb-2 opacity-50" />
          <p>{language === 'zh' ? '暂无产物文件' : 'No artifacts yet'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="os-artifact-preview">
      <div className="os-artifact-tabs">
        {sortedArtifacts.map((artifact) => (
          <button
            key={artifact.name}
            className={`os-artifact-tab ${activeTab === artifact.name ? 'active' : ''}`}
            onClick={() => setActiveTab(artifact.name)}
          >
            {artifact.name}
          </button>
        ))}
      </div>

      {activeArtifact && (
        <div className="os-artifact-path" onClick={handleOpenInFileManager}>
          {activeArtifact.path}
        </div>
      )}

      <div className="os-artifact-content">
        {loading ? (
          <div className="os-artifact-loading">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="os-artifact-error">
            <p>{error}</p>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap text-sm">{content}</pre>
        )}
      </div>
    </div>
  )
}
