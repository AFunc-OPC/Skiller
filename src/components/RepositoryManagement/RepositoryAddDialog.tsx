import { useState, useCallback } from 'react'
import { useRepositoryStore } from '../../stores/repositoryStore'
import { useAppStore } from '../../stores/appStore'
import type { CreateRepoRequest } from '../../types'

interface RepositoryAddDialogProps {
  isOpen: boolean
  onClose: () => void
}

type AuthMethod = 'http' | 'ssh'

function isValidCron(expression: string): boolean {
  const parts = expression.trim().split(/\s+/)
  return parts.length >= 5 && parts.length <= 6
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

export function RepositoryAddDialog({ isOpen, onClose }: RepositoryAddDialogProps) {
  const { language } = useAppStore()
  const { addRepository, cloningRepository } = useRepositoryStore()
  
  const [repoUrl, setRepoUrl] = useState('')
  const [repoName, setRepoName] = useState('')
  const [branch, setBranch] = useState('main')
  const [description, setDescription] = useState('')
  // const [skillRelativePath, setSkillRelativePath] = useState('')
  const [authMethod, setAuthMethod] = useState<AuthMethod>('ssh')
  const [username, setUsername] = useState('')
  const [token, setToken] = useState('')
  const [sshKey, setSshKey] = useState('')
  const [syncSchedule, setSyncSchedule] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  const validateForm = useCallback((): boolean => {
    if (!repoUrl.trim()) {
      setValidationError(language === 'zh' ? '请输入仓库地址' : 'Please enter repository URL')
      return false
    }
    
    if (!repoName.trim()) {
      setValidationError(language === 'zh' ? '请输入仓库名称' : 'Please enter repository name')
      return false
    }
    
    if (authMethod === 'http') {
      if (!token.trim()) {
        setValidationError(language === 'zh' ? '请填写 Token' : 'Please provide a token')
        return false
      }
    }
    
    if (syncSchedule && !isValidCron(syncSchedule)) {
      setValidationError(language === 'zh' ? 'Cron表达式格式错误' : 'Invalid cron expression')
      return false
    }
    
    if (authMethod === 'ssh' && sshKey.trim() && !sshKey.includes('BEGIN') && !sshKey.includes('/') && !sshKey.startsWith('~')) {
      setValidationError(language === 'zh' ? 'SSH Key 请填写私钥内容或本机私钥文件路径' : 'SSH key must be a private key value or a local key file path')
      return false
    }

    setValidationError(null)
    return true
  }, [repoUrl, repoName, authMethod, token, sshKey, syncSchedule, language])
  
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return
    
    try {
      const request: CreateRepoRequest = {
        name: repoName.trim(),
        url: repoUrl.trim(),
        branch: branch.trim() || 'main',
        description: description.trim() || undefined,
        // skill_relative_path: skillRelativePath.trim() || undefined,
        auth_method: authMethod,
        username: authMethod === 'http' && username.trim() ? username.trim() : undefined,
        token: authMethod === 'http' ? token.trim() : undefined,
        ssh_key: authMethod === 'ssh' && sshKey.trim() ? sshKey.trim() : undefined,
        sync_schedule: syncSchedule.trim() || undefined
      }
      
      const createdRepository = await addRepository(request)
      // const savedPath = createdRepository.skill_relative_path?.trim() || '/'
      setSuccessMessage(
        language === 'zh'
          ? `仓库添加成功`
          : `Repository added successfully`,
      )
      window.setTimeout(() => {
        handleClose()
      }, 1200)
    } catch (error) {
      const errorMessage = normalizeErrorMessage(error)
      
      if (errorMessage.includes('UNIQUE constraint failed: repos.name')) {
        setValidationError(language === 'zh' 
          ? '该仓库名称已存在，请使用不同的名称' 
          : 'This repository name already exists, please use a different name')
      } else if (errorMessage.includes('UNIQUE constraint failed')) {
        setValidationError(language === 'zh' 
          ? '仓库信息已存在，请检查输入' 
          : 'Repository information already exists')
      } else {
        setValidationError(errorMessage)
        console.error('Failed to add repository:', error)
      }
    }
  }, [validateForm, repoName, repoUrl, branch, description, /* skillRelativePath, */ authMethod, username, token, sshKey, syncSchedule, addRepository, language])
  
  const handleClose = useCallback(() => {
    setRepoUrl('')
    setRepoName('')
    setBranch('main')
    setDescription('')
    // setSkillRelativePath('')
    setAuthMethod('ssh')
    setUsername('')
    setToken('')
    setSshKey('')
    setSyncSchedule('')
    setValidationError(null)
    setSuccessMessage(null)
    onClose()
  }, [onClose])
  
  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setRepoUrl(url)
    
    const urlParts = url.split('/')
    const lastPart = urlParts[urlParts.length - 1]
    if (lastPart && lastPart.endsWith('.git')) {
      setRepoName(lastPart.slice(0, -4))
    } else if (lastPart) {
      setRepoName(lastPart)
    }
  }, [])
  
  if (!isOpen) return null
  
  return (
    <>
      <div className="repo-overlay" onClick={handleClose} />
      <div className="repo-modal repo-modal-compact">
        <div className="repo-modal-header">
          <h2>{language === 'zh' ? '添加仓库' : 'Add Repository'}</h2>
          <button className="repo-modal-close" onClick={handleClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="repo-modal-body">
          {validationError && (
            <div className="repo-error-banner">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 8 8 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{validationError}</span>
            </div>
          )}

          {successMessage && (
            <div className="repo-success-banner">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-3-3a1 1 0 011.414-1.414L9 11.586l6.293-6.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}
          
          <div className="repo-form-section">
            {/* 第一行：仓库地址 */}
            <div className="repo-field">
              <label>{language === 'zh' ? '仓库地址' : 'Repository URL'}</label>
              <input
                type="text"
                value={repoUrl}
                onChange={handleUrlChange}
                placeholder="https://github.com/user/repo.git"
                autoFocus
              />
            </div>
            
            {/* 第二行：分支 */}
            <div className="repo-field">
              <label>{language === 'zh' ? '分支' : 'Branch'}</label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
              />
            </div>
            
            {/* 原第二行：分支 + 仓库内skill路径 */}
            {/* <div className="repo-field-row">
              <div className="repo-field repo-field-half">
                <label>{language === 'zh' ? '分支' : 'Branch'}</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                />
              </div>
              <div className="repo-field repo-field-half">
                <label>{language === 'zh' ? '仓库内skills路径' : 'Skills Path in Repo'}</label>
                <input
                  type="text"
                  value={skillRelativePath}
                  onChange={(e) => setSkillRelativePath(e.target.value)}
                  placeholder="example: skills"
                />
              </div>
            </div> */}
            
            {/* 第三行：仓库名称 */}
            <div className="repo-field">
              <label>{language === 'zh' ? '仓库名称' : 'Repository Name'}</label>
              <input
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="my-repo"
              />
            </div>
            
            {/* 第四行：仓库简介（多行文本框） */}
            <div className="repo-field">
              <label>{language === 'zh' ? '仓库简介' : 'Description'}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={language === 'zh' ? '请输入仓库简介（可选）' : 'Enter repository description (optional)'}
                rows={3}
              />
            </div>
          </div>
          
          <div className="repo-form-section">
            <div className="repo-section-header">
              <label>{language === 'zh' ? '认证方式' : 'Authentication'}</label>
            </div>
            <div className="repo-auth-toggle">
              <button
                className={authMethod === 'ssh' ? 'repo-toggle active' : 'repo-toggle'}
                onClick={() => setAuthMethod('ssh')}
              >
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2a4 4 0 100 8 4 4 0 000-8zM4 12a2 2 0 00-2 2v2a2 2 0 002 2h12a2 2 0 002-2v-2a2 2 0 00-2-2H4z" />
                </svg>
                SSH
              </button>
              <button
                className={authMethod === 'http' ? 'repo-toggle active' : 'repo-toggle'}
                onClick={() => setAuthMethod('http')}
              >
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                HTTP
              </button>
            </div>
            
            {authMethod === 'http' && (
              <div className="repo-auth-fields">
                <div className="repo-field-row">
                  <div className="repo-field repo-field-half">
                    <label>{language === 'zh' ? '用户名' : 'Username'}</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="git-user"
                    />
                  </div>
                  <div className="repo-field repo-field-half">
                    <label>{language === 'zh' ? 'Token' : 'Token'}</label>
                    <input
                      type="password"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {authMethod === 'ssh' && (
              <div className="repo-auth-fields">
                <div className="repo-field">
                  <label>
                    {language === 'zh' ? 'SSH Key 文件' : 'SSH Key File'}
                    <span className="repo-hint">{language === 'zh' ? '（默认使用本机SSH Key）' : '(Use local SSH key by default)'}</span>
                  </label>
                  <div className="repo-file-input-wrapper">
                    <input
                      type="text"
                      value={sshKey}
                      onChange={(e) => setSshKey(e.target.value)}
                      placeholder={language === 'zh' ? '~/.ssh/id_rsa' : '~/.ssh/id_rsa'}
                      className="repo-file-path-input"
                    />
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setSshKey(file.name)
                        }
                      }}
                      style={{ display: 'none' }}
                      id="ssh-key-file"
                    />
                    <button
                      className="repo-file-browse-btn"
                      onClick={() => document.getElementById('ssh-key-file')?.click()}
                    >
                      {language === 'zh' ? '选择文件' : 'Browse'}
                    </button>
                  </div>
                  <div className="repo-help-text repo-ssh-hint">
                    {language === 'zh' 
                      ? '常见位置: ~/.ssh/id_rsa (Linux/macOS) 或 C:\\Users\\<用户名>\\.ssh\\id_rsa (Windows)' 
                      : 'Common locations: ~/.ssh/id_rsa (Linux/macOS) or C:\\Users\\<username>\\.ssh\\id_rsa (Windows)'}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <button
            className="repo-advanced-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className={showAdvanced ? 'rotated' : ''}>
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            {language === 'zh' ? '高级选项' : 'Advanced Options'}
          </button>
          
          {showAdvanced && (
            <div className="repo-form-section repo-advanced-section">
              <div className="repo-field">
                <span className="repo-help-text">
                  {language === 'zh' 
                    ? '暂待开发' 
                    : 'Coming soon'}
                </span>
              </div>
            </div>
          )}
        </div>
        
        <div className="repo-modal-footer">
          <button className="repo-btn-ghost" onClick={handleClose}>
            {language === 'zh' ? '取消' : 'Cancel'}
          </button>
          <button
            className="repo-btn-primary"
            onClick={handleSubmit}
            disabled={cloningRepository}
          >
            {cloningRepository 
              ? (language === 'zh' ? '克隆中...' : 'Cloning...') 
              : (language === 'zh' ? '添加' : 'Add')
            }
          </button>
        </div>
      </div>
    </>
  )
}
