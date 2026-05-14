import { create } from 'zustand'
import type {
  ClawhubSource,
  ClawhubSkill,
  ClawhubSkillDetail,
  ClawhubSkillOverview,
  ClawhubSkillVersionItem,
  ClawhubSkillFileEntry,
  ClawhubSkillFileContent,
  ConnectionTestResult,
  DuplicateCheckResult,
  ImportSkillResult,
} from '../types'
import { clawhubApi } from '../api/clawhub'

type SortOption = 'newest' | 'updated' | 'downloads' | 'rating'
type ClawhubDetailTab = 'overview' | 'versions' | 'files'

interface ClawhubState {
  sources: ClawhubSource[]
  selectedSourceId: string | null
  skills: ClawhubSkill[]
  selectedSkillSlug: string | null
  skillDetail: ClawhubSkillDetail | null
  skillOverview: ClawhubSkillOverview | null
  activeDetailTab: ClawhubDetailTab
  skillVersions: ClawhubSkillVersionItem[] | null
  versionsLoading: boolean
  skillFiles: ClawhubSkillFileEntry[] | null
  filesLoading: boolean
  fileContent: ClawhubSkillFileContent | null
  fileContentLoading: boolean
  selectedVersion: string | null
  selectedFilePath: string | null
  searchQuery: string
  sortOption: SortOption
  loading: boolean
  skillsLoading: boolean
  detailLoading: boolean
  importing: boolean
  importProgress: { completed: number; total: number; currentSlug: string } | null
  error: string | null
  connectionTestResult: ConnectionTestResult | null
  duplicateCheckResults: DuplicateCheckResult[] | null

  fetchSources: () => Promise<void>
  addSource: (name: string, registryUrl: string, token: string, connectionType: 'api' | 'cli', cliPath?: string) => Promise<void>
  updateSource: (id: string, updates: { name?: string; registry_url?: string; token?: string; connection_type?: 'api' | 'cli'; cli_path?: string; is_enabled?: boolean; sort_order?: number }) => Promise<void>
  deleteSource: (id: string) => Promise<void>
  selectSource: (id: string | null) => void
  testConnection: (sourceId: string) => Promise<ConnectionTestResult>
  exploreSkills: (sourceId: string) => Promise<void>
  searchSkills: (sourceId: string, query: string) => Promise<void>
  inspectSkill: (sourceId: string, slug: string) => Promise<void>
  loadSkillVersions: (sourceId: string, slug: string) => Promise<void>
  loadSkillFiles: (sourceId: string, slug: string, version?: string) => Promise<void>
  readSkillFile: (sourceId: string, slug: string, path: string, version?: string) => Promise<void>
  clearSkillDetail: () => void
  setActiveDetailTab: (tab: ClawhubDetailTab) => void
  selectDetailVersion: (version: string | null) => void
  setSortOption: (option: SortOption) => void
  setSearchQuery: (query: string) => void
  importSkills: (sourceId: string, slugs: string[], overwrite?: boolean) => Promise<ImportSkillResult[]>
  checkDuplicates: (slugs: string[]) => Promise<DuplicateCheckResult[]>
  clearError: () => void
  clearConnectionTestResult: () => void
}

export const useClawhubStore = create<ClawhubState>((set, get) => ({
  sources: [],
  selectedSourceId: null,
  skills: [],
  selectedSkillSlug: null,
  skillDetail: null,
  skillOverview: null,
  activeDetailTab: 'overview',
  skillVersions: null,
  versionsLoading: false,
  skillFiles: null,
  filesLoading: false,
  fileContent: null,
  fileContentLoading: false,
  selectedVersion: null,
  selectedFilePath: null,
  searchQuery: '',
  sortOption: 'newest',
  loading: false,
  skillsLoading: false,
  detailLoading: false,
  importing: false,
  importProgress: null,
  error: null,
  connectionTestResult: null,
  duplicateCheckResults: null,

  fetchSources: async () => {
    set({ loading: true, error: null })
    try {
      const sources = await clawhubApi.listSources()
      const enabledSources = sources.filter(s => s.is_enabled)
      const currentSelectedId = get().selectedSourceId
      if (currentSelectedId && !enabledSources.find(s => s.id === currentSelectedId)) {
        const firstEnabled = enabledSources.length > 0 ? enabledSources[0].id : null
        set({ sources, selectedSourceId: firstEnabled, loading: false })
      } else {
        set({ sources, loading: false })
      }
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },

  addSource: async (name, registryUrl, token, connectionType, cliPath) => {
    try {
      const source = await clawhubApi.addSource({
        name,
        registry_url: registryUrl,
        token,
        connection_type: connectionType,
        cli_path: cliPath,
      })
      set((state) => ({ sources: [...state.sources, source] }))
    } catch (error) {
      set({ error: String(error) })
    }
  },

  updateSource: async (id, updates) => {
    try {
      const updated = await clawhubApi.updateSource({ id, ...updates })
      set((state) => ({
        sources: state.sources.map(s => s.id === id ? updated : s),
      }))
    } catch (error) {
      set({ error: String(error) })
    }
  },

  deleteSource: async (id) => {
    try {
      await clawhubApi.deleteSource(id)
      set((state) => ({
        sources: state.sources.filter(s => s.id !== id),
        selectedSourceId: state.selectedSourceId === id ? null : state.selectedSourceId,
      }))
    } catch (error) {
      set({ error: String(error) })
    }
  },

  selectSource: (id) => {
    set({
      selectedSourceId: id,
      skills: [],
      searchQuery: '',
      skillDetail: null,
      skillOverview: null,
      selectedSkillSlug: null,
      activeDetailTab: 'overview',
      skillVersions: null,
      skillFiles: null,
      fileContent: null,
      selectedVersion: null,
      selectedFilePath: null,
    })
  },

  testConnection: async (sourceId) => {
    set({ connectionTestResult: null })
    try {
      const result = await clawhubApi.testConnection(sourceId)
      set({ connectionTestResult: result })
      return result
    } catch (error) {
      const result: ConnectionTestResult = { success: false, message: String(error), username: null }
      set({ connectionTestResult: result })
      return result
    }
  },

  exploreSkills: async (sourceId) => {
    set({ skillsLoading: true, error: null })
    try {
      const skills = await clawhubApi.explore(sourceId, get().sortOption)
      set({ skills, skillsLoading: false })
    } catch (error) {
      set({ error: String(error), skillsLoading: false })
    }
  },

  searchSkills: async (sourceId, query) => {
    set({ skillsLoading: true, error: null, searchQuery: query })
    try {
      if (!query.trim()) {
        return get().exploreSkills(sourceId)
      }
      const skills = await clawhubApi.search(sourceId, query)
      set({ skills, skillsLoading: false })
    } catch (error) {
      set({ error: String(error), skillsLoading: false })
    }
  },

  inspectSkill: async (sourceId, slug) => {
    set({
      detailLoading: true,
      selectedSkillSlug: slug,
      error: null,
      activeDetailTab: 'overview',
      skillVersions: null,
      versionsLoading: false,
      skillFiles: null,
      filesLoading: false,
      fileContent: null,
      fileContentLoading: false,
      selectedVersion: null,
      selectedFilePath: null,
    })
    try {
      const detail = await clawhubApi.inspect(sourceId, slug)
      set({
        skillDetail: detail,
        skillOverview: {
          slug: detail.slug,
          name: detail.name,
          description: detail.description,
          summary: detail.description,
          version: detail.version,
          downloads: detail.downloads,
          rating: detail.rating,
          created_at: detail.created_at,
          updated_at: detail.updated_at,
          owner_handle: null,
          owner_name: null,
          metadata_os: null,
          metadata_systems: null,
        },
        detailLoading: false,
      })
    } catch (error) {
      set({ error: String(error), detailLoading: false })
    }
  },

  loadSkillVersions: async (sourceId, slug) => {
    set({ versionsLoading: true, error: null })
    try {
      const skillVersions = await clawhubApi.listVersions(sourceId, slug)
      set({ skillVersions, versionsLoading: false })
    } catch (error) {
      set({ error: String(error), versionsLoading: false })
    }
  },

  loadSkillFiles: async (sourceId, slug, version) => {
    set({ filesLoading: true, error: null, selectedVersion: version ?? null, selectedFilePath: null, fileContent: null })
    try {
      const skillFiles = await clawhubApi.listFiles(sourceId, slug, version)
      set({ skillFiles, filesLoading: false })
    } catch (error) {
      set({ error: String(error), filesLoading: false })
    }
  },

  readSkillFile: async (sourceId, slug, path, version) => {
    set({ fileContentLoading: true, error: null, selectedFilePath: path })
    try {
      const fileContent = await clawhubApi.readFile(sourceId, slug, path, version)
      set({ fileContent, fileContentLoading: false })
    } catch (error) {
      set({ error: String(error), fileContentLoading: false })
    }
  },

  clearSkillDetail: () => {
    set({
      skillDetail: null,
      skillOverview: null,
      selectedSkillSlug: null,
      activeDetailTab: 'overview',
      skillVersions: null,
      versionsLoading: false,
      skillFiles: null,
      filesLoading: false,
      fileContent: null,
      fileContentLoading: false,
      selectedVersion: null,
      selectedFilePath: null,
      detailLoading: false,
    })
  },

  setActiveDetailTab: (tab) => {
    set({ activeDetailTab: tab })
  },

  selectDetailVersion: (version) => {
    set({ selectedVersion: version, selectedFilePath: null, fileContent: null })
  },

  setSortOption: (option) => {
    set({ sortOption: option })
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query })
  },

  importSkills: async (sourceId, slugs, overwrite = false) => {
    set({ importing: true, importProgress: { completed: 0, total: slugs.length, currentSlug: slugs[0] || '' }, error: null })
    try {
      const results = await clawhubApi.importSkills(sourceId, slugs, overwrite)
      set({ importing: false, importProgress: null })
      return results
    } catch (error) {
      set({ importing: false, importProgress: null, error: String(error) })
      throw error
    }
  },

  checkDuplicates: async (slugs) => {
    try {
      const results = await clawhubApi.checkDuplicates(slugs)
      set({ duplicateCheckResults: results })
      return results
    } catch (error) {
      set({ error: String(error) })
      return []
    }
  },

  clearError: () => set({ error: null }),
  clearConnectionTestResult: () => set({ connectionTestResult: null }),
}))
