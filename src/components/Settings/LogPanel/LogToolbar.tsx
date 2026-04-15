import { useState } from 'react'
import type { LogFilter, LogStats } from '../../../api/log'

interface LogToolbarProps {
  language: 'zh' | 'en'
  stats: LogStats
  filter: LogFilter
  onFilterChange: (filter: Partial<LogFilter>) => void
  onExport: (format: 'txt' | 'json') => void
  onClear: () => void
}

export function LogToolbar({
  language,
  stats,
  filter,
  onFilterChange,
  onExport,
  onClear,
}: LogToolbarProps) {
  const [searchValue, setSearchValue] = useState(filter.keyword || '')
  
  const handleSearch = () => {
    onFilterChange({ keyword: searchValue || undefined })
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }
  
  const labels = {
    level: language === 'zh' ? '日志级别' : 'Level',
    all: language === 'zh' ? '全部' : 'All',
    info: language === 'zh' ? '信息' : 'Info',
    warn: language === 'zh' ? '警告' : 'Warn',
    error: language === 'zh' ? '错误' : 'Error',
    search: language === 'zh' ? '搜索' : 'Search',
    exportTxt: language === 'zh' ? '导出 TXT' : 'Export TXT',
    exportJson: language === 'zh' ? '导出 JSON' : 'Export JSON',
    clear: language === 'zh' ? '清空' : 'Clear',
  }
  
  return (
    <div className="log-toolbar">
      <div className="log-toolbar-left">
        <div className="log-filter-group">
          <label>{labels.level}</label>
          <select
            value={filter.level || ''}
            onChange={(e) => onFilterChange({ level: e.target.value || undefined })}
            className="log-select"
          >
            <option value="">{labels.all} ({stats.total})</option>
            <option value="INFO">{labels.info} ({stats.info_count})</option>
            <option value="WARN">{labels.warn} ({stats.warn_count})</option>
            <option value="ERROR">{labels.error} ({stats.error_count})</option>
          </select>
        </div>
        
        <div className="log-search-group">
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={labels.search}
            className="log-search-input"
          />
          <button onClick={handleSearch} className="log-button">
            {labels.search}
          </button>
        </div>
      </div>
      
      <div className="log-toolbar-right">
        <button 
          onClick={() => onExport('txt')} 
          className="log-button log-button-secondary"
        >
          {labels.exportTxt}
        </button>
        <button 
          onClick={() => onExport('json')} 
          className="log-button log-button-secondary"
        >
          {labels.exportJson}
        </button>
        <button 
          onClick={onClear} 
          className="log-button log-button-danger"
        >
          {labels.clear}
        </button>
      </div>
    </div>
  )
}
