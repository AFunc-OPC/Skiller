import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChangesList } from './ChangesList'
import type { OpenSpecChangeInfo, OpenSpecStage } from '../../types'

const createMockChange = (
  name: string, 
  status: OpenSpecChangeInfo['status'] = 'no-tasks',
  currentStage: OpenSpecStage = 'propose',
  completedTasks = 0,
  totalTasks = 0
): OpenSpecChangeInfo => ({
  name,
  completedTasks,
  totalTasks,
  lastModified: '2026-05-02T00:00:00Z',
  status,
  currentStage,
  artifacts: [],
})

const mockChanges: OpenSpecChangeInfo[] = [
  createMockChange('add-feature-x', 'in-progress', 'apply', 2, 5),
  createMockChange('fix-bug-y', 'no-tasks', 'propose', 0, 0),
  createMockChange('update-docs', 'complete', 'archive', 3, 3),
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

    it('shows loading state with skeleton', () => {
      render(<ChangesList {...defaultProps} loading={true} />)

      const skeletonItems = document.querySelectorAll('.os-skeleton-item')
      expect(skeletonItems.length).toBe(3)
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

      const mark = document.querySelector('mark.os-highlight')
      expect(mark).toBeInTheDocument()
      expect(mark?.textContent).toBe('feature')
    })

    it('shows no matching message when search has no results', async () => {
      const user = userEvent.setup()
      render(<ChangesList {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText('搜索变更...')
      await user.type(searchInput, 'nonexistent')

      expect(screen.getByText('无匹配结果')).toBeInTheDocument()
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
    it('calls onSelectChange when change item is clicked', async () => {
      const user = userEvent.setup()
      render(<ChangesList {...defaultProps} />)

      await user.click(screen.getByText('add-feature-x'))

      expect(defaultProps.onSelectChange).toHaveBeenCalledWith('add-feature-x')
    })

    it('shows selected state on clicked change', () => {
      render(<ChangesList {...defaultProps} selectedChangeId="add-feature-x" />)

      const selectedItem = document.querySelector('.os-change-item.selected')
      expect(selectedItem).toBeInTheDocument()
    })
  })

  describe('Stage Display', () => {
    it('shows stage badges for changes', () => {
      render(<ChangesList {...defaultProps} />)

      const stageBadges = document.querySelectorAll('.os-stage-badge')
      expect(stageBadges.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Language Support', () => {
    it('shows English labels when language is en', () => {
      render(<ChangesList {...defaultProps} language="en" />)

      expect(screen.getByPlaceholderText('Search changes...')).toBeInTheDocument()
    })
  })
})
