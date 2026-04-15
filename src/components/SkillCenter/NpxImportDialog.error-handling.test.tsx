import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NpxImportDialog } from './NpxImportDialog'
import type { ToolAvailability, NativeNpxImportResponse } from '../../types'

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

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onPrepareImport: mocks.onPrepareImport,
  onConfirmImport: mocks.onConfirmImport,
  onCancelImport: mocks.onCancelImport,
  onExecuteNative: mocks.onExecuteNative,
  onSyncToSkiller: mocks.onSyncToSkiller,
  checkTools: mocks.checkTools,
}

describe('NpxImportDialog - Native Mode Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listen.mockResolvedValue(vi.fn())
    mocks.checkTools.mockResolvedValue({ npx: true, git: true } as ToolAvailability)
  })

  it('should show friendly error when skill installation fails due to non-existent skill', async () => {
    const errorMessage = '技能安装失败。可能原因：\n1. 技能名称不存在于指定的仓库中\n2. 网络连接失败\n3. 权限不足'
    mocks.onExecuteNative.mockRejectedValue(new Error(errorMessage))

    render(<NpxImportDialog {...defaultProps} />)

    const commandInput = screen.getByPlaceholderText(/例如：npx skills add/)
    fireEvent.change(commandInput, { target: { value: 'npx skills add xixu-me/skills@non-existent-skill -g -y' } })

    const executeButton = screen.getByText('执行安装')
    fireEvent.click(executeButton)

    await waitFor(() => {
      expect(screen.getAllByText(/技能安装失败/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/技能名称不存在/).length).toBeGreaterThan(0)
    })
  })

  it('should show friendly error when npx command fails', async () => {
    const errorMessage = 'npx skills add 失败: Error: Failed to clone repository'
    mocks.onExecuteNative.mockRejectedValue(new Error(errorMessage))

    render(<NpxImportDialog {...defaultProps} />)

    const commandInput = screen.getByPlaceholderText(/例如：npx skills add/)
    fireEvent.change(commandInput, { target: { value: 'npx skills add invalid-repo@skill -g -y' } })

    const executeButton = screen.getByText('执行安装')
    fireEvent.click(executeButton)

    await waitFor(() => {
      expect(screen.getAllByText(/npx 命令执行失败/).length).toBeGreaterThan(0)
    })
  })

  it('should show friendly error when skill directory does not exist during sync', async () => {
    const mockResult: NativeNpxImportResponse = {
      success: true,
      skill_name: 'github-actions-docs',
      exists_in_skiller: true,
      logs: ['Installation complete'],
    }
    mocks.onExecuteNative.mockResolvedValue(mockResult)
    mocks.onSyncToSkiller.mockRejectedValue(new Error("技能 'github-actions-docs' 不存在于 ~/.agents/skills/ 目录"))

    render(<NpxImportDialog {...defaultProps} />)

    const commandInput = screen.getByPlaceholderText(/例如：npx skills add/)
    fireEvent.change(commandInput, { target: { value: 'npx skills add xixu-me/skills@github-actions-docs -g -y' } })

    const executeButton = screen.getByText('执行安装')
    fireEvent.click(executeButton)

    await waitFor(() => {
      expect(screen.getByText('待确认导入信息')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('确认更新'))

    await waitFor(() => {
      expect(screen.getAllByText(/删除或移动/).length).toBeGreaterThan(0)
    })
  })

  it('should display installation logs with detailed error information', async () => {
    const mockResult: NativeNpxImportResponse = {
      success: true,
      skill_name: 'github-actions-docs',
      exists_in_skiller: false,
      logs: [
        'Checking local tool environment...',
        'Executing native npx skills command...',
        'Installing to: Antigravity, Claude Code, OpenClaw',
        'Installed 1 skill',
      ],
    }
    mocks.onExecuteNative.mockResolvedValue(mockResult)

    render(<NpxImportDialog {...defaultProps} />)

    const commandInput = screen.getByPlaceholderText(/例如：npx skills add/)
    fireEvent.change(commandInput, { target: { value: 'npx skills add xixu-me/skills@github-actions-docs -g -y' } })

    const executeButton = screen.getByText('执行安装')
    fireEvent.click(executeButton)

    await waitFor(() => {
      expect(screen.getByText('待确认导入信息')).toBeInTheDocument()
    })
  })
})

describe('NpxImportDialog - Update Existing Skill', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listen.mockResolvedValue(vi.fn())
    mocks.checkTools.mockResolvedValue({ npx: true, git: true } as ToolAvailability)
  })

  it('should show update mode when skill already exists', async () => {
    const mockResult: NativeNpxImportResponse = {
      success: true,
      skill_name: 'existing-skill',
      exists_in_skiller: true,
      logs: ['Installation complete'],
    }
    mocks.onExecuteNative.mockResolvedValue(mockResult)

    render(<NpxImportDialog {...defaultProps} />)

    const commandInput = screen.getByPlaceholderText(/例如：npx skills add/)
    fireEvent.change(commandInput, { target: { value: 'npx skills add xixu-me/skills@existing-skill -g -y' } })

    const executeButton = screen.getByText('执行安装')
    fireEvent.click(executeButton)

    await waitFor(() => {
      expect(screen.getByText('待确认导入信息')).toBeInTheDocument()
      expect(screen.getByText('该技能已存在，确认后将覆盖原有技能')).toBeInTheDocument()
    })
  })
})
