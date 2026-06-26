import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { SkillDistributionPanel } from './SkillDistributionPanel'
import type { DistributeSkillResult, Project, ToolPreset } from '../../types'

const mocks = vi.hoisted(() => ({
  getToolPresets: vi.fn<() => Promise<ToolPreset[]>>(),
  listProjects: vi.fn<() => Promise<Project[]>>(),
  distributeSkill: vi.fn<(request: unknown) => Promise<DistributeSkillResult>>(),
  checkConflicts: vi.fn<() => Promise<{ conflicts: { skill_id: string; skill_name: string; target_path: string; target_label: string; exists: boolean }[] }>>(),
}))

vi.mock('../../api/config', () => ({
  configApi: { getToolPresets: mocks.getToolPresets },
}))

vi.mock('../../api/project', () => ({
  projectApi: { list: mocks.listProjects },
}))

vi.mock('../../api/distribution', () => ({
  distributionApi: { checkConflicts: mocks.checkConflicts },
}))

vi.mock('../../contexts/SkillContext', () => ({
  useSkillContext: () => ({ distributeSkill: mocks.distributeSkill }),
}))

vi.mock('../../stores/appStore', () => ({
  useAppStore: () => ({ language: 'zh' }),
}))

const preset: ToolPreset = {
  id: 'preset-1',
  name: 'OpenCode',
  skill_path: '.opencode/skills',
  global_path: '~/.config/opencode/skills',
  is_builtin: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const project: Project = {
  id: 'proj-1',
  name: 'Project Alpha',
  path: '/workspace/project-alpha',
  skill_path: '.opencode/skills',
  tool_preset_id: 'preset-1',
  description: null,
  icon: null,
  is_builtin: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('SkillDistributionPanel modeLocked', () => {
  beforeEach(() => {
    mocks.getToolPresets.mockResolvedValue([preset])
    mocks.listProjects.mockResolvedValue([project])
    mocks.distributeSkill.mockResolvedValue({ target_path: '/target', target: 'project', mode: 'copy' })
    mocks.checkConflicts.mockResolvedValue({ conflicts: [] })
  })

  it('locks mode to copy when modeLocked="copy"', () => {
    render(
      <SkillDistributionPanel
        skillIds={['/skills/demo']}
        skillNames={['demo']}
        modeLocked="copy"
      />,
    )

    const copyRadio = screen.getByRole('radio', { name: '复制' })
    const symlinkRadio = screen.getByRole('radio', { name: '软链接' })

    expect(copyRadio).toBeChecked()
    expect(symlinkRadio).toBeDisabled()
  })

  it('allows switching modes when modeLocked is not provided', () => {
    render(
      <SkillDistributionPanel
        skillIds={['/skills/demo']}
        skillNames={['demo']}
      />,
    )

    const copyRadio = screen.getByRole('radio', { name: '复制' })
    const symlinkRadio = screen.getByRole('radio', { name: '软链接' })

    expect(symlinkRadio).not.toBeDisabled()
    expect(copyRadio).not.toBeDisabled()
  })
})
