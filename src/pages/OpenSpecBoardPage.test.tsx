import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OpenSpecBoardPage } from './OpenSpecBoardPage'
import { useOpenSpecStore } from '../stores/openspecStore'
import type {
  OpenSpecBoardSnapshot,
  OpenSpecChangeDetail,
  OpenSpecChangeSummary,
  OpenSpecDocumentPreview,
  Project,
} from '../types'

const mocks = vi.hoisted(() => ({
  getBoardSnapshot: vi.fn(),
  getChangeDetail: vi.fn(),
  getSpecDocument: vi.fn(),
  executeTerminal: vi.fn(),
  openPath: vi.fn(),
}))

vi.mock('../api/openspec', () => ({
  openspecApi: {
    getBoardSnapshot: mocks.getBoardSnapshot,
    getChangeDetail: mocks.getChangeDetail,
    getSpecDocument: mocks.getSpecDocument,
  },
}))

vi.mock('../api/desktop', () => ({
  desktopApi: {
    openPath: mocks.openPath,
  },
}))

vi.mock('../api/openspecTerminal', () => ({
  openspecTerminalApi: {
    execute: mocks.executeTerminal,
  },
}))

const project: Project = {
  id: 'project-1',
  name: 'OpenSpec Demo',
  path: '/Users/demo/project',
  skill_path: '.skills',
  tool_preset_id: null,
  description: 'demo',
  icon: null,
  is_builtin: false,
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
}

function createSnapshot(overrides: Partial<OpenSpecBoardSnapshot> = {}): OpenSpecBoardSnapshot {
  return {
    project_id: project.id,
    project_path: project.path,
    state: 'ready',
    cli_message: null,
    changes: [],
    archived_changes: [],
    ...overrides,
  }
}

function createChange(id: string, archived = false): OpenSpecChangeSummary {
  return {
    id,
    title: id,
    archived,
    path: `${project.path}/openspec/changes/${id}`,
    updated_at: '2026-04-26T12:00:00Z',
    summary: `${id} summary`,
    task_progress: {
      total: 2,
      completed: 1,
    },
    artifacts: [],
    validation: null,
  }
}

function createDetail(id: string, archived = false): OpenSpecChangeDetail {
  return {
    change: createChange(id, archived),
    overview_markdown: `# ${id}\n\n${id} overview`,
    proposal: null,
    design: null,
    tasks: null,
    specs: [],
  }
}

function createMarkdownDocument(title: string, path: string, content: string): OpenSpecDocumentPreview {
  return {
    kind: 'markdown',
    title,
    path,
    updated_at: '2026-04-26T12:00:00Z',
    content,
  }
}

function renderBoard() {
  render(<OpenSpecBoardPage project={project} onBack={vi.fn()} />)
}

function createNotInitializedSnapshot(): OpenSpecBoardSnapshot {
  return createSnapshot({
    state: 'not_initialized',
    cli_message: '当前项目尚未初始化 OpenSpec',
  })
}

function expectHeader() {
  expect(screen.getByRole('heading', { name: 'OpenSpec Demo / OpenSpec' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '返回项目' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '刷新' })).toBeInTheDocument()
}

describe('OpenSpecBoardPage', () => {
  beforeEach(() => {
    useOpenSpecStore.getState().clear()
    mocks.getBoardSnapshot.mockReset()
    mocks.getChangeDetail.mockReset()
    mocks.getSpecDocument.mockReset()
    mocks.executeTerminal.mockReset()
    mocks.openPath.mockReset()
  })

  it('keeps the header visible while loading the board snapshot', async () => {
    mocks.getBoardSnapshot.mockReturnValue(new Promise(() => {}))

    renderBoard()

    expectHeader()
    expect(await screen.findByText('加载 OpenSpec 看板中…')).toBeInTheDocument()
    expect(mocks.getBoardSnapshot).toHaveBeenCalledWith('project-1')
  })

  it('refreshes the board snapshot from the header action', async () => {
    const user = userEvent.setup()
    mocks.getBoardSnapshot.mockResolvedValue(createSnapshot({ state: 'ready_empty' }))

    renderBoard()

    await screen.findByText('当前项目暂无 OpenSpec change')
    await user.click(screen.getByRole('button', { name: '刷新' }))

    await waitFor(() => {
      expect(mocks.getBoardSnapshot).toHaveBeenCalledTimes(2)
    })
  })

  it('refreshes the snapshot when the window regains focus', async () => {
    mocks.getBoardSnapshot.mockResolvedValue(
      createSnapshot({
        state: 'ready',
        changes: [createChange('add-board')],
      }),
    )
    mocks.getChangeDetail.mockResolvedValue(createDetail('add-board'))

    renderBoard()

    await screen.findByText('add-board')
    window.dispatchEvent(new Event('focus'))

    await waitFor(() => {
      expect(mocks.getBoardSnapshot).toHaveBeenCalledTimes(2)
    })
  })

  it('renders API errors in the board body while keeping the header visible', async () => {
    mocks.getBoardSnapshot.mockRejectedValue(new Error('snapshot failed'))

    renderBoard()

    expectHeader()
    expect(await screen.findByRole('alert')).toHaveTextContent('snapshot failed')
  })

  it('shows a cli-unavailable state with a terminal entry', async () => {
    mocks.getBoardSnapshot.mockResolvedValue(
      createSnapshot({
        state: 'cli_unavailable',
        cli_message: '未检测到 OpenSpec CLI。',
      }),
    )

    renderBoard()

    expectHeader()
    expect(await screen.findByRole('heading', { name: '未检测到 OpenSpec CLI' })).toBeInTheDocument()
    expect(screen.getByText('未检测到 OpenSpec CLI。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '打开 OpenSpec 终端' })).toBeInTheDocument()
  })

  it('shows a not-initialized empty state with a terminal entry', async () => {
    mocks.getBoardSnapshot.mockResolvedValue(createNotInitializedSnapshot())

    renderBoard()

    expectHeader()
    expect(await screen.findByRole('heading', { name: '当前项目尚未初始化 OpenSpec' })).toBeInTheDocument()
    expect(screen.getAllByText('当前项目尚未初始化 OpenSpec')).toHaveLength(2)
    expect(screen.getByRole('button', { name: '打开 OpenSpec 终端' })).toBeInTheDocument()
  })

  it('opens an OpenSpec terminal panel prefilled with openspec init', async () => {
    const user = userEvent.setup()
    mocks.getBoardSnapshot.mockResolvedValue(createNotInitializedSnapshot())

    renderBoard()

    await user.click(await screen.findByRole('button', { name: '打开 OpenSpec 终端' }))

    expect(screen.getByDisplayValue('openspec init')).toBeInTheDocument()
    expect(screen.getByText('/Users/demo/project')).toBeInTheDocument()
  })

  it('executes a terminal command and keeps board refresh explicit', async () => {
    const user = userEvent.setup()
    mocks.getBoardSnapshot.mockResolvedValue(createNotInitializedSnapshot())
    mocks.executeTerminal.mockResolvedValue({ stdout: 'initialized', stderr: '', success: true })

    renderBoard()

    await user.click(await screen.findByRole('button', { name: '打开 OpenSpec 终端' }))
    await user.click(screen.getByRole('button', { name: '执行' }))

    expect(await screen.findByText('initialized')).toBeInTheDocument()
    expect(mocks.executeTerminal).toHaveBeenCalledWith('/Users/demo/project', 'openspec init')
    expect(mocks.getBoardSnapshot).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: '刷新' }))

    await waitFor(() => {
      expect(mocks.getBoardSnapshot).toHaveBeenCalledTimes(2)
    })
  })

  it('shows an empty ready state with a terminal entry', async () => {
    mocks.getBoardSnapshot.mockResolvedValue(createSnapshot({ state: 'ready_empty' }))

    renderBoard()

    expectHeader()
    expect(await screen.findByRole('heading', { name: '当前项目暂无 OpenSpec change' })).toBeInTheDocument()
    expect(screen.getByText('OpenSpec 已可用，但还没有可展示的 changes。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '打开 OpenSpec 终端' })).toBeInTheDocument()
  })

  it('defaults to the first active change and can switch to archived changes', async () => {
    const user = userEvent.setup()
    mocks.getBoardSnapshot.mockResolvedValue(
      createSnapshot({
        state: 'ready',
        changes: [createChange('add-board'), createChange('preview-files')],
        archived_changes: [createChange('archived-board', true)],
      }),
    )
    mocks.getChangeDetail.mockImplementation(async (_projectId: string, changeId: string) => {
      return createDetail(changeId, changeId === 'archived-board')
    })

    renderBoard()

    expectHeader()
    expect(await screen.findByRole('heading', { name: 'OpenSpec 看板已就绪' })).toBeInTheDocument()
    expect(screen.getByText('当前共有 2 个进行中的 change，1 个已归档 change。')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: 'add-board' })).not.toHaveLength(0)
    })
    expect(screen.getByText('add-board overview')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '已归档' }))

    expect(screen.getByRole('button', { name: 'archived-board' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'preview-files' })).not.toBeInTheDocument()
    expect(mocks.getChangeDetail).toHaveBeenCalledWith('project-1', 'add-board')
  })

  it('loads change detail when a change is clicked', async () => {
    const user = userEvent.setup()
    mocks.getBoardSnapshot.mockResolvedValue(
      createSnapshot({
        state: 'ready',
        changes: [createChange('add-board'), createChange('preview-files')],
      }),
    )
    mocks.getChangeDetail.mockImplementation(async (_projectId: string, changeId: string) => {
      return createDetail(changeId)
    })

    renderBoard()

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: 'add-board' })).not.toHaveLength(0)
    })

    await user.click(screen.getByRole('button', { name: 'preview-files' }))

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: 'preview-files' })).not.toHaveLength(0)
    })
    expect(screen.getByText('preview-files overview')).toBeInTheDocument()
    expect(mocks.getChangeDetail).toHaveBeenNthCalledWith(2, 'project-1', 'preview-files')
  })

  it('switches between proposal, design, tasks, and specs previews', async () => {
    const user = userEvent.setup()
    mocks.getBoardSnapshot.mockResolvedValue(
      createSnapshot({
        state: 'ready',
        changes: [createChange('add-board')],
      }),
    )
    mocks.getChangeDetail.mockResolvedValue({
      ...createDetail('add-board'),
      proposal: createMarkdownDocument(
        'proposal.md',
        '/Users/demo/project/openspec/changes/add-board/proposal.md',
        '# Proposal\n\nProposal body',
      ),
      design: createMarkdownDocument(
        'design.md',
        '/Users/demo/project/openspec/changes/add-board/design.md',
        '# Design\n\nDesign body',
      ),
      tasks: createMarkdownDocument(
        'tasks.md',
        '/Users/demo/project/openspec/changes/add-board/tasks.md',
        '# Tasks\n\nTask list body',
      ),
      specs: [
        {
          path: 'auth/spec.md',
          title: 'auth/spec.md',
          updated_at: '2026-04-26T12:00:00Z',
        },
      ],
    })
    mocks.getSpecDocument.mockResolvedValue(
      createMarkdownDocument(
        'auth/spec.md',
        '/Users/demo/project/openspec/changes/add-board/specs/auth/spec.md',
        '# Auth Spec',
      ),
    )

    renderBoard()

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: 'add-board' })).not.toHaveLength(0)
    })

    await user.click(screen.getByRole('button', { name: 'Proposal' }))
    expect(await screen.findByText('Proposal body')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Design' }))
    expect(await screen.findByText('Design body')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Tasks' }))
    expect(await screen.findByText('Task list body')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Specs' }))
    expect(screen.getByText('请选择一个 spec 文件')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'auth/spec.md' }))

    expect(await screen.findByText('Auth Spec')).toBeInTheDocument()
    expect(mocks.getSpecDocument).toHaveBeenCalledWith('project-1', 'add-board', 'auth/spec.md')
  })

  it('opens the original file for markdown previews and spec previews', async () => {
    const user = userEvent.setup()
    mocks.getBoardSnapshot.mockResolvedValue(
      createSnapshot({
        state: 'ready',
        changes: [createChange('add-board')],
      }),
    )
    mocks.getChangeDetail.mockResolvedValue({
      ...createDetail('add-board'),
      proposal: createMarkdownDocument(
        'proposal.md',
        '/Users/demo/project/openspec/changes/add-board/proposal.md',
        '# Proposal\n\nProposal body',
      ),
      specs: [
        {
          path: 'auth/spec.md',
          title: 'auth/spec.md',
          updated_at: '2026-04-26T12:00:00Z',
        },
      ],
    })
    mocks.getSpecDocument.mockResolvedValue(
      createMarkdownDocument(
        'auth/spec.md',
        '/Users/demo/project/openspec/changes/add-board/specs/auth/spec.md',
        '# Auth Spec',
      ),
    )

    renderBoard()

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: 'add-board' })).not.toHaveLength(0)
    })

    await user.click(screen.getByRole('button', { name: 'Proposal' }))
    await user.click(await screen.findByRole('button', { name: '打开原文件' }))

    expect(mocks.openPath).toHaveBeenCalledWith('/Users/demo/project/openspec/changes/add-board/proposal.md')

    await user.click(screen.getByRole('button', { name: 'Specs' }))
    await user.click(screen.getByRole('button', { name: 'auth/spec.md' }))
    await screen.findByText('Auth Spec')
    await user.click(screen.getByRole('button', { name: '打开原文件' }))

    expect(mocks.openPath).toHaveBeenLastCalledWith('/Users/demo/project/openspec/changes/add-board/specs/auth/spec.md')
  })

  it('calls onBack from the header action', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()
    mocks.getBoardSnapshot.mockResolvedValue(createSnapshot())

    render(<OpenSpecBoardPage project={project} onBack={onBack} />)

    await user.click(screen.getByRole('button', { name: '返回项目' }))

    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
