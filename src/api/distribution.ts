import { invoke } from './tauri'
import type { DistributeSkillRequest, DistributeSkillResult } from '../types'

export const distributionApi = {
  distribute: async (request: DistributeSkillRequest): Promise<DistributeSkillResult> => {
    return await invoke('distribute_skill', { request })
  },
}
