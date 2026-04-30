import { create } from 'zustand'
import { invoke } from '../api/tauri'
import type { Skill } from '../types'
import { normalizeSkillSourceMetadata } from '../utils/skillSourceMetadata'

interface FileSkillState {
  skills: Skill[]
  loading: boolean
  error: string | null
  fetchSkills: () => Promise<void>
  updateSkillLocally: (skillId: string, updates: Partial<Skill>) => void
}

export const useFileSkillStore = create<FileSkillState>((set) => ({
  skills: [],
  loading: false,
  error: null,
  
  fetchSkills: async () => {
    set({ loading: true, error: null })
    try {
      const skills = await invoke<Skill[]>('get_file_skills')
      set({ skills: skills.map(normalizeSkillSourceMetadata), loading: false })
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },

  updateSkillLocally: (skillId, updates) => {
    set((state) => ({
      skills: state.skills.map((skill) => (
        skill.id === skillId ? { ...skill, ...updates } : skill
      )),
    }))
  },
}))
