import { useAppStore } from '../../stores/appStore'
import { SkillDistributionPanel } from './SkillDistributionPanel'
import type { SkillDistributionMode } from '../../types'

interface BatchDistributionModalProps {
  skillIds: string[]
  skillNames: string[]
  isOpen: boolean
  onClose: () => void
  modeLocked?: SkillDistributionMode
}

export function BatchDistributionModal({ skillIds, skillNames, isOpen, onClose, modeLocked }: BatchDistributionModalProps) {
  const { language } = useAppStore()

  if (!isOpen) return null

  return (
    <>
      <div className="pm-overlay" onClick={onClose} />
      <div className="pm-modal sk-batch-distribution-modal" role="dialog" aria-modal="true" aria-labelledby="batch-dist-title">
        <div className="pm-modal-header">
          <h2 id="batch-dist-title">
            {language === 'zh' ? '批量分发技能' : 'Batch Distribute Skills'}
          </h2>
          <button className="pm-modal-close" onClick={onClose} aria-label={language === 'zh' ? '关闭' : 'Close'}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="pm-modal-body sk-batch-distribution-body">
          <SkillDistributionPanel
            skillIds={skillIds}
            skillNames={skillNames}
            onSuccess={onClose}
            modeLocked={modeLocked}
          />
        </div>
      </div>
    </>
  )
}
