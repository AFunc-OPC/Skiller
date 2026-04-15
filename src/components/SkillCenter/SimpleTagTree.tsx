import { ChevronDown, Folder } from 'lucide-react'
import { Tag } from '../../types'

interface TagTreeNode {
  tag: Tag
  children: TagTreeNode[]
}

interface SimpleTagTreeProps {
  tags: Tag[]
  selectedTagId: string | null
  onSelectTag: (tagId: string | null) => void
  skillCounts: Record<string, number>
}

export function SimpleTagTree({ tags, selectedTagId, onSelectTag, skillCounts }: SimpleTagTreeProps) {
  const buildTree = (tags: Tag[]): TagTreeNode[] => {
    const tagMap = new Map<string, TagTreeNode>()
    const rootNodes: TagTreeNode[] = []

    tags.forEach(tag => {
      tagMap.set(tag.id, { tag, children: [] })
    })

    tags.forEach(tag => {
      const node = tagMap.get(tag.id)!
      if (tag.parent_id) {
        const parent = tagMap.get(tag.parent_id)
        if (parent) {
          parent.children.push(node)
        } else {
          rootNodes.push(node)
        }
      } else {
        rootNodes.push(node)
      }
    })

    return rootNodes
  }

  const tree = buildTree(tags)

  const renderNode = (node: TagTreeNode, depth: number = 0) => {
    const isSelected = selectedTagId === node.tag.id
    const hasChildren = node.children.length > 0
    const count = skillCounts[node.tag.id] || 0

    return (
      <div key={node.tag.id}>
        <button
          onClick={() => onSelectTag(node.tag.id)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left
                     ${isSelected 
                       ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                       : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          {hasChildren ? (
            <ChevronDown className="w-4 h-4 flex-shrink-0" />
          ) : (
            <Folder className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="flex-1 truncate">{node.tag.name}</span>
          {count > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {count}
            </span>
          )}
        </button>
        
        {hasChildren && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const totalSkills = Object.values(skillCounts).reduce((sum, count) => sum + count, 0)

  return (
    <div className="space-y-1">
      <button
        onClick={() => onSelectTag(null)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left
                   ${selectedTagId === null 
                     ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                     : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
      >
        <Folder className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1">全部技能</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {totalSkills}
        </span>
      </button>
      
      {tree.map(node => renderNode(node))}
    </div>
  )
}
