import { create } from 'zustand'
import type { TreeNode, Tag, DeleteTagOptions } from '../types'
import { tagApi } from '../api/tag'

interface TagTreeState {
  tree: TreeNode[]
  expandedIds: Set<string>
  selectedTagId: string | null
  loading: boolean
  error: string | null
  
  fetchTree: () => Promise<void>
  createTag: (name: string, groupId: string, parentId?: string) => Promise<Tag>
  updateTag: (id: string, name: string) => Promise<void>
  moveTag: (tagId: string, newParentId?: string) => Promise<void>
  deleteTag: (id: string, options?: DeleteTagOptions) => Promise<void>
  
  toggleExpanded: (tagId: string) => void
  expandAll: () => void
  collapseAll: () => void
  selectTag: (tagId: string | null) => void
  expandToTag: (tagId: string) => void
  
  clearError: () => void
  getTagCount: () => number
}

const countAllTags = (nodes: TreeNode[]): number => {
  let count = 0
  for (const node of nodes) {
    count++
    if (node.children.length > 0) {
      count += countAllTags(node.children)
    }
  }
  return count
}

export const useTagTreeStore = create<TagTreeState>((set, get) => ({
  tree: [],
  expandedIds: new Set(),
  selectedTagId: null,
  loading: false,
  error: null,
  
  fetchTree: async () => {
    set({ loading: true, error: null })
    try {
      const tree = await tagApi.getTree()
      set({ tree, loading: false })
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },
  
  createTag: async (name, groupId, parentId) => {
    try {
      const tag = await tagApi.create({
        name,
        group_id: groupId,
        parent_id: parentId,
      })
      await get().fetchTree()
      return tag
    } catch (error) {
      set({ error: String(error) })
      throw error
    }
  },
  
  updateTag: async (id, name) => {
    try {
      await tagApi.update({ id, name })
      await get().fetchTree()
    } catch (error) {
      set({ error: String(error) })
      throw error
    }
  },
  
  moveTag: async (tagId, newParentId) => {
    try {
      await tagApi.move({
        tag_id: tagId,
        new_parent_id: newParentId,
      })
      await get().fetchTree()
    } catch (error) {
      set({ error: String(error) })
      throw error
    }
  },
  
  deleteTag: async (id, options) => {
    try {
      if (options) {
        await tagApi.deleteWithOptions(id, options)
      } else {
        await tagApi.delete(id)
      }
      await get().fetchTree()
      
      set((state) => {
        const nextExpanded = new Set(state.expandedIds)
        nextExpanded.delete(id)
        return {
          expandedIds: nextExpanded,
          selectedTagId: state.selectedTagId === id ? null : state.selectedTagId,
        }
      })
    } catch (error) {
      set({ error: String(error) })
      throw error
    }
  },
  
  toggleExpanded: (tagId) => {
    set((state) => {
      const next = new Set(state.expandedIds)
      if (next.has(tagId)) {
        next.delete(tagId)
      } else {
        next.add(tagId)
      }
      return { expandedIds: next }
    })
  },
  
  expandAll: () => {
    const allIds = new Set<string>()
    const collectIds = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        if (node.children.length > 0) {
          allIds.add(node.tag.id)
          collectIds(node.children)
        }
      }
    }
    collectIds(get().tree)
    set({ expandedIds: allIds })
  },
  
  collapseAll: () => {
    set({ expandedIds: new Set() })
  },
  
  selectTag: (tagId) => {
    set({ selectedTagId: tagId })
  },
  
  expandToTag: (tagId) => {
    const findPath = (nodes: TreeNode[], target: string, path: string[] = []): string[] | null => {
      for (const node of nodes) {
        if (node.tag.id === target) {
          return path
        }
        if (node.children.length > 0) {
          const result = findPath(node.children, target, [...path, node.tag.id])
          if (result) return result
        }
      }
      return null
    }
    
    const path = findPath(get().tree, tagId)
    if (path) {
      set((state) => ({
        expandedIds: new Set([...state.expandedIds, ...path]),
      }))
    }
  },
  
  clearError: () => {
    set({ error: null })
  },
  
  getTagCount: () => {
    return countAllTags(get().tree)
  },
}))
