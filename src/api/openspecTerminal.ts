import { invoke } from './tauri'
import type { OpenSpecTerminalResult } from '../types'

export const openspecTerminalApi = {
  execute: async (projectPath: string, command: string): Promise<OpenSpecTerminalResult> => {
    return await invoke('execute_openspec_terminal_command', { projectPath, command })
  },
}
