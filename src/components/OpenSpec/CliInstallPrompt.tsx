import { RefreshCw, AlertTriangle } from 'lucide-react'
import { useOpenSpecStore } from '../../stores/openspecStore'
import { t } from '../../i18n'

interface CliInstallPromptProps {
  language: 'zh' | 'en'
}

export function CliInstallPrompt({ language }: CliInstallPromptProps) {
  const { checkCli, commandLoading } = useOpenSpecStore()

  const handleRecheck = () => {
    checkCli()
  }

  return (
    <div className="os-cli-prompt">
      <AlertTriangle className="os-cli-prompt-icon" />
      <h2>{t('openspecCliNotInstalled', language)}</h2>
      <p>{t('openspecCliInstallHint', language)}</p>
      <div className="os-cli-install-commands">
        <code>npm install -g openspec</code>
        <code>bun install -g openspec</code>
      </div>
      <button
        className="os-recheck-btn"
        onClick={handleRecheck}
        disabled={commandLoading}
      >
        <RefreshCw className={`w-4 h-4 ${commandLoading ? 'animate-spin' : ''}`} />
        <span>{t('openspecRecheck', language)}</span>
      </button>
    </div>
  )
}
