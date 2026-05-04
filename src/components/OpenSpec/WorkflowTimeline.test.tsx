import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WorkflowTimeline } from './WorkflowTimeline'

const STAGES = ['proposal', 'apply', 'archive']

const defaultProps = {
  completedTasks: 0,
  totalTasks: 5,
  artifacts: [] as Array<{ name: string; type: string }>,
  status: 'in-progress',
  language: 'zh' as const,
}

describe('WorkflowTimeline', () => {
  describe('Rendering', () => {
    it('renders all stage labels in Chinese', () => {
      render(<WorkflowTimeline {...defaultProps} currentStage="proposal" />)

      expect(screen.getByText('提案')).toBeInTheDocument()
      expect(screen.getByText('实现')).toBeInTheDocument()
      expect(screen.getByText('归档')).toBeInTheDocument()
    })

    it('renders all stage labels in English', () => {
      render(<WorkflowTimeline {...defaultProps} currentStage="proposal" language="en" />)

      expect(screen.getByText('Proposal')).toBeInTheDocument()
      expect(screen.getByText('Apply')).toBeInTheDocument()
      expect(screen.getByText('Archive')).toBeInTheDocument()
    })
  })

  describe('Stage States', () => {
    it('marks proposal as current when currentStage is proposal and no proposal artifact', () => {
      render(<WorkflowTimeline {...defaultProps} currentStage="proposal" />)

      const stageLabels = document.querySelectorAll('.os-stage-label')
      const proposalLabel = Array.from(stageLabels).find((label) => label.textContent === '提案')
      expect(proposalLabel).toHaveClass('active')
    })

    it('marks proposal as completed when has proposal artifact', () => {
      render(
        <WorkflowTimeline 
          {...defaultProps} 
          currentStage="apply" 
          artifacts={[{ name: 'proposal.md', type: 'proposal' }]} 
        />
      )

      const completedNodes = document.querySelectorAll('.os-stage-node.completed')
      expect(completedNodes.length).toBe(1)
    })

    it('marks apply as completed when tasks are 100% complete', () => {
      render(
        <WorkflowTimeline 
          {...defaultProps} 
          currentStage="apply"
          completedTasks={5}
          totalTasks={5}
          artifacts={[{ name: 'proposal.md', type: 'proposal' }]} 
        />
      )

      const completedNodes = document.querySelectorAll('.os-stage-node.completed')
      expect(completedNodes.length).toBe(2)
    })

    it('marks all stages as completed when archived', () => {
      render(
        <WorkflowTimeline 
          {...defaultProps} 
          currentStage="archive"
          completedTasks={5}
          totalTasks={5}
          isArchived={true}
          artifacts={[{ name: 'proposal.md', type: 'proposal' }]} 
        />
      )

      const completedNodes = document.querySelectorAll('.os-stage-node.completed')
      expect(completedNodes.length).toBe(3)
    })
  })

  describe('Visual Indicators', () => {
    it('shows check icon in completed stages', () => {
      render(
        <WorkflowTimeline 
          {...defaultProps} 
          currentStage="apply"
          artifacts={[{ name: 'proposal.md', type: 'proposal' }]} 
        />
      )

      const completedNodes = document.querySelectorAll('.os-stage-node.completed')
      expect(completedNodes.length).toBe(1)
    })

    it('has current class on current stage node', () => {
      render(<WorkflowTimeline {...defaultProps} currentStage="apply" />)

      const currentNode = document.querySelector('.os-stage-node.current')
      expect(currentNode).toBeInTheDocument()
    })

    it('has pending class on future stages', () => {
      render(<WorkflowTimeline {...defaultProps} currentStage="proposal" />)

      const pendingNodes = document.querySelectorAll('.os-stage-node.pending')
      expect(pendingNodes.length).toBe(2)
    })
  })
})
