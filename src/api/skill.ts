import { invoke } from './tauri'
import type { Skill, CreateSkillRequest, UpdateSkillRequest } from '../types'

export const skillApi = {
  list: async (tagIds?: string[]): Promise<Skill[]> => {
    return await invoke('get_skills', { tagIds })
  },
  
  create: async (request: CreateSkillRequest): Promise<Skill> => {
    return await invoke('create_skill', { request })
  },
  
  update: async (request: UpdateSkillRequest): Promise<Skill> => {
    return await invoke('update_skill', { request })
  },
  
  delete: async (id: string): Promise<void> => {
    return await invoke('delete_skill', { id })
  },
  
  readSkillMdContent: async (skillId: string): Promise<string> => {
    return await invoke('read_skill_md_content', { skillId })
  },
}
