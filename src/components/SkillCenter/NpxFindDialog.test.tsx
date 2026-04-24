import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NpxFindDialog, type NpxFindProgressEvent } from './NpxFindDialog'

const mocks = vi.hoisted(() => ({
  listen: vi.fn(),
  openUrl: vi.fn(),
  onSearchApi: vi.fn(),
  onExecuteFind: vi.fn(),
  onExecuteNative: vi.fn(),
  onSyncToSkiller: vi.fn(),
  checkNpx: vi.fn(),
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: mocks.listen,
}))

vi.mock('@tauri-apps/plugin-opener', () => ({
  openUrl: mocks.openUrl,
}))

describe('NpxFindDialog', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
    mocks.listen.mockReset()
    mocks.openUrl.mockReset()
    mocks.onSearchApi.mockReset()
    mocks.onExecuteFind.mockReset()
    mocks.onExecuteNative.mockReset()
    mocks.onSyncToSkiller.mockReset()
    mocks.checkNpx.mockReset()

    mocks.checkNpx.mockResolvedValue(true)
    mocks.onSearchApi.mockResolvedValue({ success: true, skills: [] })
    mocks.onExecuteNative.mockResolvedValue({ success: true, skill_name: 'demo-skill', logs: [] })
    mocks.onSyncToSkiller.mockResolvedValue({ skill_name: 'demo-skill', skill_path: '/tmp/demo-skill', is_update: false })
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function renderDialog() {
    return render(
      <NpxFindDialog
        isOpen
        onClose={vi.fn()}
        onSearchApi={mocks.onSearchApi}
        onExecuteFind={mocks.onExecuteFind}
        onExecuteNative={mocks.onExecuteNative}
        onSyncToSkiller={mocks.onSyncToSkiller}
        checkNpx={mocks.checkNpx}
        existingSkillNames={[]}
      />,
    )
  }

  it('does not check npx availability until switching to npx mode', async () => {
    const { rerender } = render(
      <NpxFindDialog
        isOpen
        onClose={vi.fn()}
        onSearchApi={mocks.onSearchApi}
        onExecuteFind={mocks.onExecuteFind}
        onExecuteNative={mocks.onExecuteNative}
        onSyncToSkiller={mocks.onSyncToSkiller}
        checkNpx={mocks.checkNpx}
        existingSkillNames={[]}
      />,
    )

    await act(async () => {
      await Promise.resolve()
    })

    expect(mocks.checkNpx).not.toHaveBeenCalled()

    rerender(
      <NpxFindDialog
        isOpen
        onClose={vi.fn()}
        onSearchApi={mocks.onSearchApi}
        onExecuteFind={mocks.onExecuteFind}
        onExecuteNative={mocks.onExecuteNative}
        onSyncToSkiller={mocks.onSyncToSkiller}
        checkNpx={async () => true}
        existingSkillNames={[]}
      />,
    )

    await act(async () => {
      await Promise.resolve()
    })

    expect(mocks.checkNpx).not.toHaveBeenCalled()
  })

  it('checks npx availability once after switching to npx mode', async () => {
    const user = userEvent.setup()
    renderDialog()

    expect(mocks.checkNpx).not.toHaveBeenCalled()

    await user.click(screen.getByRole('radio', { name: /npx skills find命令搜索/i }))

    await waitFor(() => {
      expect(mocks.checkNpx).toHaveBeenCalledTimes(1)
    })
  })

  it('buffers progress logs before flushing them to the terminal output', async () => {
    const user = userEvent.setup()
    let emitProgress: ((payload: NpxFindProgressEvent) => void) | undefined
    let resolveSearch: ((value: {
      success: boolean
      skills: Array<{
        name: string
        description: string
        repo: string
        author: string
        install_command: string
        link: string
        installs: number
      }>
    }) => void) | undefined

    mocks.listen.mockImplementation(async (_eventName, handler) => {
      emitProgress = (payload: NpxFindProgressEvent) => {
        handler({ payload } as { payload: NpxFindProgressEvent })
      }
      return vi.fn()
    })

    mocks.onExecuteFind.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSearch = resolve
        }),
    )

    renderDialog()

    await user.click(screen.getByRole('radio', { name: /npx skills find命令搜索/i }))
    await user.type(screen.getByPlaceholderText('输入技能名称或关键词...'), 'demo')
    await user.click(screen.getByRole('button', { name: '搜索' }))

    await waitFor(() => {
      expect(mocks.listen).toHaveBeenCalled()
    })

    act(() => {
      emitProgress?.({ request_id: '00000000-0000-4000-8000-000000000001', line: 'line one', is_error: false })
      emitProgress?.({ request_id: '00000000-0000-4000-8000-000000000001', line: 'line two', is_error: false })
    })

    expect(screen.getByText(/正在搜索技能/)).toBeInTheDocument()
    expect(screen.queryByText(/line one/)).not.toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText(/line one/)).toBeInTheDocument()
      expect(screen.getByText(/line two/)).toBeInTheDocument()
    })

    await act(async () => {
      resolveSearch?.({
        success: true,
        skills: [
          {
            name: 'demo-skill',
            description: 'demo skill description',
            repo: 'skills',
            author: 'demo',
            install_command: 'npx skills add demo/skills@demo-skill -g -y',
            link: 'https://skills.sh/demo/skills/demo-skill',
            installs: 42,
          },
        ],
      })
    })

    expect(
      await screen.findByText((_, element) => element?.textContent === 'demo-skill'),
    ).toBeInTheDocument()
    expect(screen.getByText(/找到 1 个匹配的技能/)).toBeInTheDocument()
  })

  it('prevents concurrent searches from repeated Enter presses', async () => {
    const user = userEvent.setup()
    let resolveSearch: ((value: { success: boolean; skills: [] }) => void) | undefined

    mocks.onSearchApi.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSearch = resolve
        }),
    )

    renderDialog()

    const input = screen.getByPlaceholderText('输入技能名称或关键词...')
    await user.type(input, 'demo')

    await user.keyboard('{Enter}{Enter}{Enter}')

    await waitFor(() => {
      expect(mocks.onSearchApi).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      resolveSearch?.({ success: true, skills: [] })
    })

    expect(await screen.findByText(/未找到匹配的技能/)).toBeInTheDocument()
  })
})
