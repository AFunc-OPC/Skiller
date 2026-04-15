import { invoke } from './tauri'
import type { Project, CreateProjectRequest, UpdateProjectRequest, Skill } from '../types'

export const projectApi = {
  list: async (): Promise<Project[]> => {
    return await invoke('get_projects')
  },
  
  create: async (request: CreateProjectRequest): Promise<Project> => {
    return await invoke('create_project', { request })
  },
  
  update: async (id: string, request: UpdateProjectRequest): Promise<Project> => {
    return await invoke('update_project', { id, request })
  },
  
  delete: async (id: string): Promise<void> => {
    return await invoke('delete_project', { id })
  },
}

export const projectSkillApi = {
  list: async (projectId: string, presetId?: string): Promise<Skill[]> => {
    return await invoke('get_project_skills', { projectId, presetId })
  },

  listByPresets: async (projectId: string): Promise<Record<string, Skill[]>> => {
    const result = await invoke<[string, Skill[]][]>('get_project_skills_by_presets', { projectId })
    return Object.fromEntries(result)
  },

  remove: async (projectId: string, skillId: string): Promise<void> => {
    return await invoke('remove_project_skill', { projectId, skillId })
  },

  toggleStatus: async (projectId: string, skillId: string): Promise<void> => {
    return await invoke('toggle_project_skill_status', { projectId, skillId })
  },

  batchRemove: async (projectId: string, skillIds: string[]): Promise<void> => {
    return await invoke('batch_remove_project_skills', { projectId, skillIds })
  },

  batchToggleStatus: async (projectId: string, skillIds: string[]): Promise<void> => {
    return await invoke('batch_toggle_project_skills_status', { projectId, skillIds })
  },

  checkExists: async (projectId: string, presetId: string, skillName: string): Promise<boolean> => {
    return await invoke('check_project_skill_exists', { projectId, presetId, skillName })
  },
}
