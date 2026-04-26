import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { Project } from './types'

const mockedProjectsPageProps = vi.hoisted(() => ({
  current: null as { onOpenOpenSpecBoard?: (project: Project) => void } | null,
}))

const openspecProject: Project = {
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

vi.mock('./stores/appStore', () => ({
  useAppStore: () => ({
    language: 'zh',
    theme: 'light',
    setLanguage: vi.fn(),
    setTheme: vi.fn(),
  }),
}))

vi.mock('./stores/skillStore', () => ({
  useSkillStore: () => ({
    fetchSkills: vi.fn(),
    fetchTags: vi.fn(),
    fetchTagGroups: vi.fn(),
  }),
}))

vi.mock('./stores/fileSkillStore', () => ({
  useFileSkillStore: () => ({
    skills: [],
    fetchSkills: vi.fn(),
  }),
}))

vi.mock('./stores/projectStore', () => ({
  useProjectStore: () => ({
    projects: [],
    fetchProjects: vi.fn(),
    createProject: vi.fn(),
  }),
}))

vi.mock('./stores/repoStore', () => ({
  useRepoStore: () => ({
    repos: [],
    fetchRepos: vi.fn(),
  }),
}))

vi.mock('./stores/tagTreeStore', () => ({
  useTagTreeStore: () => ({
    tree: [],
    fetchTree: vi.fn(),
  }),
}))

vi.mock('./contexts/SkillContext', () => ({
  SkillProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('./components/SkillCenter', () => ({
  SkillCenter: () => <div>SkillCenter mock</div>,
}))

vi.mock('./pages/TagGovernancePage', () => ({
  TagGovernancePage: () => <div>TagGovernancePage mock</div>,
}))

vi.mock('./pages/ProjectsPage', () => ({
  ProjectsPage: (props: { onOpenOpenSpecBoard?: (project: Project) => void }) => {
    mockedProjectsPageProps.current = props
    return <div>ProjectsPage mock</div>
  },
}))

vi.mock('./pages/OpenSpecBoardPage', () => ({
  OpenSpecBoardPage: ({ project, onBack }: { project: Project; onBack: () => void }) => (
    <div>
      <h1>{project.name} / OpenSpec</h1>
      <button type="button" onClick={onBack}>返回项目</button>
    </div>
  ),
}))

vi.mock('./pages/OverviewPage', () => ({
  OverviewPage: () => <div>OverviewPage mock</div>,
}))

vi.mock('./components/RepositoryManagement', () => ({
  RepositoryManagementPage: () => <div>RepositoryManagementPage mock</div>,
  RepositoryAddDialog: () => null,
}))

vi.mock('./components/Settings', () => ({
  ToolPresetSettings: () => null,
  SettingsTabs: () => <div>SettingsTabs mock</div>,
}))

vi.mock('./api/tauri', () => ({
  isTauriEnvironment: () => false,
}))

vi.mock('./api/desktop', () => ({
  desktopApi: {
    selectFolder: vi.fn(),
  },
}))

vi.mock('./components/SkillCenter/SkillMarkdownPreview', () => ({
  SkillMarkdownPreview: () => null,
}))

describe('App', () => {
  beforeEach(() => {
    mockedProjectsPageProps.current = null
  })

  it('renders the OpenSpec board page when the projects callback opens a board', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.click(screen.getByRole('button', { name: /项目管理/ }))

    expect(mockedProjectsPageProps.current?.onOpenOpenSpecBoard).toBeTypeOf('function')

    act(() => {
      mockedProjectsPageProps.current?.onOpenOpenSpecBoard?.(openspecProject)
    })

    expect(await screen.findByText('OpenSpec Demo / OpenSpec')).toBeInTheDocument()
  })

  it('returns to the projects page when the board back action is used', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.click(screen.getByRole('button', { name: /项目管理/ }))

    act(() => {
      mockedProjectsPageProps.current?.onOpenOpenSpecBoard?.(openspecProject)
    })

    await user.click(await screen.findByRole('button', { name: '返回项目' }))

    expect(screen.getByText('ProjectsPage mock')).toBeInTheDocument()
  })
})
