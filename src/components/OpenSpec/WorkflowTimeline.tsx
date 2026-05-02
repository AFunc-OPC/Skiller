import { Check } from 'lucide-react'

interface WorkflowTimelineProps {
  currentStage: string
  language: 'zh' | 'en'
}

const STAGES = ['propose', 'new', 'continue', 'apply', 'verify', 'archive']

const STAGE_LABELS: Record<string, Record<'zh' | 'en', string>> = {
  propose: { zh: '提案', en: 'Propose' },
  new: { zh: '新建', en: 'New' },
  continue: { zh: '迭代', en: 'Continue' },
  apply: { zh: '实现', en: 'Apply' },
  verify: { zh: '验证', en: 'Verify' },
  archive: { zh: '归档', en: 'Archive' },
}

export function WorkflowTimeline({ currentStage, language }: WorkflowTimelineProps) {
  const currentIndex = STAGES.indexOf(currentStage)

  return (
    <div className="os-timeline">
      <div className="os-timeline-stages">
        {STAGES.map((stage, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = index === currentIndex
          const isPending = index > currentIndex

          return (
            <div key={stage} className="os-stage">
              <div
                className={`os-stage-node ${
                  isCompleted ? 'completed' : isCurrent ? 'current' : 'pending'
                }`}
              >
                {isCompleted && <Check className="w-3 h-3" />}
              </div>
              <span
                className={`os-stage-label ${
                  isCurrent ? 'active' : ''
                }`}
              >
                {STAGE_LABELS[stage][language]}
              </span>
              {index < STAGES.length - 1 && (
                <div
                  className={`os-stage-connector ${
                    isCompleted ? 'completed' : ''
                  }`}
                  style={{
                    position: 'absolute',
                    left: '100%',
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
