import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToolPresetSettings } from './ToolPresetSettings'
import type { ToolPreset } from '../../types'

const mocks = vi.hoisted(() => ({
  getToolPresets: vi.fn<() => Promise<ToolPreset[]>>(),
  getStoragePath: vi.fn<() => Promise<string>>(),
  createToolPreset: vi.fn<() => Promise<void>>(),
  updateToolPreset: vi.fn<() => Promise<void>>(),
  deleteToolPreset: vi.fn<() => Promise<void>>(),
  openFolder: vi.fn<() => Promise<void>>(),
}))

vi.mock('../../api/config', () => ({
  configApi: {
    getToolPresets: mocks.getToolPresets,
    getStoragePath: mocks.getStoragePath,
    createToolPreset: mocks.createToolPreset,
    updateToolPreset: mocks.updateToolPreset,
    deleteToolPreset: mocks.deleteToolPreset,
  },
}))

vi.mock('../../api/desktop', () => ({
  desktopApi: {
    openFolder: mocks.openFolder,
  },
}))

vi.mock('../../api/tauri', () => ({
  isTauriEnvironment: () => true,
}))

const presets: ToolPreset[] = [
  {
    id: 'preset-opencode',
    name: 'OpenCode',
    skill_path: '.opencode/skills/',
    global_path: '/Users/demo/.opencode/skills/',
    is_builtin: false,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-10T12:00:00Z',
  },
  {
    id: 'preset-claude',
    name: 'Claude Code',
    skill_path: '.claude/commands/',
    global_path: '/Users/demo/.claude/commands/',
    is_builtin: false,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-09T12:00:00Z',
  },
]

describe('ToolPresetSettings', () => {
  beforeEach(() => {
    mocks.getToolPresets.mockReset()
    mocks.getStoragePath.mockReset()
    mocks.createToolPreset.mockReset()
    mocks.updateToolPreset.mockReset()
    mocks.deleteToolPreset.mockReset()
    mocks.openFolder.mockReset()

    mocks.getToolPresets.mockResolvedValue(presets)
    mocks.getStoragePath.mockResolvedValue('/Users/demo/.skiller')
    mocks.createToolPreset.mockResolvedValue(undefined)
    mocks.updateToolPreset.mockResolvedValue(undefined)
    mocks.deleteToolPreset.mockResolvedValue(undefined)
    mocks.openFolder.mockResolvedValue(undefined)

    vi.stubGlobal('alert', vi.fn())
  })

  it('shows preset count in badge', async () => {
    render(<ToolPresetSettings language="zh" />)

    expect(await screen.findByText('工具预设路径')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows preset names in table', async () => {
    render(<ToolPresetSettings language="zh" />)

    expect(await screen.findByText('OpenCode')).toBeInTheDocument()
    expect(screen.getByText('Claude Code')).toBeInTheDocument()
  })

  it('allows editing preset fields', async () => {
    const user = userEvent.setup()
    render(<ToolPresetSettings language="zh" />)

    await screen.findByText('OpenCode')
    
    const editButtons = screen.getAllByTitle('编辑预设')
    await user.click(editButtons[0])
    
    const globalPathInput = screen.getByDisplayValue('/Users/demo/.opencode/skills/')
    await user.clear(globalPathInput)
    await user.type(globalPathInput, '/opt/opencode/skills/')
    await user.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(mocks.updateToolPreset).toHaveBeenCalledWith({
        id: 'preset-opencode',
        name: 'OpenCode',
        skill_path: '.opencode/skills/',
        global_path: '/opt/opencode/skills/',
      })
    })
  })

  it('allows deleting presets with confirmation', async () => {
    const user = userEvent.setup()
    render(<ToolPresetSettings language="zh" />)

    await screen.findByText('OpenCode')
    
    const deleteButtons = screen.getAllByTitle('删除预设')
    await user.click(deleteButtons[0])

    expect(await screen.findByText(/删除「OpenCode」？/)).toBeInTheDocument()
    
    await user.click(screen.getByRole('button', { name: '删除' }))

    await waitFor(() => {
      expect(mocks.deleteToolPreset).toHaveBeenCalledWith('preset-opencode')
    })
  })

  it('opens folder from global path', async () => {
    const user = userEvent.setup()
    render(<ToolPresetSettings language="zh" />)

    await screen.findByText('OpenCode')
    
    const openButtons = screen.getAllByTitle('打开文件夹')
    await user.click(openButtons[0])

    await waitFor(() => {
      expect(mocks.openFolder).toHaveBeenCalledWith('/Users/demo/.opencode/skills/')
    })
  })
})
