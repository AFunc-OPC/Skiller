import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NpxImportDialog } from './NpxImportDialog'
import type {
  PrepareNpxSkillImportResponse,
} from '../../types'

const mocks = vi.hoisted(() => ({
  listen: vi.fn(async () => vi.fn()),
  onPrepareImport: vi.fn(),
  onConfirmImport: vi.fn(),
  onCancelImport: vi.fn(),
  onExecuteNative: vi.fn(),
  onSyncToSkiller: vi.fn(),
  checkTools: vi.fn(),
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: mocks.listen,
}))

const preparedResponse: PrepareNpxSkillImportResponse = {
  session_id: 'session-1',
  command: 'npx skills add https://github.com/demo/skills --skill demo-skill',
  parsed: {
    repo_url: 'https://github.com/demo/skills',
    skill_name: 'demo-skill',
    branch: 'main',
    skill_path: 'skills/demo-skill',
  },
  tools: { git: true, npx: true },
  logs: [
    { stage: 'command', message: '命令校验通过，目标技能：demo-skill' },
    { stage: 'clone', message: '正在暂存克隆仓库：https://github.com/demo/skills' },
  ],
  summary: {
    skill_name: 'demo-skill',
    display_name: 'Demo Skill',
    repo_url: 'https://github.com/demo/skills',
    branch: 'main',
    skill_path: 'skills/demo-skill',
    staged_path: '/home/demo/.skiller/.temp_skills/session-1/repo/skills/demo-skill',
    required_tools: ['git', 'npx（仅用于命令来源兼容）'],
    exists_in_skiller: false,
  },
}

describe('NpxImportDialog', () => {
  beforeEach(() => {
    mocks.listen.mockReset()
    mocks.onPrepareImport.mockReset()
    mocks.onConfirmImport.mockReset()
    mocks.onCancelImport.mockReset()
    mocks.onExecuteNative.mockReset()
    mocks.onSyncToSkiller.mockReset()
    mocks.checkTools.mockReset()

    mocks.listen.mockResolvedValue(vi.fn())
    mocks.checkTools.mockResolvedValue({ git: true, npx: true })
    mocks.onPrepareImport.mockResolvedValue(preparedResponse)
    mocks.onConfirmImport.mockResolvedValue({
      skill_path: '/home/demo/.skiller/skills/demo-skill',
      imported_skill_name: 'demo-skill',
      cleaned_up: true,
      is_update: false,
    })
    mocks.onCancelImport.mockResolvedValue(undefined)
    mocks.onExecuteNative.mockResolvedValue({
      success: true,
      skill_name: 'demo-skill',
      exists_in_skiller: false,
      logs: ['Installing...', 'Done'],
    })
    mocks.onSyncToSkiller.mockResolvedValue({
      skill_name: 'demo-skill',
      skill_path: '/home/demo/.skiller/skills/demo-skill',
      is_update: false,
    })
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function renderDialog() {
    return render(
      <NpxImportDialog
        isOpen
        onClose={vi.fn()}
        onPrepareImport={mocks.onPrepareImport}
        onConfirmImport={mocks.onConfirmImport}
        onCancelImport={mocks.onCancelImport}
        onExecuteNative={mocks.onExecuteNative}
        onSyncToSkiller={mocks.onSyncToSkiller}
        checkTools={mocks.checkTools}
      />,
    )
  }

  it('shows prepared summary after managed import preparation succeeds', async () => {
    const user = userEvent.setup()
    renderDialog()

    // Switch to managed mode
    await user.click(screen.getByRole('radio', { name: /接管模式/ }))

    expect(screen.getByPlaceholderText('例如：npx skills add xixu-me/skills@github-actions-docs -g -y')).toHaveValue('')

    await user.type(
      screen.getByPlaceholderText('例如：npx skills add xixu-me/skills@github-actions-docs -g -y'),
      'npx skills add https://github.com/demo/skills --skill demo-skill',
    )
    await user.click(screen.getByRole('button', { name: '检查并暂存' }))

    expect(await screen.findByText('待确认导入信息')).toBeInTheDocument()
    expect(screen.getByText('Demo Skill')).toBeInTheDocument()
    expect(screen.getByText('https://github.com/demo/skills')).toBeInTheDocument()
    expect(screen.getByText(/命令校验通过，目标技能：demo-skill/)).toBeInTheDocument()
  })

  it('shows preparation error when tool check fails', async () => {
    const user = userEvent.setup()
    mocks.checkTools.mockResolvedValueOnce({ git: false, npx: true })
    renderDialog()

    // Switch to managed mode
    await user.click(screen.getByRole('radio', { name: /接管模式/ }))

    await user.type(
      screen.getByPlaceholderText('例如：npx skills add xixu-me/skills@github-actions-docs -g -y'),
      'npx skills add https://github.com/demo/skills --skill demo-skill',
    )
    await user.click(screen.getByRole('button', { name: '检查并暂存' }))

    expect(await screen.findByText('未检测到 git，请先安装 git 后再导入')).toBeInTheDocument()
    expect(mocks.onPrepareImport).not.toHaveBeenCalled()
  })

  it('confirms import after preparation', async () => {
    const user = userEvent.setup()
    renderDialog()

    // Switch to managed mode
    await user.click(screen.getByRole('radio', { name: /接管模式/ }))

    await user.type(
      screen.getByPlaceholderText('例如：npx skills add xixu-me/skills@github-actions-docs -g -y'),
      'npx skills add https://github.com/demo/skills --skill demo-skill',
    )
    await user.click(screen.getByRole('button', { name: '检查并暂存' }))
    await screen.findByText('待确认导入信息')
    await user.click(screen.getByRole('button', { name: '确认导入' }))

    await waitFor(() => {
      expect(mocks.onConfirmImport).toHaveBeenCalledWith('session-1')
    })

    expect(await screen.findByText('导入成功：demo-skill')).toBeInTheDocument()
  })

  it('cancels staged session when dialog closes after preparation', async () => {
    const user = userEvent.setup()
    renderDialog()

    // Switch to managed mode
    await user.click(screen.getByRole('radio', { name: /接管模式/ }))

    await user.type(
      screen.getByPlaceholderText('例如：npx skills add xixu-me/skills@github-actions-docs -g -y'),
      'npx skills add https://github.com/demo/skills --skill demo-skill',
    )
    await user.click(screen.getByRole('button', { name: '检查并暂存' }))
    await screen.findByText('待确认导入信息')
    await user.click(screen.getByRole('button', { name: '取消' }))

    await waitFor(() => {
      expect(mocks.onCancelImport).toHaveBeenCalledWith('session-1')
    })
  })

  it('executes native npx command in native mode', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(
      screen.getByPlaceholderText('例如：npx skills add xixu-me/skills@github-actions-docs -g -y'),
      'npx skills add https://github.com/demo/skills --skill demo-skill',
    )
    await user.click(screen.getByRole('button', { name: '执行安装' }))

    await waitFor(() => {
      expect(mocks.onExecuteNative).toHaveBeenCalledWith(
        'npx skills add https://github.com/demo/skills --skill demo-skill',
        '00000000-0000-4000-8000-000000000001'
      )
    })

    await screen.findByText('待确认导入信息')
    expect(screen.getByText('demo-skill')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '确认同步到 Skiller' }))

    expect(await screen.findByText('同步成功：demo-skill')).toBeInTheDocument()
  })
})
