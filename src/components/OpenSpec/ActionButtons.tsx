import { useState } from 'react'
import { Play, CheckCircle, Archive, Loader2 } from 'lucide-react'
import { useOpenSpecStore } from '../../stores/openspecStore'
import type { OpenSpecChangeInfo } from '../../types'

interface ActionButtonsProps {
  projectPath: string
  change: OpenSpecChangeInfo
  language: 'zh' | 'en'
}

const STAGE_ACTIONS: Record<string, { action: string; labelZh: string; labelEn: string }[]> = {
  propose: [{ action: 'new', labelZh: '继续推进', labelEn: 'Continue' }],
  new: [
    { action: 'continue', labelZh: '迭代', labelEn: 'Iterate' },
    { action: 'apply', labelZh: '执行实现', labelEn: 'Apply' },
  ],
  continue: [
    { action: 'continue', labelZh: '继续迭代', labelEn: 'Continue' },
    { action: 'apply', labelZh: '执行实现', labelEn: 'Apply' },
  ],
  apply: [{ action: 'verify', labelZh: '验证实现', labelEn: 'Verify' }],
  verify: [{ action: 'archive', labelZh: '归档变更', labelEn: 'Archive' }],
  archive: [],
}

export function ActionButtons({ projectPath, change, language }: ActionButtonsProps) {
  const { executeAction, commandLoading, refresh } = useOpenSpecStore()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  const actions = STAGE_ACTIONS[change.currentStage] || []

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

  if (actions.length === 0 || change.status === 'complete') {
    return null
  }

  return (
    <>
      <div className="os-actions">
        {actions.map((actionInfo) => (
          <button
            key={actionInfo.action}
            className="os-action-btn primary"
            onClick={() => handleActionClick(actionInfo.action)}
            disabled={commandLoading}
          >
            {commandLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : actionInfo.action === 'archive' ? (
              <Archive className="w-4 h-4" />
            ) : actionInfo.action === 'verify' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span>{language === 'zh' ? actionInfo.labelZh : actionInfo.labelEn}</span>
          </button>
        ))}
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
