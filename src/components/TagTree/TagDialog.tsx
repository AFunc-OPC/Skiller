import { useEffect, useState } from 'react'
import { useAppStore } from '../../stores/appStore'

interface TagDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  title: string
  initialValue?: string
  parentPath?: string | null
  loading?: boolean
  onClose: () => void
  onSubmit: (name: string) => Promise<void> | void
}

export function TagDialog({
  open,
  mode,
  title,
  initialValue = '',
  parentPath,
  loading = false,
  onClose,
  onSubmit,
}: TagDialogProps) {
  const { language } = useAppStore()
  const [name, setName] = useState(initialValue)

  useEffect(() => {
    if (open) {
      setName(initialValue)
    }
  }, [open, initialValue])

  if (!open) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      return
    }
    await onSubmit(trimmed)
  }

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="tag-dialog-compact glass-panel" role="dialog" aria-modal="true">
        <form onSubmit={handleSubmit}>
          <div className="tag-dialog-header">
            <h3>{title}</h3>
            <button className="tag-dialog-close" onClick={onClose} type="button">
              <svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
          
          {parentPath && (
            <div className="tag-dialog-path">
              <svg viewBox="0 0 24 24" className="tag-dialog-path-icon">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span>{parentPath}</span>
            </div>
          )}
          
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={language === 'zh' ? '标签名称' : 'Tag name'}
            className="tag-dialog-input"
          />
          
          <div className="tag-dialog-actions">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="tag-dialog-btn tag-dialog-btn-ghost"
            >
              {language === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="tag-dialog-btn tag-dialog-btn-primary"
            >
              {loading 
                ? '...' 
                : mode === 'create' 
                  ? (language === 'zh' ? '创建' : 'Create') 
                  : (language === 'zh' ? '保存' : 'Save')}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

interface DeleteDialogProps {
  open: boolean
  tagName?: string
  hasChildren: boolean
  skillCount?: number
  loading?: boolean
  onClose: () => void
  onConfirm: (deleteChildren: boolean) => Promise<void> | void
}

export function DeleteTagDialog({
  open,
  tagName,
  hasChildren,
  skillCount = 0,
  loading = false,
  onClose,
  onConfirm,
}: DeleteDialogProps) {
  const { language } = useAppStore()
  
  if (!open) {
    return null
  }

  const getWarningText = () => {
    if (skillCount > 0 && hasChildren) {
      return language === 'zh'
        ? `此标签被 ${skillCount} 个技能使用，且有子标签。确定要删除吗？`
        : `This tag is used by ${skillCount} skills and has children. Delete it?`
    }
    if (skillCount > 0) {
      return language === 'zh'
        ? `此标签被 ${skillCount} 个技能使用。确定要删除吗？`
        : `This tag is used by ${skillCount} skills. Delete it?`
    }
    if (hasChildren) {
      return language === 'zh'
        ? '此标签有子标签。将它们上移还是全部删除？'
        : 'This tag has children. Move them up or delete all?'
    }
    return language === 'zh' ? '此操作无法撤销。' : 'This cannot be undone.'
  }

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="tag-dialog-compact glass-panel" role="dialog" aria-modal="true">
        <div className="tag-dialog-header tag-dialog-header-danger">
          <svg viewBox="0 0 24 24" className="tag-dialog-warning-icon">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <h3>{language === 'zh' ? `删除 ${tagName ?? '标签'}` : `Delete ${tagName ?? 'Tag'}`}</h3>
        </div>
        
        <p className="tag-dialog-desc">
          {getWarningText()}
        </p>
        
        <div className="tag-dialog-actions">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="tag-dialog-btn tag-dialog-btn-ghost"
          >
            {language === 'zh' ? '取消' : 'Cancel'}
          </button>
          {hasChildren && (
            <button
              type="button"
              onClick={() => onConfirm(false)}
              disabled={loading}
              className="tag-dialog-btn tag-dialog-btn-secondary"
            >
              {language === 'zh' ? '上移' : 'Move Up'}
            </button>
          )}
          <button
            type="button"
            onClick={() => onConfirm(hasChildren)}
            disabled={loading}
            className="tag-dialog-btn tag-dialog-btn-danger"
          >
            {loading 
              ? '...' 
              : hasChildren 
                ? (language === 'zh' ? '全部删除' : 'Delete All') 
                : (language === 'zh' ? '删除' : 'Delete')}
          </button>
        </div>
      </div>
    </>
  )
}
