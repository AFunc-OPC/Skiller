import { invoke } from './tauri'
import type { DistributeSkillRequest, DistributeSkillResult, CheckConflictsRequest, CheckConflictsResult } from '../types'

export const distributionApi = {
  distribute: async (request: DistributeSkillRequest): Promise<DistributeSkillResult> => {
    return await invoke('distribute_skill', { request })
  },
  checkConflicts: async (request: CheckConflictsRequest): Promise<CheckConflictsResult> => {
    return await invoke('check_distribution_conflicts', { request })
  },
}