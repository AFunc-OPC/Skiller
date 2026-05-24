import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClawHubPage } from './ClawHubPage'
import { useClawhubStore } from '../../stores/clawhubStore'
import { useAppStore } from '../../stores/appStore'
import type {
  ClawhubSkill,
  ClawhubSource,
  ClawhubSkillOverview,
  ClawhubSkillVersionItem,
  ClawhubSkillFileEntry,
} from '../../types'

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

function createOverview(overrides: Partial<ClawhubSkillOverview> = {}): ClawhubSkillOverview {
  return {
    slug: 'demo-skill',
    name: 'Demo Skill',
    description: 'Skill description',
    summary: 'Skill description',
    version: '1.2.3',
    downloads: 42,
    rating: 4.7,
    created_at: '2026-05-10T10:00:00Z',
    updated_at: '2026-05-13T12:34:56Z',
    owner_handle: 'openclaw',
    owner_name: 'OpenClaw',
    metadata_os: ['macos'],
    metadata_systems: ['aarch64-darwin'],
    ...overrides,
  }
}

function createVersionItem(overrides: Partial<ClawhubSkillVersionItem> = {}): ClawhubSkillVersionItem {
  return {
    version: '1.2.3',
    created_at: '2026-05-13T12:34:56Z',
    changelog: 'Latest',
    is_latest: true,
    ...overrides,
  }
}

function createFileEntry(overrides: Partial<ClawhubSkillFileEntry> = {}): ClawhubSkillFileEntry {
  return {
    path: 'SKILL.md',
    size: 1200,
    content_type: 'text/markdown',
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
      skillOverview: null,
      activeDetailTab: 'overview',
      skillVersions: null,
      versionsLoading: false,
      skillFiles: null,
      filesLoading: false,
      fileContent: null,
      fileContentLoading: false,
      selectedVersion: null,
      selectedFilePath: null,
      searchQuery: '',
      sortOption: 'updated',
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
      loadSkillVersions: vi.fn(async () => {}),
      loadSkillFiles: vi.fn(async () => {}),
      readSkillFile: vi.fn(async () => {}),
      clearSkillDetail: vi.fn(),
      setActiveDetailTab: vi.fn(),
      selectDetailVersion: vi.fn(),
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
    expect(screen.getByRole('heading', { name: 'Source A' })).toBeInTheDocument()
    expect(screen.getByText('https://example.com')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '搜索技能...' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '卡片' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '列表' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '排序' })).toBeInTheDocument()
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

  it('shows card description tooltips and keeps import affordances visible in list mode', async () => {
    const user = userEvent.setup()

    useClawhubStore.setState({
      skills: [createSkill({ description: 'A long card description for tooltip coverage' })],
    })

    render(<ClawHubPage />)

    const cardDescription = await screen.findByText('A long card description for tooltip coverage')
    expect(cardDescription).toHaveAttribute('title', 'A long card description for tooltip coverage')

    await user.click(screen.getByRole('button', { name: '列表' }))

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

  it('opens the shared drawer on overview and lazily loads versions and files', async () => {
    const user = userEvent.setup()
    const loadSkillVersions = vi.fn(async () => {})
    const loadSkillFiles = vi.fn(async () => {})

    useClawhubStore.setState({
      skills: [createSkill()],
      selectedSkillSlug: 'demo-skill',
      skillOverview: createOverview(),
      detailLoading: false,
      activeDetailTab: 'overview',
      skillVersions: null,
      versionsLoading: false,
      skillFiles: null,
      filesLoading: false,
      selectedVersion: null,
      selectedFilePath: null,
      fileContent: null,
      fileContentLoading: false,
      loadSkillVersions,
      loadSkillFiles,
    })

    render(<ClawHubPage />)

    expect(await screen.findByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')

    await user.click(screen.getByRole('tab', { name: 'Versions' }))

    expect(loadSkillVersions).toHaveBeenCalledWith('source-a', 'demo-skill')

    await user.click(screen.getByRole('tab', { name: 'Files' }))

    expect(loadSkillFiles).toHaveBeenCalledWith('source-a', 'demo-skill', undefined)
  })

  it('loads file content on click and resets file selection when the version changes', async () => {
    const user = userEvent.setup()
    const readSkillFile = vi.fn(async () => {})
    const loadSkillFiles = vi.fn(async () => {})
    const setActiveDetailTab = vi.fn((tab: 'overview' | 'versions' | 'files') => {
      useClawhubStore.setState({ activeDetailTab: tab })
    })
    const selectDetailVersion = vi.fn((version: string | null) => {
      useClawhubStore.setState({ selectedVersion: version, selectedFilePath: null })
    })

    useClawhubStore.setState({
      skills: [createSkill()],
      selectedSkillSlug: 'demo-skill',
      skillOverview: createOverview(),
      activeDetailTab: 'files',
      selectedVersion: '1.2.3',
      skillFiles: [
        createFileEntry(),
        createFileEntry({ path: 'notes.txt', size: 50, content_type: 'text/plain' }),
      ],
      filesLoading: false,
      fileContent: null,
      fileContentLoading: false,
      selectedFilePath: null,
      readSkillFile,
      loadSkillFiles,
      setActiveDetailTab,
      skillVersions: [
        createVersionItem(),
        createVersionItem({ version: '1.2.2', created_at: '2026-05-10T10:00:00Z', changelog: 'Previous', is_latest: false }),
      ],
      selectDetailVersion,
    })

    render(<ClawHubPage />)

    await user.click(screen.getByRole('button', { name: 'SKILL.md' }))

    expect(readSkillFile).toHaveBeenCalledWith('source-a', 'demo-skill', 'SKILL.md', '1.2.3')

    await user.click(screen.getByRole('tab', { name: 'Versions' }))
    await user.click(screen.getByRole('button', { name: /1.2.2/ }))

    expect(loadSkillFiles).toHaveBeenCalledWith('source-a', 'demo-skill', '1.2.2')
    expect(useClawhubStore.getState().selectedFilePath).toBeNull()
  })

  it('resets active tab and selected file when the drawer closes', async () => {
    const user = userEvent.setup()
    const clearSkillDetail = vi.fn(() => {
      useClawhubStore.setState({
        selectedSkillSlug: null,
        activeDetailTab: 'overview',
        selectedFilePath: null,
      })
    })

    useClawhubStore.setState({
      skills: [createSkill()],
      selectedSkillSlug: 'demo-skill',
      skillOverview: createOverview(),
      activeDetailTab: 'files',
      selectedFilePath: 'SKILL.md',
      skillFiles: [createFileEntry()],
      clearSkillDetail,
    })

    render(<ClawHubPage />)

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(useClawhubStore.getState().selectedSkillSlug).toBeNull()
    expect(useClawhubStore.getState().activeDetailTab).toBe('overview')
    expect(useClawhubStore.getState().selectedFilePath).toBeNull()
  })
})
