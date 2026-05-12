import { memo } from 'react'
import { t } from '../../i18n'

interface EmptyStateProps {
  language: 'zh' | 'en'
  type: 'noSources' | 'noResults' | 'noSkills'
}

export function EmptyState({ language, type }: EmptyStateProps) {
  const messages = {
    noSources: {
      title: t('clawhubNoSources', language),
      description: language === 'zh'
        ? '请先在设置中添加数据源'
        : 'Add a data source in Settings first',
    },
    noResults: {
      title: t('clawhubNoResults', language),
      description: language === 'zh'
        ? '试试其他关键词'
        : 'Try different keywords',
    },
    noSkills: {
      title: language === 'zh' ? '暂无技能' : 'No skills available',
      description: language === 'zh'
        ? '此数据源中暂无可浏览的技能'
        : 'No skills to browse in this source',
    },
  }

  const msg = messages[type]

  return (
    <div className="clawhub-empty-state">
      <div className="clawhub-empty-icon">
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="24" cy="24" r="18" />
          <path d="M24 16v16M16 24h16" />
        </svg>
      </div>
      <h3>{msg.title}</h3>
      <p>{msg.description}</p>
    </div>
  )
}