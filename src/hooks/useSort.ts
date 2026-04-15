import { useState, useCallback } from 'react'
import { SortOption, DEFAULT_SORT, SORT_OPTIONS } from '../types'

interface UseSortOptions {
  storageKey: string
  defaultSort?: SortOption
}

interface UseSortReturn {
  sortOption: SortOption
  setSortOption: (option: SortOption) => void
  sortData: <T extends Record<string, any>>(data: T[]) => T[]
}

export function useSort(options: UseSortOptions): UseSortReturn {
  const { storageKey, defaultSort = DEFAULT_SORT } = options

  const [sortOption, setSortOptionState] = useState<SortOption>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        const found = SORT_OPTIONS.find(
          opt => opt.field === parsed.field && opt.order === parsed.order
        )
        return found || defaultSort
      }
    } catch (e) {
      console.error('Failed to load sort option:', e)
    }
    return defaultSort
  })

  const setSortOption = useCallback((option: SortOption) => {
    setSortOptionState(option)
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        field: option.field,
        order: option.order,
      }))
    } catch (e) {
      console.error('Failed to save sort option:', e)
    }
  }, [storageKey])

  const sortData = useCallback(<T extends Record<string, any>>(data: T[]): T[] => {
    if (!data || data.length === 0) return data

    const { field, order } = sortOption
    const multiplier = order === 'asc' ? 1 : -1

    return [...data].sort((a, b) => {
      let aVal = a[field]
      let bVal = b[field]

      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1

      if (field === 'updated_at' || field === 'created_at') {
        const aTime = new Date(aVal).getTime()
        const bTime = new Date(bVal).getTime()
        return (aTime - bTime) * multiplier
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * multiplier
      }

      return 0
    })
  }, [sortOption])

  return { sortOption, setSortOption, sortData }
}
