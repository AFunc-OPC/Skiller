import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProjectsPage } from './ProjectsPage'

const mocks = vi.hoisted(() => {
  const dragDropHandlers: Array<(event: { payload: { type: string; paths?: string[] } }) => void> = []

  return {
    dragDropHandlers,
    listen: vi.fn(async () => vi.fn()),
    getCurrentWindow: vi.fn(() => ({
      onDragDropEvent: vi.fn(async (handler: (event: { payload: { type: string; paths?: string[] } }) => void) => {
        dragDropHandlers.push(handler)
        return vi.fn()
      }),
    })),
    selectFolder: vi.fn(),
    openFolder: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
  }
})

vi.mock('@tauri-apps/api/event', () => ({
  listen: mocks.listen,
}))

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: mocks.getCurrentWindow,
}))

vi.mock('../api/desktop', () => ({
  desktopApi: {
    selectFolder: mocks.selectFolder,
    openFolder: mocks.openFolder,
  },
}))

vi.mock('../stores/projectStore', () => ({
  useProjectStore: () => ({
    projects: [],
    createProject: mocks.createProject,
    updateProject: mocks.updateProject,
    deleteProject: mocks.deleteProject,
  }),
}))

describe('ProjectsPage', () => {
  beforeEach(() => {
    mocks.dragDropHandlers.length = 0
    mocks.listen.mockClear()
    mocks.getCurrentWindow.mockClear()
    mocks.selectFolder.mockReset()
    mocks.openFolder.mockReset()
    mocks.createProject.mockReset()
    mocks.updateProject.mockReset()
    mocks.deleteProject.mockReset()
    localStorage.clear()
  })

  it('opens the new project dialog and fills folder info when a folder is dropped', async () => {
    render(<ProjectsPage />)

    await waitFor(() => {
      expect(mocks.dragDropHandlers).toHaveLength(1)
    })

    mocks.dragDropHandlers[0]({
      payload: {
        type: 'drop',
        paths: ['/Users/akio/demo-workspace'],
      },
    })

    expect(await screen.findByRole('heading', { name: '新建项目' })).toBeInTheDocument()
    expect(screen.getByText('/Users/akio/demo-workspace')).toBeInTheDocument()
    expect(screen.getByDisplayValue('demo-workspace')).toBeInTheDocument()
  })

  it('submits an optional multiline description when creating a project', async () => {
    const user = userEvent.setup()
    mocks.selectFolder.mockResolvedValue('/Users/akio/demo-workspace')

    render(<ProjectsPage />)

    await user.click(screen.getByRole('button', { name: '新建' }))
    await user.click(screen.getByText('选择或拖入文件夹'))
    await user.clear(screen.getByRole('textbox', { name: '名称' }))
    await user.type(screen.getByRole('textbox', { name: '名称' }), '示例项目')
    await user.type(screen.getByRole('textbox', { name: '描述' }), '第一行{enter}第二行')
    await user.click(screen.getByRole('button', { name: '创建' }))

    await waitFor(() => {
      expect(mocks.createProject).toHaveBeenCalledWith(
        '示例项目',
        '/Users/akio/demo-workspace',
        '.skills',
        '第一行\n第二行',
      )
    })
  })
})
