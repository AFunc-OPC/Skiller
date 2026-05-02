import { describe, expect, it, vi, beforeEach } from 'vitest'
import { openspecApi } from './openspec'
import * as tauri from './tauri'

vi.mock('./tauri', () => ({
  invoke: vi.fn(),
}))

describe('openspecApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkCli', () => {
    it('calls check_openspec_cli command', async () => {
      const mockResult = { installed: true, version: '1.0.0' }
      vi.mocked(tauri.invoke).mockResolvedValue(mockResult)

      const result = await openspecApi.checkCli()

      expect(tauri.invoke).toHaveBeenCalledWith('check_openspec_cli')
      expect(result).toEqual(mockResult)
    })
  })

  describe('listChanges', () => {
    it('calls list_openspec_changes with project path', async () => {
      const mockChanges = [
        {
          id: 'change-1',
          name: 'add-feature',
          status: 'in_progress',
          currentStage: 'propose',
          createdAt: '2026-05-02T00:00:00Z',
          updatedAt: '2026-05-02T00:00:00Z',
          artifacts: [],
        },
      ]
      vi.mocked(tauri.invoke).mockResolvedValue(mockChanges)

      const result = await openspecApi.listChanges('/project/path')

      expect(tauri.invoke).toHaveBeenCalledWith('list_openspec_changes', {
        projectPath: '/project/path',
      })
      expect(result).toEqual(mockChanges)
    })
  })

  describe('readArtifact', () => {
    it('calls read_openspec_artifact with correct params', async () => {
      const mockContent = '# Proposal\n\nThis is a proposal.'
      vi.mocked(tauri.invoke).mockResolvedValue(mockContent)

      const result = await openspecApi.readArtifact(
        '/project/path',
        'change-1',
        'proposal.md'
      )

      expect(tauri.invoke).toHaveBeenCalledWith('read_openspec_artifact', {
        projectPath: '/project/path',
        changeId: 'change-1',
        fileName: 'proposal.md',
      })
      expect(result).toBe(mockContent)
    })
  })

  describe('executeCommand', () => {
    it('calls execute_openspec_command with correct params', async () => {
      const mockResult = {
        success: true,
        stdout: 'Command executed',
        stderr: '',
        exitCode: 0,
      }
      vi.mocked(tauri.invoke).mockResolvedValue(mockResult)

      const result = await openspecApi.executeCommand(
        '/project/path',
        'propose',
        ['change-name']
      )

      expect(tauri.invoke).toHaveBeenCalledWith('execute_openspec_command', {
        projectPath: '/project/path',
        command: 'propose',
        args: ['change-name'],
      })
      expect(result).toEqual(mockResult)
    })
  })

  describe('checkOpenSpecDirectory', () => {
    it('calls check_openspec_directory with project path', async () => {
      vi.mocked(tauri.invoke).mockResolvedValue(true)

      const result = await openspecApi.checkOpenSpecDirectory('/project/path')

      expect(tauri.invoke).toHaveBeenCalledWith('check_openspec_directory', {
        projectPath: '/project/path',
      })
      expect(result).toBe(true)
    })
  })
})
