interface ViewToggleProps {
  viewMode: 'card' | 'list'
  onViewModeChange: (mode: 'card' | 'list') => void
}

export function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
    <div className="skill-view-toggle">
      <button
        onClick={() => onViewModeChange('card')}
        className={`skill-toggle-btn ${viewMode === 'card' ? 'active' : ''}`}
        title="卡片视图"
      >
        <svg viewBox="0 0 20 20" fill="currentColor">
          <rect x="2" y="2" width="7" height="7" rx="1.5" />
          <rect x="11" y="2" width="7" height="7" rx="1.5" />
          <rect x="2" y="11" width="7" height="7" rx="1.5" />
          <rect x="11" y="11" width="7" height="7" rx="1.5" />
        </svg>
      </button>
      <button
        onClick={() => onViewModeChange('list')}
        className={`skill-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
        title="列表视图"
      >
        <svg viewBox="0 0 20 20" fill="currentColor">
          <rect x="2" y="4" width="16" height="2" rx="0.5" />
          <rect x="2" y="9" width="16" height="2" rx="0.5" />
          <rect x="2" y="14" width="16" height="2" rx="0.5" />
        </svg>
      </button>
    </div>
  )
}
