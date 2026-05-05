import { create } from 'zustand'
import type { OpenSpecChangeInfo, OpenSpecCliStatus, OpenSpecCommandResult, OpenSpecBoardSettings } from '../types'
import { openspecApi } from '../api/openspec'
import { configApi } from '../api/config'

interface ProjectState {
  changes: OpenSpecChangeInfo[]
  archivedChanges: OpenSpecChangeInfo[]
  selectedChangeId: string | null
  loading: boolean
  error: string | null
  hasOpenSpecDirectory: boolean
  checkingDirectory: boolean
  initialized: boolean
  settings: OpenSpecBoardSettings
  initLoading: boolean
  initError: string | null
  isPaused: boolean
}

interface OpenSpecState {
  currentProjectId: string | null
  projectStates: Record<string, ProjectState>
  cliStatus: OpenSpecCliStatus | null
  commandLoading: boolean
  commandError: string | null
  lastCommandResult: OpenSpecCommandResult | null

  setCurrentProject: (projectId: string) => void
  getProjectState: (projectId: string) => ProjectState
  fetchAllChanges: (projectId: string, projectPath: string) => Promise<void>
  fetchChanges: (projectId: string, projectPath: string) => Promise<void>
  fetchArchivedChanges: (projectId: string, projectPath: string) => Promise<void>
  selectChange: (projectId: string, changeId: string | null) => void
  checkCli: () => Promise<void>
  checkOpenSpecDirectory: (projectId: string, projectPath: string) => Promise<void>
  executeAction: (projectPath: string, command: string, args: string[]) => Promise<OpenSpecCommandResult | null>
  refresh: (projectId: string, projectPath: string) => Promise<void>
  resetProject: (projectId: string) => void
  loadSettings: (projectId: string) => Promise<void>
  saveSettings: (projectId: string, settings: OpenSpecBoardSettings) => Promise<void>
  initOpenSpec: (projectId: string, projectPath: string, tools: string[]) => Promise<void>
  pauseAutoRefresh: (projectId: string) => void
  resumeAutoRefresh: (projectId: string) => void
}

const DEFAULT_PROJECT_STATE: ProjectState = {
  changes: [],
  archivedChanges: [],
  selectedChangeId: null,
  loading: false,
  error: null,
  hasOpenSpecDirectory: false,
  checkingDirectory: false,
  initialized: false,
  settings: { autoRefreshInterval: 0, configuredTools: [] },
  initLoading: false,
  initError: null,
  isPaused: false,
}

function finishLoading(set: (state: Partial<OpenSpecState>) => void, projectId: string) {
  requestAnimationFrame(() => {
    const state = useOpenSpecStore.getState()
    set({
      projectStates: {
        ...state.projectStates,
        [projectId]: {
          ...state.projectStates[projectId],
          loading: false,
        },
      },
    })
  })
}

export const useOpenSpecStore = create<OpenSpecState>((set, get) => ({
  currentProjectId: null,
  projectStates: {},
  cliStatus: null,
  commandLoading: false,
  commandError: null,
  lastCommandResult: null,

  setCurrentProject: (projectId: string) => {
    set({ currentProjectId: projectId })
  },

  getProjectState: (projectId: string) => {
    const { projectStates } = get()
    return projectStates[projectId] || DEFAULT_PROJECT_STATE
  },

  fetchAllChanges: async (projectId: string, projectPath: string) => {
    const { projectStates } = get()
    const projectState = projectStates[projectId] || DEFAULT_PROJECT_STATE
    
    if (projectState.initialized) return

    set({
      projectStates: {
        ...projectStates,
        [projectId]: {
          ...projectState,
          loading: true,
          error: null,
        },
      },
    })

    try {
      const data = await openspecApi.fetchBoardData(projectPath)
      set({
        projectStates: {
          ...get().projectStates,
          [projectId]: {
            ...get().projectStates[projectId],
            changes: data.changes,
            archivedChanges: data.archivedChanges,
            initialized: true,
          },
        },
        cliStatus: { installed: data.cliInstalled, version: data.cliVersion },
      })
    } catch (error) {
      set({
        projectStates: {
          ...get().projectStates,
          [projectId]: {
            ...get().projectStates[projectId],
            error: String(error),
          },
        },
      })
    } finally {
      finishLoading(set, projectId)
    }
  },

  fetchChanges: async (projectId: string, projectPath: string) => {
    const { projectStates } = get()
    const projectState = projectStates[projectId] || DEFAULT_PROJECT_STATE

    set({
      projectStates: {
        ...projectStates,
        [projectId]: {
          ...projectState,
          loading: true,
          error: null,
        },
      },
    })

    try {
      const changes = await openspecApi.listChanges(projectPath)
      set({
        projectStates: {
          ...get().projectStates,
          [projectId]: {
            ...get().projectStates[projectId],
            changes,
          },
        },
      })
    } catch (error) {
      set({
        projectStates: {
          ...get().projectStates,
          [projectId]: {
            ...get().projectStates[projectId],
            error: String(error),
          },
        },
      })
    } finally {
      finishLoading(set, projectId)
    }
  },

  fetchArchivedChanges: async (projectId: string, projectPath: string) => {
    const { projectStates } = get()
    const projectState = projectStates[projectId] || DEFAULT_PROJECT_STATE

    set({
      projectStates: {
        ...projectStates,
        [projectId]: {
          ...projectState,
          loading: true,
        },
      },
    })

    try {
      const archivedChanges = await openspecApi.listArchivedChanges(projectPath)
      set({
        projectStates: {
          ...get().projectStates,
          [projectId]: {
            ...get().projectStates[projectId],
            archivedChanges,
          },
        },
      })
    } catch {
      set({
        projectStates: {
          ...get().projectStates,
          [projectId]: {
            ...get().projectStates[projectId],
            archivedChanges: [],
          },
        },
      })
    } finally {
      finishLoading(set, projectId)
    }
  },

  selectChange: (projectId: string, changeId: string | null) => {
    const { projectStates } = get()
    const projectState = projectStates[projectId] || DEFAULT_PROJECT_STATE
    set({
      projectStates: {
        ...projectStates,
        [projectId]: {
          ...projectState,
          selectedChangeId: changeId,
        },
      },
    })
  },

  checkCli: async () => {
    set({ commandLoading: true })
    try {
      const cliStatus = await openspecApi.checkCli()
      set({ cliStatus })
    } catch (error) {
      set({ cliStatus: { installed: false, version: null } })
    } finally {
      set({ commandLoading: false })
    }
  },

  checkOpenSpecDirectory: async (projectId: string, projectPath: string) => {
    const { projectStates } = get()
    const projectState = projectStates[projectId] || DEFAULT_PROJECT_STATE
    
    set({
      projectStates: {
        ...projectStates,
        [projectId]: {
          ...projectState,
          checkingDirectory: true,
        },
      },
    })
    
    try {
      const hasOpenSpecDirectory = await openspecApi.checkOpenSpecDirectory(projectPath)
      set({
        projectStates: {
          ...get().projectStates,
          [projectId]: {
            ...get().projectStates[projectId],
            hasOpenSpecDirectory,
            checkingDirectory: false,
          },
        },
      })
    } catch {
      set({
        projectStates: {
          ...get().projectStates,
          [projectId]: {
            ...get().projectStates[projectId],
            hasOpenSpecDirectory: false,
            checkingDirectory: false,
          },
        },
      })
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

  refresh: async (projectId: string, projectPath: string) => {
    const { projectStates } = get()
    const projectState = projectStates[projectId] || DEFAULT_PROJECT_STATE

    set({
      projectStates: {
        ...projectStates,
        [projectId]: {
          ...projectState,
          loading: true,
          error: null,
        },
      },
    })

    try {
      const data = await openspecApi.fetchBoardData(projectPath)
      set({
        projectStates: {
          ...get().projectStates,
          [projectId]: {
            ...get().projectStates[projectId],
            changes: data.changes,
            archivedChanges: data.archivedChanges,
          },
        },
        cliStatus: { installed: data.cliInstalled, version: data.cliVersion },
      })
    } catch (error) {
      set({
        projectStates: {
          ...get().projectStates,
          [projectId]: {
            ...get().projectStates[projectId],
            error: String(error),
          },
        },
      })
    } finally {
      finishLoading(set, projectId)
    }
  },

  resetProject: (projectId: string) => {
    const { projectStates } = get()
    const { [projectId]: _, ...rest } = projectStates
    set({ projectStates: rest })
  },

  loadSettings: async (projectId: string) => {
    const { projectStates } = get()
    const projectState = projectStates[projectId] || DEFAULT_PROJECT_STATE
    
    try {
      const settingsJson = await configApi.get(`openspec_board_settings_${projectId}`)
      if (settingsJson) {
        const settings = JSON.parse(settingsJson) as OpenSpecBoardSettings
        set({
          projectStates: {
            ...get().projectStates,
            [projectId]: {
              ...projectState,
              settings,
            },
          },
        })
      } else {
        set({
          projectStates: {
            ...get().projectStates,
            [projectId]: {
              ...projectState,
              settings: { autoRefreshInterval: 0, configuredTools: [] },
            },
          },
        })
      }
    } catch {
      set({
        projectStates: {
          ...get().projectStates,
          [projectId]: {
            ...projectState,
            settings: { autoRefreshInterval: 0, configuredTools: [] },
          },
        },
      })
    }
  },

  saveSettings: async (projectId: string, settings: OpenSpecBoardSettings) => {
    try {
      await configApi.set(`openspec_board_settings_${projectId}`, JSON.stringify(settings))
      const { projectStates } = get()
      const projectState = projectStates[projectId] || DEFAULT_PROJECT_STATE
      set({
        projectStates: {
          ...projectStates,
          [projectId]: {
            ...projectState,
            settings,
          },
        },
      })
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  },

  initOpenSpec: async (projectId: string, projectPath: string, tools: string[]) => {
    const { projectStates } = get()
    const projectState = projectStates[projectId] || DEFAULT_PROJECT_STATE

    set({
      projectStates: {
        ...projectStates,
        [projectId]: {
          ...projectState,
          initLoading: true,
          initError: null,
        },
      },
    })

    try {
      const result = await openspecApi.initOpenSpec(projectPath, tools)
      if (result.success) {
        set({
          projectStates: {
            ...get().projectStates,
            [projectId]: {
              ...get().projectStates[projectId],
              hasOpenSpecDirectory: true,
              initLoading: false,
              initError: null,
            },
          },
        })
      } else {
        set({
          projectStates: {
            ...get().projectStates,
            [projectId]: {
              ...get().projectStates[projectId],
              initLoading: false,
              initError: result.error || 'Initialization failed',
            },
          },
        })
      }
    } catch (error) {
      set({
        projectStates: {
          ...get().projectStates,
          [projectId]: {
            ...get().projectStates[projectId],
            initLoading: false,
            initError: String(error),
          },
        },
      })
    }
  },

  pauseAutoRefresh: (projectId: string) => {
    const { projectStates } = get()
    const projectState = projectStates[projectId] || DEFAULT_PROJECT_STATE
    set({
      projectStates: {
        ...projectStates,
        [projectId]: {
          ...projectState,
          isPaused: true,
        },
      },
    })
  },

  resumeAutoRefresh: (projectId: string) => {
    const { projectStates } = get()
    const projectState = projectStates[projectId] || DEFAULT_PROJECT_STATE
    set({
      projectStates: {
        ...projectStates,
        [projectId]: {
          ...projectState,
          isPaused: false,
        },
      },
    })
  },
}))
