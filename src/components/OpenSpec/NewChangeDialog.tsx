import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { useOpenSpecStore } from '../../stores/openspecStore'
import { t } from '../../i18n'

interface NewChangeDialogProps {
  projectId: string
  projectPath: string
  language: 'zh' | 'en'
  onClose: () => void
}

export function NewChangeDialog({ projectId, projectPath, language, onClose }: NewChangeDialogProps) {
  const { executeAction, commandLoading, refresh } = useOpenSpecStore()
  const [changeName, setChangeName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!changeName.trim()) {
      setError(t('openspecEnterChangeName', language))
      return
    }

    const kebabName = changeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    if (!kebabName) {
      setError(t('openspecInvalidChangeName', language))
      return
    }

    const result = await executeAction(projectPath, 'propose', [kebabName])

    if (result?.success) {
      refresh(projectId, projectPath)
      onClose()
    } else {
      setError(result?.stderr || 'Unknown error')
    }
  }

  return (
    <div className="os-dialog-overlay" onClick={onClose}>
      <div className="os-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="os-dialog-header">
          <h3>{t('openspecNewProposal', language)}</h3>
          <p>{t('openspecCreateChangeDesc', language)}</p>
        </div>
        <div className="os-dialog-body">
          <input
            type="text"
            className="os-dialog-input"
            value={changeName}
            onChange={(e) => {
              setChangeName(e.target.value)
              setError(null)
            }}
            placeholder={t('openspecChangeNamePlaceholder', language)}
            autoFocus
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
        <div className="os-dialog-footer">
          <button className="os-action-btn secondary" onClick={onClose}>
            {t('cancel', language)}
          </button>
          <button
            className="os-action-btn primary"
            onClick={handleSubmit}
            disabled={commandLoading}
          >
            {commandLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>{t('openspecCreate', language)}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
