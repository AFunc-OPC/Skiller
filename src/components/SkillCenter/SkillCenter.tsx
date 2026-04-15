import { useState, useEffect, useCallback } from 'react'
import { useSkillContext } from '../../contexts/SkillContext'
import { useTagTreeStore } from '../../stores/tagTreeStore'
import { useRepositoryStore } from '../../stores/repositoryStore'
import { useAppStore } from '../../stores/appStore'
import { useTagSearch } from '../TagTree'
import { SkillSearchInput } from './SkillSearchInput'
import { ViewToggle } from './ViewToggle'
import { AddSkillButton } from './AddSkillButton'
import { SkillCard } from './SkillCard'
import { SkillList } from './SkillList'
import { SkillDetailDrawer } from './SkillDetailDrawer'
import { EmptyState } from './EmptyState'
import { FileImportDialog } from './FileImportDialog'
import { NpxImportDialog } from './NpxImportDialog'
import { NpxFindDialog } from './NpxFindDialog'
import { RepositorySelectDialog } from './RepositorySelectDialog'
import { TreeNode, SearchInput, SearchResults } from '../TagTree'
import { SortDropdown } from '../shared'
import { Skill } from '../../types'
import { invoke } from '../../api/tauri'
import './SkillCenter.css'

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
    executeNativeNpxSkillsAdd,
    syncToSkiller,
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

  const selectedSkill = skills.find(s => s.id === selectedSkillId) || null

  const handleSkillClick = (skill: Skill) => {
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

  const findTagPath = useCallback((tagId: string | null) => {
    if (!tagId) return [] as string[]

    const walk = (nodes: typeof tree, parents: string[] = []): string[] | null => {
      for (const node of nodes) {
        const nextPath = [...parents, node.tag.name]
        if (node.tag.id === tagId) return nextPath
        const childMatch = walk(node.children, nextPath)
        if (childMatch) return childMatch
      }
      return null
    }

    return walk(tree) || []
  }, [tree])

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
        <div className="flex-1 flex rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-elevated)] shadow-sm overflow-hidden">
        {/* 左侧标签树 */}
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
                ) : tree.length > 0 ? (
                  <div className="space-y-1">
                    {tree.map((node) => (
                      <TreeNode 
                        key={node.tag.id} 
                        node={node} 
                        depth={0} 
                        selectedTagId={selectedTagId}
                        onSelectTag={handleSelectTag}
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

          {/* 右侧技能展示 */}
          <div className="flex-1 overflow-y-auto p-4">
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
                      <SkillCard
                        key={skill.id}
                        skill={skill}
                        searchKeyword={searchKeyword}
                        onClick={() => handleSkillClick(skill)}
                        style={{ animationDelay: `${index * 30}ms` }}
                        language={language}
                      />
                    ))}
                  </div>
                ) : (
                  <SkillList
                    skills={filteredSkills}
                    searchKeyword={searchKeyword}
                    onSkillClick={handleSkillClick}
                    language={language}
                  />
                )}
              </>
            )}
        </div>
      </div>
    </div>

    {/* 技能详情抽屉 */}
      <SkillDetailDrawer
        skill={selectedSkill}
        isOpen={isDrawerOpen}
        onClose={() => toggleDrawer(false)}
        onToggleStatus={toggleSkillStatus}
        onDelete={deleteSkill}
        onNavigateToRepository={onNavigateToRepository}
      />

      {/* 导入对话框 */}
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
        onPrepareImport={prepareSkillImportFromNpx}
        onConfirmImport={confirmSkillImportFromNpx}
        onCancelImport={cancelSkillImportFromNpx}
        checkNpx={async () => {
          const tools = await checkToolAvailability()
          return tools.npx
        }}
      />
    </div>
  )
}
