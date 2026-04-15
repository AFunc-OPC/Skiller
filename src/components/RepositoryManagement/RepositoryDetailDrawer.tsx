import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { flushSync } from 'react-dom'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { openUrl } from '@tauri-apps/plugin-opener'
import { useRepositoryStore } from '../../stores/repositoryStore'
import { useAppStore } from '../../stores/appStore'
import { useSkillContext } from '../../contexts/SkillContext'
import { desktopApi } from '../../api/desktop'
import type { Repo, RepoSyncEvent, Skill } from '../../types'
import { SkillMarkdownPreview } from '../SkillCenter/SkillMarkdownPreview'

const REPO_SYNC_PROGRESS_EVENT = 'repo-sync-progress'

interface RepositoryDetailDrawerProps {
  repository: Repo | null
  isOpen: boolean
  onClose: () => void
  onNavigateToSkill?: (skillId: string) => void
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

function highlightText(text: string, keyword: string): React.ReactNode {
  if (!keyword.trim()) return text
  
  const lowerText = text.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()
  const index = lowerText.indexOf(lowerKeyword)
  
  if (index === -1) return text
  
  const before = text.slice(0, index)
  const match = text.slice(index, index + keyword.length)
  const after = text.slice(index + keyword.length)
  
  return (
    <>
      {before}
      <mark className="repo-highlight">{match}</mark>
      {highlightText(after, keyword)}
    </>
  )
}

function gitUrlToHttps(url: string): string {
  if (url.startsWith('git@')) {
    return url.replace(/^git@([^:]+):(.+?)(\.git)?$/, 'https://$1/$2')
  }
  return url
}

export function RepositoryDetailDrawer({ repository, isOpen, onClose, onNavigateToSkill }: RepositoryDetailDrawerProps) {
  const { language } = useAppStore()
  const { deleteRepository, syncRepository, updateRepository, repairRepository, fetchRepositorySkills, repositorySkills, syncingRepositoryIds, markRepositorySyncCompleted, markRepositorySyncFailed } = useRepositoryStore()
  const { importSkillFromRepository } = useSkillContext()
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showAuthToken, setShowAuthToken] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncResultMessage, setSyncResultMessage] = useState<string | null>(null)
  const [syncProgressMessage, setSyncProgressMessage] = useState<string | null>(null)
  const [skillSearchKeyword, setSkillSearchKeyword] = useState('')
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set())
  const [importingSkills, setImportingSkills] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [previewSkill, setPreviewSkill] = useState<Skill | null>(null)
  const [copiedSkillId, setCopiedSkillId] = useState<string | null>(null)
  const drawerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const activeRequestIdRef = useRef<string | null>(null)
  const unlistenRef = useRef<UnlistenFn | null>(null)
  const syncing = repository ? syncingRepositoryIds.includes(repository.id) : false
  
  useEffect(() => {
    if (repository) {
      fetchRepositorySkills(repository.id)
    }
  }, [repository, fetchRepositorySkills])
  
  useEffect(() => {
    if (!isOpen) return
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingField) {
          setEditingField(null)
        } else {
          onClose()
        }
      }
    }
    
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, editingField])

  useEffect(() => {
    return () => {
      if (unlistenRef.current) {
        void unlistenRef.current()
        unlistenRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    setSyncError(null)
    setSyncResultMessage(null)
    setSyncProgressMessage(null)
    setPreviewSkill(null)
  }, [repository?.id, isOpen])

  useEffect(() => {
    if (!syncing) {
      setSyncProgressMessage(null)
      return
    }

    setSyncProgressMessage(language === 'zh' ? '正在拉取仓库并扫描技能，请稍候...' : 'Pulling repository and scanning skills...')

    const longRunningTimer = window.setTimeout(() => {
      setSyncProgressMessage(language === 'zh' ? '仓库较大或网络较慢，仍在处理中...' : 'This is taking longer than usual. The sync is still running...')
    }, 10000)

    return () => window.clearTimeout(longRunningTimer)
  }, [syncing, language])
  
  useEffect(() => {
    if (editingField && (inputRef.current || textareaRef.current)) {
      if (inputRef.current) inputRef.current.focus()
      if (textareaRef.current) textareaRef.current.focus()
    }
  }, [editingField])
  
  const handleDeleteRepository = useCallback(async () => {
    if (!repository) return
    
    try {
      await deleteRepository(repository.id)
      setDeleteConfirmOpen(false)
      onClose()
    } catch (error) {
      console.error('Failed to delete repository:', error)
    }
  }, [repository, deleteRepository, onClose])
  
  const handleSyncRepository = useCallback(async () => {
    if (!repository) return

    const requestId = crypto.randomUUID()
    activeRequestIdRef.current = requestId
    
    flushSync(() => {
      setSyncError(null)
      setSyncResultMessage(null)
      setSyncProgressMessage(language === 'zh' ? '正在拉取仓库并扫描技能，请稍候...' : 'Pulling repository and scanning skills...')
    })

    try {
      if (unlistenRef.current) {
        await unlistenRef.current()
        unlistenRef.current = null
      }

      unlistenRef.current = await listen<RepoSyncEvent>(REPO_SYNC_PROGRESS_EVENT, async (event) => {
        const payload = event.payload
        if (!payload || payload.request_id !== activeRequestIdRef.current || payload.repo_id !== repository.id) {
          return
        }

        if (payload.status === 'success' && payload.repo) {
          markRepositorySyncCompleted(payload.repo)
          await fetchRepositorySkills(repository.id)
          const latestSkills = useRepositoryStore.getState().repositorySkills.filter((skill) => skill.repo_id === repository.id)
          const recoveredByReclone = payload.recovery_action === 'reclone'
          setSyncResultMessage(
            latestSkills.length > 0
              ? (recoveredByReclone
                  ? (language === 'zh'
                      ? `本地仓库已自动重建并同步成功，发现 ${latestSkills.length} 个技能`
                      : `Local repository was rebuilt automatically. Sync complete with ${latestSkills.length} skills found.`)
                  : (language === 'zh'
                      ? `同步成功，发现 ${latestSkills.length} 个技能`
                      : `Sync complete. Found ${latestSkills.length} skills.`))
              : (recoveredByReclone
                  ? (language === 'zh'
                      ? '本地仓库已自动重建并同步成功，但未发现技能'
                      : 'Local repository was rebuilt automatically. Sync complete, but no skills were found.')
                  : (language === 'zh'
                      ? '同步成功，但未发现技能'
                      : 'Sync complete, but no skills were found.')),
          )
        } else {
          markRepositorySyncFailed(repository.id)
          setSyncError(payload.error || (language === 'zh' ? '同步失败' : 'Sync failed'))
        }

        activeRequestIdRef.current = null
      })

      await syncRepository(repository.id, requestId)
    } catch (error) {
      markRepositorySyncFailed(repository.id)
      setSyncError(normalizeErrorMessage(error))
      console.error('Failed to sync repository:', error)
    }
  }, [repository, syncRepository, fetchRepositorySkills, language, markRepositorySyncCompleted, markRepositorySyncFailed])

  const handleRepair = useCallback(async () => {
    if (!repository) return

    const requestId = crypto.randomUUID()
    activeRequestIdRef.current = requestId
    
    flushSync(() => {
      setSyncError(null)
      setSyncResultMessage(null)
      setSyncProgressMessage(language === 'zh' ? '正在重新克隆仓库...' : 'Re-cloning repository...')
    })

    try {
      if (unlistenRef.current) {
        await unlistenRef.current()
        unlistenRef.current = null
      }

      unlistenRef.current = await listen<RepoSyncEvent>(REPO_SYNC_PROGRESS_EVENT, async (event) => {
        const payload = event.payload
        if (!payload || payload.request_id !== activeRequestIdRef.current || payload.repo_id !== repository.id) {
          return
        }

        if (payload.status === 'success' && payload.repo) {
          markRepositorySyncCompleted(payload.repo)
          await fetchRepositorySkills(repository.id)
          const latestSkills = useRepositoryStore.getState().repositorySkills.filter((skill) => skill.repo_id === repository.id)
          setSyncResultMessage(
            latestSkills.length > 0
              ? (language === 'zh' ? `修复成功，发现 ${latestSkills.length} 个技能` : `Repair complete. Found ${latestSkills.length} skills.`)
              : (language === 'zh' ? '修复成功，但未发现技能' : 'Repair complete, but no skills were found.'),
          )
        } else {
          markRepositorySyncFailed(repository.id)
          setSyncError(payload.error || (language === 'zh' ? '修复失败' : 'Repair failed'))
        }

        activeRequestIdRef.current = null
      })

      await repairRepository(repository.id, requestId)
    } catch (error) {
      markRepositorySyncFailed(repository.id)
      setSyncError(normalizeErrorMessage(error))
      console.error('Failed to repair repository:', error)
    }
  }, [repository, repairRepository, fetchRepositorySkills, language, markRepositorySyncCompleted, markRepositorySyncFailed])
  
  const localPath = repository?.local_path || `~/.skiller/repository/${repository?.id || ''}/`
  
  const handleCopyPath = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(localPath)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }, [localPath])
  
  const handleOpenFolder = useCallback(async () => {
    if (!repository?.local_path) return
    
    try {
      await desktopApi.openFolder(repository.local_path)
    } catch (error) {
      console.error('Failed to open folder:', error)
    }
  }, [repository])

  const getSkillFolderPath = useCallback((skill: Skill): string => {
    const filePath = skill.file_path
    const lastSlash = filePath.lastIndexOf('/')
    return lastSlash > 0 ? filePath.substring(0, lastSlash) : filePath
  }, [])
  
  const getSkillRelativePath = useCallback((skill: Skill): string => {
    const folderPath = getSkillFolderPath(skill)
    if (!repository?.local_path) return folderPath
    const prefix = repository.local_path.endsWith('/') ? repository.local_path : repository.local_path + '/'
    if (folderPath.startsWith(prefix)) {
      return folderPath.substring(prefix.length)
    }
    return folderPath
  }, [repository, getSkillFolderPath])
  
  const handleCopySkillPath = useCallback(async (skill: Skill) => {
    const folderPath = getSkillFolderPath(skill)
    try {
      await navigator.clipboard.writeText(folderPath)
      setCopiedSkillId(skill.id)
      setTimeout(() => setCopiedSkillId(null), 1500)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }, [getSkillFolderPath])
  
  const handleOpenSkillFolder = useCallback(async (skill: Skill) => {
    const folderPath = getSkillFolderPath(skill)
    
    try {
      await desktopApi.openFolder(folderPath)
    } catch (error) {
      console.error('Failed to open folder:', error)
    }
  }, [getSkillFolderPath])
  
  const handleEditField = useCallback((field: string, value: string) => {
    setEditingField(field)
    setEditValue(value)
  }, [])
  
  const handleSaveEdit = useCallback(async () => {
    if (!repository || !editingField) return
    
    const trimmedValue = editValue.trim()
    
    if (editingField === 'name' && !trimmedValue) {
      setEditingField(null)
      return
    }
    
    try {
      await updateRepository({
        id: repository.id,
        [editingField]: trimmedValue || null,
      })
    } catch (error) {
      console.error('Failed to update repository:', error)
    }
    
    setEditingField(null)
  }, [repository, editingField, editValue, updateRepository])
  
  const handleCancelEdit = useCallback(() => {
    setEditingField(null)
    setEditValue('')
  }, [])
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && editingField !== 'description') {
      e.preventDefault()
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }, [editingField, handleSaveEdit, handleCancelEdit])
  
  const filteredSkills = useMemo(() => {
    if (!skillSearchKeyword.trim()) return repositorySkills
    const keyword = skillSearchKeyword.toLowerCase()
    return repositorySkills.filter(skill => 
      skill.name.toLowerCase().includes(keyword) ||
      (skill.description && skill.description.toLowerCase().includes(keyword))
    )
  }, [repositorySkills, skillSearchKeyword])
  
  const toggleSkillSelection = useCallback((skillId: string) => {
    setSelectedSkillIds(prev => {
      const next = new Set(prev)
      if (next.has(skillId)) {
        next.delete(skillId)
      } else {
        next.add(skillId)
      }
      return next
    })
  }, [])
  
  const toggleAllSkills = useCallback(() => {
    if (selectedSkillIds.size === filteredSkills.length) {
      setSelectedSkillIds(new Set())
    } else {
      setSelectedSkillIds(new Set(filteredSkills.map(s => s.id)))
    }
  }, [selectedSkillIds.size, filteredSkills])
  
  const handleImportSkills = useCallback(async () => {
    if (!repository || selectedSkillIds.size === 0) return
    
    setImportingSkills(true)
    setImportError(null)
    setImportSuccess(null)
    
    const skillsToImport = repositorySkills.filter(s => selectedSkillIds.has(s.id))
    let successCount = 0
    const failedSkills: { name: string; reason: string }[] = []
    
    for (const skill of skillsToImport) {
      try {
        await importSkillFromRepository(repository.id, skill.file_path)
        successCount++
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        failedSkills.push({ name: skill.name, reason })
        console.error(`Failed to import skill ${skill.name}:`, error)
      }
    }
    
    setImportingSkills(false)
    
    if (failedSkills.length === 0) {
      setImportSuccess(language === 'zh' 
        ? `成功导入 ${successCount} 个技能` 
        : `Successfully imported ${successCount} skill${successCount > 1 ? 's' : ''}`)
      setSelectedSkillIds(new Set())
    } else {
      const failedNames = failedSkills.map(f => `${f.name}: ${f.reason}`).join('\n')
      setImportError(language === 'zh'
        ? `成功 ${successCount} 个，失败 ${failedSkills.length} 个\n${failedNames}`
        : `Succeeded ${successCount}, failed ${failedSkills.length}\n${failedNames}`)
    }
    
    setTimeout(() => {
      setImportSuccess(null)
      setImportError(null)
    }, 8000)
  }, [repository, selectedSkillIds, repositorySkills, importSkillFromRepository, language])
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return language === 'zh' ? '未同步' : 'Not synced'
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }
  
  const maskToken = (token: string | null | undefined) => {
    if (!token) return ''
    if (token.length <= 8) return '••••••••'
    return token.slice(0, 4) + '••••••••' + token.slice(-4)
  }
  
  if (!isOpen || !repository) return null
  
  const isHttp = repository.auth_method === 'http'
  
  return (
    <>
      <div className="repo-overlay" onClick={onClose} />
      <aside className="repo-drawer" ref={drawerRef}>
        <div className="repo-drawer-header">
          <span className="repo-drawer-label">{language === 'zh' ? '仓库详情' : 'Repository Details'}</span>
          <div className="repo-drawer-header-actions">
            <button
              className="repo-btn-delete"
              onClick={() => setDeleteConfirmOpen(true)}
              title={language === 'zh' ? '删除仓库' : 'Delete repository'}
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            <button className="repo-drawer-close" onClick={onClose}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="repo-drawer-body">
          <div className="repo-drawer-info">
            <div className="repo-drawer-section">
              {editingField === 'name' ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyDown={handleKeyDown}
                  className="repo-drawer-input repo-drawer-input-name"
                  autoFocus
                />
              ) : (
                <h3 
                  className="repo-drawer-name" 
                  onClick={() => handleEditField('name', repository.name)}
                >
                  {repository.name}
                </h3>
              )}
              
              {editingField === 'description' ? (
                <textarea
                  ref={textareaRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyDown={handleKeyDown}
                  className="repo-drawer-textarea"
                  placeholder={language === 'zh' ? '添加仓库简介...' : 'Add repository description...'}
                  autoFocus
                  rows={3}
                />
              ) : (
                <p 
                  className="repo-drawer-desc" 
                  onClick={() => handleEditField('description', repository.description || '')}
                >
                  {repository.description || (language === 'zh' ? '点击添加仓库简介' : 'Click to add description')}
                </p>
              )}
            </div>
            
            <div className="repo-drawer-meta-grid">
              <div className="repo-drawer-meta-item repo-drawer-meta-item-full">
                <label>{language === 'zh' ? '仓库地址' : 'Repository URL'}</label>
                <button
                  onClick={() => openUrl(gitUrlToHttps(repository.url))}
                  className="repo-drawer-link"
                  title={repository.url}
                >
                  {repository.url}
                  <svg viewBox="0 0 20 20" fill="currentColor" className="repo-link-icon">
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                  </svg>
                </button>
              </div>
              
              <div className="repo-drawer-meta-item repo-drawer-meta-item-full">
                <label>{language === 'zh' ? '存储位置' : 'Storage Location'}</label>
                <div className="repo-drawer-path-row">
                  <code className="repo-drawer-path">{localPath}</code>
                  <div className="repo-drawer-path-actions">
                    <button 
                      onClick={handleCopyPath} 
                      className={copied ? 'repo-action-copied' : ''}
                      title={language === 'zh' ? '复制路径' : 'Copy path'}
                    >
                      {copied ? (
                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M16 6L9 13l-3-3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="7" y="7" width="10" height="10" rx="1" />
                          <path d="M3 13V4a1 1 0 011-1h9" />
                        </svg>
                      )}
                    </button>
                    <button 
                      onClick={handleOpenFolder}
                      title={language === 'zh' ? '打开文件夹' : 'Open folder'}
                      disabled={!repository.local_path}
                    >
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 7h5l2 2h7v7H3z" />
                        <path d="M3 7l2-2h4" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* 原仓库内路径字段，已注释移除 */}
              {/* <div className="repo-drawer-meta-item">
                <label>{language === 'zh' ? '仓库内路径' : 'Repo Path'}</label>
                {editingField === 'skill_relative_path' ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleSaveEdit}
                    onKeyDown={handleKeyDown}
                    className="repo-drawer-input"
                    placeholder="skills"
                    autoFocus
                  />
                ) : (
                  <code 
                    className="repo-drawer-value repo-drawer-value-editable"
                    onClick={() => handleEditField('skill_relative_path', repository.skill_relative_path || '')}
                  >
                    {repository.skill_relative_path || (language === 'zh' ? '优先 skills/，否则仓库根目录' : 'Prefer skills/, otherwise repository root')}
                  </code>
                )}
              </div> */}
              
              <div className="repo-drawer-meta-item">
                <label>{language === 'zh' ? '分支' : 'Branch'}</label>
                {editingField === 'branch' ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleSaveEdit}
                    onKeyDown={handleKeyDown}
                    className="repo-drawer-input"
                    autoFocus
                  />
                ) : (
                  <span 
                    className="repo-drawer-value repo-drawer-value-editable"
                    onClick={() => handleEditField('branch', repository.branch)}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="repo-value-icon">
                      <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H13a3 3 0 013 3v1.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L13 11.586V10a1 1 0 00-1-1H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {repository.branch}
                  </span>
                )}
              </div>
              
              <div className="repo-drawer-meta-item repo-drawer-meta-item-full">
                <label>{language === 'zh' ? '授权方式' : 'Auth Method'}</label>
                <div className="repo-auth-section">
                  {editingField === 'auth_method' ? (
                    <select
                      ref={(el) => {
                        if (el) el.focus()
                      }}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleSaveEdit}
                      onKeyDown={handleKeyDown}
                      className="repo-drawer-select"
                    >
                      <option value="ssh">SSH</option>
                      <option value="http">HTTP/HTTPS</option>
                    </select>
                  ) : (
                    <span 
                      className="repo-drawer-value repo-drawer-value-editable repo-auth-method"
                      onClick={() => handleEditField('auth_method', repository.auth_method || 'ssh')}
                    >
                      {repository.auth_method === 'ssh' ? (
                        <>
                          <svg viewBox="0 0 20 20" fill="currentColor" className="repo-value-icon">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                          SSH
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 20 20" fill="currentColor" className="repo-value-icon">
                            <path fillRule="evenodd" d="M4.083 9a1 1 0 000 1.664l6.5 4.333a1 1 0 001.664-.883V6.886a1 1 0 00-1.664-.883L4.083 9z" clipRule="evenodd" />
                          </svg>
                          HTTP/HTTPS
                        </>
                      )}
                    </span>
                  )}
                  
                  {isHttp ? (
                    <div className="repo-auth-details">
                      {editingField === 'username' ? (
                        <div className="repo-auth-field">
                          <span className="repo-auth-label">{language === 'zh' ? '用户名' : 'Username'}</span>
                          <input
                            ref={inputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleSaveEdit}
                            onKeyDown={handleKeyDown}
                            className="repo-drawer-input repo-auth-input"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className="repo-auth-field" onClick={() => handleEditField('username', repository.username || '')}>
                          <span className="repo-auth-label">{language === 'zh' ? '用户名' : 'Username'}</span>
                          <span className="repo-auth-value">{repository.username || (language === 'zh' ? '未设置' : 'Not set')}</span>
                        </div>
                      )}
                      
                      {editingField === 'token' ? (
                        <div className="repo-auth-field">
                          <span className="repo-auth-label">{language === 'zh' ? 'Token' : 'Token'}</span>
                          <input
                            ref={inputRef}
                            type="password"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleSaveEdit}
                            onKeyDown={handleKeyDown}
                            className="repo-drawer-input repo-auth-input"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className="repo-auth-field" onClick={() => handleEditField('token', repository.token || '')}>
                          <span className="repo-auth-label">{language === 'zh' ? 'Token' : 'Token'}</span>
                          <span className="repo-auth-value repo-auth-masked">
                            {showAuthToken && repository.token ? repository.token : maskToken(repository.token)}
                            {repository.token && (
                              <button 
                                className="repo-auth-masked-toggle" 
                                onClick={(e) => { e.stopPropagation(); setShowAuthToken(!showAuthToken) }}
                              >
                                <svg viewBox="0 0 20 20" fill="currentColor">
                                  {showAuthToken ? (
                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  ) : (
                                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.97 9.97 0 00-4.744 1.194L3.707 2.293zm7.293 10.207l-3.293-3.293a2 2 0 003.293 3.293zM3 10c0-1.262.35-2.443.954-3.456L6.3 8.893a2 2 0 003.407 3.407l2.688 2.688A7.965 7.965 0 0110 17c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029L3 10z" clipRule="evenodd" />
                                  )}
                                </svg>
                              </button>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="repo-auth-details">
                      {editingField === 'ssh_key' ? (
                        <div className="repo-auth-field">
                          <span className="repo-auth-label">{language === 'zh' ? 'SSH Key' : 'SSH Key'}</span>
                          <input
                            ref={inputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleSaveEdit}
                            onKeyDown={handleKeyDown}
                            className="repo-drawer-input repo-auth-input"
                            placeholder={language === 'zh' ? '~/.ssh/id_rsa' : '~/.ssh/id_rsa'}
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className="repo-auth-field" onClick={() => handleEditField('ssh_key', repository.ssh_key || '')}>
                          <span className="repo-auth-label">{language === 'zh' ? 'SSH Key' : 'SSH Key'}</span>
                          <span className="repo-auth-value">{repository.ssh_key || (language === 'zh' ? '默认 ~/.ssh/id_rsa' : 'Default ~/.ssh/id_rsa')}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="repo-drawer-meta-item">
                <label>{language === 'zh' ? '上次同步' : 'Last Sync'}</label>
                <span className="repo-drawer-value repo-drawer-value-muted">
                  {formatDate(repository.last_sync)}
                </span>
              </div>
            </div>
            
            <div className="repo-sync-block">
              <button
                className="repo-btn-primary repo-sync-btn"
                onClick={handleSyncRepository}
                disabled={syncing}
              >
                {syncing ? (
                  <>
                    <svg className="repo-spinner" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    {language === 'zh' ? '同步中...' : 'Syncing...'}
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    {language === 'zh' ? '立即同步' : 'Sync Now'}
                  </>
                )}
              </button>

              {syncError && (
                <div className="repo-inline-error" role="alert">
                  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-.993.883L9 6v4a1 1 0 001.993.117L11 10V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="repo-inline-error-copy">
                    <strong>{language === 'zh' ? '同步失败' : 'Sync failed'}</strong>
                    <span>{syncError}</span>
                    {(syncError.includes('no local path') || syncError.includes('No such file or directory')) && (
                      <button
                        className="repo-repair-btn"
                        onClick={handleRepair}
                        disabled={syncing}
                      >
                        {syncing 
                          ? (language === 'zh' ? '修复中...' : 'Repairing...') 
                          : (language === 'zh' ? '快速修复' : 'Quick Fix')}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!syncError && syncResultMessage && (
                <div className="repo-inline-success" role="status">
                  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-3-3a1 1 0 011.414-1.414L9 11.586l6.293-6.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div className="repo-inline-success-copy">
                    <strong>{language === 'zh' ? '同步完成' : 'Sync complete'}</strong>
                    <span>{syncResultMessage}</span>
                  </div>
                </div>
              )}

              {syncing && syncProgressMessage && (
                <div className="repo-inline-progress" role="status" aria-live="polite">
                  <svg className="repo-spinner" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  <div className="repo-inline-progress-copy">
                    <strong>{language === 'zh' ? '正在同步' : 'Sync in progress'}</strong>
                    <span>{syncProgressMessage}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="repo-drawer-divider" />
          
          <div className="repo-drawer-skills">
            <div className="repo-skills-section">
              <div className="repo-skills-header">
                <div className="repo-skills-title-row">
                  <h4 className="repo-skills-title">
                    {language === 'zh' ? '仓库技能' : 'Repository Skills'}
                    <span className="repo-skills-count">{repositorySkills.length}</span>
                  </h4>
                  {repositorySkills.length > 0 && (
                    <div className="repo-skills-actions">
                      <label className="repo-select-all">
                        <input
                          type="checkbox"
                          checked={selectedSkillIds.size === filteredSkills.length && filteredSkills.length > 0}
                          onChange={toggleAllSkills}
                        />
                        <span>{language === 'zh' ? '全选' : 'Select All'}</span>
                      </label>
                      <button
                        className="repo-btn-import"
                        onClick={handleImportSkills}
                        disabled={importingSkills || selectedSkillIds.size === 0}
                      >
                        {importingSkills ? (
                          <>
                            <svg className="repo-spinner" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                            </svg>
                            {language === 'zh' ? '导入中...' : 'Importing...'}
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 20 20" fill="currentColor">
                              <path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" />
                            </svg>
                            {language === 'zh' ? '导入到技能中心' : 'Import to Skill Center'}
                            {selectedSkillIds.size > 0 && <span className="repo-import-count">({selectedSkillIds.size})</span>}
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
                {repositorySkills.length > 0 && (
                  <div className="repo-skills-search">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="repo-search-icon">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                    <input
                      type="text"
                      placeholder={language === 'zh' ? '搜索技能...' : 'Search skills...'}
                      value={skillSearchKeyword}
                      onChange={(e) => setSkillSearchKeyword(e.target.value)}
                      className="repo-skills-search-input"
                    />
                    {skillSearchKeyword && (
                      <button 
                        className="repo-search-clear"
                        onClick={() => setSkillSearchKeyword('')}
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {importError && (
                <div className="repo-import-error">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-.993.883L9 6v4a1 1 0 001.993.117L11 10V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{importError}</span>
                </div>
              )}
              
              {importSuccess && (
                <div className="repo-import-success">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-3-3a1 1 0 011.414-1.414L9 11.586l6.293-6.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>{importSuccess}</span>
                </div>
              )}
              
              {repositorySkills.length > 0 ? (
                filteredSkills.length > 0 ? (
                  <div className="repo-skills-list">
                    {filteredSkills.map((skill) => (
                      <div
                        key={skill.id}
                        className={`repo-skill-item ${selectedSkillIds.has(skill.id) ? 'selected' : ''}`}
                      >
                        <label className="repo-skill-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedSkillIds.has(skill.id)}
                            onChange={() => toggleSkillSelection(skill.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </label>
                        <div className="repo-skill-content">
                          <div className="repo-skill-info">
                            <span className="repo-skill-name">
                              {highlightText(skill.name, skillSearchKeyword)}
                            </span>
                            <span className="repo-skill-desc">
                              {skill.description 
                                ? highlightText(skill.description, skillSearchKeyword)
                                : (language === 'zh' ? '无描述' : 'No description')}
                            </span>
                            <div className="repo-skill-path-row">
                              <svg viewBox="0 0 20 20" fill="currentColor" className="repo-skill-path-icon">
                                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                              </svg>
                              <code className="repo-skill-path" title={getSkillFolderPath(skill)}>
                                {getSkillRelativePath(skill)}
                              </code>
                              <div className="repo-skill-path-actions">
                                <button
                                  className={`repo-skill-path-btn ${copiedSkillId === skill.id ? 'copied' : ''}`}
                                  onClick={(e) => { e.stopPropagation(); handleCopySkillPath(skill) }}
                                  title={language === 'zh' ? '复制完整路径' : 'Copy full path'}
                                >
                                  {copiedSkillId === skill.id ? (
                                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M16 6L9 13l-3-3" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  ) : (
                                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                                      <rect x="7" y="7" width="10" height="10" rx="1" />
                                      <path d="M3 13V4a1 1 0 011-1h9" />
                                    </svg>
                                  )}
                                </button>
                                <button
                                  className="repo-skill-path-btn"
                                  onClick={(e) => { e.stopPropagation(); handleOpenSkillFolder(skill) }}
                                  title={language === 'zh' ? '打开所在文件夹' : 'Open containing folder'}
                                >
                                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M3 7h5l2 2h7v7H3z" />
                                    <path d="M3 7l2-2h4" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        <button
                          className="repo-skill-preview-btn"
                          onClick={() => setPreviewSkill(skill)}
                          title={language === 'zh' ? '查看 SKILL.md 文档' : 'View SKILL.md'}
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                          <span>{language === 'zh' ? '查看文档' : 'View Doc'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="repo-skills-no-results">
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                    <p>{language === 'zh' ? '未找到匹配的技能' : 'No matching skills found'}</p>
                  </div>
                )
              ) : (
                <div className="repo-skills-empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 12h6M9 16h6M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>{language === 'zh' ? '该仓库暂无技能' : 'No skills in this repository'}</p>
                  <span>{language === 'zh' ? '同步仓库后将自动扫描技能' : 'Skills will be scanned after sync'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
      
      {deleteConfirmOpen && (
        <>
          <div className="repo-overlay" onClick={() => setDeleteConfirmOpen(false)} />
          <div className="repo-confirm-modal">
            <div className="repo-confirm-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <h3>{language === 'zh' ? '确认删除' : 'Confirm Delete'}</h3>
            <p>
              {language === 'zh' 
                ? `确定要删除仓库 "${repository.name}" 吗？此操作无法撤销。` 
                : `Are you sure you want to delete "${repository.name}"? This action cannot be undone.`}
            </p>
            <div className="repo-confirm-actions">
              <button className="repo-btn-ghost" onClick={() => setDeleteConfirmOpen(false)}>
                {language === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button className="repo-btn-danger" onClick={handleDeleteRepository}>
                {language === 'zh' ? '删除' : 'Delete'}
              </button>
            </div>
          </div>
        </>
      )}

      {previewSkill && (
        <SkillMarkdownPreview
          skillId={previewSkill.id}
          skillName={previewSkill.name}
          skillPath={previewSkill.file_path}
          isOpen={Boolean(previewSkill)}
          onClose={() => setPreviewSkill(null)}
        />
      )}
    </>
  )
}
