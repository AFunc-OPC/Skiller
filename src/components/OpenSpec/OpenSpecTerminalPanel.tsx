import { useEffect, useState } from 'react'
import { openspecTerminalApi } from '../../api/openspecTerminal'
import type { Project } from '../../types'
import type { Language } from '../../stores/appStore'

interface OpenSpecTerminalPanelProps {
  isOpen: boolean
  project: Project
  initialCommand: string
  language: Language
  onClose: () => void
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function OpenSpecTerminalPanel({
  isOpen,
  project,
  initialCommand,
  language,
  onClose,
}: OpenSpecTerminalPanelProps) {
  const [command, setCommand] = useState(initialCommand)
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setCommand(initialCommand)
    setOutput('')
    setRunning(false)
  }, [initialCommand, isOpen])

  if (!isOpen) {
    return null
  }

  const executeCommand = async () => {
    setRunning(true)

    try {
      const result = await openspecTerminalApi.execute(project.path, command)
      setOutput([result.stdout, result.stderr].filter(Boolean).join('\n'))
    } catch (error) {
      setOutput(getErrorMessage(error))
    } finally {
      setRunning(false)
    }
  }

  return (
    <section className="osb-terminal-panel" aria-label={language === 'zh' ? 'OpenSpec 终端面板' : 'OpenSpec terminal panel'}>
      <div className="osb-terminal-header">
        <h3>{language === 'zh' ? 'OpenSpec 终端' : 'OpenSpec Terminal'}</h3>
        <button type="button" onClick={onClose}>
          {language === 'zh' ? '关闭' : 'Close'}
        </button>
      </div>
      <p>{project.path}</p>
      <label>
        <span>{language === 'zh' ? '命令' : 'Command'}</span>
        <textarea
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          rows={3}
        />
      </label>
      <button type="button" onClick={() => void executeCommand()} disabled={running || command.trim().length === 0}>
        {running ? (language === 'zh' ? '执行中…' : 'Running...') : (language === 'zh' ? '执行' : 'Run')}
      </button>
      <pre>{output || (language === 'zh' ? '等待执行...' : 'Waiting to run...')}</pre>
    </section>
  )
}
