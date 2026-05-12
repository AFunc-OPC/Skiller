import { invoke } from './tauri'
import type {
  ClawhubSource,
  CreateClawhubSourceRequest,
  UpdateClawhubSourceRequest,
  ClawhubSkill,
  ClawhubSkillDetail,
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

  importSkills: async (sourceId: string, slugs: string[], overwrite: boolean = false): Promise<ImportSkillResult[]> => {
    return await invoke('clawhub_import_skills', { sourceId, slugs, overwrite })
  },

  checkDuplicates: async (slugs: string[]): Promise<DuplicateCheckResult[]> => {
    return await invoke('clawhub_check_duplicates', { slugs })
  },
}