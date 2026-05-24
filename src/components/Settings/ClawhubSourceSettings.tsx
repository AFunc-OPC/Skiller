import { useState, useEffect } from 'react'
import { useClawhubStore } from '../../stores/clawhubStore'
import { useAppStore } from '../../stores/appStore'
import { t } from '../../i18n'
import type { ClawhubSource } from '../../types'
import { AlertDialog } from '../AlertDialog'

export function ClawhubSourceSettings({ language }: { language: 'zh' | 'en' }) {
  const {
    sources,
    fetchSources,
    addSource,
    updateSource,
    deleteSource,
    testConnection,
    clearConnectionTestResult,
    error,
    clearError,
    alertDialog,
    clearAlertDialog,
  } = useClawhubStore()

  const { clawhubMenuEnabled, setClawhubMenuEnabled } = useAppStore()

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingSource, setEditingSource] = useState<ClawhubSource | null>(null)
  const [deletingSource, setDeletingSource] = useState<ClawhubSource | null>(null)
  const [testingSourceId, setTestingSourceId] = useState<string | null>(null)

  useEffect(() => {
    fetchSources()
  }, [fetchSources])

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <div>
          <h2 className="settings-section-title">{t('clawhubSourceConfig', language)}</h2>
          <p className="settings-section-desc">
            {language === 'zh' ? '配置 ClawHub 数据源，支持 API 和 CLI 两种连接方式' : 'Configure ClawHub data sources with API or CLI connection modes'}
          </p>
        </div>
        <label className="settings-toggle" title={language === 'zh' ? '显示/隐藏 ClawHub 菜单' : 'Toggle ClawHub menu'}>
          <input
            type="checkbox"
            checked={clawhubMenuEnabled}
            onChange={() => setClawhubMenuEnabled(!clawhubMenuEnabled)}
          />
          <span className="settings-toggle-slider" />
        </label>
      </div>

      <div className="settings-card">
        <div className="settings-card-header">
          <span>{language === 'zh' ? '数据源列表' : 'Source List'}</span>
          <button className="pm-btn-primary" onClick={() => setShowAddDialog(true)}>
            + {t('clawhubAddSource', language)}
          </button>
        </div>

        {sources.length === 0 && (
          <div className="settings-empty-state">
            {language === 'zh' ? '暂无数据源，点击上方按钮添加' : 'No sources yet. Click above to add one.'}
          </div>
        )}

        <div className="settings-source-list">
          {sources.map((source) => (
            <div key={source.id} className="settings-source-item">
              <div className="settings-source-info">
                <div className="settings-source-name">{source.name}</div>
                <div className="settings-source-url">{source.registry_url}</div>
                <div className="settings-source-meta">
                  <span className="settings-source-type">
                    {source.connection_type === 'api' ? t('clawhubConnectionApi', language) : t('clawhubConnectionCli', language)}
                  </span>
                </div>
              </div>
              <div className="settings-source-actions">
                <button
                  className={`pm-btn-ghost ${testingSourceId === source.id ? 'testing' : ''}`}
                  disabled={testingSourceId !== null}
                  onClick={async () => {
                    setTestingSourceId(source.id)
                    clearConnectionTestResult()
                    await testConnection(source.id)
                    setTestingSourceId(null)
                  }}
                >
                  {testingSourceId === source.id
                    ? (language === 'zh' ? '测试中...' : 'Testing...')
                    : t('clawhubTestConnection', language)}
                </button>
                <button className="pm-btn-ghost" onClick={() => setEditingSource(source)}>
                  {language === 'zh' ? '编辑' : 'Edit'}
                </button>
                <button className="pm-btn-ghost settings-btn-danger" onClick={() => setDeletingSource(source)}>
                  {language === 'zh' ? '删除' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAddDialog && (
        <SourceDialog
          language={language}
          onClose={() => setShowAddDialog(false)}
          onSave={async (data) => {
            await addSource(data.name, data.registry_url, data.token, data.connection_type, data.cli_path)
            setShowAddDialog(false)
          }}
        />
      )}

      {editingSource && (
        <SourceDialog
          key={editingSource.id}
          language={language}
          source={editingSource}
          onClose={() => setEditingSource(null)}
          onSave={async (data) => {
            await updateSource(editingSource.id, data)
            setEditingSource(null)
          }}
        />
      )}

      {deletingSource && (
        <div className="pm-overlay" onClick={() => setDeletingSource(null)}>
          <div className="pm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pm-modal-header">
              <h2>{t('clawhubDeleteSource', language)}</h2>
              <button className="pm-modal-close" onClick={() => setDeletingSource(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="pm-modal-body">
              <p>{t('clawhubDeleteConfirm', language)}</p>
              <p className="settings-delete-source-name">{deletingSource.name} ({deletingSource.registry_url})</p>
            </div>
            <div className="pm-modal-footer">
              <button className="pm-btn-ghost" onClick={() => setDeletingSource(null)}>
                {t('clawhubCancel', language)}
              </button>
              <button
                className="pm-btn-primary pm-btn-danger"
                onClick={async () => {
                  await deleteSource(deletingSource.id)
                  setDeletingSource(null)
                }}
              >
                {t('clawhubDeleteSource', language)}
              </button>
            </div>
          </div>
        </div>
      )}

      {alertDialog && (
        <AlertDialog dialog={alertDialog} onClose={clearAlertDialog} confirmLabel={language === 'zh' ? '确定' : 'OK'} />
      )}
    </div>
  )
}

interface SourceDialogProps {
  language: 'zh' | 'en'
  source?: ClawhubSource | null
  onClose: () => void
  onSave: (data: { name: string; registry_url: string; token: string; connection_type: 'api' | 'cli'; cli_path?: string }) => Promise<void>
}

function SourceDialog({ language, source, onClose, onSave }: SourceDialogProps) {
  const isEditing = !!source
  const existingToken = source?.token || ''
  
  const [name, setName] = useState(source?.name || '')
  const [registryUrl, setRegistryUrl] = useState(source?.registry_url || '')
  const [token, setToken] = useState(existingToken)
  const [showToken, setShowToken] = useState(false)
  const [connectionType, setConnectionType] = useState<'api' | 'cli'>(source?.connection_type || 'api')
  const [cliPath, setCliPath] = useState(source?.cli_path || '')
  const [saving, setSaving] = useState(false)

  const canSave = name.trim() && registryUrl.trim()
  const tokenChanged = token !== existingToken

  const handleSubmit = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        registry_url: registryUrl.trim(),
        token: tokenChanged ? token.trim() : '',
        connection_type: connectionType,
        cli_path: connectionType === 'cli' && cliPath.trim() ? cliPath.trim() : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pm-overlay" onClick={onClose}>
      <div className="pm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pm-modal-header">
          <h2>{isEditing ? t('clawhubEditSource', language) : t('clawhubAddSource', language)}</h2>
          <button className="pm-modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="pm-modal-body">
          <div className="pm-field">
            <label htmlFor="source-name">{t('clawhubSourceName', language)} *</label>
            <input
              id="source-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={language === 'zh' ? '例如: ClawHub Official' : 'e.g., ClawHub Official'}
            />
          </div>

          <div className="pm-field">
            <label htmlFor="source-url">{t('clawhubRegistryUrl', language)} *</label>
            <input
              id="source-url"
              type="text"
              value={registryUrl}
              onChange={(e) => setRegistryUrl(e.target.value)}
              placeholder="https://registry.clawhub.io"
            />
          </div>

          <div className="pm-field">
            <label htmlFor="source-token">{t('clawhubToken', language)}</label>
            <div className="settings-token-input-wrapper">
              <input
                id="source-token"
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={language === 'zh' ? '输入 Token' : 'Enter token'}
              />
              <button
                type="button"
                className="settings-token-toggle"
                onClick={() => setShowToken(!showToken)}
                title={showToken ? (language === 'zh' ? '隐藏' : 'Hide') : (language === 'zh' ? '显示' : 'Show')}
              >
                {showToken ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {isEditing && existingToken && !tokenChanged && (
              <p className="settings-field-hint">
                {language === 'zh' ? 'Token 已设置，修改后将更新' : 'Token set, modify to update'}
              </p>
            )}
            {isEditing && !existingToken && (
              <p className="settings-field-hint" style={{ color: '#e74c3c' }}>
                {language === 'zh' ? 'Token 未设置，请输入' : 'Token not set, please enter'}
              </p>
            )}
          </div>

          <div className="pm-field">
            <label>{t('clawhubConnectionType', language)}</label>
            <div className="settings-option-group">
              <button
                className={`settings-option ${connectionType === 'api' ? 'selected' : ''}`}
                onClick={() => setConnectionType('api')}
              >
                <span className="settings-option-text">{t('clawhubConnectionApi', language)}</span>
                {connectionType === 'api' && (
                  <span className="settings-option-check">
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 6.5l2.5 2.5 4.5-5.5" /></svg>
                  </span>
                )}
              </button>
              <button
                className={`settings-option ${connectionType === 'cli' ? 'selected' : ''}`}
                onClick={() => setConnectionType('cli')}
              >
                <span className="settings-option-text">{t('clawhubConnectionCli', language)}</span>
                {connectionType === 'cli' && (
                  <span className="settings-option-check">
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 6.5l2.5 2.5 4.5-5.5" /></svg>
                  </span>
                )}
              </button>
            </div>
          </div>

          {connectionType === 'cli' && (
            <div className="pm-field">
              <label htmlFor="source-cli-path">{t('clawhubCliPath', language)}</label>
              <input
                id="source-cli-path"
                type="text"
                value={cliPath}
                onChange={(e) => setCliPath(e.target.value)}
                placeholder={t('clawhubCliPathPlaceholder', language)}
              />
            </div>
          )}
        </div>
        <div className="pm-modal-footer">
          <button className="pm-btn-ghost" onClick={onClose}>
            {t('clawhubCancel', language)}
          </button>
          <button className="pm-btn-primary" disabled={!canSave || saving} onClick={handleSubmit}>
            {saving ? (language === 'zh' ? '保存中...' : 'Saving...') : (language === 'zh' ? '保存' : 'Save')}
          </button>
        </div>
      </div>
    </div>
  )
}