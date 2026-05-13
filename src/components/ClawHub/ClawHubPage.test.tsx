import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClawHubPage } from './ClawHubPage'
import { useClawhubStore } from '../../stores/clawhubStore'
import { useAppStore } from '../../stores/appStore'
import type { ClawhubSkill, ClawhubSource } from '../../types'

function createSource(overrides: Partial<ClawhubSource> = {}): ClawhubSource {
  return {
    id: 'source-a',
    name: 'Source A',
    registry_url: 'https://example.com',
    token: '',
    connection_type: 'api',
    cli_path: null,
    is_enabled: true,
    sort_order: 0,
    created_at: '2026-05-13T00:00:00Z',
    updated_at: '2026-05-13T00:00:00Z',
    ...overrides,
  }
}

function createSkill(overrides: Partial<ClawhubSkill> = {}): ClawhubSkill {
  return {
    slug: 'demo-skill',
    name: 'Demo Skill',
    description: 'Skill description',
    version: '1.2.3',
    downloads: 42,
    rating: 4.7,
    created_at: '2026-05-10T10:00:00Z',
    updated_at: '2026-05-13T12:34:56Z',
    ...overrides,
  }
}

describe('ClawHubPage', () => {
  beforeEach(() => {
    useAppStore.setState({ language: 'zh', theme: 'light' })

    const exploreSkills = vi.fn(async () => {})
    const searchSkills = vi.fn(async () => {})

    useClawhubStore.setState({
      sources: [
        createSource(),
        createSource({ id: 'source-b', name: 'Source B', sort_order: 1 }),
      ],
      selectedSourceId: 'source-a',
      skills: [],
      selectedSkillSlug: null,
      skillDetail: null,
      searchQuery: '',
      sortOption: 'newest',
      loading: false,
      skillsLoading: false,
      detailLoading: false,
      importing: false,
      importProgress: null,
      error: null,
      connectionTestResult: null,
      duplicateCheckResults: null,
      fetchSources: vi.fn(async () => {}),
      addSource: vi.fn(async () => {}),
      updateSource: vi.fn(async () => {}),
      deleteSource: vi.fn(async () => {}),
      selectSource: (id: string | null) => {
        useClawhubStore.setState({ selectedSourceId: id, skills: [], searchQuery: '', skillDetail: null })
      },
      testConnection: vi.fn(async () => ({ success: true, message: '', username: null })),
      exploreSkills,
      searchSkills,
      inspectSkill: vi.fn(async () => {}),
      clearSkillDetail: vi.fn(),
      setSortOption: vi.fn(),
      setSearchQuery: vi.fn(),
      importSkills: vi.fn(async () => []),
      checkDuplicates: vi.fn(async () => []),
      clearError: vi.fn(),
      clearConnectionTestResult: vi.fn(),
    })
  })

  it('requests skills once when switching sources', async () => {
    const user = userEvent.setup()
    render(<ClawHubPage />)

    await waitFor(() => {
      expect(useClawhubStore.getState().exploreSkills).toHaveBeenCalledWith('source-a')
    })

    vi.mocked(useClawhubStore.getState().exploreSkills).mockClear()

    await user.click(screen.getByRole('button', { name: /Source B/i }))

    await waitFor(() => {
      expect(useClawhubStore.getState().exploreSkills).toHaveBeenCalledTimes(1)
    })

    expect(useClawhubStore.getState().exploreSkills).toHaveBeenCalledWith('source-b')
  })

  it('fetches configured sources when the ClawHub page mounts', async () => {
    render(<ClawHubPage />)

    await waitFor(() => {
      expect(useClawhubStore.getState().fetchSources).toHaveBeenCalledTimes(1)
    })
  })

  it('auto-selects the first enabled source and requests skills once on initial load', async () => {
    useClawhubStore.setState({
      selectedSourceId: null,
    })

    render(
      <React.StrictMode>
        <ClawHubPage />
      </React.StrictMode>,
    )

    await waitFor(() => {
      expect(useClawhubStore.getState().selectedSourceId).toBe('source-a')
    })

    await waitFor(() => {
      expect(useClawhubStore.getState().exploreSkills).toHaveBeenCalledTimes(1)
    })

    expect(useClawhubStore.getState().exploreSkills).toHaveBeenCalledWith('source-a')
  })

  it('renders the ClawHub context band and browse controls for the selected source', async () => {
    useClawhubStore.setState({
      skills: [createSkill()],
    })

    render(<ClawHubPage />)

    expect(await screen.findByText('ClawHub')).toBeInTheDocument()
    expect(screen.getByText('在应用内浏览、筛选并导入线上技能。')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Source A' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '搜索技能...' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '卡片' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '列表' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '排序' })).toBeInTheDocument()
  })

  it('renders rating and updated date in card and list views when metadata is present', async () => {
    const user = userEvent.setup()

    useClawhubStore.setState({
      skills: [createSkill()],
    })

    render(<ClawHubPage />)

    expect(await screen.findByText('Demo Skill')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('4.7')).toBeInTheDocument()
    expect(screen.getByText('2026-05-13')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '列表' }))

    expect(screen.getByText('4.7')).toBeInTheDocument()
    expect(screen.getByText('2026-05-13')).toBeInTheDocument()
  })

  it('shows list mode as record rows and keeps import affordances visible', async () => {
    const user = userEvent.setup()

    useClawhubStore.setState({
      skills: [createSkill()],
    })

    render(<ClawHubPage />)

    await user.click(await screen.findByRole('button', { name: '列表' }))

    expect(screen.getByText('Demo Skill')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '导入到技能中心' }).length).toBeGreaterThan(0)
  })

  it('hides updated date when the metadata is invalid', async () => {
    useClawhubStore.setState({
      skills: [createSkill({ slug: 'invalid-date-skill', name: 'Invalid Date Skill', updated_at: 'not-a-date' })],
    })

    render(<ClawHubPage />)

    expect(await screen.findByText('Invalid Date Skill')).toBeInTheDocument()
    expect(screen.queryByText('not-a-date')).not.toBeInTheDocument()
  })
})
