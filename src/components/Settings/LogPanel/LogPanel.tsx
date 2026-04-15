import { useEffect } from 'react'
import { useLogStore } from '../../../stores/logStore'
import { LogViewer } from './LogViewer'
import { LogToolbar } from './LogToolbar'
import { isTauriEnvironment } from '../../../api/tauri'
import './logPanel.css'

interface LogPanelProps {
  language: 'zh' | 'en'
}

export function LogPanel({ language }: LogPanelProps) {
  const {
    logs,
    stats,
    filter,
    loading,
    fetchLogs,
    fetchStats,
    setFilter,
    clearLogs,
    exportLogs,
    initEventListener,
  } = useLogStore()
  
  useEffect(() => {
    if (!isTauriEnvironment()) return
    
    fetchLogs()
    fetchStats()
    const cleanup = initEventListener()
    
    return cleanup
  }, [fetchLogs, fetchStats, initEventListener])
  
  return (
    <div className="log-panel-container">
      <div className="log-panel-header">
        {/* <span className="eyebrow">{language === 'zh' ? '运行日志' : 'Runtime Logs'}</span> */}
        <strong>{language === 'zh' ? '应用运行日志' : 'Application Logs'}</strong>
      </div>
      
      <LogToolbar
        language={language}
        stats={stats}
        filter={filter}
        onFilterChange={setFilter}
        onExport={exportLogs}
        onClear={clearLogs}
      />
      
      <LogViewer logs={logs} loading={loading} />
    </div>
  )
}
