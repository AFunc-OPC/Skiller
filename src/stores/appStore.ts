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
  language: (localStorage.getItem('app-language') as Language) || 'zh',
  theme: (localStorage.getItem('app-theme') as Theme) || 'light',
  setLanguage: (language) => {
    localStorage.setItem('app-language', language)
    set({ language })
  },
  setTheme: (theme) => {
    localStorage.setItem('app-theme', theme)
    set({ theme })
  },
}))
