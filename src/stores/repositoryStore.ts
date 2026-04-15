import { create } from 'zustand'
import type { Repo, CreateRepoRequest, UpdateRepoRequest, Skill, SortOption } from '../types'
import { DEFAULT_SORT, SORT_OPTIONS } from '../types'
import { repoApi } from '../api/repo'
import { skillApi } from '../api/skill'

interface RepositoryState {
  repositories: Repo[]
  selectedRepositoryId: string | null
  repositorySkills: Skill[]
  searchKeyword: string
  sortOption: SortOption
  viewMode: 'card' | 'list'
  loading: boolean
  error: string | null
  cloningRepository: boolean
  cloneProgress: string | null
  syncingRepositoryIds: string[]
  
  fetchRepositories: () => Promise<void>
  addRepository: (request: CreateRepoRequest) => Promise<Repo>
  updateRepository: (request: UpdateRepoRequest) => Promise<Repo>
  deleteRepository: (id: string) => Promise<void>
  syncRepository: (id: string, requestId: string) => Promise<string>
  repairRepository: (id: string, requestId: string) => Promise<string>
  fetchRepositorySkills: (repoId: string) => Promise<void>
  markRepositorySyncStarted: (id: string) => void
  markRepositorySyncCompleted: (repo: Repo) => void
  markRepositorySyncFailed: (id: string) => void
  selectRepository: (id: string | null) => void
  setSearchKeyword: (keyword: string) => void
  setSortOption: (option: SortOption) => void
  setViewMode: (mode: 'card' | 'list') => void
  getFilteredRepositories: () => Repo[]
}

const VIEW_MODE_KEY = 'repository-view-mode'
const SORT_OPTION_KEY = 'repository-sort-option'

export const useRepositoryStore = create<RepositoryState>((set, get) => ({
  repositories: [],
  selectedRepositoryId: null,
  repositorySkills: [],
  searchKeyword: '',
  sortOption: (() => {
    try {
      const saved = localStorage.getItem(SORT_OPTION_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return SORT_OPTIONS.find(opt => opt.field === parsed.field && opt.order === parsed.order) || DEFAULT_SORT
      }
    } catch (e) {
      console.error('Failed to load repository sort:', e)
    }
    return DEFAULT_SORT
  })(),
  viewMode: (localStorage.getItem(VIEW_MODE_KEY) as 'card' | 'list') || 'card',
  loading: false,
  error: null,
  cloningRepository: false,
  cloneProgress: null,
  syncingRepositoryIds: [],
  
  fetchRepositories: async () => {
    set({ loading: true, error: null })
    try {
      const repositories = await repoApi.list()
      set({ repositories, loading: false })
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },
  
  addRepository: async (request: CreateRepoRequest) => {
    set({ cloningRepository: true, cloneProgress: null, error: null })
    try {
      const repository = await repoApi.add(request)
      set((state) => ({ 
        repositories: [...state.repositories, repository],
        cloningRepository: false,
        cloneProgress: null
      }))
      return repository
    } catch (error) {
      set({ cloningRepository: false, cloneProgress: null })
      throw error
    }
  },
  
  updateRepository: async (request: UpdateRepoRequest) => {
    try {
      const repository = await repoApi.update(request)
      set((state) => ({
        repositories: state.repositories.map((r) => 
          r.id === request.id ? repository : r
        )
      }))
      return repository
    } catch (error) {
      set({ error: String(error) })
      throw error
    }
  },
  
  deleteRepository: async (id: string) => {
    try {
      await repoApi.delete(id)
      set((state) => ({
        repositories: state.repositories.filter((r) => r.id !== id),
        selectedRepositoryId: state.selectedRepositoryId === id ? null : state.selectedRepositoryId
      }))
    } catch (error) {
      set({ error: String(error) })
      throw error
    }
  },
  
  syncRepository: async (id: string, requestId: string) => {
    try {
      set((state) => ({
        syncingRepositoryIds: state.syncingRepositoryIds.includes(id)
          ? state.syncingRepositoryIds
          : [...state.syncingRepositoryIds, id],
      }))
      await repoApi.refresh(id, requestId)
      return requestId
    } catch (error) {
      set((state) => ({
        syncingRepositoryIds: state.syncingRepositoryIds.filter((repoId) => repoId !== id),
      }))
      throw error
    }
  },

  repairRepository: async (id: string, requestId: string) => {
    set((state) => ({
      syncingRepositoryIds: state.syncingRepositoryIds.includes(id)
        ? state.syncingRepositoryIds
        : [...state.syncingRepositoryIds, id],
    }))
    try {
      await repoApi.repair(id, requestId)
      return requestId
    } catch (error) {
      set((state) => ({
        syncingRepositoryIds: state.syncingRepositoryIds.filter((repoId) => repoId !== id),
      }))
      throw error
    }
  },

  markRepositorySyncStarted: (id: string) => {
    set((state) => ({
      syncingRepositoryIds: state.syncingRepositoryIds.includes(id)
        ? state.syncingRepositoryIds
        : [...state.syncingRepositoryIds, id],
    }))
  },

  markRepositorySyncCompleted: (repo: Repo) => {
    set((state) => ({
      repositories: state.repositories.map((item) =>
        item.id === repo.id
          ? {
              ...item,
              ...repo,
              local_path: repo.local_path ?? item.local_path,
              description: repo.description ?? item.description,
              skill_relative_path: repo.skill_relative_path ?? item.skill_relative_path,
              auth_method: repo.auth_method ?? item.auth_method,
              username: repo.username ?? item.username,
              token: repo.token ?? item.token,
              ssh_key: repo.ssh_key ?? item.ssh_key,
            }
          : item,
      ),
      syncingRepositoryIds: state.syncingRepositoryIds.filter((repoId) => repoId !== repo.id),
    }))
  },

  markRepositorySyncFailed: (id: string) => {
    set((state) => ({
      syncingRepositoryIds: state.syncingRepositoryIds.filter((repoId) => repoId !== id),
    }))
  },
  
  fetchRepositorySkills: async (repoId: string) => {
    try {
      const allSkills = await skillApi.list()
      const repoSkills = allSkills.filter(skill => skill.repo_id === repoId)
      set({ repositorySkills: repoSkills })
    } catch (error) {
      set({ error: String(error) })
    }
  },
  
  selectRepository: (id: string | null) => {
    set({ selectedRepositoryId: id })
  },
  
  setSearchKeyword: (keyword: string) => {
    set({ searchKeyword: keyword })
  },
  
  setSortOption: (option: SortOption) => {
    localStorage.setItem(SORT_OPTION_KEY, JSON.stringify({
      field: option.field,
      order: option.order,
    }))
    set({ sortOption: option })
  },
  
  setViewMode: (mode: 'card' | 'list') => {
    localStorage.setItem(VIEW_MODE_KEY, mode)
    set({ viewMode: mode })
  },
  
  getFilteredRepositories: () => {
    const { repositories, searchKeyword, sortOption } = get()
    const normalized = searchKeyword.trim().toLowerCase()
    
    let result = repositories
    if (normalized) {
      result = result.filter((repo) => 
        repo.name.toLowerCase().includes(normalized) ||
        (repo.description && repo.description.toLowerCase().includes(normalized)) ||
        repo.url.toLowerCase().includes(normalized)
      )
    }

    if (sortOption) {
      const { field, order } = sortOption
      const multiplier = order === 'asc' ? 1 : -1

      result = [...result].sort((a, b) => {
        if (field === 'path') {
          const aPath = a.local_path || ''
          const bPath = b.local_path || ''
          return aPath.localeCompare(bPath) * multiplier
        }

        let aVal = a[field]
        let bVal = b[field]

        if (aVal === null || aVal === undefined) return 1
        if (bVal === null || bVal === undefined) return -1

        if (field === 'updated_at' || field === 'created_at') {
          const aTime = new Date(aVal).getTime()
          const bTime = new Date(bVal).getTime()
          return (aTime - bTime) * multiplier
        }

        if (field === 'name' && typeof aVal === 'string' && typeof bVal === 'string') {
          return aVal.localeCompare(bVal) * multiplier
        }

        return 0
      })
    }

    return result
  }
}))
