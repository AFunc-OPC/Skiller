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
import type { AlertDialogState } from '../components/AlertDialog'

type SortOption = 'newest' | 'updated' | 'downloads' | 'rating'
type ClawhubDetailTab = 'overview' | 'versions' | 'files'

interface ClawhubState {
  sources: ClawhubSource[]
  selectedSourceId: string | null
  skills: ClawhubSkill[]
  hasMore: boolean
  currentLimit: number
  cliLimitedTip: boolean
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
  loadingMore: boolean
  detailLoading: boolean
  importing: boolean
  importProgress: { completed: number; total: number; currentSlug: string } | null
  error: string | null
  alertDialog: AlertDialogState | null
  connectionTestResult: ConnectionTestResult | null
  duplicateCheckResults: DuplicateCheckResult[] | null

  fetchSources: () => Promise<void>
  addSource: (name: string, registryUrl: string, token: string, connectionType: 'api' | 'cli', cliPath?: string) => Promise<void>
  updateSource: (id: string, updates: { name?: string; registry_url?: string; token?: string; connection_type?: 'api' | 'cli'; cli_path?: string; is_enabled?: boolean; sort_order?: number }) => Promise<void>
  deleteSource: (id: string) => Promise<void>
  selectSource: (id: string | null) => void
  testConnection: (sourceId: string) => Promise<ConnectionTestResult>
  exploreSkills: (sourceId: string) => Promise<void>
  loadMoreSkills: (sourceId: string) => Promise<void>
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
  clearAlertDialog: () => void
  clearConnectionTestResult: () => void
}

export const useClawhubStore = create<ClawhubState>((set, get) => ({
  sources: [],
  selectedSourceId: null,
  skills: [],
  hasMore: false,
  currentLimit: 200,
  cliLimitedTip: false,
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
  loadingMore: false,
  detailLoading: false,
  importing: false,
  importProgress: null,
  error: null,
  alertDialog: null,
  connectionTestResult: null,
  duplicateCheckResults: null,

  fetchSources: async () => {
    set({ loading: true, error: null })
    try {
      const sources = await clawhubApi.listSources()
      const currentSelectedId = get().selectedSourceId
      if (currentSelectedId && !sources.find(s => s.id === currentSelectedId)) {
        const firstSource = sources.length > 0 ? sources[0].id : null
        set({ sources, selectedSourceId: firstSource, loading: false })
      } else {
        set({ sources, loading: false })
      }
    } catch (error) {
      set({ error: String(error), alertDialog: { title: 'ClawHub', message: extractErrorMessage(error), type: 'error' }, loading: false })
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
      set((state) => ({ sources: [...state.sources, source], alertDialog: { title: 'ClawHub', message: '添加成功', type: 'success' } }))
    } catch (error) {
      set({ error: String(error), alertDialog: { title: 'ClawHub', message: extractErrorMessage(error), type: 'error' } })
    }
  },

  updateSource: async (id, updates) => {
    try {
      const updated = await clawhubApi.updateSource({ id, ...updates })
      set((state) => ({
        sources: state.sources.map(s => s.id === id ? updated : s),
        alertDialog: { title: 'ClawHub', message: '更新成功', type: 'success' },
      }))
    } catch (error) {
      set({ error: String(error), alertDialog: { title: 'ClawHub', message: extractErrorMessage(error), type: 'error' } })
    }
  },

  deleteSource: async (id) => {
    try {
      await clawhubApi.deleteSource(id)
      set((state) => ({
        sources: state.sources.filter(s => s.id !== id),
        selectedSourceId: state.selectedSourceId === id ? null : state.selectedSourceId,
        alertDialog: { title: 'ClawHub', message: '删除成功', type: 'success' },
      }))
    } catch (error) {
      set({ error: String(error), alertDialog: { title: 'ClawHub', message: extractErrorMessage(error), type: 'error' } })
    }
  },

  selectSource: (id) => {
    set({
      selectedSourceId: id,
      skills: [],
      hasMore: false,
      currentLimit: 200,
      cliLimitedTip: false,
      searchQuery: '',
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
    })
  },

  testConnection: async (sourceId) => {
    set({ connectionTestResult: null })
    try {
      const result = await clawhubApi.testConnection(sourceId)
      set({
        connectionTestResult: result,
        alertDialog: result.success
          ? { title: 'ClawHub', message: result.username ? `连接成功 (${result.username})` : '连接成功', type: 'success' }
          : { title: 'ClawHub', message: result.message, type: 'error' },
      })
      return result
    } catch (error) {
      const result: ConnectionTestResult = { success: false, message: String(error), username: null }
      set({
        connectionTestResult: result,
        alertDialog: { title: 'ClawHub', message: extractErrorMessage(error), type: 'error' },
      })
      return result
    }
  },

  exploreSkills: async (sourceId) => {
    set({ skillsLoading: true, error: null, hasMore: false, currentLimit: 200, cliLimitedTip: false })
    try {
      const result = await clawhubApi.explore(sourceId, get().sortOption, 200)
      set({
        skills: result.skills,
        hasMore: result.has_more,
        cliLimitedTip: result.cli_limited,
        skillsLoading: false,
      })
    } catch (error) {
      set({ error: String(error), alertDialog: { title: 'ClawHub', message: extractErrorMessage(error), type: 'error' }, skillsLoading: false })
    }
  },

  loadMoreSkills: async (sourceId) => {
    const { skillsLoading, loadingMore } = get()
    if (skillsLoading || loadingMore) return
    const newLimit = get().currentLimit + 200
    set({ loadingMore: true, currentLimit: newLimit })
    try {
      const result = await clawhubApi.explore(sourceId, get().sortOption, newLimit)
      set({
        skills: result.skills,
        hasMore: result.has_more,
        cliLimitedTip: result.cli_limited,
        loadingMore: false,
      })
    } catch (error) {
      set({ loadingMore: false, error: String(error), alertDialog: { title: 'ClawHub', message: extractErrorMessage(error), type: 'error' } })
    }
  },

  searchSkills: async (sourceId, query) => {
    set({ skillsLoading: true, error: null, searchQuery: query, hasMore: false, currentLimit: 200, cliLimitedTip: false })
    try {
      if (!query.trim()) {
        return get().exploreSkills(sourceId)
      }
      const skills = await clawhubApi.search(sourceId, query)
      set({ skills, skillsLoading: false })
    } catch (error) {
      set({ error: String(error), alertDialog: { title: 'ClawHub', message: extractErrorMessage(error), type: 'error' }, skillsLoading: false })
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
      set({ error: String(error), alertDialog: { title: 'ClawHub', message: extractErrorMessage(error), type: 'error' }, detailLoading: false })
    }
  },

  loadSkillVersions: async (sourceId, slug) => {
    set({ versionsLoading: true, error: null })
    try {
      const skillVersions = await clawhubApi.listVersions(sourceId, slug)
      set({ skillVersions, versionsLoading: false })
    } catch (error) {
      set({ error: String(error), alertDialog: { title: 'ClawHub', message: extractErrorMessage(error), type: 'error' }, versionsLoading: false })
    }
  },

  loadSkillFiles: async (sourceId, slug, version) => {
    set({ filesLoading: true, error: null, selectedVersion: version ?? null, selectedFilePath: null, fileContent: null })
    try {
      const skillFiles = await clawhubApi.listFiles(sourceId, slug, version)
      set({ skillFiles, filesLoading: false })
    } catch (error) {
      set({ error: String(error), alertDialog: { title: 'ClawHub', message: extractErrorMessage(error), type: 'error' }, filesLoading: false })
    }
  },

  readSkillFile: async (sourceId, slug, path, version) => {
    set({ fileContentLoading: true, error: null, selectedFilePath: path })
    try {
      const fileContent = await clawhubApi.readFile(sourceId, slug, path, version)
      set({ fileContent, fileContentLoading: false })
    } catch (error) {
      set({ error: String(error), alertDialog: { title: 'ClawHub', message: extractErrorMessage(error), type: 'error' }, fileContentLoading: false })
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
      const failedCount = results.filter(r => !r.success).length
      const successCount = results.filter(r => r.success).length
      set({
        importing: false,
        importProgress: null,
        alertDialog: failedCount > 0
          ? { title: 'ClawHub', message: `导入完成: ${successCount} 成功, ${failedCount} 失败`, type: 'error' }
          : { title: 'ClawHub', message: `导入成功: ${successCount} 个技能`, type: 'success' },
      })
      return results
    } catch (error) {
      set({ importing: false, importProgress: null, error: String(error), alertDialog: { title: 'ClawHub', message: extractErrorMessage(error), type: 'error' } })
      throw error
    }
  },

  checkDuplicates: async (slugs) => {
    try {
      const results = await clawhubApi.checkDuplicates(slugs)
      set({ duplicateCheckResults: results })
      return results
    } catch (error) {
      set({ error: String(error), alertDialog: { title: 'ClawHub', message: extractErrorMessage(error), type: 'error' } })
      return []
    }
  },

  clearError: () => set({ error: null }),
  clearAlertDialog: () => set({ alertDialog: null }),
  clearConnectionTestResult: () => set({ connectionTestResult: null }),
}))

function extractErrorMessage(error: unknown): string {
  const str = String(error)
  const match = str.match(/^Error:\s*调用\s+\w+\s+失败:\s*(.+)$/)
  return match ? match[1] : str.replace(/^Error:\s*/, '')
}
