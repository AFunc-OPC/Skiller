import { create } from 'zustand'
import { invoke } from '../api/tauri'
import type { Skill } from '../types'

interface FileSkillState {
  skills: Skill[]
  loading: boolean
  error: string | null
  fetchSkills: () => Promise<void>
}

export const useFileSkillStore = create<FileSkillState>((set) => ({
  skills: [],
  loading: false,
  error: null,
  
  fetchSkills: async () => {
    set({ loading: true, error: null })
    try {
      const skills = await invoke<Skill[]>('get_file_skills')
      set({ skills, loading: false })
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },
}))
