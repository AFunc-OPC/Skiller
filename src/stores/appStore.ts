import { create } from 'zustand'

export type Language = 'zh' | 'en'
export type Theme = 'light' | 'dark'

interface AppState {
  language: Language
  theme: Theme
  clawhubMenuEnabled: boolean
  setLanguage: (lang: Language) => void
  setTheme: (theme: Theme) => void
  setClawhubMenuEnabled: (enabled: boolean) => void
}

function readBool(key: string, fallback: boolean): boolean {
  const v = localStorage.getItem(key)
  if (v === null) return fallback
  return v === 'true'
}

export const useAppStore = create<AppState>((set) => ({
  language: (localStorage.getItem('app-language') as Language) || 'zh',
  theme: (localStorage.getItem('app-theme') as Theme) || 'light',
  clawhubMenuEnabled: readBool('clawhub-menu-enabled', true),
  setLanguage: (language) => {
    localStorage.setItem('app-language', language)
    set({ language })
  },
  setTheme: (theme) => {
    localStorage.setItem('app-theme', theme)
    set({ theme })
  },
  setClawhubMenuEnabled: (enabled) => {
    localStorage.setItem('clawhub-menu-enabled', String(enabled))
    set({ clawhubMenuEnabled: enabled })
  },
}))
