import { create } from 'zustand'
import { logApi, type LogEntry, type LogFilter, type LogStats } from '../api/log'
import { isTauriEnvironment } from '../api/tauri'

interface LogState {
  logs: LogEntry[]
  stats: LogStats
  filter: LogFilter
  loading: boolean
  fetchLogs: () => Promise<void>
  fetchStats: () => Promise<void>
  setFilter: (filter: Partial<LogFilter>) => void
  clearLogs: () => Promise<void>
  exportLogs: (format: 'txt' | 'json') => Promise<void>
  initEventListener: () => () => void
}

const defaultStats: LogStats = {
  total: 0,
  info_count: 0,
  warn_count: 0,
  error_count: 0,
}

export const useLogStore = create<LogState>((set, get) => ({
  logs: [],
  stats: defaultStats,
  filter: {},
  loading: false,

  fetchLogs: async () => {
    if (!isTauriEnvironment()) return
    set({ loading: true })
    try {
      const logs = await logApi.getLogs(get().filter)
      set({ logs, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  fetchStats: async () => {
    if (!isTauriEnvironment()) return
    try {
      const stats = await logApi.getStats()
      set({ stats })
    } catch {
      // ignore
    }
  },

  setFilter: (partial) => {
    const filter = { ...get().filter, ...partial }
    set({ filter })
    get().fetchLogs()
    get().fetchStats()
  },

  clearLogs: async () => {
    if (!isTauriEnvironment()) return
    try {
      await logApi.clearLogs()
      set({ logs: [], stats: defaultStats })
    } catch {
      // ignore
    }
  },

  exportLogs: async (format) => {
    if (!isTauriEnvironment()) return
    try {
      await logApi.exportLogs(format, get().filter)
    } catch {
      // ignore
    }
  },

  initEventListener: () => {
    if (!isTauriEnvironment()) return () => {}
    const unlistenPromise = import('@tauri-apps/api/event').then(({ listen }) =>
      listen<LogEntry>('log:new', () => {
        get().fetchLogs()
        get().fetchStats()
      })
    )
    return () => {
      unlistenPromise.then((unlisten) => unlisten())
    }
  },
}))
