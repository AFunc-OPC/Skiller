import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { SkillDetailDrawer } from './SkillDetailDrawer'
import type { DistributeSkillResult, Project, Skill, ToolPreset } from '../../types'

const writeTextMock = vi.fn<() => Promise<void>>()

const mocks = vi.hoisted(() => ({
  getToolPresets: vi.fn<() => Promise<ToolPreset[]>>(),
  listProjects: vi.fn<() => Promise<Project[]>>(),
  distributeSkill: vi.fn<(request: unknown) => Promise<DistributeSkillResult>>(),
  getSkillTags: vi.fn<() => Promise<string[]>>(),
  updateSkillTags: vi.fn<() => Promise<void>>(),
}))

vi.mock('../../api/config', () => ({
  configApi: {
    getToolPresets: mocks.getToolPresets,
  },
}))

vi.mock('../../api/project', () => ({
  projectApi: {
    list: mocks.listProjects,
  },
}))

vi.mock('../../api/desktop', () => ({
  desktopApi: {
    openFolder: vi.fn(),
  },
}))

vi.mock('../../contexts/SkillContext', () => ({
  useSkillContext: () => ({
    tags: [],
    getSkillTags: mocks.getSkillTags,
    updateSkillTags: mocks.updateSkillTags,
    distributeSkill: mocks.distributeSkill,
  }),
}))

const skill: Skill = {
  id: '/skills/demo-skill',
  name: 'Demo Skill',
  description: 'Skill for tests',
  file_path: '/skills/demo-skill',
  source: 'file',
  source_metadata: null,
  repo_id: null,
  tags: [],
  status: 'available',
  created_at: '2026-04-07T00:00:00Z',
  updated_at: '2026-04-07T00:00:00Z',
}

const toolPresets: ToolPreset[] = [
  { id: 'preset-opencode', name: 'OpenCode', skill_path: '.opencode/skills/', global_path: '.opencode/skills/', is_builtin: false, created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
  { id: 'preset-claude', name: 'Claude Code', skill_path: '.claude/commands/', global_path: '.claude/commands/', is_builtin: false, created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
]

const projects: Project[] = [
  {
    id: 'project-1',
    name: 'Project Alpha',
    path: '/workspace/project-alpha',
    skill_path: '.opencode/skills/',
    tool_preset_id: 'preset-opencode',
    description: null,
    icon: null,
    is_builtin: false,
    created_at: '2026-04-07T00:00:00Z',
    updated_at: '2026-04-07T00:00:00Z',
  },
]

function renderDrawer() {
  return render(
    <SkillDetailDrawer
      skill={skill}
      isOpen
      onClose={vi.fn()}
      onToggleStatus={vi.fn().mockResolvedValue(undefined)}
      onDelete={vi.fn().mockResolvedValue(undefined)}
    />,
  )
}

describe('SkillDetailDrawer distribution flow', () => {
  beforeEach(() => {
    writeTextMock.mockReset()
    writeTextMock.mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: writeTextMock,
      },
    })

    mocks.getToolPresets.mockResolvedValue(toolPresets)
    mocks.listProjects.mockResolvedValue(projects)
    mocks.getSkillTags.mockResolvedValue([])
    mocks.updateSkillTags.mockResolvedValue(undefined)
    mocks.distributeSkill.mockResolvedValue({
      target_path: '.opencode/skills/demo-skill',
      target: 'global',
      mode: 'copy',
    })
  })

  it('switches between global and project targets', async () => {
    const user = userEvent.setup()
    renderDrawer()

    expect(await screen.findByText('技能分发')).toBeInTheDocument()
    expect(screen.queryByLabelText('目标项目')).not.toBeInTheDocument()

    await user.click(screen.getByLabelText('项目'))

    expect(screen.getByLabelText('目标项目')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '目标项目' })).toBeInTheDocument()
  })

  it('previews the global target path after selecting a tool preset', async () => {
    const user = userEvent.setup()
    renderDrawer()

    expect(await screen.findByText('技能分发')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '工具目录' }))
    await user.click(screen.getByRole('option', { name: /OpenCode/ }))

    expect(await screen.findByText('.opencode/skills/demo-skill')).toBeInTheDocument()
  })

  it('submits project distribution with selected project, preset, and mode', async () => {
    const user = userEvent.setup()
    mocks.distributeSkill.mockResolvedValueOnce({
      target_path: '/workspace/project-alpha/.opencode/skills/demo-skill',
      target: 'project',
      mode: 'symlink',
    })

    renderDrawer()

    expect(await screen.findByText('技能分发')).toBeInTheDocument()
    await user.click(screen.getByLabelText('项目'))
    await user.click(screen.getByRole('button', { name: '目标项目' }))
    await user.click(screen.getByRole('option', { name: /Project Alpha/ }))
    await user.click(screen.getByRole('button', { name: '工具目录' }))
    await user.click(screen.getByRole('option', { name: /OpenCode/ }))
    await user.click(screen.getByLabelText('软链接'))
    await user.click(screen.getByRole('button', { name: '分发' }))

    await waitFor(() => {
      expect(mocks.distributeSkill).toHaveBeenCalledWith({
        skill_id: '/skills/demo-skill',
        target: 'project',
        project_id: 'project-1',
        preset_id: 'preset-opencode',
        mode: 'symlink',
      })
    })

    expect(await screen.findByText('分发成功：/workspace/project-alpha/.opencode/skills/demo-skill')).toBeInTheDocument()
  })

  it('disables global distribution when the preset has no global path', async () => {
    mocks.getToolPresets.mockResolvedValueOnce([
      { id: 'preset-empty', name: 'Empty Preset', skill_path: '.skills/', global_path: '', is_builtin: false, created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
    ])
    const user = userEvent.setup()
    renderDrawer()

    expect(await screen.findByText('技能分发')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '工具目录' }))
    await user.click(screen.getByRole('option', { name: /Empty/ }))

    expect(screen.getByText('请在工具预设中配置全局目录路径')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '分发' })).toBeDisabled()
  })

})
