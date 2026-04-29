import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import { Tag, Tags, X, Check, Trash2, ListChecks, AlertTriangle, Square, CheckSquare } from 'lucide-react'
import { createPortal } from 'react-dom'
import { TreeNode } from '../../types'
import { useSkillContext } from '../../contexts/SkillContext'
import { useTagTreeStore } from '../../stores/tagTreeStore'
import { useRepositoryStore } from '../../stores/repositoryStore'
import { useAppStore } from '../../stores/appStore'
import { useTagSearch } from '../TagTree'
import { SkillSearchInput } from './SkillSearchInput'
import { ViewToggle } from './ViewToggle'
import { AddSkillButton } from './AddSkillButton'
import { DroppableSkillCard } from './DroppableSkill'
import { DroppableSkillListItem } from './DroppableSkillListItem'
import { DroppableSkillArea } from './DroppableSkillArea'
import { SkillDetailDrawer } from './SkillDetailDrawer'
import { EmptyState } from './EmptyState'
import { FileImportDialog } from './FileImportDialog'
import { NpxImportDialog } from './NpxImportDialog'
import { NpxFindDialog } from './NpxFindDialog'
import { RepositorySelectDialog } from './RepositorySelectDialog'
import { DraggableTagNode, SearchInput, SearchResults } from '../TagTree'
import { SortDropdown } from '../shared'
import { Skill, Tag as TagType } from '../../types'
import { invoke } from '../../api/tauri'
import './SkillCenter.css'
import './DroppableSkill.css'

interface SkillCenterProps {
  onNavigateToRepository?: (repoId: string) => void
  onNavigateToAddRepo?: () => void
}

export function SkillCenter({ onNavigateToRepository, onNavigateToAddRepo }: SkillCenterProps) {
  const {
    skills,
    filteredSkills,
    searchKeyword,
    selectedTagId,
    viewMode,
    selectedSkillId,
    isDrawerOpen,
    loading,
    error,
    sortOption,
    setSearchKeyword,
    setSelectedTag,
    setViewMode,
    setSortOption,
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
    refreshSkillData,
    executeNativeNpxSkillsAdd,
    syncToSkiller,
    updateSkillTags,
  } = useSkillContext()

  const { language } = useAppStore()

  const {
    tree,
    loading: tagTreeLoading,
    error: tagTreeError,
    fetchTree
  } = useTagTreeStore()

  const {
    repositories,
    loading: repositoriesLoading,
    fetchRepositories
  } = useRepositoryStore()

  const { query: tagQuery, results: tagResults, search: searchTags, clear: clearTagSearch } = useTagSearch()

  const [importDialog, setImportDialog] = useState<'file' | 'npxFind' | 'npx' | 'repository' | null>(null)
  const [addSkillMenuOpen, setAddSkillMenuOpen] = useState(false)
  const [activeTag, setActiveTag] = useState<TagType | null>(null)
  const [isDraggingOverSkillArea, setIsDraggingOverSkillArea] = useState(false)

  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set())
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [showBatchTagPicker, setShowBatchTagPicker] = useState(false)
  const [batchTagIds, setBatchTagIds] = useState<Set<string>>(new Set())
  const [batchTagSearch, setBatchTagSearch] = useState('')
  const [batchExpandedTagIds, setBatchExpandedTagIds] = useState<Set<string>>(new Set())
  const [batchTagLoading, setBatchTagLoading] = useState(false)
  const [batchDeleting, setBatchDeleting] = useState(false)
  const [confirmBatchDeleteOpen, setConfirmBatchDeleteOpen] = useState(false)
  const multiSelectPanelRef = useRef<HTMLDivElement>(null)
  const tagActionButtonRef = useRef<HTMLButtonElement>(null)
  const batchTagPickerRef = useRef<HTMLDivElement>(null)
  const [batchTagPickerPosition, setBatchTagPickerPosition] = useState({ top: 0, left: 0, maxHeight: 360 })

  const selectedSkill = skills.find(s => s.id === selectedSkillId) || null

  const collisionDetection = useCallback((args: Parameters<typeof closestCenter>[0]) => {
    if (args.active.data.current?.type !== 'tag-for-skill') {
      return closestCenter(args)
    }

    const skillAreaRect = args.droppableRects.get('skill-area')
    const pointer = args.pointerCoordinates

    if (!skillAreaRect || !pointer) {
      return []
    }

    const isPointerInSkillArea =
      pointer.x >= skillAreaRect.left &&
      pointer.x <= skillAreaRect.right &&
      pointer.y >= skillAreaRect.top &&
      pointer.y <= skillAreaRect.bottom

    if (!isPointerInSkillArea) {
      return []
    }

    const skillContainers = args.droppableContainers.filter((container) => {
      const id = String(container.id)
      return id === 'skill-area' || id.startsWith('skill-card-') || id.startsWith('skill-list-')
    })

    const pointerHits = pointerWithin({
      ...args,
      droppableContainers: skillContainers,
    })

    if (pointerHits.length > 0) {
      return pointerHits
    }

    return closestCenter({
      ...args,
      droppableContainers: skillContainers,
    })
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const tagData = active.data.current
    if (tagData?.type === 'tag-for-skill') {
      setActiveTag(tagData.tag)
      setIsDraggingOverSkillArea(false)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const overId = typeof event.over?.id === 'string' ? event.over.id : ''
    const isOverSkillArea = overId === 'skill-area' || overId.startsWith('skill-card-') || overId.startsWith('skill-list-')
    setIsDraggingOverSkillArea(isOverSkillArea)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTag(null)
    setIsDraggingOverSkillArea(false)

    if (!over) return

    const activeData = active.data.current
    const overData = over.data.current

    if (activeData?.type === 'tag-for-skill' && overData?.type === 'skill') {
      const tag = activeData.tag as TagType
      const skill = overData.skill as Skill

      if (!skill.tags.includes(tag.id)) {
        try {
          const newTags = [...skill.tags, tag.id]
          await updateSkillTags(skill.id, newTags)
        } catch (err) {
          console.error('Failed to add tag to skill:', err)
        }
      }
    }
  }

  const handleToggleSkillSelection = useCallback((skillId: string) => {
    setSelectedSkillIds(prev => {
      const next = new Set(prev)
      if (next.has(skillId)) {
        next.delete(skillId)
      } else {
        next.add(skillId)
      }
      return next
    })
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedSkillIds(new Set())
    setShowBatchTagPicker(false)
    setBatchTagIds(new Set())
    setBatchTagSearch('')
    setBatchExpandedTagIds(new Set())
  }, [])

  const handleToggleMultiSelectMode = useCallback(() => {
    setMultiSelectMode(prev => {
      const next = !prev
      if (!next) {
        handleClearSelection()
      }
      return next
    })
  }, [handleClearSelection])

  const selectedSkillsForDelete = useMemo(() => {
    if (selectedSkillIds.size === 0) return [] as Skill[]
    const selected = new Set(selectedSkillIds)
    return skills.filter(skill => selected.has(skill.id))
  }, [selectedSkillIds, skills])

  const allFilteredSelected = useMemo(() => {
    if (filteredSkills.length === 0) return false
    return filteredSkills.every(skill => selectedSkillIds.has(skill.id))
  }, [filteredSkills, selectedSkillIds])

  const handleToggleSelectAll = useCallback(() => {
    if (filteredSkills.length === 0) return

    setSelectedSkillIds(prev => {
      if (filteredSkills.every(skill => prev.has(skill.id))) {
        const next = new Set(prev)
        filteredSkills.forEach(skill => next.delete(skill.id))
        return next
      }

      const next = new Set(prev)
      filteredSkills.forEach(skill => next.add(skill.id))
      return next
    })
  }, [filteredSkills])

  const handleRequestBatchDelete = useCallback(() => {
    if (selectedSkillIds.size === 0 || batchDeleting) return
    setConfirmBatchDeleteOpen(true)
  }, [batchDeleting, selectedSkillIds])

  const handleBatchDelete = useCallback(async () => {
    if (selectedSkillsForDelete.length === 0 || batchDeleting) return

    setBatchDeleting(true)
    try {
      for (const skill of selectedSkillsForDelete) {
        await deleteSkill(skill.id)
      }
      setConfirmBatchDeleteOpen(false)
      handleClearSelection()
      setMultiSelectMode(false)
    } finally {
      setBatchDeleting(false)
    }
  }, [batchDeleting, deleteSkill, handleClearSelection, selectedSkillsForDelete])

  const handleBatchAssignTags = useCallback(async () => {
    if (batchTagIds.size === 0 || selectedSkillIds.size === 0) return
    setBatchTagLoading(true)
    const skillMap = new Map(skills.map(s => [s.id, s]))
    try {
      await Promise.all(
        Array.from(selectedSkillIds).map(skillId => {
          const skill = skillMap.get(skillId)
          if (!skill) return Promise.resolve()
          const merged = Array.from(new Set([...skill.tags, ...batchTagIds]))
          return updateSkillTags(skillId, merged)
        })
      )
      setShowBatchTagPicker(false)
      setBatchTagIds(new Set())
      setBatchTagSearch('')
      setSelectedSkillIds(new Set())
    } finally {
      setBatchTagLoading(false)
    }
  }, [batchTagIds, selectedSkillIds, skills, updateSkillTags])

  const handleBatchToggleTag = useCallback((tagId: string) => {
    setBatchTagIds(prev => {
      const next = new Set(prev)
      if (next.has(tagId)) {
        next.delete(tagId)
      } else {
        next.add(tagId)
      }
      return next
    })
  }, [])

  const handleBatchToggleExpand = useCallback((tagId: string) => {
    setBatchExpandedTagIds(prev => {
      const next = new Set(prev)
      if (next.has(tagId)) {
        next.delete(tagId)
      } else {
        next.add(tagId)
      }
      return next
    })
  }, [])

  const hasBatchMatchingDescendant = useCallback((node: TreeNode): boolean => {
    if (!batchTagSearch.trim()) return true
    const searchLower = batchTagSearch.toLowerCase()
    for (const child of node.children) {
      if (child.tag.name.toLowerCase().includes(searchLower)) return true
      if (hasBatchMatchingDescendant(child)) return true
    }
    return false
  }, [batchTagSearch])

  const renderBatchTagNode = useCallback((node: TreeNode, depth: number): React.ReactNode => {
    const { tag } = node
    const isExpanded = batchExpandedTagIds.has(tag.id)
    const isSelected = batchTagIds.has(tag.id)
    const hasChildren = node.children.length > 0
    const matchesSearch = !batchTagSearch.trim() || tag.name.toLowerCase().includes(batchTagSearch.toLowerCase())

    if (batchTagSearch.trim() && !matchesSearch && !hasBatchMatchingDescendant(node)) return null

    return (
      <div key={tag.id}>
        <div
          className={`sk-tree-node ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          <button
            className={`sk-tree-toggle ${!hasChildren ? 'invisible' : ''}`}
            onClick={() => handleBatchToggleExpand(tag.id)}
          >
            {hasChildren && (
              <svg viewBox="0 0 24 24" className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                <path fill="currentColor" d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
          <button className="sk-tree-label" onClick={() => handleBatchToggleTag(tag.id)}>
            <span className="sk-tree-name">{tag.name}</span>
            {isSelected && (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
        {isExpanded && hasChildren && (
          <div>{node.children.map(child => renderBatchTagNode(child, depth + 1))}</div>
        )}
      </div>
    )
  }, [batchExpandedTagIds, batchTagIds, batchTagSearch, hasBatchMatchingDescendant, handleBatchToggleExpand, handleBatchToggleTag])

  // Close tag picker on outside click
  useEffect(() => {
    if (!showBatchTagPicker) return
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      const clickedInToolbar = multiSelectPanelRef.current?.contains(target)
      const clickedInPicker = batchTagPickerRef.current?.contains(target)
      if (!clickedInToolbar && !clickedInPicker) {
        setShowBatchTagPicker(false)
      }
    }
    window.addEventListener('mousedown', handlePointerDown)
    return () => window.removeEventListener('mousedown', handlePointerDown)
  }, [showBatchTagPicker])

  useEffect(() => {
    if (!showBatchTagPicker) return

    const updatePickerPosition = () => {
      const rect = tagActionButtonRef.current?.getBoundingClientRect()
      if (!rect) return

      const pickerEl = batchTagPickerRef.current
      const pickerWidth = pickerEl?.offsetWidth ?? 260
      const viewportPadding = 8
      const gapFromButton = 8
      const top = rect.bottom + gapFromButton

      const maxLeft = Math.max(viewportPadding, window.innerWidth - pickerWidth - viewportPadding)
      const left = Math.min(Math.max(rect.left, viewportPadding), maxLeft)
      const availableHeight = window.innerHeight - top - viewportPadding

      setBatchTagPickerPosition({
        top,
        left,
        maxHeight: Math.max(120, availableHeight),
      })
    }

    updatePickerPosition()
    window.addEventListener('resize', updatePickerPosition)
    window.addEventListener('scroll', updatePickerPosition, true)
    return () => {
      window.removeEventListener('resize', updatePickerPosition)
      window.removeEventListener('scroll', updatePickerPosition, true)
    }
  }, [showBatchTagPicker])

  const handleSkillClick = (skill: Skill) => {
    if (multiSelectMode) {
      handleToggleSkillSelection(skill.id)
      return
    }
    selectSkill(skill.id)
    toggleDrawer(true)
  }

  const handleSelectTag = useCallback((tagId: string | null) => {
    setSelectedTag(tagId)
    clearTagSearch()
  }, [setSelectedTag, clearTagSearch])

  const handleTagSearchSelect = useCallback((tagId: string) => {
    setSelectedTag(tagId)
    clearTagSearch()
  }, [setSelectedTag, clearTagSearch])

  useEffect(() => {
    fetchTree()
  }, [fetchTree])

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
    const injectCounts = (nodes: TreeNode[]): TreeNode[] => {
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

  const findTagPath = useCallback((tagId: string | null) => {
    if (!tagId) return [] as string[]

    const walk = (nodes: typeof treeWithLiveCounts, parents: string[] = []): string[] | null => {
      for (const node of nodes) {
        const nextPath = [...parents, node.tag.name]
        if (node.tag.id === tagId) return nextPath
        const childMatch = walk(node.children, nextPath)
        if (childMatch) return childMatch
      }
      return null
    }

    return walk(treeWithLiveCounts) || []
  }, [treeWithLiveCounts])

  const selectedTagPath = findTagPath(selectedTagId)

  useEffect(() => {
    if (!addSkillMenuOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-add-skill-root="true"]')) {
        return
      }
      setAddSkillMenuOpen(false)
    }

    window.addEventListener('mousedown', handlePointerDown)
    return () => window.removeEventListener('mousedown', handlePointerDown)
  }, [addSkillMenuOpen])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="skill-center-page">
        <div className="skill-center-toolbar">
          <div className="flex-1">
            <SkillSearchInput
              value={searchKeyword}
              onChange={setSearchKeyword}
              language={language}
            />
          </div>

          <div className="skill-actions">
            <div className="skill-multi-mode-wrap" ref={multiSelectPanelRef}>
              <div className={`skill-multi-mode-cluster ${multiSelectMode ? 'active' : ''}`}>
                <button
                  className={`skill-multi-mode-trigger ${multiSelectMode ? 'active' : ''}`}
                  onClick={handleToggleMultiSelectMode}
                  title={language === 'zh' ? '多选模式' : 'Multi-select'}
                  aria-label={language === 'zh' ? '多选模式' : 'Multi-select'}
                >
                  <ListChecks className="w-4 h-4" />
                  {multiSelectMode && (
                    <span>{language === 'zh' ? '多选模式' : 'Multi-select'}</span>
                  )}
                  {multiSelectMode && (
                    <span className="skill-multi-selected-count">{selectedSkillIds.size}</span>
                  )}
                </button>

                {multiSelectMode && (
                  <div className="skill-multi-inline-actions">
                    <button
                      className={`skill-multi-action-btn ${allFilteredSelected ? 'selected' : 'neutral'}`}
                      onClick={handleToggleSelectAll}
                      disabled={filteredSkills.length === 0}
                      title={allFilteredSelected
                        ? (language === 'zh' ? '取消全选' : 'Deselect all')
                        : (language === 'zh' ? '全选' : 'Select all')}
                      aria-label={allFilteredSelected
                        ? (language === 'zh' ? '取消全选' : 'Deselect all')
                        : (language === 'zh' ? '全选' : 'Select all')}
                    >
                      {allFilteredSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      ref={tagActionButtonRef}
                      className="skill-multi-action-btn tag"
                      onClick={() => setShowBatchTagPicker(prev => !prev)}
                      title={language === 'zh' ? '加标签' : 'Add tags'}
                      aria-label={language === 'zh' ? '加标签' : 'Add tags'}
                    >
                      <Tags className="w-3.5 h-3.5" />
                      {batchTagIds.size > 0 && (
                        <span className="skill-batch-tag-count">{batchTagIds.size}</span>
                      )}
                    </button>

                    <button
                      className="skill-multi-action-btn danger"
                      onClick={handleRequestBatchDelete}
                      disabled={selectedSkillIds.size === 0 || batchDeleting}
                      title={language === 'zh' ? '批量删除' : 'Batch delete'}
                      aria-label={language === 'zh' ? '批量删除' : 'Batch delete'}
                    >
                      {batchDeleting ? <span className="skill-batch-spinner" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <SortDropdown
              sortOption={sortOption}
              onSortChange={setSortOption}
            />

            <ViewToggle
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />

            <div data-add-skill-root="true">
              <AddSkillButton
                open={addSkillMenuOpen}
                onOpen={() => setAddSkillMenuOpen(true)}
                onClose={() => setAddSkillMenuOpen(false)}
                onFileImport={() => setImportDialog('file')}
                onNpxFindImport={() => setImportDialog('npxFind')}
                onNpxImport={() => setImportDialog('npx')}
                onRepoImport={() => setImportDialog('repository')}
                language={language}
              />
            </div>

          </div>
        </div>

        <div className="skill-center-content">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 flex rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-elevated)] shadow-sm overflow-hidden min-h-0">
              <div className="w-[220px] min-w-[220px] flex flex-col border-r border-[var(--border-soft)]">
                <div className="p-3 border-b border-[var(--border-soft)]">
                  <SearchInput
                    value={tagQuery}
                    onChange={searchTags}
                    placeholder={language === 'zh' ? '搜索标签...' : 'Search tags...'}
                  />
                </div>
                <div className="flex-1 overflow-auto p-4">
                  {tagQuery.trim() ? (
                    <SearchResults
                      query={tagQuery}
                      results={tagResults}
                      onSelect={handleTagSearchSelect}
                    />
                  ) : (
                    <>
                      <button
                        onClick={() => handleSelectTag(null)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left mb-2
                                ${selectedTagId === null
                            ? 'bg-[var(--accent-mint)]/10 text-[var(--accent-mint)]'
                            : 'hover:bg-[var(--border-soft)] text-[var(--text-secondary)]'}`}
                      >
                        <span className="flex-1">{language === 'zh' ? '全部技能' : 'All Skills'}</span>
                        <span className="text-xs opacity-60">{skills.length}</span>
                      </button>

                      {tagTreeLoading ? (
                        <div className="text-sm text-[var(--text-secondary)]">{language === 'zh' ? '标签树加载中...' : 'Loading tag tree...'}</div>
                      ) : tagTreeError ? (
                        <div className="text-sm text-red-600 dark:text-red-400">{tagTreeError}</div>
                      ) : treeWithLiveCounts.length > 0 ? (
                        <div className="space-y-1">
                          {treeWithLiveCounts.map((node) => (
                            <DraggableTagNode
                              key={node.tag.id}
                              node={node}
                              depth={0}
                              selectedTagId={selectedTagId}
                              onSelectTag={handleSelectTag}
                              activeDragTagId={activeTag?.id ?? null}
                              highlightDragged={isDraggingOverSkillArea}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-[var(--text-secondary)]">{language === 'zh' ? '暂无标签' : 'No tags'}</div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <DroppableSkillArea
                isDraggingTag={activeTag !== null}
              >
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-[var(--text-secondary)]">{language === 'zh' ? '加载中...' : 'Loading...'}</div>
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-red-500">{error}</div>
                  </div>
                ) : (
                  <>
                    {selectedTagId && (
                      <div className="mb-4 rounded-xl border border-[var(--accent-mint)]/20 bg-[var(--accent-mint)]/[0.06] px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]/80">
                          <span className="uppercase tracking-[0.22em]">{language === 'zh' ? '正在筛选标签' : 'Filtering by tag'}</span>
                          <span className="whitespace-nowrap">{language === 'zh' ? `找到 ${filteredSkills.length} 个技能` : `${filteredSkills.length} skills found`}</span>
                        </div>
                        <div className="mt-2 overflow-x-auto whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 min-w-max">
                            {selectedTagPath.length > 0 ? selectedTagPath.map((segment, index) => {
                              const isCurrent = index === selectedTagPath.length - 1
                              return (
                                <span key={`${segment}-${index}`} className="inline-flex items-center gap-1">
                                  <span
                                    className={isCurrent
                                      ? 'rounded-full bg-[var(--accent-mint)] px-2 py-0.5 text-xs font-semibold text-slate-950 shadow-sm'
                                      : 'rounded-full border border-[var(--border-soft)] bg-[var(--bg-elevated)] px-2 py-0.5 text-xs text-[var(--text-secondary)]'}
                                  >
                                    {segment}
                                  </span>
                                  {!isCurrent && (
                                    <span className="text-[var(--text-secondary)]/55">/</span>
                                  )}
                                </span>
                              )
                            }) : (
                              <span className="rounded-full bg-[var(--accent-mint)] px-2 py-0.5 text-xs font-semibold text-slate-950 shadow-sm">
                                {selectedTagId}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {filteredSkills.length === 0 ? (
                      <EmptyState
                        message={searchKeyword
                          ? (language === 'zh' ? '未找到匹配的技能' : 'No matching skills found')
                          : selectedTagId
                            ? (language === 'zh' ? '该标签下暂无技能' : 'No skills in this tag')
                            : (language === 'zh' ? '暂无技能' : 'No skills')
                        }
                        description={searchKeyword
                          ? (language === 'zh' ? '请尝试其他关键词' : 'Try different keywords')
                          : selectedTagId
                            ? (language === 'zh' ? '该标签可能没有关联技能，或技能数据中 tags 字段为空' : 'This tag may have no associated skills, or the tags field in skill data is empty')
                            : (language === 'zh' ? '点击添加按钮导入技能' : 'Click the add button to import skills')
                        }
                      />
                    ) : viewMode === 'card' ? (
                      <div className="pm-grid">
                        {filteredSkills.map((skill, index) => (
                          <DroppableSkillCard
                            key={skill.id}
                            skill={skill}
                            searchKeyword={searchKeyword}
                            onClick={() => handleSkillClick(skill)}
                            style={{ animationDelay: `${index * 30}ms` }}
                            language={language}
                            enableDropHighlight={isDraggingOverSkillArea}
                            isSelected={selectedSkillIds.has(skill.id)}
                            hasSelection={multiSelectMode}
                            onToggleSelect={handleToggleSkillSelection}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="pm-list">
                        {filteredSkills.map((skill) => (
                          <DroppableSkillListItem
                            key={skill.id}
                            skill={skill}
                            searchKeyword={searchKeyword}
                            onSkillClick={handleSkillClick}
                            language={language}
                            enableDropHighlight={isDraggingOverSkillArea}
                            isSelected={selectedSkillIds.has(skill.id)}
                            hasSelection={multiSelectMode}
                            onToggleSelect={handleToggleSkillSelection}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </DroppableSkillArea>
            </div>

          </div>
        </div>

        <SkillDetailDrawer
          skill={selectedSkill}
          isOpen={isDrawerOpen}
          onClose={() => toggleDrawer(false)}
          onToggleStatus={toggleSkillStatus}
          onDelete={deleteSkill}
          onNavigateToRepository={onNavigateToRepository}
        />

        <FileImportDialog
          isOpen={importDialog === 'file'}
          onClose={() => setImportDialog(null)}
          onImport={importSkillFromFile}
        />

        <NpxImportDialog
          isOpen={importDialog === 'npx'}
          onClose={() => setImportDialog(null)}
          onPrepareImport={prepareSkillImportFromNpx}
          onConfirmImport={confirmSkillImportFromNpx}
          onCancelImport={cancelSkillImportFromNpx}
          onExecuteNative={executeNativeNpxSkillsAdd}
          onSyncToSkiller={syncToSkiller}
          checkTools={checkToolAvailability}
        />

        <RepositorySelectDialog
          isOpen={importDialog === 'repository'}
          onClose={() => setImportDialog(null)}
          onImport={importSkillFromRepository}
          onImportComplete={refreshSkillData}
          onDeleteSkill={deleteSkill}
          existingSkills={skills}
          onUpdateSkillTags={updateSkillTags}
          repositories={repositories}
          loading={repositoriesLoading}
          onLoadRepositories={fetchRepositories}
          onNavigateToRepository={onNavigateToRepository}
          onAddRepository={onNavigateToAddRepo}
        />

        <NpxFindDialog
          isOpen={importDialog === 'npxFind'}
          onClose={() => setImportDialog(null)}
          onSearchApi={async (keyword: string) => {
            try {
              const result = await invoke<{ success: boolean; skills: Array<{ name: string; description: string; repo: string; author: string; install_command: string; link: string; installs: number }>; error?: string }>('search_skills_sh_api', { keyword })
              return {
                success: result.success,
                skills: result.skills.map(s => ({
                  name: s.name,
                  description: s.description,
                  repo: s.repo,
                  author: s.author,
                  install_command: s.install_command,
                  link: s.link,
                  installs: s.installs,
                })),
                error: result.error,
              }
            } catch (err) {
              return {
                success: false,
                skills: [],
                error: err instanceof Error ? err.message : String(err),
              }
            }
          }}
          onExecuteFind={async (keyword, requestId) => {
            try {
              const result = await invoke<{ success: boolean; skills: Array<{ name: string; description: string; repo: string; author: string; install_command: string; link: string; installs: number }>; error?: string }>('execute_npx_skills_find', { keyword, requestId })
              return {
                success: result.success,
                skills: result.skills.map(s => ({
                  name: s.name,
                  description: s.description,
                  repo: s.repo,
                  author: s.author,
                  install_command: s.install_command,
                  link: s.link,
                  installs: s.installs,
                })),
                error: result.error,
              }
            } catch (err) {
              return {
                success: false,
                skills: [],
                error: err instanceof Error ? err.message : String(err),
              }
            }
          }}
          onExecuteNative={executeNativeNpxSkillsAdd}
          onSyncToSkiller={syncToSkiller}
          checkNpx={async () => {
            const tools = await checkToolAvailability()
            return tools.npx
          }}
          existingSkillNames={skills.map(s => s.name)}
        />

        {confirmBatchDeleteOpen && (
          <>
            <div className="sc-import-overlay" onClick={() => setConfirmBatchDeleteOpen(false)} />
            <div className="sc-import-dialog sc-overwrite-confirm-dialog">
              <div className="sc-import-header">
                <div className="sc-import-title">
                  <div className="sc-import-title-icon">
                    <Trash2 />
                  </div>
                  <h3>{language === 'zh' ? '确认批量删除' : 'Confirm Batch Delete'}</h3>
                </div>
                <button onClick={() => setConfirmBatchDeleteOpen(false)} className="sc-import-close" disabled={batchDeleting}>
                  <X />
                </button>
              </div>

              <div className="sc-import-body">
                <div className="sc-overwrite-warning">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                  <p>
                    {language === 'zh'
                      ? `将删除 ${selectedSkillsForDelete.length} 个技能，操作不可撤销。`
                      : `This will permanently delete ${selectedSkillsForDelete.length} skill(s).`}
                  </p>
                </div>

                <div className="sc-overwrite-list">
                  {selectedSkillsForDelete.map(skill => (
                    <div key={skill.id} className="sc-overwrite-item">
                      <code>{skill.name}</code>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sc-import-footer">
                <button
                  className="sc-btn sc-btn-ghost"
                  onClick={() => setConfirmBatchDeleteOpen(false)}
                  disabled={batchDeleting}
                >
                  {language === 'zh' ? '取消' : 'Cancel'}
                </button>
                <button
                  className="sc-btn sc-btn-primary warning"
                  onClick={handleBatchDelete}
                  disabled={batchDeleting || selectedSkillsForDelete.length === 0}
                >
                  {batchDeleting ? <span className="sc-btn-spinner" /> : <Trash2 className="w-3.5 h-3.5" />}
                  {language === 'zh' ? '确认删除' : 'Delete'}
                </button>
              </div>
            </div>
          </>
        )}

        {multiSelectMode && showBatchTagPicker && createPortal(
          <div className="skill-top-layer">
            <div
              ref={batchTagPickerRef}
              className="skill-batch-tag-picker in-portal"
              style={{
                top: `${batchTagPickerPosition.top}px`,
                left: `${batchTagPickerPosition.left}px`,
                maxHeight: `${batchTagPickerPosition.maxHeight}px`,
              }}
            >
              <div className="sk-dropdown-search">
                <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
                  <circle cx="11" cy="11" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  autoFocus
                  value={batchTagSearch}
                  onChange={(e) => setBatchTagSearch(e.target.value)}
                  placeholder={language === 'zh' ? '搜索标签...' : 'Search tags...'}
                />
              </div>
              <div className="sk-dropdown-tree">
                {tree.length > 0 ? (
                  tree.map(node => renderBatchTagNode(node, 0))
                ) : (
                  <div className="sk-empty-hint">{language === 'zh' ? '暂无可选标签' : 'No available tags'}</div>
                )}
              </div>
              {batchTagIds.size > 0 && (
                <div className="skill-batch-picker-footer">
                  <button
                    className="skill-batch-apply-btn"
                    onClick={handleBatchAssignTags}
                    disabled={batchTagLoading || selectedSkillIds.size === 0}
                  >
                    {batchTagLoading ? (
                      <span className="skill-batch-spinner" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    {language === 'zh'
                      ? `应用 ${batchTagIds.size} 个标签`
                      : `Apply ${batchTagIds.size} tag${batchTagIds.size === 1 ? '' : 's'}`}
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

        <DragOverlay>
          {activeTag && (
            <div className="tag-drag-overlay">
              <Tag className="w-3.5 h-3.5" />
              {activeTag.name}
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  )
}
