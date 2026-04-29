import { useMemo, useState } from 'react'
import { TreeView, SearchResults, useTagSearch, DraggableTree } from '../components/TagTree'
import { useTagTreeStore } from '../stores/tagTreeStore'
import { useAppStore } from '../stores/appStore'
import { useFileSkillStore } from '../stores/fileSkillStore'
import type { DeleteTagOptions } from '../types'
import { DeleteTagDialog, TagDialog } from '../components/TagTree/TagDialog'
import { NotificationContainer } from '../components/NotificationToast'

export function TagGovernancePage() {
  const { language } = useAppStore()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [createParentId, setCreateParentId] = useState<string | undefined>(undefined)
  const [editTagId, setEditTagId] = useState<string | null>(null)
  const [deleteTagId, setDeleteTagId] = useState<string | null>(null)
  const [deleteSkillCount, setDeleteSkillCount] = useState<number>(0)
  const { createTag, deleteTag: deleteTagAction, error, clearError, tree } = useTagTreeStore()
  const { skills } = useFileSkillStore()
  const { query, results, search, clear } = useTagSearch()

  const skillCountsByTagId = useMemo(() => {
    const counts = new Map<string, number>()

    for (const skill of skills) {
      for (const tagId of skill.tags) {
        counts.set(tagId, (counts.get(tagId) ?? 0) + 1)
      }
    }

    return counts
  }, [skills])

  const treeWithLiveCounts = useMemo(() => {
    const injectCounts = (nodes: typeof tree): typeof tree => {
      return nodes.map((node) => ({
        ...node,
        tag: {
          ...node.tag,
          skill_count: skillCountsByTagId.get(node.tag.id) ?? 0,
        },
        children: injectCounts(node.children),
      }))
    }

    return injectCounts(tree)
  }, [tree, skillCountsByTagId])

  const clearSuccess = () => {
    setSuccessMessage(null)
  }

  const handleCreateTag = async (name: string) => {
    try {
      setSubmitting(true)
      await createTag(name, 'group-build', createParentId)
      setCreateOpen(false)
      setCreateParentId(undefined)
      setSuccessMessage(`Tag "${name}" created successfully`)
      setTimeout(clearSuccess, 3000)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteTag = async (deleteChildren: boolean) => {
    if (!deleteTagId) return

    try {
      setSubmitting(true)
      const hasChildren = results.some((r) => r.tag.parent_id === deleteTagId)
      const options: DeleteTagOptions = { delete_children: deleteChildren }
      if (hasChildren) {
        await deleteTagAction(deleteTagId, options)
      } else {
        await deleteTagAction(deleteTagId)
      }
      setDeleteOpen(false)
      setDeleteTagId(null)
      setSuccessMessage('Tag deleted successfully')
      setTimeout(clearSuccess, 3000)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditTag = async (newName: string) => {
    if (!editTagId) return

    try {
      setSubmitting(true)
      const { updateTag } = useTagTreeStore.getState()
      await updateTag(editTagId, newName)
      setEditOpen(false)
      setEditTagId(null)
      setSuccessMessage('Tag updated successfully')
      setTimeout(clearSuccess, 3000)
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenCreate = (parentId?: string) => {
    setCreateParentId(parentId)
    setCreateOpen(true)
  }

  const handleOpenEdit = (tagId: string) => {
    setEditTagId(tagId)
    setEditOpen(true)
  }

  const handleOpenDelete = async (tagId: string) => {
    setDeleteTagId(tagId)
    setDeleteSkillCount(skillCountsByTagId.get(tagId) ?? 0)
    setDeleteOpen(true)
  }

  const editTag = editTagId ? results.find((r) => r.tag.id === editTagId)?.tag : null
  const deleteTag = deleteTagId ? results.find((r) => r.tag.id === deleteTagId)?.tag : null
  const hasDeleteChildren = deleteTagId ? results.some((r) => r.tag.parent_id === deleteTagId) : false

  const getTagPath = (tagId: string | undefined): string | null => {
    if (!tagId) return null
    
    const tagResult = results.find((r) => r.tag.id === tagId)
    if (!tagResult) return null
    
    const tag = tagResult.tag
    const path: string[] = [tag.name]
    let currentParentId = tag.parent_id
    
    while (currentParentId) {
      const parentResult = results.find((r) => r.tag.id === currentParentId)
      if (!parentResult) break
      path.unshift(parentResult.tag.name)
      currentParentId = parentResult.tag.parent_id
    }
    
    return path.join('/')
  }

  const createParentPath = getTagPath(createParentId)
  const editTagPath = editTagId ? getTagPath(editTagId) : null

  return (
    <div className="pm-page">
      <NotificationContainer
        successMessage={successMessage}
        errorMessage={error}
        onCloseSuccess={clearSuccess}
        onCloseError={clearError}
      />
      
      <div className="pm-toolbar">
        <div className="pm-search">
          <svg className="pm-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="6" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => search(e.target.value)}
            placeholder={language === 'zh' ? '搜索标签...' : 'Search tags...'}
            className="pm-search-input"
          />
          {query && (
            <button className="pm-search-clear" onClick={clear}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        <div className="pm-actions">
          <button className="pm-btn-primary" onClick={() => handleOpenCreate()}>
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>{language === 'zh' ? '新建' : 'New'}</span>
          </button>
        </div>
      </div>
      
      <div className="pm-content">
        {query ? (
          <SearchResults
            query={query}
            results={results}
            onSelect={() => clear()}
          />
        ) : (
          <DraggableTree
            onMoveError={() => {}}
            onMoveSuccess={(msg) => {
              setSuccessMessage(msg)
              setTimeout(clearSuccess, 3000)
            }}
          >
            <TreeView
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
              onCreateChild={handleOpenCreate}
              treeOverride={treeWithLiveCounts}
            />
          </DraggableTree>
        )}
      </div>
      <TagDialog
        open={createOpen}
        mode="create"
        title={createParentId 
          ? (language === 'zh' ? '创建子标签' : 'Create Child Tag') 
          : (language === 'zh' ? '创建标签' : 'Create Tag')}
        parentPath={createParentPath}
        loading={submitting}
        onClose={() => {
          setCreateOpen(false)
          setCreateParentId(undefined)
        }}
        onSubmit={handleCreateTag}
      />
      <TagDialog
        open={editOpen}
        mode="edit"
        title={language === 'zh' ? '编辑标签' : 'Edit Tag'}
        initialValue={editTag?.name ?? ''}
        parentPath={editTagPath}
        loading={submitting}
        onClose={() => {
          setEditOpen(false)
          setEditTagId(null)
        }}
        onSubmit={handleEditTag}
      />
      <DeleteTagDialog
        open={deleteOpen}
        tagName={deleteTag?.name}
        hasChildren={hasDeleteChildren}
        skillCount={deleteSkillCount}
        loading={submitting}
        onClose={() => {
          setDeleteOpen(false)
          setDeleteTagId(null)
          setDeleteSkillCount(0)
        }}
        onConfirm={handleDeleteTag}
      />
    </div>
  )
}
