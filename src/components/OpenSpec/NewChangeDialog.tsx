import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { useOpenSpecStore } from '../../stores/openspecStore'

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
      setError(language === 'zh' ? '请输入变更名称' : 'Please enter a change name')
      return
    }

    const kebabName = changeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    if (!kebabName) {
      setError(language === 'zh' ? '变更名称无效' : 'Invalid change name')
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
          <h3>{language === 'zh' ? '新建变更' : 'New Change'}</h3>
          <p>
            {language === 'zh'
              ? '创建一个新的 OpenSpec 变更'
              : 'Create a new OpenSpec change'}
          </p>
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
            placeholder={language === 'zh' ? '变更名称 (kebab-case)' : 'Change name (kebab-case)'}
            autoFocus
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
        <div className="os-dialog-footer">
          <button className="os-action-btn secondary" onClick={onClose}>
            {language === 'zh' ? '取消' : 'Cancel'}
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
            <span>{language === 'zh' ? '创建' : 'Create'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
