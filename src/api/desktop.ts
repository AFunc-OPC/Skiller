import { invoke } from './tauri'

export const desktopApi = {
  selectFolder: async (): Promise<string | null> => {
    return await invoke('select_folder')
  },

  openFolder: async (path: string): Promise<void> => {
    return await invoke('open_folder', { path })
  },

  openPath: async (path: string): Promise<void> => {
    return await invoke('open_path', { path })
  },
}
