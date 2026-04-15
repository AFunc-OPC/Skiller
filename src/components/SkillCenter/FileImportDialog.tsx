import { useEffect, useState } from 'react'
import { FileArchive, FolderOpen, Upload, X, Info, ChevronDown, ChevronRight } from 'lucide-react'
import { open } from '@tauri-apps/plugin-dialog'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { isTauriEnvironment } from '../../api/tauri'
import { useAppStore } from '../../stores/appStore'
import './SkillCenter.css'

interface FileImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onImport: (filePath: string) => Promise<void>
}

export function FileImportDialog({ isOpen, onClose, onImport }: FileImportDialogProps) {
  const [filePath, setFilePath] = useState('')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [tipExpanded, setTipExpanded] = useState(false)
  const [importType, setImportType] = useState<'file' | 'folder'>('file')
  const { language } = useAppStore()

  useEffect(() => {
    if (!isOpen) {
      setFilePath('')
      setError('')
      setDragOver(false)
      setImporting(false)
      setImportType('file')
      return
    }

    if (!isTauriEnvironment()) {
      return
    }

    let disposed = false
    let unlisten: null | (() => void) = null

    const setupListener = async () => {
      try {
        unlisten = await getCurrentWindow().onDragDropEvent((event) => {
          if (disposed) {
            return
          }

          const payload = event.payload

          if (payload.type === 'enter' || payload.type === 'over') {
            setDragOver(true)
            setError('')
            return
          }

          if (payload.type === 'leave') {
            setDragOver(false)
            return
          }

          setDragOver(false)
          const droppedPath = payload.paths?.[0]
          if (!droppedPath) {
            return
          }

          applyDroppedPath(droppedPath)
        })
      } catch (err) {
        console.error('Failed to attach drag-drop listener:', err)
      }
    }

    setupListener()

    return () => {
      disposed = true
      unlisten?.()
    }
  }, [isOpen])

  if (!isOpen) return null

  const getExtension = (path: string) => path.toLowerCase().split('.').pop() || ''

  const isSupportedFile = (path: string) => {
    const extension = getExtension(path)
    return extension === 'zip' || extension === 'skill'
  }

  const isSkillFolder = (path: string) => {
    return path.toLowerCase().includes('skill') || path.endsWith('SKILL.md') || path.includes('/.claude/skills/') || path.includes('/.opencode/skills/')
  }

  const getDisplayName = (path: string) => path.split('/').pop() || path.split('\\').pop() || path

  const applyDroppedPath = (path: string, isFolder: boolean = false) => {
    if (isFolder) {
      setError('')
      setFilePath(path)
      setImportType('folder')
      return
    }

    if (!isSupportedFile(path)) {
      setError(language === 'zh' ? '仅支持导入 .zip、.skill 文件或技能文件夹。' : 'Only .zip, .skill files or skill folders are supported.')
      return
    }

    setError('')
    setFilePath(path)
    setImportType('file')
  }

  const handleSelectFile = async () => {
    setError('')

    if (!isTauriEnvironment()) {
      setError(language === 'zh' ? '文件选择仅在桌面版可用，请使用 `npm run tauri:dev` 启动应用。' : 'File selection is only available in desktop version. Please run with `npm run tauri:dev`.')
      return
    }

    try {
      if (importType === 'folder') {
        const selected = await open({
          multiple: false,
          directory: true,
        })

        if (typeof selected === 'string') {
          applyDroppedPath(selected, true)
        }
      } else {
        const selected = await open({
          multiple: false,
          filters: [
            { name: 'Skill Files', extensions: ['zip', 'skill'] }
          ]
        })

        if (typeof selected === 'string') {
          applyDroppedPath(selected)
        }
      }
    } catch (err) {
      setError(language === 'zh' ? '打开文件选择器失败，请确认当前以桌面版方式启动。' : 'Failed to open file selector. Please confirm the app is running in desktop mode.')
      console.error('Failed to select file:', err)
    }
  }

  const handleImport = async () => {
    if (!filePath) return
    
    setImporting(true)
    setError('')
    
    try {
      await onImport(filePath)
      setFilePath('')
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setImporting(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)

    const droppedFile = e.dataTransfer.files?.[0] as File & { path?: string }
    if (!droppedFile) {
      return
    }

    const path = droppedFile.path || droppedFile.name
    
    if (!droppedFile.type && droppedFile.size === 0 && !droppedFile.name.includes('.')) {
      applyDroppedPath(path, true)
    } else {
      applyDroppedPath(path, false)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  return (
    <>
      <div className="sc-import-overlay" onClick={onClose} />
      <div className="sc-import-dialog" role="dialog" aria-modal="true" aria-labelledby="file-import-title">
        <div className="sc-import-header">
          <div className="sc-import-title">
            <div className="sc-import-title-icon">
              <Upload />
            </div>
            <h3 id="file-import-title">{language === 'zh' ? '从文件导入技能' : 'Import Skill from File'}</h3>
          </div>
          <button onClick={onClose} className="sc-import-close" aria-label={language === 'zh' ? '关闭' : 'Close'}>
            <X />
          </button>
        </div>

        <div className="sc-import-body">
          <div className={`sc-import-info ${tipExpanded ? 'expanded' : ''}`}>
            <div className="sc-import-info-header" onClick={() => setTipExpanded(!tipExpanded)}>
              <Info />
              <span className="sc-import-info-title">
                {language === 'zh' ? '导入说明' : 'Import Guide'}
              </span>
              {tipExpanded ? <ChevronDown className="sc-import-info-chevron" /> : <ChevronRight className="sc-import-info-chevron" />}
            </div>
            {tipExpanded && (
              <div className="sc-import-info-content">
                {language === 'zh' 
                  ? <>支持 <code>.zip</code>、<code>.skill</code> 文件格式或技能文件夹，导入后自动复制到 <code>~/.skiller/skills</code> 目录。</>
                  : <>Supports <code>.zip</code>, <code>.skill</code> files or skill folders. After import, files are automatically copied to <code>~/.skiller/skills</code> directory.</>
                }
              </div>
            )}
          </div>

          <div className="sc-import-type-selector">
            <button
              className={`sc-import-type-btn ${importType === 'file' ? 'active' : ''}`}
              onClick={() => { setImportType('file'); setFilePath(''); setError('') }}
            >
              <FileArchive />
              <span>{language === 'zh' ? '压缩文件' : 'Archive File'}</span>
            </button>
            <button
              className={`sc-import-type-btn ${importType === 'folder' ? 'active' : ''}`}
              onClick={() => { setImportType('folder'); setFilePath(''); setError('') }}
            >
              <FolderOpen />
              <span>{language === 'zh' ? '技能文件夹' : 'Skill Folder'}</span>
            </button>
          </div>

          <div
            className={`sc-dropzone ${dragOver ? 'active' : ''}`}
            onClick={handleSelectFile}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            role="button"
            tabIndex={0}
            aria-label={language === 'zh' ? '选择或拖入文件/文件夹' : 'Select or drop file/folder'}
          >
            <div className="sc-dropzone-icon">
              {importType === 'folder' ? <FolderOpen /> : <FileArchive />}
            </div>
            <div className="sc-dropzone-text">
              <div className="sc-dropzone-title">{language === 'zh' ? '选择或拖入' + (importType === 'folder' ? '文件夹' : '文件') : 'Select or drop ' + (importType === 'folder' ? 'folder' : 'file')}</div>
              <div className="sc-dropzone-desc">{language === 'zh' 
                ? (importType === 'folder' ? '技能文件夹需包含 SKILL.md' : '支持 .zip 和 .skill 文件')
                : (importType === 'folder' ? 'Skill folder must contain SKILL.md' : 'Supports .zip and .skill files')}</div>
            </div>
          </div>

          <div className="sc-field">
            <label className="sc-field-label" htmlFor="file-path-input">{language === 'zh' ? (importType === 'folder' ? '文件夹路径' : '文件路径') : (importType === 'folder' ? 'Folder Path' : 'File Path')}</label>
            <div className="sc-input-row">
              <input
                id="file-path-input"
                type="text"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder={language === 'zh' 
                  ? (importType === 'folder' ? '选择技能文件夹' : '选择 .zip 或 .skill 文件')
                  : (importType === 'folder' ? 'Select skill folder' : 'Select .zip or .skill file')}
                className="sc-input"
              />
              <button
                type="button"
                onClick={handleSelectFile}
                className="sc-browse-btn"
              >
                {language === 'zh' ? '浏览' : 'Browse'}
              </button>
            </div>
          </div>

          {filePath && (
            <div className="sc-file-selection" aria-live="polite">
              <span className="sc-file-selection-label">{language === 'zh' ? '已选择' : 'Selected'}</span>
              <span className="sc-file-selection-name">{getDisplayName(filePath)}</span>
            </div>
          )}

          {error && (
            <div className="sc-error-banner" role="alert">
              <FileArchive />
              <div>{error}</div>
            </div>
          )}
        </div>

        <div className="sc-import-footer">
          <button onClick={onClose} className="sc-btn sc-btn-ghost">
            {language === 'zh' ? '取消' : 'Cancel'}
          </button>
          <button
            onClick={handleImport}
            disabled={!filePath || importing}
            className="sc-btn sc-btn-primary"
          >
            {importing ? (
              <>
                <div className="sc-btn-spinner" />
                {language === 'zh' ? '导入中...' : 'Importing...'}
              </>
            ) : (
              <>
                <Upload />
                {language === 'zh' ? '导入' : 'Import'}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
