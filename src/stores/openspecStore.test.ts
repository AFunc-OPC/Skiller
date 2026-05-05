import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOpenSpecStore } from './openspecStore'
import * as openspecApi from '../api/openspec'
import type { OpenSpecChangeInfo } from '../types'

const PROJECT_ID = 'project-1'
const PROJECT_PATH = '/project/path'

vi.mock('../api/openspec', () => ({
  openspecApi: {
    checkCli: vi.fn(),
    listChanges: vi.fn(),
    listArchivedChanges: vi.fn(),
    fetchBoardData: vi.fn(),
    readArtifact: vi.fn(),
    executeCommand: vi.fn(),
    checkOpenSpecDirectory: vi.fn(),
  },
}))

describe('openspecStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useOpenSpecStore.setState({
      currentProjectId: null,
      projectStates: {},
      cliStatus: null,
      commandLoading: false,
      commandError: null,
      lastCommandResult: null,
    })
  })

  describe('checkCli', () => {
    it('sets cliStatus when CLI is installed', async () => {
      vi.mocked(openspecApi.openspecApi.checkCli).mockResolvedValue({
        installed: true,
        version: '1.0.0',
      })

      await useOpenSpecStore.getState().checkCli()

      expect(useOpenSpecStore.getState().cliStatus).toEqual({
        installed: true,
        version: '1.0.0',
      })
    })

    it('sets cliStatus to not installed on error', async () => {
      vi.mocked(openspecApi.openspecApi.checkCli).mockRejectedValue(new Error('Not found'))

      await useOpenSpecStore.getState().checkCli()

      expect(useOpenSpecStore.getState().cliStatus).toEqual({
        installed: false,
        version: null,
      })
    })
  })

  describe('fetchChanges', () => {
    it('fetches and sets changes list', async () => {
      const mockChanges: OpenSpecChangeInfo[] = [
        {
          name: 'add-feature',
          completedTasks: 2,
          totalTasks: 5,
          lastModified: '2026-05-02T00:00:00Z',
          status: 'in-progress',
          currentStage: 'apply',
          artifacts: [],
        },
      ]

      vi.mocked(openspecApi.openspecApi.listChanges).mockResolvedValue(mockChanges)

      await useOpenSpecStore.getState().fetchChanges(PROJECT_ID, PROJECT_PATH)
      
      await new Promise(resolve => requestAnimationFrame(resolve))

      const projectState = useOpenSpecStore.getState().getProjectState(PROJECT_ID)
      expect(projectState.changes).toEqual(mockChanges)
      expect(projectState.loading).toBe(false)
    })

    it('sets error on fetch failure', async () => {
      vi.mocked(openspecApi.openspecApi.listChanges).mockRejectedValue(new Error('Failed'))

      await useOpenSpecStore.getState().fetchChanges(PROJECT_ID, PROJECT_PATH)
      
      await new Promise(resolve => requestAnimationFrame(resolve))

      const projectState = useOpenSpecStore.getState().getProjectState(PROJECT_ID)
      expect(projectState.error).toBe('Error: Failed')
      expect(projectState.loading).toBe(false)
    })
  })

  describe('fetchAllChanges', () => {
    it('fetches board data with changes and cli status', async () => {
      const mockChanges: OpenSpecChangeInfo[] = [
        {
          name: 'add-feature',
          completedTasks: 2,
          totalTasks: 5,
          lastModified: '2026-05-02T00:00:00Z',
          status: 'in-progress',
          currentStage: 'apply',
          artifacts: [],
        },
      ]

      const mockArchivedChanges: OpenSpecChangeInfo[] = [
        {
          name: 'old-feature',
          completedTasks: 1,
          totalTasks: 1,
          lastModified: '2026-04-01T00:00:00Z',
          status: 'complete',
          currentStage: 'archive',
          artifacts: [],
        },
      ]

      vi.mocked(openspecApi.openspecApi.fetchBoardData).mockResolvedValue({
        changes: mockChanges,
        archivedChanges: mockArchivedChanges,
        cliInstalled: true,
        cliVersion: '1.0.0',
      })

      await useOpenSpecStore.getState().fetchAllChanges(PROJECT_ID, PROJECT_PATH)
      
      await new Promise(resolve => requestAnimationFrame(resolve))

      const projectState = useOpenSpecStore.getState().getProjectState(PROJECT_ID)
      expect(projectState.changes).toEqual(mockChanges)
      expect(projectState.archivedChanges).toEqual(mockArchivedChanges)
      expect(useOpenSpecStore.getState().cliStatus).toEqual({
        installed: true,
        version: '1.0.0',
      })
      expect(projectState.initialized).toBe(true)
      expect(projectState.loading).toBe(false)
    })

    it('handles errors gracefully', async () => {
      vi.mocked(openspecApi.openspecApi.fetchBoardData).mockRejectedValue(new Error('Failed'))

      await useOpenSpecStore.getState().fetchAllChanges(PROJECT_ID, PROJECT_PATH)
      
      await new Promise(resolve => requestAnimationFrame(resolve))

      const projectState = useOpenSpecStore.getState().getProjectState(PROJECT_ID)
      expect(projectState.error).toBe('Error: Failed')
      expect(projectState.loading).toBe(false)
    })

    it('skips fetch if already initialized', async () => {
      useOpenSpecStore.setState({
        projectStates: {
          [PROJECT_ID]: {
            ...useOpenSpecStore.getState().getProjectState(PROJECT_ID),
            initialized: true,
          },
        },
      })
      
      await useOpenSpecStore.getState().fetchAllChanges(PROJECT_ID, PROJECT_PATH)

      expect(openspecApi.openspecApi.fetchBoardData).not.toHaveBeenCalled()
    })
  })

  describe('selectChange', () => {
    it('sets selectedChangeId', () => {
      useOpenSpecStore.getState().selectChange(PROJECT_ID, 'add-feature')

      expect(useOpenSpecStore.getState().getProjectState(PROJECT_ID).selectedChangeId).toBe('add-feature')
    })

    it('clears selectedChangeId when null is passed', () => {
      useOpenSpecStore.setState({
        projectStates: {
          [PROJECT_ID]: {
            ...useOpenSpecStore.getState().getProjectState(PROJECT_ID),
            selectedChangeId: 'add-feature',
          },
        },
      })

      useOpenSpecStore.getState().selectChange(PROJECT_ID, null)

      expect(useOpenSpecStore.getState().getProjectState(PROJECT_ID).selectedChangeId).toBeNull()
    })
  })

  describe('executeAction', () => {
    it('executes command and returns result', async () => {
      const mockResult = {
        success: true,
        stdout: 'Done',
        stderr: '',
        exitCode: 0,
      }

      vi.mocked(openspecApi.openspecApi.executeCommand).mockResolvedValue(mockResult)

      const result = await useOpenSpecStore.getState().executeAction(
        '/project/path',
        'propose',
        ['change-name']
      )

      expect(result).toEqual(mockResult)
      expect(useOpenSpecStore.getState().lastCommandResult).toEqual(mockResult)
      expect(useOpenSpecStore.getState().commandLoading).toBe(false)
    })

    it('sets commandError on failure', async () => {
      vi.mocked(openspecApi.openspecApi.executeCommand).mockRejectedValue(new Error('Command failed'))

      const result = await useOpenSpecStore.getState().executeAction(
        '/project/path',
        'propose',
        ['change-name']
      )

      expect(result).toBeNull()
      expect(useOpenSpecStore.getState().commandError).toBe('Error: Command failed')
    })
  })

  describe('resetProject', () => {
    it('resets a project state to initial state', () => {
      useOpenSpecStore.setState({
        projectStates: {
          [PROJECT_ID]: {
            ...useOpenSpecStore.getState().getProjectState(PROJECT_ID),
            changes: [{ 
              name: 'test', 
              completedTasks: 0, 
              totalTasks: 0, 
              lastModified: '', 
              status: 'no-tasks',
              currentStage: 'proposal',
              artifacts: [],
            }],
            selectedChangeId: 'test',
            error: 'some error',
          },
        },
      })

      useOpenSpecStore.getState().resetProject(PROJECT_ID)

      const projectState = useOpenSpecStore.getState().getProjectState(PROJECT_ID)
      expect(projectState.changes).toEqual([])
      expect(projectState.selectedChangeId).toBeNull()
      expect(projectState.error).toBeNull()
    })
  })
})
