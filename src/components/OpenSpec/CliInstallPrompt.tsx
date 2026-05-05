import { RefreshCw, AlertTriangle } from 'lucide-react'
import { useOpenSpecStore } from '../../stores/openspecStore'

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
      <h2>
        {language === 'zh' ? 'OpenSpec CLI 未安装' : 'OpenSpec CLI Not Installed'}
      </h2>
      <p>
        {language === 'zh'
          ? '请安装 OpenSpec CLI 以使用此功能'
          : 'Please install OpenSpec CLI to use this feature'}
      </p>
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
        <span>{language === 'zh' ? '重新检测' : 'Recheck'}</span>
      </button>
    </div>
  )
}
