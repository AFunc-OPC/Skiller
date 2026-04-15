import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProjectSkillList } from './ProjectSkillList'
import type { Skill, ToolPreset } from '../../types'

const mocks = vi.hoisted(() => ({
  language: 'zh' as 'zh' | 'en',
}))

vi.mock('../../stores/appStore', () => ({
  useAppStore: vi.fn(() => ({ language: mocks.language })),
}))

const createMockSkill = (id: string, name: string): Skill => ({
  id,
  name,
  description: `Description for ${name}`,
  file_path: `/skills/${name}.md`,
  source: 'file',
  source_metadata: { type: 'file', original_path: `/original/${name}.md` },
  repo_id: null,
  tags: [],
  status: 'available',
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-10T00:00:00Z',
})

const mockSkills: Skill[] = [
  createMockSkill('skill-1', 'Test Skill 1'),
  createMockSkill('skill-2', 'Test Skill 2'),
  createMockSkill('skill-3', 'Test Skill 3'),
]

const mockToolPresets: ToolPreset[] = [
  {
    id: 'preset-opencode',
    name: 'OpenCode',
    skill_path: '.opencode/skills/',
    global_path: '/Users/demo/.opencode/skills/',
    is_builtin: false,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-10T00:00:00Z',
  },
]

const defaultProps = {
  skills: mockSkills,
  skillsByPreset: { 'preset-opencode': mockSkills },
  toolPresets: mockToolPresets,
  selectedPresetId: 'preset-opencode',
  loading: false,
  error: null,
  onPresetChange: vi.fn(),
  onRemove: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  onToggleStatus: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  onBatchRemove: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  onBatchToggle: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  onImport: vi.fn(),
  onRetry: vi.fn(),
}

describe('ProjectSkillList - Delete Confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.language = 'zh'
  })

  describe('Single Delete Confirmation', () => {
    it('shows confirmation dialog when delete button is clicked', async () => {
      const user = userEvent.setup()
      render(<ProjectSkillList {...defaultProps} />)

      const deleteButtons = await screen.findAllByTitle('移除')
      await user.click(deleteButtons[0])

      expect(screen.getByText('确认移除')).toBeInTheDocument()
      expect(screen.getByText(/确定要移除技能 "Test Skill 1"/)).toBeInTheDocument()
    })

    it('closes dialog without deleting when cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<ProjectSkillList {...defaultProps} />)

      const deleteButtons = await screen.findAllByTitle('移除')
      await user.click(deleteButtons[0])

      expect(screen.getByText('确认移除')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: '取消' }))

      await waitFor(() => {
        expect(screen.queryByText('确认移除')).not.toBeInTheDocument()
      })
      expect(defaultProps.onRemove).not.toHaveBeenCalled()
    })

    it('executes delete when confirm button is clicked', async () => {
      const user = userEvent.setup()
      render(<ProjectSkillList {...defaultProps} />)

      const deleteButtons = await screen.findAllByTitle('移除')
      await user.click(deleteButtons[0])

      const confirmButton = document.querySelector('.pm-btn-danger') as HTMLElement
      await user.click(confirmButton)

      await waitFor(() => {
        expect(defaultProps.onRemove).toHaveBeenCalledWith('skill-1')
      })
    })

    it('displays correct skill name in confirmation dialog', async () => {
      const user = userEvent.setup()
      render(<ProjectSkillList {...defaultProps} />)

      const deleteButtons = await screen.findAllByTitle('移除')
      await user.click(deleteButtons[1])

      expect(screen.getByText(/确定要移除技能 "Test Skill 2"/)).toBeInTheDocument()
    })
  })

  describe('Batch Delete Confirmation', () => {
    it('shows batch delete button when skills are selected', async () => {
      const user = userEvent.setup()
      render(<ProjectSkillList {...defaultProps} />)

      const checkboxes = await screen.findAllByRole('checkbox')
      await user.click(checkboxes[1])

      expect(screen.getByText('已选 1')).toBeInTheDocument()
      expect(screen.getByTitle('批量移除')).toBeInTheDocument()
    })

    it('shows confirmation dialog when batch delete button is clicked', async () => {
      const user = userEvent.setup()
      render(<ProjectSkillList {...defaultProps} />)

      const checkboxes = await screen.findAllByRole('checkbox')
      await user.click(checkboxes[1])
      await user.click(checkboxes[2])

      await user.click(screen.getByTitle('批量移除'))

      expect(screen.getByText('确认批量移除')).toBeInTheDocument()
      expect(screen.getByText(/确定要移除选中的 2 个技能/)).toBeInTheDocument()
    })

    it('closes dialog without deleting when cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<ProjectSkillList {...defaultProps} />)

      const checkboxes = await screen.findAllByRole('checkbox')
      await user.click(checkboxes[1])

      await user.click(screen.getByTitle('批量移除'))
      expect(screen.getByText('确认批量移除')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: '取消' }))

      await waitFor(() => {
        expect(screen.queryByText('确认批量移除')).not.toBeInTheDocument()
      })
      expect(defaultProps.onBatchRemove).not.toHaveBeenCalled()
    })

    it('executes batch delete when confirm button is clicked', async () => {
      const user = userEvent.setup()
      render(<ProjectSkillList {...defaultProps} />)

      const checkboxes = await screen.findAllByRole('checkbox')
      await user.click(checkboxes[1])
      await user.click(checkboxes[2])

      await user.click(screen.getByTitle('批量移除'))
      
      const confirmButton = document.querySelector('.pm-btn-danger') as HTMLElement
      await user.click(confirmButton)

      await waitFor(() => {
        expect(defaultProps.onBatchRemove).toHaveBeenCalledWith(['skill-1', 'skill-2'])
      })
    })

    it('displays correct selected count in confirmation dialog', async () => {
      const user = userEvent.setup()
      render(<ProjectSkillList {...defaultProps} />)

      const checkboxes = await screen.findAllByRole('checkbox')
      await user.click(checkboxes[1])
      await user.click(checkboxes[2])
      await user.click(checkboxes[3])

      await user.click(screen.getByTitle('批量移除'))

      expect(screen.getByText(/确定要移除选中的 3 个技能/)).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('closes dialog when clicking overlay', async () => {
      const user = userEvent.setup()
      render(<ProjectSkillList {...defaultProps} />)

      const deleteButtons = await screen.findAllByTitle('移除')
      await user.click(deleteButtons[0])

      expect(screen.getByText('确认移除')).toBeInTheDocument()

      const overlay = document.querySelector('.pm-overlay') as HTMLElement
      await user.click(overlay)

      await waitFor(() => {
        expect(screen.queryByText('确认移除')).not.toBeInTheDocument()
      })
    })

    it('hides batch delete button when no skills are selected', async () => {
      render(<ProjectSkillList {...defaultProps} />)

      await screen.findByText('Test Skill 1')

      expect(screen.queryByTitle('批量移除')).not.toBeInTheDocument()
    })

    it('supports English language for confirmation dialogs', async () => {
      mocks.language = 'en'
      const user = userEvent.setup()
      render(<ProjectSkillList {...defaultProps} />)

      const deleteButtons = await screen.findAllByTitle('Remove')
      await user.click(deleteButtons[0])

      expect(screen.getByText('Confirm Remove')).toBeInTheDocument()
      expect(screen.getByText(/Are you sure you want to remove "Test Skill 1"/)).toBeInTheDocument()
    })

    it('supports English language for batch delete dialogs', async () => {
      mocks.language = 'en'
      const user = userEvent.setup()
      render(<ProjectSkillList {...defaultProps} />)

      const checkboxes = await screen.findAllByRole('checkbox')
      await user.click(checkboxes[1])

      await user.click(screen.getByTitle('Batch remove'))

      expect(screen.getByText('Confirm Batch Remove')).toBeInTheDocument()
      expect(screen.getByText(/Are you sure you want to remove 1 selected skills/)).toBeInTheDocument()
    })
  })
})
