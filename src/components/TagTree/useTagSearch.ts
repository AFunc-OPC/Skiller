import { useState, useMemo, useCallback } from 'react'
import Fuse from 'fuse.js'
import type { TreeNode, Tag } from '../../types'
import { useTagTreeStore } from '../../stores/tagTreeStore'

interface UseTagSearchResult {
  query: string
  results: Array<{ tag: Tag; path: string }>
  search: (query: string) => void
  clear: () => void
}

export function useTagSearch(): UseTagSearchResult {
  const [query, setQuery] = useState('')
  const { tree } = useTagTreeStore()

  const flatTags = useMemo(() => {
    const tags: Array<{ tag: Tag; path: string }> = []
    
    const traverse = (nodes: TreeNode[], path: string[] = []) => {
      for (const node of nodes) {
        const currentPath = [...path, node.tag.name]
        tags.push({
          tag: node.tag,
          path: currentPath.join(' > '),
        })
        if (node.children.length > 0) {
          traverse(node.children, currentPath)
        }
      }
    }
    
    traverse(tree)
    return tags
  }, [tree])

  const fuse = useMemo(() => {
    return new Fuse(flatTags, {
      keys: [
        { name: 'tag.name', weight: 2 },
        { name: 'path', weight: 1 },
      ],
      threshold: 0.4,
      includeScore: true,
    })
  }, [flatTags])

  const search = useCallback((searchQuery: string) => {
    setQuery(searchQuery)
  }, [])

  const clear = useCallback(() => {
    setQuery('')
  }, [])

  const results = useMemo(() => {
    if (!query.trim()) {
      return flatTags
    }
    
    const searchResults = fuse.search(query)
    return searchResults.map((result) => result.item)
  }, [query, fuse, flatTags])

  return {
    query,
    results,
    search,
    clear,
  }
}
