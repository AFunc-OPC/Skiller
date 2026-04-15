import { create } from 'zustand'
import type { Skill, Tag, TagGroup, SourceMetadata } from '../types'
import { skillApi } from '../api/skill'
import { tagApi } from '../api/tag'

interface SkillState {
  skills: Skill[]
  tags: Tag[]
  tagGroups: TagGroup[]
  selectedTagIds: Set<string>
  loading: boolean
  error: string | null
  
  fetchSkills: (tagIds?: string[]) => Promise<void>
  createSkill: (name: string, description: string, filePath: string, source: string, tags: string[], sourceMetadata?: SourceMetadata) => Promise<void>
  updateSkill: (id: string, updates: Partial<Skill>) => Promise<void>
  deleteSkill: (id: string) => Promise<void>
  
  fetchTags: () => Promise<void>
  fetchTagGroups: () => Promise<void>
  createTag: (name: string, groupId: string) => Promise<void>
  deleteTag: (id: string) => Promise<void>
  
  toggleTag: (tagId: string) => void
  clearTagSelection: () => void
}

export const useSkillStore = create<SkillState>((set) => ({
  skills: [],
  tags: [],
  tagGroups: [],
  selectedTagIds: new Set(),
  loading: false,
  error: null,
  
  fetchSkills: async (tagIds) => {
    set({ loading: true, error: null })
    try {
      const skills = await skillApi.list(tagIds)
      set({ skills, loading: false })
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },
  
  createSkill: async (name, description, filePath, source, tags, sourceMetadata) => {
    try {
      const skill = await skillApi.create({
        name,
        description,
        file_path: filePath,
        source,
        source_metadata: sourceMetadata,
        tags,
      })
      set((state) => ({ skills: [...state.skills, skill] }))
    } catch (error) {
      set({ error: String(error) })
    }
  },
  
  updateSkill: async (id, updates) => {
    try {
      const skill = await skillApi.update({
        id,
        name: updates.name,
        description: updates.description ?? undefined,
        tags: updates.tags,
      })
      set((state) => ({
        skills: state.skills.map((s) => (s.id === id ? skill : s)),
      }))
    } catch (error) {
      set({ error: String(error) })
    }
  },
  
  deleteSkill: async (id) => {
    try {
      await skillApi.delete(id)
      set((state) => ({
        skills: state.skills.filter((s) => s.id !== id),
      }))
    } catch (error) {
      set({ error: String(error) })
    }
  },
  
  fetchTags: async () => {
    try {
      const tags = await tagApi.list()
      set({ tags })
    } catch (error) {
      set({ error: String(error) })
    }
  },
  
  fetchTagGroups: async () => {
    try {
      const tagGroups = await tagApi.getGroups()
      set({ tagGroups })
    } catch (error) {
      set({ error: String(error) })
    }
  },
  
  createTag: async (name, groupId) => {
    try {
      const tag = await tagApi.create({ name, group_id: groupId })
      set((state) => ({ tags: [...state.tags, tag] }))
    } catch (error) {
      set({ error: String(error) })
    }
  },
  
  deleteTag: async (id) => {
    try {
      await tagApi.delete(id)
      set((state) => ({
        tags: state.tags.filter((t) => t.id !== id),
        selectedTagIds: new Set([...state.selectedTagIds].filter((tid) => tid !== id)),
      }))
    } catch (error) {
      set({ error: String(error) })
    }
  },
  
  toggleTag: (tagId) => {
    set((state) => {
      const next = new Set(state.selectedTagIds)
      if (next.has(tagId)) {
        next.delete(tagId)
      } else {
        next.add(tagId)
      }
      return { selectedTagIds: next }
    })
  },
  
  clearTagSelection: () => {
    set({ selectedTagIds: new Set() })
  },
}))
