import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOpenSpecStore } from './openspecStore'
import * as openspecApi from '../api/openspec'
import type { OpenSpecChangeInfo } from '../types'

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
      changes: [],
      selectedChangeId: null,
      cliStatus: null,
      loading: false,
      error: null,
      commandLoading: false,
      commandError: null,
      lastCommandResult: null,
      hasOpenSpecDirectory: false,
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

      await useOpenSpecStore.getState().fetchChanges('/project/path')
      
      await new Promise(resolve => requestAnimationFrame(resolve))

      expect(useOpenSpecStore.getState().changes).toEqual(mockChanges)
      expect(useOpenSpecStore.getState().loading).toBe(false)
    })

    it('sets error on fetch failure', async () => {
      vi.mocked(openspecApi.openspecApi.listChanges).mockRejectedValue(new Error('Failed'))

      await useOpenSpecStore.getState().fetchChanges('/project/path')
      
      await new Promise(resolve => requestAnimationFrame(resolve))

      expect(useOpenSpecStore.getState().error).toBe('Error: Failed')
      expect(useOpenSpecStore.getState().loading).toBe(false)
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

      await useOpenSpecStore.getState().fetchAllChanges('/project/path')
      
      await new Promise(resolve => requestAnimationFrame(resolve))

      expect(useOpenSpecStore.getState().changes).toEqual(mockChanges)
      expect(useOpenSpecStore.getState().archivedChanges).toEqual(mockArchivedChanges)
      expect(useOpenSpecStore.getState().cliStatus).toEqual({
        installed: true,
        version: '1.0.0',
      })
      expect(useOpenSpecStore.getState().initialized).toBe(true)
      expect(useOpenSpecStore.getState().loading).toBe(false)
    })

    it('handles errors gracefully', async () => {
      useOpenSpecStore.setState({ initialized: false })
      
      vi.mocked(openspecApi.openspecApi.fetchBoardData).mockRejectedValue(new Error('Failed'))

      await useOpenSpecStore.getState().fetchAllChanges('/project/path')
      
      await new Promise(resolve => requestAnimationFrame(resolve))

      expect(useOpenSpecStore.getState().error).toBe('Error: Failed')
      expect(useOpenSpecStore.getState().loading).toBe(false)
    })

    it('skips fetch if already initialized', async () => {
      useOpenSpecStore.setState({ initialized: true })
      
      await useOpenSpecStore.getState().fetchAllChanges('/project/path')

      expect(openspecApi.openspecApi.fetchBoardData).not.toHaveBeenCalled()
    })
  })

  describe('selectChange', () => {
    it('sets selectedChangeId', () => {
      useOpenSpecStore.getState().selectChange('add-feature')

      expect(useOpenSpecStore.getState().selectedChangeId).toBe('add-feature')
    })

    it('clears selectedChangeId when null is passed', () => {
      useOpenSpecStore.setState({ selectedChangeId: 'add-feature' })

      useOpenSpecStore.getState().selectChange(null)

      expect(useOpenSpecStore.getState().selectedChangeId).toBeNull()
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

  describe('reset', () => {
    it('resets store to initial state', () => {
      useOpenSpecStore.setState({
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
      })

      useOpenSpecStore.getState().reset()

      expect(useOpenSpecStore.getState().changes).toEqual([])
      expect(useOpenSpecStore.getState().selectedChangeId).toBeNull()
      expect(useOpenSpecStore.getState().error).toBeNull()
    })
  })
})
