import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProjectsPage } from './ProjectsPage'
import type { Project } from '../types'

const mocks = vi.hoisted(() => {
  const dragDropHandlers: Array<(event: { payload: { type: string; paths?: string[] } }) => void> = []
  const defaultProjectStore = {
    projects: [] as Project[],
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    projectSkills: [],
    projectSkillsByPreset: {},
    projectSkillsLoading: false,
    projectSkillsError: null,
    toolPresets: [],
    selectedPresetId: null,
    fetchProjectSkillsByPresets: vi.fn(),
    fetchToolPresets: vi.fn(),
    selectPreset: vi.fn(),
    removeProjectSkill: vi.fn(),
    toggleProjectSkillStatus: vi.fn(),
    batchRemoveProjectSkills: vi.fn(),
    batchToggleProjectSkills: vi.fn(),
    clearProjectSkills: vi.fn(),
  }

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
    fetchProjectSkillsByPresets: vi.fn(),
    fetchToolPresets: vi.fn(),
    selectPreset: vi.fn(),
    removeProjectSkill: vi.fn(),
    toggleProjectSkillStatus: vi.fn(),
    batchRemoveProjectSkills: vi.fn(),
    batchToggleProjectSkills: vi.fn(),
    clearProjectSkills: vi.fn(),
    projectStoreState: defaultProjectStore,
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
  useProjectStore: () => mocks.projectStoreState,
}))

vi.mock('../components/ProjectSkill', () => ({
  ProjectSkillList: () => <div>project skills</div>,
  ProjectSkillImportDialog: () => null,
}))

describe('ProjectsPage', () => {
  beforeEach(() => {
    mocks.projectStoreState = {
      projects: [],
      createProject: mocks.createProject,
      updateProject: mocks.updateProject,
      deleteProject: mocks.deleteProject,
      projectSkills: [],
      projectSkillsByPreset: {},
      projectSkillsLoading: false,
      projectSkillsError: null,
      toolPresets: [],
      selectedPresetId: null,
      fetchProjectSkillsByPresets: mocks.fetchProjectSkillsByPresets,
      fetchToolPresets: mocks.fetchToolPresets,
      selectPreset: mocks.selectPreset,
      removeProjectSkill: mocks.removeProjectSkill,
      toggleProjectSkillStatus: mocks.toggleProjectSkillStatus,
      batchRemoveProjectSkills: mocks.batchRemoveProjectSkills,
      batchToggleProjectSkills: mocks.batchToggleProjectSkills,
      clearProjectSkills: mocks.clearProjectSkills,
    }
    mocks.dragDropHandlers.length = 0
    mocks.listen.mockClear()
    mocks.getCurrentWindow.mockClear()
    mocks.selectFolder.mockReset()
    mocks.openFolder.mockReset()
    mocks.createProject.mockReset()
    mocks.updateProject.mockReset()
    mocks.deleteProject.mockReset()
    mocks.fetchProjectSkillsByPresets.mockReset()
    mocks.fetchToolPresets.mockReset()
    mocks.selectPreset.mockReset()
    mocks.removeProjectSkill.mockReset()
    mocks.toggleProjectSkillStatus.mockReset()
    mocks.batchRemoveProjectSkills.mockReset()
    mocks.batchToggleProjectSkills.mockReset()
    mocks.clearProjectSkills.mockReset()
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

  it('shows an OpenSpec board entry in the project detail drawer', async () => {
    const user = userEvent.setup()

    mocks.projectStoreState = {
      ...mocks.projectStoreState,
      projects: [
        {
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
        },
      ],
    }

    const onOpenOpenSpecBoard = vi.fn()

    render(<ProjectsPage onOpenOpenSpecBoard={onOpenOpenSpecBoard} />)

    await user.click(await screen.findByText('OpenSpec Demo'))
    await user.click(screen.getByRole('button', { name: '打开 OpenSpec 看板' }))

    expect(onOpenOpenSpecBoard).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'project-1', name: 'OpenSpec Demo' }),
    )
  })
})
