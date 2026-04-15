import { invoke } from './tauri'
import type { 
  Tag, 
  TagGroup, 
  TreeNode, 
  CreateTagRequest, 
  UpdateTagRequest, 
  MoveTagRequest,
  DeleteTagOptions 
} from '../types'

export const tagApi = {
  list: async (): Promise<Tag[]> => {
    return await invoke('get_tags')
  },
  
  getGroups: async (): Promise<TagGroup[]> => {
    return await invoke('get_tag_groups')
  },
  
  create: async (request: CreateTagRequest): Promise<Tag> => {
    return await invoke('create_tag', { request })
  },
  
  delete: async (id: string): Promise<void> => {
    return await invoke('delete_tag', { id })
  },
  
  deleteWithOptions: async (id: string, options: DeleteTagOptions): Promise<void> => {
    return await invoke('delete_tag_with_options', { id, options })
  },
  
  getTree: async (): Promise<TreeNode[]> => {
    return await invoke('get_tag_tree')
  },
  
  getSubtree: async (tagId: string): Promise<TreeNode> => {
    return await invoke('get_tag_subtree', { tagId })
  },
  
  update: async (request: UpdateTagRequest): Promise<Tag> => {
    return await invoke('update_tag', { request })
  },
  
  move: async (request: MoveTagRequest): Promise<Tag> => {
    return await invoke('move_tag', { request })
  },
  
  getChildren: async (parentId?: string): Promise<Tag[]> => {
    return await invoke('get_tag_children', { parentId: parentId || null })
  },
  
  getSkillCount: async (tagId: string): Promise<number> => {
    return await invoke('get_tag_skill_count', { tagId })
  },
}
