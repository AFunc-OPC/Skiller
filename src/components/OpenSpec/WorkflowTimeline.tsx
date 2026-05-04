import { Check, Circle } from 'lucide-react'

interface WorkflowTimelineProps {
  currentStage: string
  completedTasks: number
  totalTasks: number
  artifacts: Array<{ name: string; type: string }>
  status: string
  language: 'zh' | 'en'
  isArchived?: boolean
}

const STAGES = ['proposal', 'apply', 'archive']

const STAGE_CONFIG = {
  proposal: { 
    icon: Circle, 
    label: { zh: '提案', en: 'Proposal' },
    description: { zh: '定义问题', en: 'Define problem' }
  },
  apply: { 
    icon: Circle, 
    label: { zh: '实现', en: 'Apply' },
    description: { zh: '编写代码', en: 'Write code' }
  },
  archive: { 
    icon: Circle, 
    label: { zh: '归档', en: 'Archive' },
    description: { zh: '完成归档', en: 'Complete' }
  },
}

export function WorkflowTimeline({ 
  currentStage, 
  completedTasks, 
  totalTasks, 
  artifacts, 
  status,
  language,
  isArchived = false
}: WorkflowTimelineProps) {
  const hasProposal = artifacts.some(a => a.type === 'proposal')
  const isApplyComplete = totalTasks > 0 && completedTasks === totalTasks
  
  const stageCompletion = {
    proposal: hasProposal,
    apply: isApplyComplete,
    archive: isArchived,
  }
  
  const currentIndex = STAGES.indexOf(currentStage)
  const completedCount = STAGES.filter(s => stageCompletion[s as keyof typeof stageCompletion]).length

  return (
    <div className="os-timeline">
      <div className="os-timeline-track">
        <div 
          className="os-timeline-progress" 
          style={{ 
            width: `${Math.max(0, ((completedCount - 1) / (STAGES.length - 1)) * 100)}%` 
          }}
        />
      </div>
      
      <div className="os-timeline-stages">
        {STAGES.map((stage, index) => {
          const isStageCompleted = stageCompletion[stage as keyof typeof stageCompletion]
          const isCurrent = stage === currentStage && !isStageCompleted
          const config = STAGE_CONFIG[stage as keyof typeof STAGE_CONFIG]

          return (
            <div 
              key={stage} 
              className={`os-stage ${isStageCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
              style={{ '--stage-index': index } as React.CSSProperties}
            >
              <div className="os-stage-node-container">
                <div className={`os-stage-node ${isStageCompleted ? 'completed' : isCurrent ? 'current' : 'pending'}`}>
                  <div className="os-node-inner">
                    {isStageCompleted ? (
                      <Check className="os-node-icon" />
                    ) : isCurrent ? (
                      <Circle className="os-node-icon" />
                    ) : (
                      <span className="os-node-number">{index + 1}</span>
                    )}
                  </div>
                  {isCurrent && <div className="os-node-pulse" />}
                </div>
              </div>
              
              <div className="os-stage-info">
                <span className={`os-stage-label ${isCurrent ? 'active' : ''}`}>
                  {config.label[language]}
                </span>
                <span className="os-stage-desc">
                  {config.description[language]}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
