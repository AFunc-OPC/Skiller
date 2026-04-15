export type SortField = 'updated_at' | 'created_at' | 'name' | 'path'
export type SortOrder = 'asc' | 'desc'

export interface SortOption {
  field: SortField
  order: SortOrder
  label: string
}

export const SORT_OPTIONS: SortOption[] = [
  { field: 'updated_at', order: 'desc', label: '更新时间最新' },
  { field: 'updated_at', order: 'asc', label: '更新时间最旧' },
  { field: 'created_at', order: 'desc', label: '创建时间最新' },
  { field: 'created_at', order: 'asc', label: '创建时间最旧' },
  { field: 'name', order: 'asc', label: '名称 A-Z' },
  { field: 'name', order: 'desc', label: '名称 Z-A' },
  { field: 'path', order: 'asc', label: '路径 A-Z' },
  { field: 'path', order: 'desc', label: '路径 Z-A' },
]

export const DEFAULT_SORT: SortOption = SORT_OPTIONS[0]
