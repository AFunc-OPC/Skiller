import { create } from 'zustand'
import type { SuspendedOpenSpecBoard, OpenSpecBoardSettings } from '../types'

export type Language = 'zh' | 'en'
export type Theme = 'light' | 'dark'

interface AppState {
  language: Language
  theme: Theme
  suspendedBoards: SuspendedOpenSpecBoard[]
  activeSuspendedBoardId: string | null
  pendingResumeProjectId: string | null
  setLanguage: (lang: Language) => void
  setTheme: (theme: Theme) => void
  suspendOpenSpecBoard: (project: { id: string; name: string; path: string; icon: string | null }, state: { selectedChangeId: string | null; settings: OpenSpecBoardSettings }) => void
  resumeOpenSpecBoard: (projectId: string) => SuspendedOpenSpecBoard | null
  removeSuspendedBoard: (projectId: string) => void
  setPendingResumeProjectId: (projectId: string | null) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  language: 'zh',
  theme: 'light',
  suspendedBoards: [],
  activeSuspendedBoardId: null,
  pendingResumeProjectId: null,
  setLanguage: (language) => set({ language }),
  setTheme: (theme) => set({ theme }),
  suspendOpenSpecBoard: (project, state) => {
    const suspendedBoard: SuspendedOpenSpecBoard = {
      projectId: project.id,
      projectName: project.name,
      projectPath: project.path,
      projectIcon: project.icon,
      suspendedAt: Date.now(),
      state: {
        selectedChangeId: state.selectedChangeId,
        settings: state.settings,
      },
    }
    set((s) => ({
      suspendedBoards: [...s.suspendedBoards.filter(b => b.projectId !== project.id), suspendedBoard],
      activeSuspendedBoardId: project.id,
    }))
  },
  resumeOpenSpecBoard: (projectId) => {
    const { suspendedBoards } = get()
    const board = suspendedBoards.find(b => b.projectId === projectId)
    if (board) {
      set({ activeSuspendedBoardId: projectId })
    }
    return board || null
  },
  removeSuspendedBoard: (projectId) => {
    set((s) => {
      const newBoards = s.suspendedBoards.filter(b => b.projectId !== projectId)
      return {
        suspendedBoards: newBoards,
        activeSuspendedBoardId: s.activeSuspendedBoardId === projectId ? null : s.activeSuspendedBoardId,
      }
    })
  },
  setPendingResumeProjectId: (projectId) => {
    set({ pendingResumeProjectId: projectId })
  },
}))
