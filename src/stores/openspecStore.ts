import { create } from 'zustand'
import type { OpenSpecChangeInfo, OpenSpecCliStatus, OpenSpecCommandResult } from '../types'
import { openspecApi } from '../api/openspec'

interface OpenSpecState {
  changes: OpenSpecChangeInfo[]
  archivedChanges: OpenSpecChangeInfo[]
  selectedChangeId: string | null
  cliStatus: OpenSpecCliStatus | null
  loading: boolean
  error: string | null
  commandLoading: boolean
  commandError: string | null
  lastCommandResult: OpenSpecCommandResult | null
  hasOpenSpecDirectory: boolean

  fetchAllChanges: (projectPath: string) => Promise<void>
  fetchChanges: (projectPath: string) => Promise<void>
  fetchArchivedChanges: (projectPath: string) => Promise<void>
  selectChange: (changeId: string | null) => void
  checkCli: () => Promise<void>
  checkOpenSpecDirectory: (projectPath: string) => Promise<void>
  executeAction: (projectPath: string, command: string, args: string[]) => Promise<OpenSpecCommandResult | null>
  refresh: (projectPath: string) => Promise<void>
  reset: () => void
}

function finishLoading(set: (state: Partial<OpenSpecState>) => void) {
  requestAnimationFrame(() => set({ loading: false }))
}

export const useOpenSpecStore = create<OpenSpecState>((set, get) => ({
  changes: [],
  archivedChanges: [],
  selectedChangeId: null,
  cliStatus: null,
  loading: false,
  error: null,
  commandLoading: false,
  commandError: null,
  lastCommandResult: null,
  hasOpenSpecDirectory: false,

  fetchAllChanges: async (projectPath: string) => {
    set({ loading: true, error: null })
    try {
      const [changes, archivedChanges] = await Promise.all([
        openspecApi.listChanges(projectPath),
        openspecApi.listArchivedChanges(projectPath).catch(() => []),
      ])
      set({ changes, archivedChanges })
    } catch (error) {
      set({ error: String(error) })
    } finally {
      finishLoading(set)
    }
  },

  fetchChanges: async (projectPath: string) => {
    set({ loading: true, error: null })
    try {
      const changes = await openspecApi.listChanges(projectPath)
      set({ changes })
    } catch (error) {
      set({ error: String(error) })
    } finally {
      finishLoading(set)
    }
  },

  fetchArchivedChanges: async (projectPath: string) => {
    set({ loading: true })
    try {
      const archivedChanges = await openspecApi.listArchivedChanges(projectPath)
      set({ archivedChanges })
    } catch {
      set({ archivedChanges: [] })
    } finally {
      finishLoading(set)
    }
  },

  selectChange: (changeId: string | null) => {
    set({ selectedChangeId: changeId })
  },

  checkCli: async () => {
    set({ loading: true })
    try {
      const cliStatus = await openspecApi.checkCli()
      set({ cliStatus })
    } catch (error) {
      set({ cliStatus: { installed: false, version: null } })
    } finally {
      finishLoading(set)
    }
  },

  checkOpenSpecDirectory: async (projectPath: string) => {
    set({ loading: true })
    try {
      const hasOpenSpecDirectory = await openspecApi.checkOpenSpecDirectory(projectPath)
      set({ hasOpenSpecDirectory })
    } catch {
      set({ hasOpenSpecDirectory: false })
    } finally {
      finishLoading(set)
    }
  },

  executeAction: async (projectPath: string, command: string, args: string[]) => {
    set({ commandLoading: true, commandError: null })
    try {
      const result = await openspecApi.executeCommand(projectPath, command, args)
      set({ lastCommandResult: result, commandLoading: false })
      return result
    } catch (error) {
      set({ commandError: String(error), commandLoading: false })
      return null
    }
  },

  refresh: async (projectPath: string) => {
    set({ loading: true, error: null })
    try {
      const [changes, archivedChanges, cliStatus] = await Promise.all([
        openspecApi.listChanges(projectPath),
        openspecApi.listArchivedChanges(projectPath).catch(() => []),
        openspecApi.checkCli().catch(() => ({ installed: false, version: null })),
      ])

      set({ changes, archivedChanges, cliStatus })
    } catch (error) {
      set({ error: String(error) })
    } finally {
      finishLoading(set)
    }
  },

  reset: () => {
    set({
      changes: [],
      archivedChanges: [],
      selectedChangeId: null,
      error: null,
      commandError: null,
      lastCommandResult: null,
    })
  },
}))
