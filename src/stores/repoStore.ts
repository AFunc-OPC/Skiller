import { create } from 'zustand'
import type { Repo } from '../types'
import { repoApi } from '../api/repo'

interface RepoState {
  repos: Repo[]
  selectedRepoId: string | null
  loading: boolean
  error: string | null
  
  fetchRepos: () => Promise<void>
  addRepo: (name: string, url: string, branch: string) => Promise<void>
  refreshRepo: (id: string) => Promise<void>
  selectRepo: (id: string | null) => void
}

export const useRepoStore = create<RepoState>((set) => ({
  repos: [],
  selectedRepoId: null,
  loading: false,
  error: null,
  
  fetchRepos: async () => {
    set({ loading: true, error: null })
    try {
      const repos = await repoApi.list()
      set({ repos, loading: false })
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },
  
  addRepo: async (name, url, branch) => {
    try {
      const repo = await repoApi.add({ name, url, branch })
      set((state) => ({ repos: [...state.repos, repo] }))
    } catch (error) {
      set({ error: String(error) })
    }
  },
  
  refreshRepo: async (id) => {
    try {
      const requestId = crypto.randomUUID()
      await repoApi.refresh(id, requestId)
    } catch (error) {
      set({ error: String(error) })
    }
  },
  
  selectRepo: (id) => {
    set({ selectedRepoId: id })
  },
}))
