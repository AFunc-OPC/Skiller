import { useEffect, useMemo, useRef, useState } from 'react'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { X, Terminal as TerminalIcon, AlertCircle, CheckCircle2, Info, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import type {
  ConfirmNpxSkillImportResponse,
  NativeNpxImportResponse,
  NativeNpxProgressEvent,
  NpxImportProgressEvent,
  PrepareNpxSkillImportResponse,
  SyncToSkillerResponse,
  ToolAvailability,
} from '../../types'
import { useAppStore } from '../../stores/appStore'
import './SkillCenter.css'

type ImportMode = 'native' | 'managed'

interface NpxImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onPrepareImport: (command: string, requestId: string) => Promise<PrepareNpxSkillImportResponse>
  onConfirmImport: (sessionId: string) => Promise<ConfirmNpxSkillImportResponse>
  onCancelImport: (sessionId: string) => Promise<void>
  onExecuteNative: (command: string, requestId: string) => Promise<NativeNpxImportResponse>
  onSyncToSkiller: (skillName: string) => Promise<SyncToSkillerResponse>
  checkTools: () => Promise<ToolAvailability>
}

const NPX_IMPORT_PROGRESS_EVENT = 'npx-import-progress'
const NATIVE_NPX_PROGRESS_EVENT = 'native-npx-progress'

export function NpxImportDialog({
  isOpen,
  onClose,
  onPrepareImport,
  onConfirmImport,
  onCancelImport,
  onExecuteNative,
  onSyncToSkiller,
  checkTools,
}: NpxImportDialogProps) {
  const [mode, setMode] = useState<ImportMode>('native')
  const [command, setCommand] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [preparing, setPreparing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [toolHint, setToolHint] = useState<ToolAvailability | null>(null)
  const [prepared, setPrepared] = useState<PrepareNpxSkillImportResponse | null>(null)
  const [nativeResult, setNativeResult] = useState<NativeNpxImportResponse | null>(null)
  const [showNativeConfirm, setShowNativeConfirm] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [tipExpanded, setTipExpanded] = useState(false)
  const activeRequestIdRef = useRef<string | null>(null)
  const unlistenRef = useRef<UnlistenFn | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const logsFieldRef = useRef<HTMLDivElement | null>(null)
  const logsBodyRef = useRef<HTMLDivElement | null>(null)
  const { language } = useAppStore()

  const scrollLogsIntoView = () => {
    requestAnimationFrame(() => {
      logsFieldRef.current?.scrollIntoView({ block: 'nearest' })

      requestAnimationFrame(() => {
        if (logsBodyRef.current) {
          logsBodyRef.current.scrollTop = logsBodyRef.current.scrollHeight
        }

        if (bodyRef.current) {
          const body = bodyRef.current
          const logsField = logsFieldRef.current
          if (logsField) {
            const targetTop = logsField.offsetTop + logsField.offsetHeight - body.clientHeight
            body.scrollTop = Math.max(0, targetTop)
          }
        }
      })
    })
  }

  useEffect(() => {
    if (!isOpen) {
      setError('')
      setLogs([])
      setPreparing(false)
      setConfirming(false)
      setToolHint(null)
      setPrepared(null)
      setNativeResult(null)
      setShowNativeConfirm(false)
      setSuccessMessage('')
      setCommand('')
      activeRequestIdRef.current = null
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (unlistenRef.current) {
        void unlistenRef.current()
        unlistenRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    scrollLogsIntoView()
  }, [logs])

  const output = useMemo(() => logs.join('\n'), [logs])

  if (!isOpen) return null

  const handleClose = async () => {
    if (prepared?.session_id) {
      try {
        await onCancelImport(prepared.session_id)
      } catch (cancelError) {
        console.error(cancelError)
      }
    }
    onClose()
  }

  const handleNativeExecute = async () => {
    if (!command.trim()) return

    setPreparing(true)
    setError('')
    setSuccessMessage('')
    setNativeResult(null)
    setLogs([language === 'zh' ? '正在检查本地工具环境...' : 'Checking local tool environment...'])
    const requestId = crypto.randomUUID()
    activeRequestIdRef.current = requestId

    try {
      if (unlistenRef.current) {
        await unlistenRef.current()
        unlistenRef.current = null
      }

      unlistenRef.current = await listen<NativeNpxProgressEvent>(NATIVE_NPX_PROGRESS_EVENT, (event) => {
        const payload = event.payload
        if (!payload || payload.request_id !== activeRequestIdRef.current) {
          return
        }

        const prefix = payload.is_error ? '[error] ' : ''
        setLogs((prev) => [...prev, `${prefix}${payload.line}`])
      })

      const localTools = await checkTools()
      setToolHint(localTools)

      if (!localTools.npx) {
        throw new Error(language === 'zh' ? '未检测到 npx，请先安装 Node.js 后再导入' : 'npx not detected. Please install Node.js before importing.')
      }

      setLogs((prev) => [
        ...prev,
        `${language === 'zh' ? '本地检查' : 'Local check'}: npx=${localTools.npx ? (language === 'zh' ? '可用' : 'available') : (language === 'zh' ? '不可用' : 'unavailable')}`,
        language === 'zh' ? '正在执行原生 npx skills 命令...' : 'Executing native npx skills command...',
      ])

      const result = await onExecuteNative(command, requestId)
      setNativeResult(result)

      if (!result.success) {
        setError(language === 'zh' ? '命令执行失败' : 'Command execution failed')
        return
      }

      setShowNativeConfirm(true)
      setLogs((prev) => [
        ...prev,
        language === 'zh'
          ? `npx skills 安装成功：${result.skill_name}`
          : `npx skills installed successfully: ${result.skill_name}`,
        language === 'zh'
          ? '安装完成，请确认是否同步到 Skiller'
          : 'Installation complete. Please confirm to sync to Skiller',
      ])
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)

      let friendlyMsg = errorMsg
      if (errorMsg.includes('技能目录不存在') || errorMsg.includes('安装失败')) {
        friendlyMsg = language === 'zh'
          ? '技能安装失败。可能原因：\n1. 技能名称不存在于指定的仓库中\n2. 网络连接失败\n3. 权限不足\n\n建议：使用 npx skills add <repo> --list 查看可用技能列表'
          : 'Skill installation failed. Possible reasons:\n1. Skill name does not exist in the specified repository\n2. Network connection failed\n3. Permission denied\n\nSuggestion: Use npx skills add <repo> --list to view available skills'
      } else if (errorMsg.includes('npx skills add 失败')) {
        friendlyMsg = language === 'zh'
          ? `npx 命令执行失败。${errorMsg.replace('npx skills add 失败: ', '')}`
          : `npx command failed. ${errorMsg.replace('npx skills add failed: ', '')}`
      }

      setError(friendlyMsg)
      setLogs((prev) => [...prev, `${language === 'zh' ? '错误' : 'Error'}: ${friendlyMsg}`])
    } finally {
      if (unlistenRef.current) {
        await unlistenRef.current()
        unlistenRef.current = null
      }
      setPreparing(false)
    }
  }

  const handleNativeConfirmSync = async () => {
    if (!nativeResult) return

    setConfirming(true)
    setError('')

    try {
      const result = await onSyncToSkiller(nativeResult.skill_name)
      if (result.is_update) {
        setSuccessMessage(`${language === 'zh' ? '更新成功' : 'Update successful'}：${result.skill_name}`)
        setLogs((prev) => [...prev, `${language === 'zh' ? '已更新到' : 'Updated to'} ${result.skill_path}`])
      } else {
        setSuccessMessage(`${language === 'zh' ? '同步成功' : 'Sync successful'}：${result.skill_name}`)
        setLogs((prev) => [...prev, `${language === 'zh' ? '已同步到' : 'Synced to'} ${result.skill_path}`])
      }
      setShowNativeConfirm(false)
      setNativeResult(null)
      setCommand('')
      setTimeout(() => {
        onClose()
      }, 1200)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)

      let friendlyMsg = errorMsg
      if (errorMsg.includes('不存在于 ~/.agents/skills/')) {
        friendlyMsg = language === 'zh'
          ? `技能 '${nativeResult.skill_name}' 已从 ~/.agents/skills/ 目录中删除或移动。请重新导入该技能。`
          : `Skill '${nativeResult.skill_name}' has been deleted or moved from ~/.agents/skills/ directory. Please re-import the skill.`
      }

      setError(friendlyMsg)
    } finally {
      setConfirming(false)
    }
  }

  const handlePrepare = async () => {
    if (!command.trim()) return

    setPreparing(true)
    setError('')
    setSuccessMessage('')
    setPrepared(null)
    setLogs([language === 'zh' ? '正在检查本地工具环境...' : 'Checking local tool environment...'])
    const requestId = crypto.randomUUID()
    activeRequestIdRef.current = requestId

    try {
      if (unlistenRef.current) {
        await unlistenRef.current()
        unlistenRef.current = null
      }

      unlistenRef.current = await listen<NpxImportProgressEvent>(NPX_IMPORT_PROGRESS_EVENT, (event) => {
        const payload = event.payload
        if (!payload || payload.request_id !== activeRequestIdRef.current) {
          return
        }

        setLogs((prev) => [...prev, `[${payload.entry.stage}] ${payload.entry.message}`])
      })

      const localTools = await checkTools()
      setToolHint(localTools)

      if (!localTools.git) {
        throw new Error(language === 'zh' ? '未检测到 git，请先安装 git 后再导入' : 'Git not detected. Please install git before importing.')
      }

      setLogs((prev) => [
        ...prev,
        `${language === 'zh' ? '本地检查' : 'Local check'}: git=${localTools.git ? (language === 'zh' ? '可用' : 'available') : (language === 'zh' ? '不可用' : 'unavailable')}, npx=${localTools.npx ? (language === 'zh' ? '可用' : 'available') : (language === 'zh' ? '不可用' : 'unavailable')}`,
        language === 'zh' ? '系统开始接管命令并准备暂存导入...' : 'System is taking over the command and preparing staged import...',
        language === 'zh' ? '正在执行 git clone 暂存仓库，这一步可能持续数秒到 1 分钟；如果仓库不可达、需要认证或分支不存在，将返回明确错误。' : 'Executing git clone to stage repository. This may take several seconds to 1 minute. If repository is unreachable, requires authentication, or branch does not exist, an error will be returned.',
      ])

      const result = await onPrepareImport(command, requestId)
      if (result.logs.length > 0) {
        setLogs((prev) => [
          ...prev,
          ...result.logs.map((entry) => `[${entry.stage}] ${entry.message}`),
        ])
      }
      setPrepared(result)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      setError(errorMsg)
      setLogs((prev) => {
        const recentLogs = prev.slice(-5)
        const context = recentLogs.length > 0 ? `\n${language === 'zh' ? '最近进度' : 'Recent progress'}:\n${recentLogs.join('\n')}` : ''
        return [...prev, `${language === 'zh' ? '错误' : 'Error'}: ${errorMsg}${context}`]
      })
    } finally {
      if (unlistenRef.current) {
        await unlistenRef.current()
        unlistenRef.current = null
      }

      setPreparing(false)
    }
  }

  const handleConfirm = async () => {
    if (!prepared?.session_id) return

    setConfirming(true)
    setError('')

    try {
      const result = await onConfirmImport(prepared.session_id)
      if (result.is_update) {
        setSuccessMessage(`${language === 'zh' ? '更新成功' : 'Update successful'}：${result.imported_skill_name}`)
        setLogs((prev) => [...prev, `[confirm] ${language === 'zh' ? '已更新到' : 'Updated to'} ${result.skill_path}`])
      } else {
        setSuccessMessage(`${language === 'zh' ? '导入成功' : 'Import successful'}：${result.imported_skill_name}`)
        setLogs((prev) => [...prev, `[confirm] ${language === 'zh' ? '已导入到' : 'Imported to'} ${result.skill_path}`])
      }
      setPrepared(null)
      setCommand('')
      setTimeout(() => {
        onClose()
      }, 1200)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      setError(errorMsg)
      setLogs((prev) => [...prev, `${language === 'zh' ? '错误' : 'Error'}: ${errorMsg}`])
    } finally {
      setConfirming(false)
    }
  }

  const handleModeChange = (newMode: ImportMode) => {
    setMode(newMode)
    setError('')
    setLogs([])
    setPrepared(null)
    setNativeResult(null)
    setSuccessMessage('')
    setShowNativeConfirm(false)
  }

  return (
    <>
      <div className="sc-import-overlay" onClick={handleClose} />
      <div className="sc-import-dialog sc-import-dialog-wide" role="dialog" aria-modal="true" aria-labelledby="npx-import-title">
        <div className="sc-import-header">
          <div className="sc-import-title">
            <div className="sc-import-title-icon">
              <TerminalIcon />
            </div>
            <h3 id="npx-import-title">{language === 'zh' ? 'npx skill命令导入安装' : 'Import via npx skill command'}</h3>
          </div>
          <button onClick={handleClose} className="sc-import-close" aria-label={language === 'zh' ? '关闭' : 'Close'}>
            <X />
          </button>
        </div>

        <div ref={bodyRef} className="sc-import-body">
          <div className="sc-mode-switch">
            <label className={`sc-mode-option native ${mode === 'native' ? 'active' : ''}`}>
              <input
                type="radio"
                name="import-mode"
                value="native"
                checked={mode === 'native'}
                onChange={() => handleModeChange('native')}
              />
              <div className="sc-mode-content">
                <span className="sc-mode-label">{language === 'zh' ? '原生模式' : 'Native Mode'}</span>
                <span className="sc-mode-desc">{language === 'zh' ? '执行 npx skills add' : 'Run npx skills add'}</span>
              </div>
            </label>
            <label className={`sc-mode-option managed ${mode === 'managed' ? 'active' : ''}`}>
              <input
                type="radio"
                name="import-mode"
                value="managed"
                checked={mode === 'managed'}
                onChange={() => handleModeChange('managed')}
              />
              <div className="sc-mode-content">
                <span className="sc-mode-label">{language === 'zh' ? '接管模式' : 'Managed Mode'}</span>
                <span className="sc-mode-desc">{language === 'zh' ? '通过 git clone' : 'Via git clone'}</span>
              </div>
            </label>
          </div>

          {mode === 'native' && (
            <div className="sc-native-mode-info">
              <Info size={14} />
              <span>
                {language === 'zh'
                  ? '原生模式会直接运行 npx skills add 命令，安装成功后自动同步到 Skiller。'
                  : 'Native mode runs npx skills add command directly, then syncs to Skiller after installation.'}
              </span>
            </div>
          )}

          <div className={`sc-import-info ${tipExpanded ? 'expanded' : ''}`}>
            <div className="sc-import-info-header" onClick={() => setTipExpanded(!tipExpanded)}>
              <Info />
              <span className="sc-import-info-title">
                {language === 'zh' ? '命令格式说明' : 'Command Format Guide'}
              </span>
              {tipExpanded ? <ChevronDown className="sc-import-info-chevron" /> : <ChevronRight className="sc-import-info-chevron" />}
            </div>
            {tipExpanded && (
              <div className="sc-import-info-content">
                {language === 'zh' 
                  ? <>
                      <div className="sc-format-item">
                        <span className="sc-format-label">格式一：</span>
                        <code>npx skills add {'<repo-url>'} --skill {'<name>'}</code>
                      </div>
                      <div className="sc-format-item">
                        <span className="sc-format-label">格式二：</span>
                        <code>npx skills add owner/repo@skill-name -g -y</code>
                      </div>
                      {mode === 'managed' && (
                        <div className="sc-format-note">
                          系统会检查命令并暂存 clone 到 <code>~/.skiller/.temp_skills</code>。准备阶段最长约 60 秒。
                        </div>
                      )}
                      <div className="sc-hub-links">
                        <div className="sc-hub-links-title">参考 Skill Hub：</div>
                        <div className="sc-hub-links-list">
                          <a href="https://skills.sh/" target="_blank" rel="noopener noreferrer" className="sc-hub-link">
                            skills.sh
                          </a>
                          <a href="https://clawhub.ai/" target="_blank" rel="noopener noreferrer" className="sc-hub-link">
                            clawhub.ai
                          </a>
                        </div>
                      </div>
                    </>
                  : <>
                      <div className="sc-format-item">
                        <span className="sc-format-label">Format 1:</span>
                        <code>npx skills add {'<repo-url>'} --skill {'<name>'}</code>
                      </div>
                      <div className="sc-format-item">
                        <span className="sc-format-label">Format 2:</span>
                        <code>npx skills add owner/repo@skill-name -g -y</code>
                      </div>
                      {mode === 'managed' && (
                        <div className="sc-format-note">
                          The system will validate and stage the clone to <code>~/.skiller/.temp_skills</code>. Preparation phase up to 60 seconds.
                        </div>
                      )}
                      <div className="sc-hub-links">
                        <div className="sc-hub-links-title">Reference Skill Hubs:</div>
                        <div className="sc-hub-links-list">
                          <a href="https://skills.sh/" target="_blank" rel="noopener noreferrer" className="sc-hub-link">
                            skills.sh
                          </a>
                          <a href="https://clawhub.ai/" target="_blank" rel="noopener noreferrer" className="sc-hub-link">
                            clawhub.ai
                          </a>
                        </div>
                      </div>
                    </>
                }
              </div>
            )}
          </div>

          <div className="sc-field">
            <label className="sc-field-label">{language === 'zh' ? 'npx 安装命令' : 'npx Install Command'}</label>
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder={language === 'zh' ? '例如：npx skills add xixu-me/skills@github-actions-docs -g -y' : 'e.g.: npx skills add xixu-me/skills@github-actions-docs -g -y'}
              className="sc-input"
            />
          </div>

          {error && (
            <div className="sc-error-banner" role="alert">
              <AlertCircle />
              <div>{error}</div>
            </div>
          )}

          {successMessage && (
            <div className="sc-success-banner" role="status">
              <CheckCircle2 />
              <div>{successMessage}</div>
            </div>
          )}

          {mode === 'managed' && prepared?.summary && (
            <div className={`sc-prepared-panel ${prepared.summary.exists_in_skiller ? 'warning' : ''}`}>
              <div className="sc-prepared-header">
                {prepared.summary.exists_in_skiller ? <AlertTriangle /> : <Info />}
                {language === 'zh' ? '待确认导入信息' : 'Pending Import Info'}
              </div>
              <div className="sc-prepared-grid">
                <div className="sc-prepared-row">
                  <span className="sc-prepared-label">{language === 'zh' ? '技能名' : 'Skill Name'}</span>
                  <code className="sc-prepared-value">{prepared.summary.display_name}</code>
                </div>
                <div className="sc-prepared-row">
                  <span className="sc-prepared-label">{language === 'zh' ? '仓库' : 'Repository'}</span>
                  <code className="sc-prepared-value">{prepared.summary.repo_url}</code>
                </div>
                <div className="sc-prepared-row">
                  <span className="sc-prepared-label">{language === 'zh' ? '技能路径' : 'Skill Path'}</span>
                  <code className="sc-prepared-value">{prepared.summary.skill_path}</code>
                </div>
                <div className="sc-prepared-row">
                  <span className="sc-prepared-label">{language === 'zh' ? '暂存目录' : 'Staged Directory'}</span>
                  <code className="sc-prepared-value sc-prepared-value-long">{prepared.summary.staged_path}</code>
                </div>
                <div className="sc-prepared-row">
                  <span className="sc-prepared-label">{language === 'zh' ? '工具提示' : 'Tool Hint'}</span>
                  <span className="sc-prepared-value">{prepared.summary.required_tools.join(' / ')}</span>
                </div>
                {prepared.summary.branch && (
                  <div className="sc-prepared-row">
                    <span className="sc-prepared-label">{language === 'zh' ? '分支' : 'Branch'}</span>
                    <code className="sc-prepared-value">{prepared.summary.branch}</code>
                  </div>
                )}
                {prepared.summary.exists_in_skiller && (
                  <div className="sc-prepared-row">
                    <span className="sc-prepared-label">{language === 'zh' ? '提示' : 'Notice'}</span>
                    <span className="sc-prepared-value" style={{ color: '#b45309' }}>
                      {language === 'zh' ? '该技能已存在，确认后将覆盖原有技能' : 'This skill already exists. Confirm to overwrite the existing skill.'}
                    </span>
                  </div>
                )}
                {toolHint && (
                  <div className="sc-prepared-row">
                    <span className="sc-prepared-label">{language === 'zh' ? '本地工具检查' : 'Local Tool Check'}</span>
                    <span className="sc-prepared-value">
                      git {toolHint.git ? (language === 'zh' ? '✓ 可用' : '✓ available') : (language === 'zh' ? '✗ 不可用' : '✗ unavailable')}，npx {toolHint.npx ? (language === 'zh' ? '✓ 可用' : '✓ available') : (language === 'zh' ? '✗ 不可用' : '✗ unavailable')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === 'native' && showNativeConfirm && nativeResult && (
            <div className={`sc-prepared-panel ${nativeResult.exists_in_skiller ? 'warning' : ''}`}>
              <div className="sc-prepared-header">
                {nativeResult.exists_in_skiller ? <AlertTriangle /> : <Info />}
                {language === 'zh' ? '待确认导入信息' : 'Pending Import Info'}
              </div>
              <div className="sc-prepared-grid">
                <div className="sc-prepared-row">
                  <span className="sc-prepared-label">{language === 'zh' ? '技能名' : 'Skill Name'}</span>
                  <code className="sc-prepared-value">{nativeResult.skill_name}</code>
                </div>
                <div className="sc-prepared-row">
                  <span className="sc-prepared-label">{language === 'zh' ? '安装状态' : 'Install Status'}</span>
                  <span className="sc-prepared-value">{language === 'zh' ? '✓ npx skills 安装成功' : '✓ npx skills installed'}</span>
                </div>
                {nativeResult.exists_in_skiller && (
                  <div className="sc-prepared-row">
                    <span className="sc-prepared-label">{language === 'zh' ? '提示' : 'Notice'}</span>
                    <span className="sc-prepared-value" style={{ color: '#b45309' }}>
                      {language === 'zh' ? '该技能已存在，确认后将覆盖原有技能' : 'This skill already exists. Confirm to overwrite the existing skill.'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={logsFieldRef} className="sc-field">
            <label className="sc-field-label">{language === 'zh' ? '处理进度' : 'Processing Progress'}</label>
            <div className="sc-terminal">
              <div className="sc-terminal-header">
                <span className={`sc-terminal-dot ${preparing ? 'active' : ''}`} />
                <span className="sc-terminal-dot" />
                <span className="sc-terminal-dot" />
              </div>
              <div ref={logsBodyRef} className="sc-terminal-body">
                {output || (language === 'zh' ? '等待执行...' : 'Waiting to execute...')}
              </div>
            </div>
          </div>
        </div>

        <div className="sc-import-footer">
          <button onClick={handleClose} className="sc-btn sc-btn-ghost">
            {language === 'zh' ? '取消' : 'Cancel'}
          </button>
          {mode === 'managed' ? (
            prepared ? (
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className={`sc-btn sc-btn-primary ${prepared.summary.exists_in_skiller ? 'warning' : ''}`}
              >
                {confirming ? (
                  <>
                    <div className="sc-btn-spinner" />
                    {prepared.summary.exists_in_skiller
                      ? (language === 'zh' ? '更新中...' : 'Updating...')
                      : (language === 'zh' ? '导入中...' : 'Importing...')}
                  </>
                ) : (
                  prepared.summary.exists_in_skiller
                    ? (language === 'zh' ? '确认更新' : 'Confirm Update')
                    : (language === 'zh' ? '确认导入' : 'Confirm Import')
                )}
              </button>
            ) : (
              <button
                onClick={handlePrepare}
                disabled={!command.trim() || preparing}
                className="sc-btn sc-btn-primary"
              >
                {preparing ? (
                  <>
                    <div className="sc-btn-spinner" />
                    {language === 'zh' ? '准备中...' : 'Preparing...'}
                  </>
                ) : (
                  language === 'zh' ? '检查并暂存' : 'Check & Stage'
                )}
              </button>
            )
          ) : showNativeConfirm ? (
            <button
              onClick={handleNativeConfirmSync}
              disabled={confirming}
              className={`sc-btn sc-btn-primary ${nativeResult?.exists_in_skiller ? 'warning' : ''}`}
            >
              {confirming ? (
                <>
                  <div className="sc-btn-spinner" />
                  {nativeResult?.exists_in_skiller
                    ? (language === 'zh' ? '更新中...' : 'Updating...')
                    : (language === 'zh' ? '同步中...' : 'Syncing...')}
                </>
              ) : (
                nativeResult?.exists_in_skiller
                  ? (language === 'zh' ? '确认更新' : 'Confirm Update')
                  : (language === 'zh' ? '确认同步到 Skiller' : 'Confirm Sync to Skiller')
              )}
            </button>
          ) : (
            <button
              onClick={handleNativeExecute}
              disabled={!command.trim() || preparing}
              className="sc-btn sc-btn-primary"
            >
              {preparing ? (
                <>
                  <div className="sc-btn-spinner" />
                  {language === 'zh' ? '执行中...' : 'Executing...'}
                </>
              ) : (
                language === 'zh' ? '执行安装' : 'Execute Install'
              )}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
