import { useState } from 'react'
import { Play, CheckCircle, Archive, Loader2 } from 'lucide-react'
import { useOpenSpecStore } from '../../stores/openspecStore'
import type { OpenSpecChangeInfo } from '../../types'

interface ActionButtonsProps {
  projectPath: string
  change: OpenSpecChangeInfo
  language: 'zh' | 'en'
}

export function ActionButtons({ projectPath, change, language }: ActionButtonsProps) {
  const { executeAction, commandLoading, refresh } = useOpenSpecStore()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  const handleActionClick = (action: string) => {
    setPendingAction(action)
    setConfirmOpen(true)
  }

  const handleConfirm = async () => {
    if (!pendingAction) return

    setConfirmOpen(false)
    const result = await executeAction(projectPath, pendingAction, [change.name])

    if (result?.success) {
      refresh(projectPath)
    }
  }

  if (change.status === 'complete') {
    return null
  }

  return (
    <>
      <div className="os-actions">
        <button
          className="os-action-btn primary"
          onClick={() => handleActionClick('continue')}
          disabled={commandLoading}
        >
          {commandLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          <span>{language === 'zh' ? '继续推进' : 'Continue'}</span>
        </button>
      </div>

      {confirmOpen && (
        <div className="os-dialog-overlay" onClick={() => setConfirmOpen(false)}>
          <div className="os-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="os-dialog-header">
              <h3>
                {language === 'zh' ? '确认操作' : 'Confirm Action'}
              </h3>
              <p>
                {language === 'zh'
                  ? `确定要执行 "${pendingAction}" 操作吗？`
                  : `Are you sure you want to "${pendingAction}"?`}
              </p>
            </div>
            <div className="os-dialog-footer">
              <button
                className="os-action-btn secondary"
                onClick={() => setConfirmOpen(false)}
              >
                {language === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                className="os-action-btn primary"
                onClick={handleConfirm}
              >
                {language === 'zh' ? '确认' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
