import { invoke } from './tauri'
import type { Repo, CreateRepoRequest, UpdateRepoRequest } from '../types'

export interface ImportableSkill {
  name: string
  path: string
  description?: string
}

export const repoApi = {
  list: async (): Promise<Repo[]> => {
    return await invoke('get_repos')
  },
  
  add: async (request: CreateRepoRequest): Promise<Repo> => {
    return await invoke('add_repo', { request })
  },
  
  update: async (request: UpdateRepoRequest): Promise<Repo> => {
    return await invoke('update_repo', { request })
  },
  
  delete: async (id: string): Promise<void> => {
    return await invoke('delete_repo', { id })
  },
  
  refresh: async (id: string, requestId: string): Promise<void> => {
    return await invoke('refresh_repo', { id, requestId })
  },

  repair: async (id: string, requestId: string): Promise<void> => {
    return await invoke('repair_repo', { id, requestId })
  },

  listSkills: async (repoId: string): Promise<ImportableSkill[]> => {
    return await invoke('list_repo_skills', { repoId })
  },

  getSkillCount: async (repoId: string): Promise<number> => {
    return await invoke('get_repo_skill_count', { repoId })
  }
}
