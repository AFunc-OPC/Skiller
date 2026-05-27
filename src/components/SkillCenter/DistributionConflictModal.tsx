import { useAppStore } from '../../stores/appStore'
import type { ConflictInfo } from '../../types'

interface DistributionConflictModalProps {
  conflicts: ConflictInfo[]
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function DistributionConflictModal({ conflicts, onConfirm, onCancel, loading }: DistributionConflictModalProps) {
  const { language } = useAppStore()

  const existingConflicts = conflicts.filter(c => c.exists)

  return (
    <>
      <div className="pm-overlay" onClick={onCancel} />
      <div className="pm-confirm-modal sk-conflict-modal">
        <div className="sk-conflict-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 9v4" strokeLinecap="round" />
            <path d="M12 17h.01" strokeLinecap="round" />
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinejoin="round" />
          </svg>
        </div>
        <h3>{language === 'zh' ? '发现分发冲突' : 'Distribution Conflicts Found'}</h3>
        <p>
          {language === 'zh'
            ? `以下 ${existingConflicts.length} 个技能在目标位置已存在，覆盖后将替换原有内容：`
            : `The following ${existingConflicts.length} skill(s) already exist at the target location. Overwriting will replace existing content:`}
        </p>
        <ul className="sk-conflict-list">
          {existingConflicts.map((conflict) => (
            <li key={`${conflict.skill_id}-${conflict.target_path}`} className="sk-conflict-item">
              <span className="sk-conflict-item-name">{conflict.skill_name}</span>
              <code className="sk-conflict-item-path">{conflict.target_path}</code>
            </li>
          ))}
        </ul>
        <div className="pm-confirm-actions">
          <button className="pm-btn-ghost" onClick={onCancel} disabled={loading}>
            {language === 'zh' ? '取消' : 'Cancel'}
          </button>
          <button className="pm-btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? (language === 'zh' ? '覆盖中...' : 'Overwriting...') : (language === 'zh' ? '覆盖分发' : 'Overwrite & Distribute')}
          </button>
        </div>
      </div>
    </>
  )
}