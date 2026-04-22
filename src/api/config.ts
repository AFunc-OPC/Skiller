import { invoke } from './tauri'
import type { ToolPreset, CreateToolPresetRequest, UpdateToolPresetRequest, ProxyConfig } from '../types'

export const configApi = {
  get: async (key: string): Promise<string | null> => {
    return await invoke('get_config', { key })
  },

  getGlobalSkillPath: async (): Promise<string | null> => {
    return await invoke('get_config', { key: 'global_skill_path' })
  },
  
  set: async (key: string, value: string): Promise<void> => {
    return await invoke('set_config', { key, value })
  },
  
  getToolPresets: async (): Promise<ToolPreset[]> => {
    return await invoke('get_tool_presets')
  },
  
  createToolPreset: async (request: CreateToolPresetRequest): Promise<void> => {
    return await invoke('create_tool_preset', { request })
  },
  
  updateToolPreset: async (request: UpdateToolPresetRequest): Promise<void> => {
    return await invoke('update_tool_preset', { request })
  },
  
  deleteToolPreset: async (id: string): Promise<void> => {
    return await invoke('delete_tool_preset', { id })
  },

  getStoragePath: async (): Promise<string> => {
    return await invoke('get_storage_path')
  },

  getProxyConfig: async (): Promise<ProxyConfig> => {
    return await invoke('get_proxy_config')
  },

  setProxyConfig: async (config: ProxyConfig): Promise<void> => {
    return await invoke('set_proxy_config', { config })
  },
}
