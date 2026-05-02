import { invoke } from './tauri'
import type {
  OpenSpecChangeInfo,
  OpenSpecCliStatus,
  OpenSpecCommandResult,
} from '../types'

export const openspecApi = {
  checkCli: async (): Promise<OpenSpecCliStatus> => {
    return await invoke('check_openspec_cli')
  },

  listChanges: async (projectPath: string): Promise<OpenSpecChangeInfo[]> => {
    return await invoke('list_openspec_changes', { projectPath })
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
}
