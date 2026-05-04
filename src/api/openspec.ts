import { invoke } from './tauri'
import type {
  OpenSpecChangeInfo,
  OpenSpecCliStatus,
  OpenSpecCommandResult,
  CheckInitResult,
  InitResult,
} from '../types'

export interface OpenSpecBoardData {
  changes: OpenSpecChangeInfo[]
  archivedChanges: OpenSpecChangeInfo[]
  cliInstalled: boolean
  cliVersion: string | null
}

export const openspecApi = {
  checkCli: async (): Promise<OpenSpecCliStatus> => {
    return await invoke('check_openspec_cli')
  },

  listChanges: async (projectPath: string): Promise<OpenSpecChangeInfo[]> => {
    return await invoke('list_openspec_changes', { projectPath })
  },

  listArchivedChanges: async (projectPath: string): Promise<OpenSpecChangeInfo[]> => {
    return await invoke('list_archived_changes', { projectPath })
  },

  fetchBoardData: async (projectPath: string): Promise<OpenSpecBoardData> => {
    return await invoke('fetch_openspec_board_data', { projectPath })
  },

  readArtifact: async (projectPath: string, changeId: string, fileName: string): Promise<string> => {
    return await invoke('read_openspec_artifact', { projectPath, changeId, fileName })
  },

  executeCommand: async (projectPath: string, command: string, args: string[]): Promise<OpenSpecCommandResult> => {
    return await invoke('execute_openspec_command', { projectPath, command, args })
  },

  checkOpenSpecDirectory: async (projectPath: string): Promise<boolean> => {
    return await invoke('check_openspec_directory', { projectPath })
  },

  checkOpenSpecInit: async (projectPath: string): Promise<CheckInitResult> => {
    return await invoke('check_openspec_init', { projectPath })
  },

  initOpenSpec: async (projectPath: string, tools: string[]): Promise<InitResult> => {
    return await invoke('init_openspec', { projectPath, tools })
  },
}
