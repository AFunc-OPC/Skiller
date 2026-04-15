import { invoke } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'

export interface LogEntry {
  timestamp: string
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'
  source: string
  message: string
  metadata?: Record<string, unknown>
}

export interface LogFilter {
  level?: string
  keyword?: string
  start_time?: string
  end_time?: string
  limit?: number
}

export interface LogStats {
  total: number
  info_count: number
  warn_count: number
  error_count: number
}

export const logApi = {
  async getLogs(filter?: LogFilter): Promise<LogEntry[]> {
    return invoke('get_logs', { filter: filter || {} })
  },

  async exportLogs(format: 'txt' | 'json', filter?: LogFilter): Promise<void> {
    const path = await save({
      defaultPath: `skiller-logs-${Date.now()}.${format}`,
      filters: [
        { name: format.toUpperCase(), extensions: [format] },
      ],
    })
    
    if (path) {
      return invoke('export_logs', { 
        format, 
        path, 
        filter: filter || {} 
      })
    }
  },

  async clearLogs(): Promise<void> {
    return invoke('clear_logs')
  },

  async getStats(): Promise<LogStats> {
    return invoke('get_log_stats')
  },
}
