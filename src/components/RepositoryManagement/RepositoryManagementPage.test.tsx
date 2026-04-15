import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RepositoryManagementPage } from './RepositoryManagementPage'
import type { Repo } from '../../types'

const mockFetchRepositories = vi.fn()
const mockSelectRepository = vi.fn()
const mockGetFilteredRepositories = vi.fn<() => Repo[]>()

const mockDrawer = vi.hoisted(() => vi.fn())

const repositories: Repo[] = [
  {
    id: 'repo-1',
    name: 'Repo One',
    url: 'https://example.com/repo-1.git',
    local_path: '/tmp/repo-1',
    branch: 'main',
    last_sync: null,
    is_builtin: false,
    created_at: '2026-04-15T00:00:00Z',
    updated_at: '2026-04-15T00:00:00Z',
  },
  {
    id: 'repo-2',
    name: 'Repo Two',
    url: 'https://example.com/repo-2.git',
    local_path: '/tmp/repo-2',
    branch: 'main',
    last_sync: null,
    is_builtin: false,
    created_at: '2026-04-15T00:00:00Z',
    updated_at: '2026-04-15T00:00:00Z',
  },
]

let storeState = {
  repositories,
  loading: false,
  selectedRepositoryId: null as string | null,
}

vi.mock('../../stores/repositoryStore', () => ({
  useRepositoryStore: () => ({
    fetchRepositories: mockFetchRepositories,
    repositories: storeState.repositories,
    loading: storeState.loading,
    selectedRepositoryId: storeState.selectedRepositoryId,
    selectRepository: mockSelectRepository,
    getFilteredRepositories: mockGetFilteredRepositories,
  }),
}))

vi.mock('./RepositoryToolbar', () => ({
  RepositoryToolbar: ({ onAddRepository }: { onAddRepository: () => void }) => (
    <button onClick={onAddRepository}>toolbar</button>
  ),
}))

vi.mock('./RepositoryGrid', () => ({
  RepositoryGrid: ({ repositories }: { repositories: Repo[] }) => (
    <div data-testid="repo-grid">{repositories.map(repo => repo.id).join(',')}</div>
  ),
}))

vi.mock('./RepositoryDetailDrawer', () => ({
  RepositoryDetailDrawer: (props: { repository: Repo | null; isOpen: boolean }) => {
    mockDrawer(props)
    return <div data-testid="repo-drawer">{props.isOpen ? 'open' : 'closed'}:{props.repository?.id ?? 'none'}</div>
  },
}))

vi.mock('./RepositoryAddDialog', () => ({
  RepositoryAddDialog: ({ isOpen }: { isOpen: boolean }) => (
    <div data-testid="repo-add-dialog">{isOpen ? 'open' : 'closed'}</div>
  ),
}))

describe('RepositoryManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storeState = {
      repositories,
      loading: false,
      selectedRepositoryId: null,
    }
    mockGetFilteredRepositories.mockReturnValue(repositories)
  })

  it('opens the target repository drawer when a pending repository id is provided', () => {
    const onPendingRepositoryDetailHandled = vi.fn()

    render(
      <RepositoryManagementPage
        pendingRepositoryDetailId="repo-2"
        onPendingRepositoryDetailHandled={onPendingRepositoryDetailHandled}
      />,
    )

    expect(mockFetchRepositories).toHaveBeenCalled()
    expect(mockSelectRepository).toHaveBeenCalledWith('repo-2')
    expect(onPendingRepositoryDetailHandled).toHaveBeenCalled()
    expect(mockDrawer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isOpen: true,
      }),
    )
  })

  it('clears the pending repository id when loading is finished but the repo is missing', () => {
    const onPendingRepositoryDetailHandled = vi.fn()
    storeState = {
      repositories: [repositories[0]],
      loading: false,
      selectedRepositoryId: null,
    }
    mockGetFilteredRepositories.mockReturnValue(storeState.repositories)

    render(
      <RepositoryManagementPage
        pendingRepositoryDetailId="repo-2"
        onPendingRepositoryDetailHandled={onPendingRepositoryDetailHandled}
      />,
    )

    expect(mockSelectRepository).not.toHaveBeenCalled()
    expect(onPendingRepositoryDetailHandled).toHaveBeenCalled()
    expect(mockDrawer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isOpen: false,
      }),
    )
  })
})
