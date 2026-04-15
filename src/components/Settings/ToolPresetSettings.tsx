import { useState, useEffect, useMemo } from 'react'
import { configApi } from '../../api/config'
import { desktopApi } from '../../api/desktop'
import { isTauriEnvironment } from '../../api/tauri'
import type { ToolPreset, CreateToolPresetRequest, UpdateToolPresetRequest } from '../../types'
import { t } from '../../i18n'

interface ToolPresetSettingsProps {
  language: 'zh' | 'en'
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function HighlightText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <>{text}</>
  
  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  
  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="tp-mark">{part}</mark>
        ) : (
          part
        )
      )}
    </>
  )
}

function DeleteConfirmDialog({
  open,
  presetName,
  loading,
  onClose,
  onConfirm,
  language,
}: {
  open: boolean
  presetName: string
  loading: boolean
  onClose: () => void
  onConfirm: () => void
  language: 'zh' | 'en'
}) {
  if (!open) return null

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="tp-dialog glass-panel" role="dialog" aria-modal="true">
        <div className="tp-dialog-header">
          <svg viewBox="0 0 20 20" className="tp-dialog-icon">
            <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 3a1 1 0 011 1v4a1 1 0 01-2 0V6a1 1 0 011-1zm0 10a1 1 0 100-2 1 1 0 000 2z" fill="currentColor" />
          </svg>
          <h3>{language === 'zh' ? `删除「${presetName}」？` : `Delete "${presetName}"?`}</h3>
        </div>
        <p className="tp-dialog-desc">
          {language === 'zh' ? '此操作无法撤销，确定要删除该预设吗？' : 'This action cannot be undone. Are you sure you want to delete this preset?'}
        </p>
        <div className="tp-dialog-actions">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="tp-dialog-btn tp-dialog-btn--ghost"
          >
            {language === 'zh' ? '取消' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="tp-dialog-btn tp-dialog-btn--danger"
          >
            {loading ? '...' : (language === 'zh' ? '删除' : 'Delete')}
          </button>
        </div>
      </div>
    </>
  )
}

export function ToolPresetSettings({ language }: ToolPresetSettingsProps) {
  const [presets, setPresets] = useState<ToolPreset[]>([])
  const [skillerPath, setSkillerPath] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', skill_path: '', global_path: '' })
  const [isAdding, setIsAdding] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', skill_path: '', global_path: '' })
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ToolPreset | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    if (!isTauriEnvironment()) return
    fetchData()
  }, [])

  const filteredPresets = useMemo(() => {
    if (!searchQuery.trim()) return presets
    const query = searchQuery.toLowerCase()
    return presets.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.skill_path.toLowerCase().includes(query) ||
      p.global_path.toLowerCase().includes(query)
    )
  }, [presets, searchQuery])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [presetsData, storagePath] = await Promise.all([
        configApi.getToolPresets(),
        configApi.getStoragePath(),
      ])
      setPresets(presetsData)
      setSkillerPath(storagePath)
    } catch (error) {
      console.error('Failed to fetch preset data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (preset: ToolPreset) => {
    setEditingId(preset.id)
    setEditForm({ name: preset.name, skill_path: preset.skill_path, global_path: preset.global_path })
  }

  const handleSaveEdit = async () => {
    if (!editingId) return
    try {
      const request: UpdateToolPresetRequest = {
        id: editingId,
        name: editForm.name,
        skill_path: editForm.skill_path,
        global_path: editForm.global_path,
      }
      await configApi.updateToolPreset(request)
      await fetchData()
      setEditingId(null)
      setEditForm({ name: '', skill_path: '', global_path: '' })
    } catch (error) {
      console.error('Failed to update preset:', error)
      alert(error)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm({ name: '', skill_path: '', global_path: '' })
  }

  const handleDeleteClick = (preset: ToolPreset) => {
    setDeleteTarget(preset)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await configApi.deleteToolPreset(deleteTarget.id)
      await fetchData()
      setDeleteTarget(null)
    } catch (error) {
      console.error('Failed to delete preset:', error)
      alert(error)
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleCancelDelete = () => {
    setDeleteTarget(null)
  }

  const handleAdd = () => {
    setIsAdding(true)
    setAddForm({ name: '', skill_path: '', global_path: '' })
  }

  const handleSaveAdd = async () => {
    if (!addForm.name || !addForm.skill_path || !addForm.global_path) {
      alert(t('allFieldsRequired', language))
      return
    }
    try {
      const request: CreateToolPresetRequest = {
        name: addForm.name,
        skill_path: addForm.skill_path,
        global_path: addForm.global_path,
      }
      await configApi.createToolPreset(request)
      await fetchData()
      setIsAdding(false)
      setAddForm({ name: '', skill_path: '', global_path: '' })
    } catch (error) {
      console.error('Failed to create preset:', error)
      alert(error)
    }
  }

  const handleCancelAdd = () => {
    setIsAdding(false)
    setAddForm({ name: '', skill_path: '', global_path: '' })
  }

  const handleOpenPresetFolder = async (path: string) => {
    try {
      await desktopApi.openFolder(path)
    } catch (error) {
      console.error('Failed to open preset folder:', error)
    }
  }

  const handleCopyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (error) {
      console.error('Failed to copy path:', error)
    }
  }

  const handleOpenStorageFolder = async () => {
    try {
      await desktopApi.openFolder(skillerPath)
    } catch (error) {
      console.error('Failed to open storage folder:', error)
    }
  }

  if (loading) {
    return <div className="tp-loading">{language === 'zh' ? '加载中...' : 'Loading...'}</div>
  }

  return (
    <div className="tp-wrap">
      <div className="tp-meta-bar">
        <span className="tp-meta-label">{t('skillerPath', language)}</span>
        <code className="tp-meta-value">{skillerPath}</code>
        <div className="tp-meta-actions">
          <button
            type="button"
            className={`tp-mini-btn ${copied ? 'is-done' : ''}`}
            onClick={() => handleCopyPath(skillerPath)}
            title={language === 'zh' ? '复制' : 'Copy'}
          >
            {copied ? (
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 7l2.5 2.5L11 4" />
              </svg>
            ) : (
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="4" y="4" width="7" height="7" rx="1" />
                <path d="M3 10V4a1 1 0 011-1h6" />
              </svg>
            )}
          </button>
          <button
            type="button"
            className="tp-mini-btn"
            onClick={handleOpenStorageFolder}
            title={language === 'zh' ? '打开' : 'Open'}
          >
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 4h3l1 1h6v6H2z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="tp-toolbar">
        <div className="tp-toolbar-left">
          <h3 className="tp-heading">{t('toolPresets', language)}</h3>
          <span className="tp-badge-count">{presets.length}</span>
        </div>
        <div className="tp-toolbar-right">
          <div className="tp-search-box">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="6" cy="6" r="4.5" />
              <path d="M9.5 9.5l2.5 2.5" />
            </svg>
            <input
              type="text"
              placeholder={t('searchPresets', language)}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="tp-search-clear" onClick={() => setSearchQuery('')} aria-label="Clear">
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3l6 6M9 3l-6 6" />
                </svg>
              </button>
            )}
          </div>
          <button className="tp-create-btn" onClick={handleAdd} disabled={isAdding}>
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 3v8M3 7h8" />
            </svg>
            {t('addPreset', language)}
          </button>
        </div>
      </div>

      <div className="tp-table-wrap">
        <table className="tp-table">
          <thead>
            <tr>
              <th className="tp-th tp-th--name">{t('presetName', language)}</th>
              <th className="tp-th tp-th--path">{t('projectPath', language)}</th>
              <th className="tp-th tp-th--path">{t('globalPath', language)}</th>
              <th className="tp-th tp-th--type">{t('pathMode', language)}</th>
              <th className="tp-th tp-th--time">{t('updatedAt', language)}</th>
              <th className="tp-th tp-th--actions"></th>
            </tr>
          </thead>
          <tbody>
            {isAdding && (
              <tr className="tp-row tp-row--new">
                <td className="tp-td">
                  <input
                    type="text"
                    className="tp-field"
                    placeholder={t('presetName', language)}
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  />
                </td>
                <td className="tp-td">
                  <input
                    type="text"
                    className="tp-field"
                    placeholder={t('projectPath', language)}
                    value={addForm.skill_path}
                    onChange={(e) => setAddForm({ ...addForm, skill_path: e.target.value })}
                  />
                </td>
                <td className="tp-td">
                  <input
                    type="text"
                    className="tp-field"
                    placeholder={t('globalPath', language)}
                    value={addForm.global_path}
                    onChange={(e) => setAddForm({ ...addForm, global_path: e.target.value })}
                  />
                </td>
                <td className="tp-td">
                  <span className="tp-type tp-type--custom">{t('custom', language)}</span>
                </td>
                <td className="tp-td">—</td>
                <td className="tp-td tp-td--actions">
                  <button className="tp-btn tp-btn--primary" onClick={handleSaveAdd}>{t('save', language)}</button>
                  <button className="tp-btn tp-btn--ghost" onClick={handleCancelAdd}>{t('cancel', language)}</button>
                </td>
              </tr>
            )}

            {filteredPresets.length === 0 && !isAdding ? (
              <tr>
                <td colSpan={6} className="tp-empty-cell">
                  {searchQuery 
                    ? (language === 'zh' ? '没有匹配的预设' : 'No matching presets')
                    : t('noPresets', language)
                  }
                </td>
              </tr>
            ) : (
              filteredPresets.map(preset => (
                editingId === preset.id ? (
                  <tr key={preset.id} className="tp-row tp-row--edit">
                    <td className="tp-td">
                      <input
                        type="text"
                        className="tp-field"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    </td>
                    <td className="tp-td">
                      <input
                        type="text"
                        className="tp-field"
                        value={editForm.skill_path}
                        onChange={(e) => setEditForm({ ...editForm, skill_path: e.target.value })}
                      />
                    </td>
                    <td className="tp-td">
                      <input
                        type="text"
                        className="tp-field"
                        value={editForm.global_path}
                        onChange={(e) => setEditForm({ ...editForm, global_path: e.target.value })}
                      />
                    </td>
                    <td className="tp-td">
                      <span className={`tp-type ${preset.is_builtin ? 'tp-type--builtin' : 'tp-type--custom'}`}>
                        {preset.is_builtin ? t('builtIn', language) : t('custom', language)}
                      </span>
                    </td>
                    <td className="tp-td tp-td--time">{formatDate(preset.updated_at)}</td>
                    <td className="tp-td tp-td--actions">
                      <button className="tp-btn tp-btn--primary" onClick={handleSaveEdit}>{t('save', language)}</button>
                      <button className="tp-btn tp-btn--ghost" onClick={handleCancelEdit}>{t('cancel', language)}</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={preset.id} className="tp-row">
                    <td className="tp-td tp-td--name">
                      <HighlightText text={preset.name} highlight={searchQuery} />
                    </td>
                    <td className="tp-td tp-td--path">
                      <code className="tp-code">
                        <HighlightText text={preset.skill_path} highlight={searchQuery} />
                      </code>
                    </td>
                    <td className="tp-td tp-td--path">
                      <code className="tp-code">
                        <HighlightText text={preset.global_path} highlight={searchQuery} />
                      </code>
                      <button
                        className="tp-open-btn"
                        onClick={() => handleOpenPresetFolder(preset.global_path)}
                        title={language === 'zh' ? '打开文件夹' : 'Open folder'}
                      >
                        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M2 3.5h2l.5.5h5v5H2z" />
                        </svg>
                      </button>
                    </td>
                    <td className="tp-td">
                      <span className={`tp-type ${preset.is_builtin ? 'tp-type--builtin' : 'tp-type--custom'}`}>
                        {preset.is_builtin ? t('builtIn', language) : t('custom', language)}
                      </span>
                    </td>
                    <td className="tp-td tp-td--time" title={new Date(preset.created_at).toLocaleString()}>
                      {formatDate(preset.updated_at)}
                    </td>
                    <td className="tp-td tp-td--actions">
                      <button
                        className="tp-icon-action"
                        onClick={() => handleEdit(preset)}
                        title={t('editPreset', language)}
                      >
                        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M9 2l1 1L4 9H3V8l6-6z" />
                        </svg>
                      </button>
                      <button
                        className="tp-icon-action tp-icon-action--danger"
                        onClick={() => handleDeleteClick(preset)}
                        title={t('deletePreset', language)}
                      >
                        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M2 3h8M5 3V2a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v1M4 3v6a.5.5 0 00.5.5h3A.5.5 0 008 9V3" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                )
              ))
            )}
          </tbody>
        </table>
      </div>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        presetName={deleteTarget?.name ?? ''}
        loading={deleteLoading}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        language={language}
      />
    </div>
  )
}
