import { invoke } from './tauri'
import type {
  OpenSpecBoardSnapshot,
  OpenSpecChangeDetail,
  OpenSpecDocumentPreview,
} from '../types'

export const openspecApi = {
  getBoardSnapshot: async (projectId: string): Promise<OpenSpecBoardSnapshot> => {
    return await invoke('get_openspec_board_snapshot', { projectId })
  },

  getChangeDetail: async (projectId: string, changeId: string): Promise<OpenSpecChangeDetail> => {
    return await invoke('get_openspec_change_detail', { projectId, changeId })
  },

  getSpecDocument: async (
    projectId: string,
    changeId: string,
    specPath: string,
  ): Promise<OpenSpecDocumentPreview> => {
    return await invoke('get_openspec_spec_document', { projectId, changeId, specPath })
  },
}
