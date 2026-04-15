import { create } from 'zustand'

export type Language = 'zh' | 'en'
export type Theme = 'light' | 'dark'

interface AppState {
  language: Language
  theme: Theme
  setLanguage: (lang: Language) => void
  setTheme: (theme: Theme) => void
}

export const useAppStore = create<AppState>((set) => ({
  language: 'zh',
  theme: 'light',
  setLanguage: (language) => set({ language }),
  setTheme: (theme) => set({ theme }),
}))
