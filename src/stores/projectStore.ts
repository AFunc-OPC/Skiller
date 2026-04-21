import { create } from 'zustand'
import type { Project, UpdateProjectRequest, Skill, ToolPreset } from '../types'
import { projectApi, projectSkillApi } from '../api/project'
import { configApi } from '../api/config'

interface ProjectState {
  projects: Project[]
  selectedProjectId: string | null
  loading: boolean
  error: string | null
  projectSkills: Skill[]
  projectSkillsByPreset: Record<string, Skill[]>
  projectSkillsLoading: boolean
  projectSkillsError: string | null
  toolPresets: ToolPreset[]
  selectedPresetId: string | null
  
  fetchProjects: () => Promise<void>
  createProject: (name: string, path: string, skillPath: string, description?: string, icon?: string) => Promise<void>
  updateProject: (id: string, request: UpdateProjectRequest) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  selectProject: (id: string | null) => void
  fetchToolPresets: () => Promise<void>
  selectPreset: (presetId: string | null) => void
  fetchProjectSkills: (projectId: string, presetId?: string) => Promise<void>
  fetchProjectSkillsByPresets: (projectId: string) => Promise<void>
  removeProjectSkill: (projectId: string, skillId: string) => Promise<void>
  toggleProjectSkillStatus: (projectId: string, skillId: string) => Promise<void>
  batchRemoveProjectSkills: (projectId: string, skillIds: string[]) => Promise<void>
  batchToggleProjectSkills: (projectId: string, skillIds: string[]) => Promise<void>
  clearProjectSkills: () => void
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  selectedProjectId: null,
  loading: false,
  error: null,
  projectSkills: [],
  projectSkillsByPreset: {},
  projectSkillsLoading: false,
  projectSkillsError: null,
  toolPresets: [],
  selectedPresetId: null,
  
  fetchProjects: async () => {
    set({ loading: true, error: null })
    try {
      const projects = await projectApi.list()
      set({ projects, loading: false })
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },
  
  createProject: async (name, path, skillPath, description, icon) => {
    try {
      const project = await projectApi.create({
        name,
        path,
        skill_path: skillPath,
        description,
        icon,
      })
      set((state) => ({ projects: [...state.projects, project] }))
    } catch (error) {
      set({ error: String(error) })
    }
  },
  
  updateProject: async (id, request) => {
    try {
      const updatedProject = await projectApi.update(id, request)
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? updatedProject : p)),
      }))
    } catch (error) {
      set({ error: String(error) })
    }
  },
  
  deleteProject: async (id) => {
    try {
      await projectApi.delete(id)
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        selectedProjectId: state.selectedProjectId === id ? null : state.selectedProjectId,
      }))
    } catch (error) {
      set({ error: String(error) })
    }
  },
  
  selectProject: (id) => {
    set({ selectedProjectId: id })
  },

  fetchToolPresets: async () => {
    try {
      const presets = await configApi.getToolPresets()
      set({ toolPresets: presets })
    } catch (error) {
      console.error('Failed to fetch tool presets:', error)
    }
  },

  selectPreset: (presetId) => {
    set({ selectedPresetId: presetId })
  },

  fetchProjectSkills: async (projectId: string, presetId?: string) => {
    const { selectedPresetId, toolPresets } = get()
    const effectivePresetId = presetId || selectedPresetId || toolPresets[0]?.id
    
    set({ projectSkillsLoading: true, projectSkillsError: null })
    try {
      const skills = await projectSkillApi.list(projectId, effectivePresetId)
      set({ projectSkills: skills, projectSkillsLoading: false })
    } catch (error) {
      set({ projectSkillsError: String(error), projectSkillsLoading: false })
    }
  },

  fetchProjectSkillsByPresets: async (projectId: string) => {
    set({ projectSkillsLoading: true, projectSkillsError: null })
    try {
      const skillsByPreset = await projectSkillApi.listByPresets(projectId)
      const allSkills = Object.values(skillsByPreset).flat()
      const { selectedPresetId, toolPresets } = get()
      const defaultPresetId = selectedPresetId || toolPresets[0]?.id || null
      set({ 
        projectSkillsByPreset: skillsByPreset, 
        projectSkills: allSkills,
        selectedPresetId: defaultPresetId,
        projectSkillsLoading: false 
      })
    } catch (error) {
      set({ projectSkillsError: String(error), projectSkillsLoading: false })
    }
  },

  removeProjectSkill: async (projectId: string, skillId: string) => {
    try {
      await projectSkillApi.remove(projectId, skillId)
      const skillsByPreset = await projectSkillApi.listByPresets(projectId)
      const allSkills = Object.values(skillsByPreset).flat()
      set({ projectSkillsByPreset: skillsByPreset, projectSkills: allSkills })
    } catch (error) {
      throw error
    }
  },

  toggleProjectSkillStatus: async (projectId: string, skillId: string) => {
    try {
      await projectSkillApi.toggleStatus(projectId, skillId)
      const skillsByPreset = await projectSkillApi.listByPresets(projectId)
      const allSkills = Object.values(skillsByPreset).flat()
      set({ projectSkillsByPreset: skillsByPreset, projectSkills: allSkills })
    } catch (error) {
      throw error
    }
  },

  batchRemoveProjectSkills: async (projectId: string, skillIds: string[]) => {
    try {
      await projectSkillApi.batchRemove(projectId, skillIds)
      const skillsByPreset = await projectSkillApi.listByPresets(projectId)
      const allSkills = Object.values(skillsByPreset).flat()
      set({ projectSkillsByPreset: skillsByPreset, projectSkills: allSkills })
    } catch (error) {
      throw error
    }
  },

  batchToggleProjectSkills: async (projectId: string, skillIds: string[]) => {
    try {
      await projectSkillApi.batchToggleStatus(projectId, skillIds)
      const skillsByPreset = await projectSkillApi.listByPresets(projectId)
      const allSkills = Object.values(skillsByPreset).flat()
      set({ projectSkillsByPreset: skillsByPreset, projectSkills: allSkills })
    } catch (error) {
      throw error
    }
  },

  clearProjectSkills: () => {
    set({ projectSkills: [], projectSkillsByPreset: {}, projectSkillsError: null, selectedPresetId: null })
  },
}))
