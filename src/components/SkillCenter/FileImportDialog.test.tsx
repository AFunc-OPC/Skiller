import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FileImportDialog } from './FileImportDialog'

const mocks = vi.hoisted(() => ({
  open: vi.fn(),
  isTauriEnvironment: vi.fn(),
  onImport: vi.fn(),
  onClose: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: mocks.open,
}))

vi.mock('../../api/tauri', () => ({
  isTauriEnvironment: mocks.isTauriEnvironment,
}))

describe('FileImportDialog', () => {
  beforeEach(() => {
    mocks.open.mockReset()
    mocks.isTauriEnvironment.mockReset()
    mocks.onImport.mockReset()
    mocks.onClose.mockReset()

    mocks.isTauriEnvironment.mockReturnValue(true)
    mocks.onImport.mockResolvedValue(undefined)
  })

  function renderDialog() {
    return render(
      <FileImportDialog
        isOpen
        onClose={mocks.onClose}
        onImport={mocks.onImport}
      />,
    )
  }

  function getDropzone() {
    return screen.getByRole('button', { name: '选择或拖入文件/文件夹' })
  }

  it('fills the file path when a supported package is dropped', async () => {
    renderDialog()

    const dropzone = getDropzone()
    fireEvent.dragOver(dropzone)
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [
          new File(['demo'], 'demo.skill', { type: 'application/octet-stream' }),
        ],
      },
    })

    expect(await screen.findByDisplayValue('demo.skill')).toBeInTheDocument()
    expect(screen.getByText('demo.skill')).toBeInTheDocument()
  })

  it('shows an error when an unsupported file is dropped', async () => {
    renderDialog()

    const dropzone = getDropzone()
    fireEvent.dragOver(dropzone)
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [
          new File(['demo'], 'demo.txt', { type: 'text/plain' }),
        ],
      },
    })

    expect(await screen.findByText('仅支持导入 .zip、.skill 文件或技能文件夹。')).toBeInTheDocument()
  })

  it('imports the dropped file path', async () => {
    const user = userEvent.setup()
    renderDialog()

    const dropzone = getDropzone()
    fireEvent.dragOver(dropzone)
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [
          new File(['demo'], 'demo.zip', { type: 'application/zip' }),
        ],
      },
    })

    await user.click(screen.getByRole('button', { name: '导入' }))

    await waitFor(() => {
      expect(mocks.onImport).toHaveBeenCalledWith('demo.zip')
    })
  })

  it('switches between file and folder import modes', async () => {
    const user = userEvent.setup()
    renderDialog()

    expect(screen.getByPlaceholderText('选择 .zip 或 .skill 文件')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /技能文件夹/ }))

    expect(screen.getByPlaceholderText('选择技能文件夹')).toBeInTheDocument()
  })
})
