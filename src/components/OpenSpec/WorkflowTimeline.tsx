import { Check, Circle, Loader2 } from 'lucide-react'

interface WorkflowTimelineProps {
  currentStage: string
  language: 'zh' | 'en'
}

const STAGES = ['propose', 'new', 'continue', 'apply', 'verify', 'archive']

const STAGE_CONFIG = {
  propose: { 
    icon: Circle, 
    label: { zh: '提案', en: 'Propose' },
    description: { zh: '定义问题', en: 'Define problem' }
  },
  new: { 
    icon: Circle, 
    label: { zh: '新建', en: 'New' },
    description: { zh: '创建变更', en: 'Create change' }
  },
  continue: { 
    icon: Circle, 
    label: { zh: '迭代', en: 'Iterate' },
    description: { zh: '完善设计', en: 'Refine design' }
  },
  apply: { 
    icon: Circle, 
    label: { zh: '实现', en: 'Apply' },
    description: { zh: '编写代码', en: 'Write code' }
  },
  verify: { 
    icon: Circle, 
    label: { zh: '验证', en: 'Verify' },
    description: { zh: '测试验证', en: 'Test & verify' }
  },
  archive: { 
    icon: Circle, 
    label: { zh: '归档', en: 'Archive' },
    description: { zh: '完成归档', en: 'Complete' }
  },
}

export function WorkflowTimeline({ currentStage, language }: WorkflowTimelineProps) {
  const currentIndex = STAGES.indexOf(currentStage)

  return (
    <div className="os-timeline">
      <div className="os-timeline-track">
        <div 
          className="os-timeline-progress" 
          style={{ 
            width: `${Math.max(0, (currentIndex / (STAGES.length - 1)) * 100)}%` 
          }}
        />
      </div>
      
      <div className="os-timeline-stages">
        {STAGES.map((stage, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = index === currentIndex
          const config = STAGE_CONFIG[stage as keyof typeof STAGE_CONFIG]

          return (
            <div 
              key={stage} 
              className={`os-stage ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
              style={{ '--stage-index': index } as React.CSSProperties}
            >
              <div className="os-stage-node-container">
                <div className={`os-stage-node ${isCompleted ? 'completed' : isCurrent ? 'current' : 'pending'}`}>
                  <div className="os-node-inner">
                    {isCompleted ? (
                      <Check className="os-node-icon" />
                    ) : isCurrent ? (
                      <Loader2 className="os-node-icon animate-spin" />
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
