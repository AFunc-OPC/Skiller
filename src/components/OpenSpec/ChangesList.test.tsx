import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChangesList } from './ChangesList'
import type { OpenSpecChangeInfo } from '../../types'

const createMockChange = (id: string, name: string, status: 'in_progress' | 'archived' = 'in_progress'): OpenSpecChangeInfo => ({
  id,
  name,
  status,
  currentStage: 'propose',
  createdAt: '2026-05-02T00:00:00Z',
  updatedAt: '2026-05-02T00:00:00Z',
  artifacts: [],
})

const mockChanges: OpenSpecChangeInfo[] = [
  createMockChange('change-1', 'add-feature-x'),
  createMockChange('change-2', 'fix-bug-y'),
  createMockChange('change-3', 'update-docs', 'archived'),
]

const defaultProps = {
  changes: mockChanges,
  selectedChangeId: null,
  loading: false,
  error: null,
  onSelectChange: vi.fn(),
  projectPath: '/project/path',
  language: 'zh' as const,
}

describe('ChangesList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders all changes', () => {
      render(<ChangesList {...defaultProps} />)

      expect(screen.getByText('add-feature-x')).toBeInTheDocument()
      expect(screen.getByText('fix-bug-y')).toBeInTheDocument()
      expect(screen.getByText('update-docs')).toBeInTheDocument()
    })

    it('shows loading state', () => {
      render(<ChangesList {...defaultProps} loading={true} />)

      expect(screen.getByText('加载中...')).toBeInTheDocument()
    })

    it('shows error state', () => {
      render(<ChangesList {...defaultProps} error="Failed to load" />)

      expect(screen.getByText('Failed to load')).toBeInTheDocument()
    })

    it('shows empty state when no changes', () => {
      render(<ChangesList {...defaultProps} changes={[]} />)

      expect(screen.getByText('暂无变更')).toBeInTheDocument()
    })
  })

  describe('Search with Highlight', () => {
    it('filters changes by search query', async () => {
      const user = userEvent.setup()
      render(<ChangesList {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText('搜索变更...')
      await user.type(searchInput, 'feature')

      const changeName = document.querySelector('.os-change-name')
      expect(changeName).toBeInTheDocument()
      expect(changeName?.textContent).toBe('add-feature-x')
      expect(screen.queryByText('fix-bug-y')).not.toBeInTheDocument()
    })

    it('highlights matching text in change names', async () => {
      const user = userEvent.setup()
      render(<ChangesList {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText('搜索变更...')
      await user.type(searchInput, 'feature')

      const mark = document.querySelector('mark')
      expect(mark).toBeInTheDocument()
      expect(mark?.textContent).toBe('feature')
    })

    it('shows no matching message when search has no results', async () => {
      const user = userEvent.setup()
      render(<ChangesList {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText('搜索变更...')
      await user.type(searchInput, 'nonexistent')

      expect(screen.getByText('没有匹配的变更')).toBeInTheDocument()
    })

    it('clears search filter when input is cleared', async () => {
      const user = userEvent.setup()
      render(<ChangesList {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText('搜索变更...')
      await user.type(searchInput, 'feature')
      await user.clear(searchInput)

      expect(screen.getByText('add-feature-x')).toBeInTheDocument()
      expect(screen.getByText('fix-bug-y')).toBeInTheDocument()
    })
  })

  describe('Selection', () => {
    it('calls onSelectChange when change card is clicked', async () => {
      const user = userEvent.setup()
      render(<ChangesList {...defaultProps} />)

      await user.click(screen.getByText('add-feature-x'))

      expect(defaultProps.onSelectChange).toHaveBeenCalledWith('change-1')
    })

    it('shows selected state on clicked change', () => {
      render(<ChangesList {...defaultProps} selectedChangeId="change-1" />)

      const selectedCard = document.querySelector('.os-change-card.selected')
      expect(selectedCard).toBeInTheDocument()
    })
  })

  describe('Status Display', () => {
    it('shows in-progress status', () => {
      render(<ChangesList {...defaultProps} />)

      const inProgressStatuses = screen.getAllByText('进行中')
      expect(inProgressStatuses.length).toBe(2)
    })

    it('shows archived status', () => {
      render(<ChangesList {...defaultProps} />)

      const archivedStatuses = screen.getAllByText('已归档')
      expect(archivedStatuses.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Language Support', () => {
    it('shows English labels when language is en', () => {
      render(<ChangesList {...defaultProps} language="en" />)

      expect(screen.getByPlaceholderText('Search changes...')).toBeInTheDocument()
      const inProgressStatuses = screen.getAllByText('In Progress')
      expect(inProgressStatuses.length).toBe(2)
    })
  })
})
