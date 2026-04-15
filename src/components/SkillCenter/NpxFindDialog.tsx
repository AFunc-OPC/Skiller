import { useState, useEffect, useRef, useMemo } from 'react'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { openUrl } from '@tauri-apps/plugin-opener'
import { X, Search, CheckSquare, Square, ArrowRight, AlertCircle, CheckCircle2, Loader2, ExternalLink, Download, Copy } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import type { PrepareNpxSkillImportResponse, ConfirmNpxSkillImportResponse } from '../../types'
import './SkillCenter.css'

export interface FoundSkill {
  name: string
  description: string
  repo: string
  author: string
  install_command: string
  link: string
  installs: number
}

function formatInstalls(n: number): string {
  if (n >= 1000000) {
    return (n / 1000000).toFixed(1) + 'M'
  }
  if (n >= 1000) {
    return (n / 1000).toFixed(1) + 'K'
  }
  return n.toString()
}

export interface NpxFindProgressEvent {
  request_id: string
  line: string
  is_error: boolean
}

export interface NpxFindResponse {
  success: boolean
  skills: FoundSkill[]
  error?: string
}

type SearchMode = 'api' | 'npx'

interface NpxFindDialogProps {
  isOpen: boolean
  onClose: () => void
  onSearchApi: (keyword: string) => Promise<NpxFindResponse>
  onExecuteFind: (keyword: string, requestId: string) => Promise<NpxFindResponse>
  onPrepareImport: (command: string, requestId: string) => Promise<PrepareNpxSkillImportResponse>
  onConfirmImport: (sessionId: string) => Promise<ConfirmNpxSkillImportResponse>
  onCancelImport: (sessionId: string) => Promise<void>
  checkNpx: () => Promise<boolean>
}

const NPX_FIND_PROGRESS_EVENT = 'npx-find-progress'

function HighlightText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) {
    return <>{text}</>
  }

  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)

  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="highlight">{part}</mark>
        ) : (
          part
        )
      )}
    </>
  )
}

export function NpxFindDialog({
  isOpen,
  onClose,
  onSearchApi,
  onExecuteFind,
  onPrepareImport,
  onConfirmImport,
  onCancelImport,
  checkNpx,
}: NpxFindDialogProps) {
  const [mode, setMode] = useState<SearchMode>('api')
  const [keyword, setKeyword] = useState('')
  const [skills, setSkills] = useState<FoundSkill[]>([])
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set())
  const [searching, setSearching] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [npxAvailable, setNpxAvailable] = useState<boolean | null>(null)
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

  const resetState = async (nextMode?: SearchMode) => {
    if (unlistenRef.current) {
      await unlistenRef.current()
      unlistenRef.current = null
    }

    activeRequestIdRef.current = null
    setKeyword('')
    setSkills([])
    setSelectedSkills(new Set())
    setSearching(false)
    setImporting(false)
    setError('')
    setSuccessMessage('')
    setLogs([])

    if (nextMode) {
      setMode(nextMode)
    }
  }

  useEffect(() => {
    if (isOpen) {
      setMode('api')
      setNpxAvailable(null)
      activeRequestIdRef.current = null
      setKeyword('')
      setSkills([])
      setSelectedSkills(new Set())
      setSearching(false)
      setImporting(false)
      setError('')
      setSuccessMessage('')
      setLogs([])
      
      checkNpx().then(setNpxAvailable)
    }
  }, [isOpen, checkNpx])

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
  const modeHint = useMemo(() => {
    if (mode === 'api') {
      return language === 'zh'
        ? '通过 skills.sh 在线目录搜索技能，并继续使用当前多选批量导入流程。'
        : 'Search skills from the skills.sh catalog and keep the current multi-select import flow.'
    }

    return language === 'zh'
      ? '通过本地 npx skills find 命令搜索技能，保留实时日志和批量导入。'
      : 'Search skills via local npx skills find, with live logs and batch import.'
  }, [language, mode])
  const searchDisabled = searching || (mode === 'npx' && npxAvailable === false)

  if (!isOpen) return null

  const handleSearch = async () => {
    if (!keyword.trim()) return

    setSearching(true)
    setError('')
    setSuccessMessage('')
    setSkills([])
    setSelectedSkills(new Set())
    setLogs([language === 'zh' ? '正在搜索技能...' : 'Searching skills...'])
    
    const requestId = crypto.randomUUID()
    activeRequestIdRef.current = requestId

    try {
      if (unlistenRef.current) {
        await unlistenRef.current()
        unlistenRef.current = null
      }

      let result: NpxFindResponse

      if (mode === 'npx') {
        unlistenRef.current = await listen<NpxFindProgressEvent>(NPX_FIND_PROGRESS_EVENT, (event) => {
          const payload = event.payload
          if (!payload || payload.request_id !== activeRequestIdRef.current) {
            return
          }
          const prefix = payload.is_error ? '[error] ' : ''
          setLogs((prev) => [...prev, `${prefix}${payload.line}`])
        })

        result = await onExecuteFind(keyword.trim(), requestId)
      } else {
        setLogs((prev) => [
          ...prev,
          language === 'zh'
            ? `通过 skills.sh API 搜索: ${keyword.trim()}`
            : `Searching via skills.sh API: ${keyword.trim()}`,
        ])
        result = await onSearchApi(keyword.trim())
      }
      
      if (activeRequestIdRef.current !== requestId) {
        return
      }

      if (result.success && result.skills.length > 0) {
        setSkills(result.skills)
        setLogs((prev) => [
          ...prev,
          language === 'zh' 
            ? `找到 ${result.skills.length} 个匹配的技能` 
            : `Found ${result.skills.length} matching skills`,
        ])
      } else if (result.success && result.skills.length === 0) {
        setLogs((prev) => [
          ...prev,
          language === 'zh' 
            ? '未找到匹配的技能，请尝试其他关键词' 
            : 'No matching skills found, try different keywords',
        ])
      } else {
        setError(result.error || (language === 'zh' ? '搜索失败' : 'Search failed'))
      }
    } catch (err) {
      if (activeRequestIdRef.current !== requestId) {
        return
      }

      const errorMsg = err instanceof Error ? err.message : String(err)
      setError(errorMsg)
      setLogs((prev) => [...prev, `${language === 'zh' ? '错误' : 'Error'}: ${errorMsg}`])
    } finally {
      if (unlistenRef.current) {
        await unlistenRef.current()
        unlistenRef.current = null
      }
      if (activeRequestIdRef.current === requestId) {
        activeRequestIdRef.current = null
        setSearching(false)
      }
    }
  }

  const handleModeChange = async (nextMode: SearchMode) => {
    if (nextMode === mode) {
      return
    }

    await resetState(nextMode)
  }

  const handleToggleSkill = (installCommand: string) => {
    const newSelected = new Set(selectedSkills)
    if (newSelected.has(installCommand)) {
      newSelected.delete(installCommand)
    } else {
      newSelected.add(installCommand)
    }
    setSelectedSkills(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedSkills.size === skills.length) {
      setSelectedSkills(new Set())
    } else {
      setSelectedSkills(new Set(skills.map(s => s.install_command)))
    }
  }

  const handleImport = async () => {
    if (selectedSkills.size === 0) return

    setImporting(true)
    setError('')
    setSuccessMessage('')
    setLogs((prev) => [
      ...prev,
      language === 'zh' 
        ? `开始导入 ${selectedSkills.size} 个技能...` 
        : `Starting to import ${selectedSkills.size} skills...`,
    ])

    const commands = Array.from(selectedSkills)
    let successCount = 0
    let failCount = 0
    const sessionsToCancel: string[] = []

    for (const command of commands) {
      const requestId = crypto.randomUUID()
      let sessionId: string | null = null
      
      try {
        setLogs((prev) => [
          ...prev,
          language === 'zh' 
            ? `准备导入: ${command}` 
            : `Preparing: ${command}`,
        ])
        
        const prepared = await onPrepareImport(command, requestId)
        sessionId = prepared.session_id
        sessionsToCancel.push(sessionId)
        
        const skillName = prepared.summary?.skill_name || command
        
        setLogs((prev) => [
          ...prev,
          language === 'zh' 
            ? `确认导入: ${skillName}` 
            : `Confirming: ${skillName}`,
        ])
        
        await onConfirmImport(sessionId)
        
        const idx = sessionsToCancel.indexOf(sessionId)
        if (idx > -1) sessionsToCancel.splice(idx, 1)
        
        successCount++
        setLogs((prev) => [
          ...prev,
          language === 'zh' 
            ? `✓ 导入成功: ${skillName}` 
            : `✓ Imported: ${skillName}`,
        ])
      } catch (err) {
        failCount++
        const errorMsg = err instanceof Error ? err.message : String(err)
        setLogs((prev) => [
          ...prev,
          language === 'zh' 
            ? `✗ 导入失败: ${command} - ${errorMsg}` 
            : `✗ Failed: ${command} - ${errorMsg}`,
        ])
      }
    }

    setLogs((prev) => [
      ...prev,
      language === 'zh' 
        ? `导入完成: 成功 ${successCount} 个，失败 ${failCount} 个` 
        : `Import completed: ${successCount} succeeded, ${failCount} failed`,
    ])

    if (successCount > 0) {
      setSuccessMessage(
        language === 'zh' 
          ? `成功导入 ${successCount} 个技能` 
          : `Successfully imported ${successCount} skill${successCount > 1 ? 's' : ''}`
      )
      setSelectedSkills(new Set())
    }

    setImporting(false)
  }

  const handleClose = () => {
    onClose()
  }

  return (
    <>
      <div className="sc-import-overlay" onClick={handleClose} />
      <div className="sc-import-dialog sc-import-dialog-wide" role="dialog" aria-modal="true" aria-labelledby="npx-find-title">
        <div className="sc-import-header">
          <div className="sc-import-title">
            <div className="sc-import-title-icon">
              <Search />
            </div>
            <h3 id="npx-find-title">
              {language === 'zh' ? 'npx skills find 查找安装' : 'npx skills find & Install'}
            </h3>
          </div>
          <button onClick={handleClose} className="sc-import-close" aria-label={language === 'zh' ? '关闭' : 'Close'}>
            <X />
          </button>
        </div>

        <div ref={bodyRef} className="sc-import-body">
          <div className="sc-mode-switch">
            <label className={`sc-mode-option api ${mode === 'api' ? 'active' : ''}`}>
              <input
                type="radio"
                name="find-mode"
                value="api"
                checked={mode === 'api'}
                onChange={() => void handleModeChange('api')}
              />
              <div className="sc-mode-content">
                <span className="sc-mode-label">{language === 'zh' ? 'skills.sh api搜索' : 'skills.sh API Search'}</span>
                <span className="sc-mode-desc">{language === 'zh' ? '在线目录' : 'Catalog API'}</span>
              </div>
            </label>
            <label className={`sc-mode-option command ${mode === 'npx' ? 'active' : ''}`}>
              <input
                type="radio"
                name="find-mode"
                value="npx"
                checked={mode === 'npx'}
                onChange={() => void handleModeChange('npx')}
              />
              <div className="sc-mode-content">
                <span className="sc-mode-label">{language === 'zh' ? 'npx skills find命令搜索' : 'npx skills find Search'}</span>
                <span className="sc-mode-desc">{language === 'zh' ? '本地命令' : 'Local command'}</span>
              </div>
            </label>
          </div>

          <div className="sc-find-mode-info">
            <Search className="w-4 h-4" />
            <span>{modeHint}</span>
          </div>

          {mode === 'npx' && npxAvailable === false && (
            <div className="sc-error-banner" role="alert">
              <AlertCircle />
              <div>
                {language === 'zh' 
                  ? '未检测到 npx，请先安装 Node.js 后再使用此功能' 
                  : 'npx not detected. Please install Node.js before using this feature.'}
              </div>
            </div>
          )}

          <div className="sc-field">
            <label className="sc-field-label">
              {language === 'zh' ? '搜索关键词' : 'Search Keyword'}
            </label>
            <div className="sc-search-row">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={language === 'zh' ? '输入技能名称或关键词...' : 'Enter skill name or keyword...'}
                className="sc-input"
                disabled={searchDisabled}
              />
              <button
                onClick={handleSearch}
                disabled={!keyword.trim() || searchDisabled}
                className="sc-btn sc-btn-primary"
              >
                {searching ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4" />
                    {language === 'zh' ? '搜索中...' : 'Searching...'}
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    {language === 'zh' ? '搜索' : 'Search'}
                  </>
                )}
              </button>
            </div>
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

          {skills.length > 0 && (
            <div className="sc-find-results">
              <div className="sc-find-results-header">
                <span className="sc-find-results-count">
                  {language === 'zh' 
                    ? `找到 ${skills.length} 个技能` 
                    : `${skills.length} skills found`}
                </span>
                <button
                  onClick={handleSelectAll}
                  className="sc-find-select-all"
                  disabled={importing}
                >
                  {selectedSkills.size === skills.length ? (
                    <>
                      <CheckSquare className="w-4 h-4" />
                      {language === 'zh' ? '取消全选' : 'Deselect All'}
                    </>
                  ) : (
                    <>
                      <Square className="w-4 h-4" />
                      {language === 'zh' ? '全选' : 'Select All'}
                    </>
                  )}
                </button>
              </div>

              <div className="sc-find-skills-list">
                {skills.map((skill, index) => (
                  <button
                    key={`${skill.name}-${index}`}
                    onClick={() => handleToggleSkill(skill.install_command)}
                    className={`sc-find-skill-item ${selectedSkills.has(skill.install_command) ? 'selected' : ''}`}
                    disabled={importing}
                  >
                    <div className="sc-find-skill-checkbox">
                      {selectedSkills.has(skill.install_command) ? (
                        <CheckSquare />
                      ) : (
                        <Square />
                      )}
                    </div>
                    <div className="sc-find-skill-content">
                      <div className="sc-find-skill-name">
                        <HighlightText text={skill.name} highlight={keyword} />
                      </div>
                      {skill.description && (
                        <div className="sc-find-skill-desc">
                          <HighlightText text={skill.description} highlight={keyword} />
                        </div>
                      )}
                      <div className="sc-find-skill-meta">
                        <span className="sc-find-skill-author">{skill.author}</span>
                        <span className="sc-find-skill-separator">/</span>
                        <span className="sc-find-skill-repo">{skill.repo}</span>
                        {skill.installs > 0 && (
                          <>
                            <span className="sc-find-skill-separator">·</span>
                            <span className="sc-find-skill-installs">
                              <Download className="w-3 h-3" />
                              {formatInstalls(skill.installs)}
                            </span>
                          </>
                        )}
                        {skill.link && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openUrl(skill.link)
                            }}
                            className="sc-find-skill-link"
                            title={skill.link}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="sc-find-skill-command">
                        <code>{skill.install_command}</code>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigator.clipboard.writeText(skill.install_command)
                          }}
                          className="sc-find-skill-copy"
                          title={language === 'zh' ? '复制命令' : 'Copy command'}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={logsFieldRef} className="sc-field">
            <label className="sc-field-label">
              {language === 'zh' ? '执行日志' : 'Execution Log'}
            </label>
            <div className="sc-terminal">
              <div className="sc-terminal-header">
                <span className={`sc-terminal-dot ${searching || importing ? 'active' : ''}`} />
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
          <div className="sc-import-footer-info">
            {selectedSkills.size > 0 
              ? (language === 'zh' 
                  ? `已选择 ${selectedSkills.size} 个技能` 
                  : `${selectedSkills.size} skills selected`)
              : (language === 'zh' 
                  ? '请搜索并选择要导入的技能' 
                  : 'Search and select skills to import')}
          </div>
          <div className="sc-import-footer-actions">
            <button onClick={handleClose} className="sc-btn sc-btn-ghost">
              {language === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={handleImport}
              disabled={selectedSkills.size === 0 || importing}
              className="sc-btn sc-btn-primary"
            >
              {importing ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4" />
                  {language === 'zh' ? '导入中...' : 'Importing...'}
                </>
              ) : (
                <>
                  {language === 'zh' ? '导入选中项' : 'Import Selected'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
