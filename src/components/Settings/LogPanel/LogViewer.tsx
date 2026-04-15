import { useEffect, useRef } from 'react'
import type { LogEntry } from '../../../api/log'

interface LogViewerProps {
  logs: LogEntry[]
  loading: boolean
}

export function LogViewer({ logs, loading }: LogViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs])
  
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'var(--accent-amber)'
      case 'WARN':
        return 'var(--accent-amber)'
      case 'DEBUG':
        return 'var(--text-secondary)'
      default:
        return 'var(--accent-mint)'
    }
  }
  
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      const second = String(date.getSeconds()).padStart(2, '0')
      return `${year}-${month}-${day} ${hour}:${minute}:${second}`
    } catch {
      return timestamp
    }
  }
  
  if (loading) {
    return (
      <div className="log-viewer log-viewer-loading">
        加载中...
      </div>
    )
  }
  
  if (logs.length === 0) {
    return (
      <div className="log-viewer log-viewer-empty">
        暂无日志
      </div>
    )
  }
  
  return (
    <div ref={containerRef} className="log-viewer">
      {logs.map((log, index) => (
        <div key={index} className="log-entry">
          <span className="log-time">{formatTime(log.timestamp)}</span>
          <span 
            className="log-level" 
            style={{ color: getLevelColor(log.level) }}
          >
            [{log.level}]
          </span>
          <span className="log-source">[{log.source}]</span>
          <span className="log-message">{log.message}</span>
        </div>
      ))}
    </div>
  )
}
