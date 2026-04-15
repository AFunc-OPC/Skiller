import { create } from 'zustand'
import { listen } from '@tauri-apps/api/event'
import { logApi, type LogEntry, type LogFilter, type LogStats } from '../api/log'

interface LogState {
  logs: LogEntry[]
  stats: LogStats
  filter: LogFilter
  loading: boolean
  error: string | null
  
  fetchLogs: () => Promise<void>
  fetchStats: () => Promise<void>
  setFilter: (filter: Partial<LogFilter>) => void
  clearLogs: () => Promise<void>
  exportLogs: (format: 'txt' | 'json') => Promise<void>
  addLog: (entry: LogEntry) => void
  initEventListener: () => () => void
}

export const useLogStore = create<LogState>((set, get) => ({
  logs: [],
  stats: { total: 0, info_count: 0, warn_count: 0, error_count: 0 },
  filter: { limit: 500 },
  loading: false,
  error: null,
  
  fetchLogs: async () => {
    set({ loading: true, error: null })
    try {
      const logs = await logApi.getLogs(get().filter)
      set({ logs, loading: false })
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },
  
  fetchStats: async () => {
    try {
      const stats = await logApi.getStats()
      set({ stats })
    } catch (error) {
      console.error('Failed to fetch log stats:', error)
    }
  },
  
  setFilter: (newFilter) => {
    set((state) => ({
      filter: { ...state.filter, ...newFilter }
    }))
    get().fetchLogs()
  },
  
  clearLogs: async () => {
    try {
      await logApi.clearLogs()
      set({ logs: [], stats: { total: 0, info_count: 0, warn_count: 0, error_count: 0 } })
    } catch (error) {
      set({ error: String(error) })
    }
  },
  
  exportLogs: async (format) => {
    try {
      await logApi.exportLogs(format, get().filter)
    } catch (error) {
      set({ error: String(error) })
    }
  },
  
  addLog: (entry) => {
    set((state) => ({
      logs: [...state.logs, entry].slice(-10000)
    }))
  },
  
  initEventListener: () => {
    let unlisten: (() => void) | null = null
    
    listen<LogEntry>('log:new', (event) => {
      get().addLog(event.payload)
    }).then((fn) => {
      unlisten = fn
    })
    
    return () => {
      if (unlisten) unlisten()
    }
  },
}))
