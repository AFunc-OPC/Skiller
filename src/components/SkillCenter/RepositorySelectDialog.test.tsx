import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RepositorySelectDialog } from './RepositorySelectDialog'
import { repoApi } from '../../api/repo'
import type { Repo } from '../../types'

vi.mock('../../api/repo', () => ({
  repoApi: {
    listSkills: vi.fn(),
    getSkillCount: vi.fn(),
  },
}))

const mockRepoApi = vi.mocked(repoApi)

const mockRepos: Repo[] = [
  {
    id: 'repo-1',
    name: 'Demo Repository',
    url: 'https://github.com/demo/skills',
    local_path: '/path/to/repo',
    branch: 'main',
    last_sync: '2024-01-01T00:00:00Z',
    is_builtin: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    description: 'A demo repository',
    skill_relative_path: 'skills',
  },
  {
    id: 'repo-2',
    name: 'Another Repository',
    url: 'https://github.com/another/skills',
    local_path: '/path/to/another',
    branch: 'develop',
    last_sync: '2024-01-02T00:00:00Z',
    is_builtin: false,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
]

const mockSkills = [
  {
    name: 'skill-1',
    path: '/path/to/repo/skills/skill-1',
    description: 'First skill',
  },
  {
    name: 'skill-2',
    path: '/path/to/repo/skills/skill-2',
    description: 'Second skill',
  },
]

describe('RepositorySelectDialog', () => {
  const mocks = {
    onClose: vi.fn(),
    onImport: vi.fn(),
    onDeleteSkill: vi.fn(),
    onLoadRepositories: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockRepoApi.listSkills.mockResolvedValue(mockSkills)
    mockRepoApi.getSkillCount.mockResolvedValue(2)
    mocks.onImport.mockResolvedValue(undefined)
  })

  function renderDialog(props = {}) {
    return render(
      <RepositorySelectDialog
        isOpen
        onClose={mocks.onClose}
        onImport={mocks.onImport}
        onDeleteSkill={mocks.onDeleteSkill}
        existingSkills={[]}
        repositories={mockRepos}
        loading={false}
        onLoadRepositories={mocks.onLoadRepositories}
        {...props}
      />,
    )
  }

  function getRepoButton(name: string) {
    const buttons = screen.getAllByRole('button', { name: new RegExp(name) })
    return buttons.find(btn => btn.classList.contains('repo-item')) || buttons[0]
  }

  function getSkillButton(name: string) {
    const buttons = screen.getAllByRole('button')
    return buttons.find(btn => 
      btn.classList.contains('skill-item') && 
      btn.textContent?.includes(name)
    )
  }

  it('renders with left-right split layout', () => {
    renderDialog()

    expect(screen.getByText('从仓库导入技能')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('搜索仓库...')).toBeInTheDocument()
    expect(screen.getByText('选择一个仓库')).toBeInTheDocument()
  })

  it('displays repository list', () => {
    renderDialog()

    expect(screen.getByText('Demo Repository')).toBeInTheDocument()
    expect(screen.getByText('https://github.com/demo/skills')).toBeInTheDocument()
    expect(screen.getByText('Another Repository')).toBeInTheDocument()
  })

  it('filters repositories by search keyword', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByPlaceholderText('搜索仓库...'), 'Demo')

    // Check if the filtered repo is still in the document
    const repoItems = screen.getAllByRole('button').filter(btn => 
      btn.classList.contains('repo-item')
    )
    expect(repoItems).toHaveLength(1)
    expect(repoItems[0]).toHaveTextContent('Demo')
    expect(repoItems[0]).not.toHaveTextContent('Another')
  })

  it('loads skills when repository is selected', async () => {
    const user = userEvent.setup()
    renderDialog()

    const repoButton = getRepoButton('Demo Repository')
    await user.click(repoButton)

    await waitFor(() => {
      expect(mockRepoApi.listSkills).toHaveBeenCalledWith('repo-1')
    })

    // Find skill items by class name
    const skillItems = await screen.findAllByRole('button')
    const skill1Item = skillItems.find(btn => 
      btn.classList.contains('skill-item') && 
      btn.querySelector('.skill-item-name')?.textContent === 'skill-1'
    )
    const skill2Item = skillItems.find(btn => 
      btn.classList.contains('skill-item') && 
      btn.querySelector('.skill-item-name')?.textContent === 'skill-2'
    )
    
    expect(skill1Item).toBeInTheDocument()
    expect(skill2Item).toBeInTheDocument()
  })

  it('filters skills by search keyword', async () => {
    const user = userEvent.setup()
    renderDialog()

    const repoButton = getRepoButton('Demo Repository')
    await user.click(repoButton)
    
    // Wait for skills to load
    await screen.findAllByRole('button')

    await user.type(screen.getByPlaceholderText('搜索技能...'), 'skill-1')

    // Check if skill-1 is in the document
    const skillItems = screen.getAllByRole('button').filter(btn => 
      btn.classList.contains('skill-item')
    )
    expect(skillItems).toHaveLength(1)
    expect(skillItems[0].querySelector('.skill-item-name')?.textContent).toBe('skill-1')
  })

  it('toggles skill selection with checkbox', async () => {
    const user = userEvent.setup()
    renderDialog()

    const repoButton = getRepoButton('Demo Repository')
    await user.click(repoButton)
    
    await screen.findByText('skill-1')

    const skill1Button = getSkillButton('skill-1')
    await user.click(skill1Button!)

    const footerInfo = screen.getByText(/已选择/)
    expect(footerInfo).toBeInTheDocument()
  })

  it('selects all skills with "Select All" button', async () => {
    const user = userEvent.setup()
    renderDialog()

    const repoButton = getRepoButton('Demo Repository')
    await user.click(repoButton)
    
    await screen.findByText('skill-1')

    await user.click(screen.getByRole('button', { name: /全选/ }))

    const importButton = screen.getByRole('button', { name: /导入选中项/ })
    expect(importButton).not.toBeDisabled()
  })

  it('deselects all skills when "Select All" is clicked again', async () => {
    const user = userEvent.setup()
    renderDialog()

    const repoButton = getRepoButton('Demo Repository')
    await user.click(repoButton)
    
    await screen.findByText('skill-1')

    await user.click(screen.getByRole('button', { name: /全选/ }))
    
    const importButton = screen.getByRole('button', { name: /导入选中项/ })
    expect(importButton).not.toBeDisabled()

    await user.click(screen.getByRole('button', { name: /已全选/ }))
    expect(importButton).toBeDisabled()
  })

  it('disables import button when no skills are selected', () => {
    renderDialog()

    expect(screen.getByRole('button', { name: /导入选中项/ })).toBeDisabled()
  })

  it('imports selected skills on button click', async () => {
    const user = userEvent.setup()
    renderDialog()

    const repoButton = getRepoButton('Demo Repository')
    await user.click(repoButton)
    
    await screen.findByText('skill-1')

    const skill1Button = getSkillButton('skill-1')
    await user.click(skill1Button!)

    await user.click(screen.getByRole('button', { name: /导入选中项/ }))

    await waitFor(() => {
      expect(mocks.onImport).toHaveBeenCalledWith('repo-1', mockSkills[0].path)
    })
  })

  it('shows loading state while fetching skills', async () => {
    mockRepoApi.listSkills.mockImplementation(() => new Promise(() => {}))
    const user = userEvent.setup()
    renderDialog()

    const repoButton = getRepoButton('Demo Repository')
    await user.click(repoButton)

    expect(screen.getByText('加载技能列表...')).toBeInTheDocument()
  })

  it('shows empty state when repository has no skills', async () => {
    mockRepoApi.listSkills.mockResolvedValueOnce([])
    const user = userEvent.setup()
    renderDialog()

    const repoButton = getRepoButton('Demo Repository')
    await user.click(repoButton)

    expect(await screen.findByText('该仓库尚未同步或未找到可导入的技能')).toBeInTheDocument()
  })

  it('shows error message when import fails', async () => {
    mocks.onImport.mockRejectedValueOnce(new Error('Import failed'))
    const user = userEvent.setup()
    renderDialog()

    const repoButton = getRepoButton('Demo Repository')
    await user.click(repoButton)
    
    await screen.findByText('skill-1')

    const skill1Button = getSkillButton('skill-1')
    await user.click(skill1Button!)

    await user.click(screen.getByRole('button', { name: /导入选中项/ }))

    expect(await screen.findByText('Import failed')).toBeInTheDocument()
  })

  it('shows empty state when no repositories available', () => {
    renderDialog({ repositories: [] })

    expect(screen.getByText('暂无可用仓库')).toBeInTheDocument()
  })

  it('shows overwrite confirmation when selected skills already exist', async () => {
    const user = userEvent.setup()
    renderDialog({ existingSkills: [{ id: 'existing-1', name: 'skill-1', file_path: '/skills/skill-1', source: 'file', source_metadata: null, repo_id: null, tags: [], status: 'available', created_at: '2024-01-01', updated_at: '2024-01-01', description: null }] })

    const repoButton = getRepoButton('Demo Repository')
    await user.click(repoButton)
    await screen.findByText('skill-1')

    const skill1Button = getSkillButton('skill-1')
    await user.click(skill1Button!)
    await user.click(screen.getByRole('button', { name: /导入选中项/ }))

    expect(await screen.findByText(/已存在，导入后将覆盖/)).toBeInTheDocument()
    const confirmModal = document.querySelector('.repo-import-confirm-modal')
    expect(confirmModal?.textContent).toContain('skill-1')
  })

  it('overwrites existing skills after confirmation', async () => {
    const user = userEvent.setup()
    renderDialog({ existingSkills: [{ id: 'existing-1', name: 'skill-1', file_path: '/skills/skill-1', source: 'file', source_metadata: null, repo_id: null, tags: [], status: 'available', created_at: '2024-01-01', updated_at: '2024-01-01', description: null }] })

    const repoButton = getRepoButton('Demo Repository')
    await user.click(repoButton)
    await screen.findByText('skill-1')

    await user.click(getSkillButton('skill-1')!)
    await user.click(screen.getByRole('button', { name: /导入选中项/ }))
    await user.click(screen.getByRole('button', { name: /确认导入/ }))

    await waitFor(() => {
      expect(mocks.onDeleteSkill).toHaveBeenCalledWith('existing-1')
      expect(mocks.onImport).toHaveBeenCalledWith('repo-1', mockSkills[0].path)
    })
  })
})
