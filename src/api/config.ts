import { invoke } from './tauri'

export const configApi = {
  get: async (key: string): Promise<string | null> => {
    return await invoke('get_config', { key })
  },

  set: async (key: string, value: string): Promise<void> => {
    return await invoke('set_config', { key, value })
  },
}
