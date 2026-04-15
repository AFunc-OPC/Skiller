import { beforeEach, describe, expect, it } from 'vitest'
import type { Repo } from '../types'
import { useRepositoryStore } from './repositoryStore'

function createRepo(overrides: Partial<Repo> = {}): Repo {
  return {
    id: 'repo-1',
    name: 'Demo Repo',
    url: 'https://example.com/demo.git',
    local_path: '/tmp/demo-repo',
    branch: 'main',
    last_sync: null,
    is_builtin: false,
    created_at: '2026-04-08T00:00:00Z',
    updated_at: '2026-04-08T00:00:00Z',
    description: 'demo',
    skill_relative_path: 'skills/demo',
    auth_method: 'ssh',
    username: null,
    token: null,
    ssh_key: '~/.ssh/id_rsa',
    ...overrides,
  }
}

describe('repositoryStore', () => {
  beforeEach(() => {
    useRepositoryStore.setState({
      repositories: [],
      selectedRepositoryId: null,
      repositorySkills: [],
      searchKeyword: '',
      viewMode: 'card',
      loading: false,
      error: null,
      cloningRepository: false,
      cloneProgress: null,
      syncingRepositoryIds: [],
    })
  })

  it('preserves existing optional repository fields after sync completion', () => {
    useRepositoryStore.setState({
      repositories: [createRepo()],
      syncingRepositoryIds: ['repo-1'],
    })

    useRepositoryStore.getState().markRepositorySyncCompleted(
      createRepo({
        local_path: null,
        skill_relative_path: undefined,
        description: undefined,
        auth_method: undefined,
        ssh_key: undefined,
        last_sync: '2026-04-08T12:00:00Z',
        updated_at: '2026-04-08T12:00:00Z',
      }),
    )

    const [repo] = useRepositoryStore.getState().repositories

    expect(repo.skill_relative_path).toBe('skills/demo')
    expect(repo.local_path).toBe('/tmp/demo-repo')
    expect(repo.description).toBe('demo')
    expect(repo.auth_method).toBe('ssh')
    expect(repo.ssh_key).toBe('~/.ssh/id_rsa')
    expect(repo.last_sync).toBe('2026-04-08T12:00:00Z')
    expect(useRepositoryStore.getState().syncingRepositoryIds).toEqual([])
  })
})
