import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRepositoryStore } from '../../stores/repositoryStore'
import { RepositoryToolbar } from './RepositoryToolbar'
import { RepositoryGrid } from './RepositoryGrid'
import { RepositoryDetailDrawer } from './RepositoryDetailDrawer'
import { RepositoryAddDialog } from './RepositoryAddDialog'
import type { Repo } from '../../types'

interface RepositoryManagementPageProps {
  onNavigateToSkillCenter?: (skillId: string) => void
  openAddDialog?: boolean
  onAddDialogClose?: () => void
  pendingRepositoryDetailId?: string | null
  onPendingRepositoryDetailHandled?: () => void
}

export function RepositoryManagementPage({
  onNavigateToSkillCenter,
  openAddDialog,
  onAddDialogClose,
  pendingRepositoryDetailId,
  onPendingRepositoryDetailHandled,
}: RepositoryManagementPageProps) {
  const {
    fetchRepositories,
    repositories,
    loading,
    selectedRepositoryId,
    selectRepository,
    getFilteredRepositories
  } = useRepositoryStore()
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  
  const filteredRepositories = getFilteredRepositories()
  const selectedRepository = useMemo(() => {
    if (!selectedRepositoryId) return null
    return repositories.find(r => r.id === selectedRepositoryId) || null
  }, [selectedRepositoryId, repositories])
  
  useEffect(() => {
    fetchRepositories()
  }, [fetchRepositories])
  
  useEffect(() => {
    if (openAddDialog) {
      setIsAddDialogOpen(true)
      onAddDialogClose?.()
    }
  }, [openAddDialog, onAddDialogClose])

  useEffect(() => {
    if (!pendingRepositoryDetailId) {
      return
    }

    const targetRepository = repositories.find(repo => repo.id === pendingRepositoryDetailId)
    if (targetRepository) {
      if (selectedRepositoryId !== targetRepository.id) {
        selectRepository(targetRepository.id)
      }
      setIsDrawerOpen(true)
      onPendingRepositoryDetailHandled?.()
      return
    }

    if (!loading) {
      onPendingRepositoryDetailHandled?.()
    }
  }, [
    loading,
    onPendingRepositoryDetailHandled,
    pendingRepositoryDetailId,
    repositories,
    selectRepository,
    selectedRepositoryId,
  ])
  
  const handleRepositoryClick = useCallback((repo: Repo) => {
    selectRepository(repo.id)
    setIsDrawerOpen(true)
  }, [selectRepository])
  
  const handleAddRepository = useCallback(() => {
    setIsAddDialogOpen(true)
  }, [])
  
  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false)
  }, [])
  
  const handleCloseAddDialog = useCallback(() => {
    setIsAddDialogOpen(false)
  }, [])
  
  const handleNavigateToSkill = useCallback((skillId: string) => {
    setIsDrawerOpen(false)
    onNavigateToSkillCenter?.(skillId)
  }, [onNavigateToSkillCenter])
  
  return (
    <div className="repo-page">
      <RepositoryToolbar onAddRepository={handleAddRepository} />
      <RepositoryGrid 
        repositories={filteredRepositories}
        onRepositoryClick={handleRepositoryClick}
      />
      <RepositoryDetailDrawer
        repository={selectedRepository}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onNavigateToSkill={handleNavigateToSkill}
      />
      <RepositoryAddDialog
        isOpen={isAddDialogOpen}
        onClose={handleCloseAddDialog}
      />
    </div>
  )
}
