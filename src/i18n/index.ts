export * from './zh'

import { zh, en, type Labels } from './zh'

const translations = { zh, en }

export const t = (key: keyof Labels, lang: 'zh' | 'en' = 'zh'): string => {
  return translations[lang][key] || key
}

export const pick = <T extends Record<string, any>>(value: T, language: 'zh' | 'en'): string => {
  return value[language] || value.zh
}
