import { create } from 'zustand'
import { openspecApi } from '../api/openspec'
import type {
  OpenSpecBoardSnapshot,
  OpenSpecChangeDetail,
  OpenSpecDocumentPreview,
} from '../types'

interface OpenSpecState {
  snapshot: OpenSpecBoardSnapshot | null
  selectedChangeId: string | null
  currentDetail: OpenSpecChangeDetail | null
  currentSpecDocument: OpenSpecDocumentPreview | null
  loading: boolean
  error: string | null
  selectChange: (changeId: string | null) => void
  fetchSnapshot: (projectId: string) => Promise<void>
  fetchDetail: (projectId: string, changeId: string) => Promise<void>
  fetchSpecDocument: (projectId: string, changeId: string, specPath: string) => Promise<void>
  clear: () => void
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export const useOpenSpecStore = create<OpenSpecState>((set) => ({
  snapshot: null,
  selectedChangeId: null,
  currentDetail: null,
  currentSpecDocument: null,
  loading: false,
  error: null,

  selectChange: (changeId) => {
    set({ selectedChangeId: changeId })
  },

  fetchSnapshot: async (projectId) => {
    set({
      loading: true,
      error: null,
      currentDetail: null,
      currentSpecDocument: null,
    })

    try {
      const snapshot = await openspecApi.getBoardSnapshot(projectId)
      set((state) => {
        const availableChangeIds = new Set([
          ...snapshot.changes.map((change) => change.id),
          ...snapshot.archived_changes.map((change) => change.id),
        ])
        const selectedChangeId = state.selectedChangeId && availableChangeIds.has(state.selectedChangeId)
          ? state.selectedChangeId
          : snapshot.changes[0]?.id ?? null

        return {
          snapshot,
          selectedChangeId,
          loading: false,
        }
      })
    } catch (error) {
      set({
        snapshot: null,
        selectedChangeId: null,
        loading: false,
        error: getErrorMessage(error),
      })
    }
  },

  fetchDetail: async (projectId, changeId) => {
    set({
      selectedChangeId: changeId,
      currentSpecDocument: null,
      error: null,
    })

    try {
      const detail = await openspecApi.getChangeDetail(projectId, changeId)
      set({
        currentDetail: detail,
        selectedChangeId: changeId,
        currentSpecDocument: null,
        error: null,
      })
    } catch (error) {
      set({ error: getErrorMessage(error) })
    }
  },

  fetchSpecDocument: async (projectId, changeId, specPath) => {
    try {
      const currentSpecDocument = await openspecApi.getSpecDocument(projectId, changeId, specPath)
      set({ currentSpecDocument, error: null })
    } catch (error) {
      set({ error: getErrorMessage(error) })
    }
  },

  clear: () => {
    set({
      snapshot: null,
      selectedChangeId: null,
      currentDetail: null,
      currentSpecDocument: null,
      loading: false,
      error: null,
    })
  },
}))
