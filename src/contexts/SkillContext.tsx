import { createContext, useContext, useState, useCallback, useEffect, type ReactNode, useMemo } from 'react'
import {
  AgentsSkillInfo,
  ConfirmNpxSkillImportResponse,
  DistributeSkillRequest,
  DistributeSkillResult,
  NativeNpxImportResponse,
  PrepareNpxSkillImportResponse,
  Skill,
  Tag,
  SkillCenterState,
  SortOption,
  DEFAULT_SORT,
  SORT_OPTIONS,
} from '../types'
import { invoke } from '../api/tauri'
import { distributionApi } from '../api/distribution'
import { useFileSkillStore } from '../stores/fileSkillStore'
import { useTagTreeStore } from '../stores/tagTreeStore'

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return '未知错误（详情未返回）'
}

interface SkillContextValue extends SkillCenterState {
  filteredSkills: Skill[]
  loadSkills: () => Promise<void>
  loadTags: () => Promise<void>
  setSearchKeyword: (keyword: string) => void
  setSelectedTag: (tagId: string | null) => void
  setSortOption: (option: SortOption) => void
  setViewMode: (mode: 'card' | 'list') => void
  selectSkill: (skillId: string | null) => void
  toggleDrawer: (open: boolean) => void
  toggleSkillStatus: (skillId: string) => Promise<void>
  deleteSkill: (skillId: string) => Promise<void>
  importSkillFromFile: (filePath: string) => Promise<void>
  prepareSkillImportFromNpx: (command: string, requestId: string) => Promise<PrepareNpxSkillImportResponse>
  confirmSkillImportFromNpx: (sessionId: string) => Promise<ConfirmNpxSkillImportResponse>
  cancelSkillImportFromNpx: (sessionId: string) => Promise<void>
  importSkillFromRepository: (repoId: string, skillPath: string) => Promise<void>
  checkToolAvailability: () => Promise<{ git: boolean; npx: boolean }>
  refreshSkills: () => Promise<void>
  updateSkillTags: (skillId: string, tags: string[]) => Promise<void>
  getSkillTags: (skillId: string) => Promise<string[]>
  distributeSkill: (request: DistributeSkillRequest) => Promise<DistributeSkillResult>
  executeNativeNpxSkillsAdd: (command: string, requestId: string) => Promise<NativeNpxImportResponse>
  syncToSkiller: (skillName: string) => Promise<{ skill_name: string; skill_path: string; is_update: boolean }>
  listAgentsSkills: () => Promise<AgentsSkillInfo[]>
}

const SkillContext = createContext<SkillContextValue | undefined>(undefined)

export function SkillProvider({ children }: { children: ReactNode }) {
  const { skills, loading: skillsLoading, fetchSkills } = useFileSkillStore()
  const { fetchTree: fetchTagTree } = useTagTreeStore()
  
  const [state, setState] = useState<Omit<SkillCenterState, 'skills' | 'loading'>>({
    tags: [],
    selectedTagId: null,
    searchKeyword: '',
    sortOption: DEFAULT_SORT,
    viewMode: 'card',
    selectedSkillId: null,
    isDrawerOpen: false,
    error: null
  })

  const loadSkills = useCallback(async () => {
    await fetchSkills()
  }, [fetchSkills])

  const loadTags = useCallback(async () => {
    try {
      const tags = await invoke<Tag[]>('get_tags')
      setState(prev => ({ ...prev, tags }))
    } catch (error) {
      console.error('加载标签失败:', error)
    }
  }, [])

  const setSearchKeyword = useCallback((keyword: string) => {
    setState(prev => ({ ...prev, searchKeyword: keyword }))
  }, [])

  const setSelectedTag = useCallback((tagId: string | null) => {
    setState(prev => ({ ...prev, selectedTagId: tagId }))
  }, [])

  const setSortOption = useCallback((option: SortOption) => {
    setState(prev => ({ ...prev, sortOption: option }))
    localStorage.setItem('skill-center-sort-option', JSON.stringify({
      field: option.field,
      order: option.order,
    }))
  }, [])

  const setViewMode = useCallback((mode: 'card' | 'list') => {
    setState(prev => ({ ...prev, viewMode: mode }))
    localStorage.setItem('skillCenterViewMode', mode)
  }, [])

  const selectSkill = useCallback((skillId: string | null) => {
    setState(prev => ({ ...prev, selectedSkillId: skillId }))
  }, [])

  const toggleDrawer = useCallback((open: boolean) => {
    setState(prev => ({ ...prev, isDrawerOpen: open }))
  }, [])

  const toggleSkillStatus = useCallback(async (skillId: string) => {
    try {
      await invoke('toggle_skill', { skillId })
      await loadSkills()
    } catch (error) {
      throw new Error('切换技能状态失败: ' + (error as Error).message)
    }
  }, [loadSkills])

  const deleteSkill = useCallback(async (skillId: string) => {
    try {
      await invoke('delete_file_skill', { skillId })
      await loadSkills()
    } catch (error) {
      throw new Error('删除技能失败: ' + getErrorMessage(error))
    }
  }, [loadSkills])

  const importSkillFromFile = useCallback(async (filePath: string) => {
    try {
      await invoke('unzip_skill', { filePath })
      await fetchSkills()
    } catch (error) {
      throw new Error('从文件导入技能失败: ' + getErrorMessage(error))
    }
  }, [fetchSkills])

  const prepareSkillImportFromNpx = useCallback(async (command: string, requestId: string) => {
    try {
      return await invoke<PrepareNpxSkillImportResponse>('prepare_npx_skill_import', { command, requestId })
    } catch (error) {
      throw new Error('通过 npx 接管导入失败: ' + getErrorMessage(error))
    }
  }, [])

  const confirmSkillImportFromNpx = useCallback(async (sessionId: string) => {
    try {
      const result = await invoke<ConfirmNpxSkillImportResponse>('confirm_npx_skill_import', { sessionId })
      await fetchSkills()
      return result
    } catch (error) {
      throw new Error('确认导入技能失败: ' + getErrorMessage(error))
    }
  }, [fetchSkills])

  const cancelSkillImportFromNpx = useCallback(async (sessionId: string) => {
    try {
      await invoke('cancel_npx_skill_import', { sessionId })
    } catch (error) {
      throw new Error('取消导入技能失败: ' + getErrorMessage(error))
    }
  }, [])

  const importSkillFromRepository = useCallback(async (repoId: string, skillPath: string) => {
    try {
      await invoke('copy_skill', { repoId, skillPath })
      await fetchSkills()
    } catch (error) {
      throw new Error('从仓库导入技能失败: ' + getErrorMessage(error))
    }
  }, [fetchSkills])

  const checkToolAvailability = useCallback(async () => {
    try {
      const gitAvailable = await invoke<boolean>('check_git_available')
      const npxAvailable = await invoke<boolean>('check_npx_available')
      return { git: gitAvailable, npx: npxAvailable }
    } catch (error) {
      console.error('检测工具可用性失败:', error)
      return { git: false, npx: false }
    }
  }, [])

  const refreshSkills = useCallback(async () => {
    await loadSkills()
  }, [loadSkills])

  const getSkillTags = useCallback(async (skillId: string) => {
    try {
      const tags = await invoke<string[]>('get_file_skill_tags', { skillPath: skillId })
      return tags
    } catch (error) {
      console.error('获取技能标签失败:', error)
      return []
    }
  }, [])

  const updateSkillTags = useCallback(async (skillId: string, tags: string[]) => {
    try {
      await invoke('update_file_skill_tags', { skillPath: skillId, tags })
      await loadSkills()
      await fetchTagTree()
    } catch (error) {
      throw new Error('更新技能标签失败: ' + (error as Error).message)
    }
  }, [loadSkills, fetchTagTree])

  const distributeSkill = useCallback(async (request: DistributeSkillRequest) => {
    try {
      return await distributionApi.distribute(request)
    } catch (error) {
      throw new Error('分发技能失败: ' + (error as Error).message)
    }
  }, [])

  const executeNativeNpxSkillsAdd = useCallback(async (command: string, requestId: string) => {
    try {
      const result = await invoke<NativeNpxImportResponse>('execute_npx_skills_add_native', { command, requestId })
      await fetchSkills()
      return result
    } catch (error) {
      throw new Error('原生 npx 导入失败: ' + getErrorMessage(error))
    }
  }, [fetchSkills])

  const syncToSkiller = useCallback(async (skillName: string) => {
    try {
      const result = await invoke<{ skill_name: string; skill_path: string; is_update: boolean }>('sync_skill_to_skiller', { skillName })
      await fetchSkills()
      return result
    } catch (error) {
      throw new Error('同步失败: ' + getErrorMessage(error))
    }
  }, [fetchSkills])

  const listAgentsSkills = useCallback(async () => {
    try {
      return await invoke<AgentsSkillInfo[]>('list_agents_skills')
    } catch (error) {
      console.error('列出原生技能失败:', error)
      return []
    }
  }, [])

  const filteredSkills = useMemo(() => {
    let result = skills

    if (state.selectedTagId) {
      result = result.filter(skill => skill.tags.includes(state.selectedTagId!))
    }

    if (state.searchKeyword.trim()) {
      const keyword = state.searchKeyword.toLowerCase()
      result = result.filter(skill => 
        skill.name.toLowerCase().includes(keyword) ||
        skill.file_path.toLowerCase().includes(keyword)
      )
    }

    if (state.sortOption) {
      const { field, order } = state.sortOption
      const multiplier = order === 'asc' ? 1 : -1

      result = [...result].sort((a, b) => {
        if (field === 'path') {
          const aPath = a.file_path || ''
          const bPath = b.file_path || ''
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
  }, [skills, state.selectedTagId, state.searchKeyword, state.sortOption])

  useEffect(() => {
    loadSkills()
    loadTags()
    
    const savedViewMode = localStorage.getItem('skillCenterViewMode') as 'card' | 'list' | null
    if (savedViewMode) {
      setState(prev => ({ ...prev, viewMode: savedViewMode }))
    }

    const savedSort = localStorage.getItem('skill-center-sort-option')
    if (savedSort) {
      try {
        const parsed = JSON.parse(savedSort)
        const found = SORT_OPTIONS.find(
          opt => opt.field === parsed.field && opt.order === parsed.order
        )
        if (found) {
          setState(prev => ({ ...prev, sortOption: found }))
        }
      } catch (e) {
        console.error('Failed to load saved sort:', e)
      }
    }
  }, [loadSkills, loadTags])

  const value: SkillContextValue = {
    ...state,
    skills,
    loading: skillsLoading,
    filteredSkills,
    loadSkills,
    loadTags,
    setSearchKeyword,
    setSelectedTag,
    setSortOption,
    setViewMode,
    selectSkill,
    toggleDrawer,
    toggleSkillStatus,
    deleteSkill,
    importSkillFromFile,
    prepareSkillImportFromNpx,
    confirmSkillImportFromNpx,
    cancelSkillImportFromNpx,
    importSkillFromRepository,
    checkToolAvailability,
    refreshSkills,
    updateSkillTags,
    getSkillTags,
    distributeSkill,
    executeNativeNpxSkillsAdd,
    syncToSkiller,
    listAgentsSkills,
  }

  return <SkillContext.Provider value={value}>{children}</SkillContext.Provider>
}

export function useSkillContext() {
  const context = useContext(SkillContext)
  if (!context) {
    throw new Error('useSkillContext must be used within SkillProvider')
  }
  return context
}
