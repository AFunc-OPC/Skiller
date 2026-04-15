import { useState, useCallback, useMemo } from 'react'
import { useRepositoryStore } from '../../stores/repositoryStore'
import { useAppStore } from '../../stores/appStore'
import { SortDropdown } from '../shared'

interface RepositoryToolbarProps {
  onAddRepository: () => void
}

export function RepositoryToolbar({ onAddRepository }: RepositoryToolbarProps) {
  const { language } = useAppStore()
  const { searchKeyword, viewMode, sortOption, setSearchKeyword, setViewMode, setSortOption } = useRepositoryStore()
  const [inputValue, setInputValue] = useState(searchKeyword)
  
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    
    clearTimeout((window as any).repoSearchTimeout)
    ;(window as any).repoSearchTimeout = setTimeout(() => {
      setSearchKeyword(value)
    }, 300)
  }, [setSearchKeyword])
  
  const handleClearSearch = useCallback(() => {
    setInputValue('')
    setSearchKeyword('')
  }, [setSearchKeyword])
  
  const handleViewModeChange = useCallback((mode: 'card' | 'list') => {
    setViewMode(mode)
  }, [setViewMode])
  
  return (
    <div className="repo-toolbar">
      <div className="repo-search">
        <svg className="repo-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="6" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="search"
          value={inputValue}
          onChange={handleSearchChange}
          placeholder={language === 'zh' ? '搜索仓库' : 'Search repositories'}
          className="repo-search-input"
        />
        {inputValue && (
          <button className="repo-search-clear" onClick={handleClearSearch}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      <div className="repo-actions">
        <SortDropdown
          sortOption={sortOption}
          onSortChange={setSortOption}
        />
        
        <div className="repo-view-toggle">
          <button
            className={viewMode === 'card' ? 'repo-toggle active' : 'repo-toggle'}
            onClick={() => handleViewModeChange('card')}
            title={language === 'zh' ? '卡片视图' : 'Card view'}
          >
            <svg viewBox="0 0 20 20" fill="currentColor">
              <rect x="2" y="2" width="7" height="7" rx="1.5" />
              <rect x="11" y="2" width="7" height="7" rx="1.5" />
              <rect x="2" y="11" width="7" height="7" rx="1.5" />
              <rect x="11" y="11" width="7" height="7" rx="1.5" />
            </svg>
          </button>
          <button
            className={viewMode === 'list' ? 'repo-toggle active' : 'repo-toggle'}
            onClick={() => handleViewModeChange('list')}
            title={language === 'zh' ? '列表视图' : 'List view'}
          >
            <svg viewBox="0 0 20 20" fill="currentColor">
              <rect x="2" y="4" width="16" height="2" rx="0.5" />
              <rect x="2" y="9" width="16" height="2" rx="0.5" />
              <rect x="2" y="14" width="16" height="2" rx="0.5" />
            </svg>
          </button>
        </div>
        
        <button className="repo-btn-primary" onClick={onAddRepository}>
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>{language === 'zh' ? '添加仓库' : 'Add Repo'}</span>
        </button>
      </div>
    </div>
  )
}
