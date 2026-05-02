import { create } from 'zustand'
import type { OpenSpecChangeInfo, OpenSpecCliStatus, OpenSpecCommandResult } from '../types'
import { openspecApi } from '../api/openspec'

interface OpenSpecState {
  changes: OpenSpecChangeInfo[]
  selectedChangeId: string | null
  cliStatus: OpenSpecCliStatus | null
  loading: boolean
  error: string | null
  commandLoading: boolean
  commandError: string | null
  lastCommandResult: OpenSpecCommandResult | null
  hasOpenSpecDirectory: boolean

  fetchChanges: (projectPath: string) => Promise<void>
  selectChange: (changeId: string | null) => void
  checkCli: () => Promise<void>
  checkOpenSpecDirectory: (projectPath: string) => Promise<void>
  executeAction: (projectPath: string, command: string, args: string[]) => Promise<OpenSpecCommandResult | null>
  refresh: (projectPath: string) => Promise<void>
  reset: () => void
}

export const useOpenSpecStore = create<OpenSpecState>((set, get) => ({
  changes: [],
  selectedChangeId: null,
  cliStatus: null,
  loading: false,
  error: null,
  commandLoading: false,
  commandError: null,
  lastCommandResult: null,
  hasOpenSpecDirectory: false,

  fetchChanges: async (projectPath: string) => {
    set({ loading: true, error: null })
    try {
      const changes = await openspecApi.listChanges(projectPath)
      set({ changes, loading: false })
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },

  selectChange: (changeId: string | null) => {
    set({ selectedChangeId: changeId })
  },

  checkCli: async () => {
    try {
      const cliStatus = await openspecApi.checkCli()
      set({ cliStatus })
    } catch (error) {
      set({ cliStatus: { installed: false, version: null } })
    }
  },

  checkOpenSpecDirectory: async (projectPath: string) => {
    try {
      const hasOpenSpecDirectory = await openspecApi.checkOpenSpecDirectory(projectPath)
      set({ hasOpenSpecDirectory })
    } catch {
      set({ hasOpenSpecDirectory: false })
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
    const state = get()
    await Promise.all([
      state.fetchChanges(projectPath),
      state.checkCli(),
    ])
  },

  reset: () => {
    set({
      changes: [],
      selectedChangeId: null,
      error: null,
      commandError: null,
      lastCommandResult: null,
    })
  },
}))
