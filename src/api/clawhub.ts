import { invoke } from './tauri'
import type {
  ClawhubSource,
  CreateClawhubSourceRequest,
  UpdateClawhubSourceRequest,
  ClawhubSkill,
  ClawhubSkillDetail,
  ClawhubSkillOverview,
  ClawhubSkillVersionItem,
  ClawhubSkillFileEntry,
  ClawhubSkillFileContent,
  ConnectionTestResult,
  ImportSkillResult,
  DuplicateCheckResult,
} from '../types'

export const clawhubApi = {
  listSources: async (): Promise<ClawhubSource[]> => {
    return await invoke('clawhub_list_sources')
  },

  addSource: async (request: CreateClawhubSourceRequest): Promise<ClawhubSource> => {
    return await invoke('clawhub_add_source', { request })
  },

  updateSource: async (request: UpdateClawhubSourceRequest): Promise<ClawhubSource> => {
    return await invoke('clawhub_update_source', { request })
  },

  deleteSource: async (id: string): Promise<void> => {
    return await invoke('clawhub_delete_source', { id })
  },

  testConnection: async (sourceId: string): Promise<ConnectionTestResult> => {
    return await invoke('clawhub_test_connection', { sourceId })
  },

  explore: async (sourceId: string, sort: string = 'newest', limit?: number): Promise<ClawhubSkill[]> => {
    return await invoke('clawhub_explore', { sourceId, sort, limit })
  },

  search: async (sourceId: string, query: string): Promise<ClawhubSkill[]> => {
    return await invoke('clawhub_search', { sourceId, query })
  },

  inspect: async (sourceId: string, slug: string): Promise<ClawhubSkillDetail> => {
    return await invoke('clawhub_inspect', { sourceId, slug })
  },

  listVersions: async (sourceId: string, slug: string): Promise<ClawhubSkillVersionItem[]> => {
    return await invoke('clawhub_list_versions', { sourceId, slug })
  },

  listFiles: async (sourceId: string, slug: string, version?: string): Promise<ClawhubSkillFileEntry[]> => {
    return await invoke('clawhub_list_files', { sourceId, slug, version })
  },

  readFile: async (sourceId: string, slug: string, path: string, version?: string): Promise<ClawhubSkillFileContent> => {
    return await invoke('clawhub_read_file', { sourceId, slug, path, version })
  },

  importSkills: async (sourceId: string, slugs: string[], overwrite: boolean = false): Promise<ImportSkillResult[]> => {
    return await invoke('clawhub_import_skills', { sourceId, slugs, overwrite })
  },

  checkDuplicates: async (slugs: string[]): Promise<DuplicateCheckResult[]> => {
    return await invoke('clawhub_check_duplicates', { slugs })
  },
}
