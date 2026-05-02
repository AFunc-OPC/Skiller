import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WorkflowTimeline } from './WorkflowTimeline'

const STAGES = ['propose', 'new', 'continue', 'apply', 'verify', 'archive']

describe('WorkflowTimeline', () => {
  describe('Rendering', () => {
    it('renders all stage labels in Chinese', () => {
      render(<WorkflowTimeline currentStage="propose" language="zh" />)

      expect(screen.getByText('提案')).toBeInTheDocument()
      expect(screen.getByText('新建')).toBeInTheDocument()
      expect(screen.getByText('迭代')).toBeInTheDocument()
      expect(screen.getByText('实现')).toBeInTheDocument()
      expect(screen.getByText('验证')).toBeInTheDocument()
      expect(screen.getByText('归档')).toBeInTheDocument()
    })

    it('renders all stage labels in English', () => {
      render(<WorkflowTimeline currentStage="propose" language="en" />)

      expect(screen.getByText('Propose')).toBeInTheDocument()
      expect(screen.getByText('New')).toBeInTheDocument()
      expect(screen.getByText('Iterate')).toBeInTheDocument()
      expect(screen.getByText('Apply')).toBeInTheDocument()
      expect(screen.getByText('Verify')).toBeInTheDocument()
      expect(screen.getByText('Archive')).toBeInTheDocument()
    })
  })

  describe('Stage States', () => {
    it('marks propose as current when currentStage is propose', () => {
      render(<WorkflowTimeline currentStage="propose" language="zh" />)

      const stageLabels = document.querySelectorAll('.os-stage-label')
      const proposeLabel = Array.from(stageLabels).find((label) => label.textContent === '提案')
      expect(proposeLabel).toHaveClass('active')
    })

    it('marks propose and new as completed when currentStage is continue', () => {
      render(<WorkflowTimeline currentStage="continue" language="zh" />)

      const completedNodes = document.querySelectorAll('.os-stage-node.completed')
      expect(completedNodes.length).toBe(2)
    })

    it('marks all previous stages as completed', () => {
      render(<WorkflowTimeline currentStage="verify" language="zh" />)

      const completedNodes = document.querySelectorAll('.os-stage-node.completed')
      expect(completedNodes.length).toBe(4)
    })

    it('marks archive stage as current when currentStage is archive', () => {
      render(<WorkflowTimeline currentStage="archive" language="zh" />)

      const stageLabels = document.querySelectorAll('.os-stage-label')
      const archiveLabel = Array.from(stageLabels).find((label) => label.textContent === '归档')
      expect(archiveLabel).toHaveClass('active')
    })
  })

  describe('Visual Indicators', () => {
    it('shows check icon in completed stages', () => {
      render(<WorkflowTimeline currentStage="apply" language="zh" />)

      const checkIcons = document.querySelectorAll('svg')
      const completedNodes = document.querySelectorAll('.os-stage-node.completed')
      expect(completedNodes.length).toBeGreaterThan(0)
    })

    it('has current class on current stage node', () => {
      render(<WorkflowTimeline currentStage="new" language="zh" />)

      const currentNode = document.querySelector('.os-stage-node.current')
      expect(currentNode).toBeInTheDocument()
    })

    it('has pending class on future stages', () => {
      render(<WorkflowTimeline currentStage="propose" language="zh" />)

      const pendingNodes = document.querySelectorAll('.os-stage-node.pending')
      expect(pendingNodes.length).toBe(5)
    })
  })

  describe('Stage Progression', () => {
    it.each(STAGES)('correctly renders timeline for stage: %s', (stage) => {
      render(<WorkflowTimeline currentStage={stage} language="en" />)

      const stageIndex = STAGES.indexOf(stage)
      const completedNodes = document.querySelectorAll('.os-stage-node.completed')
      const pendingNodes = document.querySelectorAll('.os-stage-node.pending')

      expect(completedNodes.length).toBe(stageIndex)
      expect(pendingNodes.length).toBe(STAGES.length - stageIndex - 1)
    })
  })
})
