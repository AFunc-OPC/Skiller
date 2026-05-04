import { useState, useRef, useEffect } from 'react'
import { Loader2, ChevronDown, X, Check } from 'lucide-react'
import { OPENSPEC_SUPPORTED_TOOLS } from '../../constants/openspec'

interface OpenSpecInitDialogProps {
  isOpen: boolean
  onClose: () => void
  onInit: (tools: string[]) => Promise<void>
  loading: boolean
  error: string | null
  language: 'zh' | 'en'
}

const t = {
  zh: {
    title: '初始化 OpenSpec 环境',
    description: '当前项目尚未初始化 OpenSpec 环境。请选择要配置的工具：',
    selectTools: '选择工具...',
    selectAll: '全选',
    clearAll: '清空',
    initButton: '初始化',
    cancelButton: '取消',
    atLeastOneTool: '请至少选择一个工具',
    initializing: '初始化中...',
    noResults: '未找到匹配的工具',
    toolsSelected: '已选择 {count} 个工具',
  },
  en: {
    title: 'Initialize OpenSpec Environment',
    description: 'This project has not been initialized with OpenSpec. Please select the tools to configure:',
    selectTools: 'Select tools...',
    selectAll: 'Select All',
    clearAll: 'Clear',
    initButton: 'Initialize',
    cancelButton: 'Cancel',
    atLeastOneTool: 'Please select at least one tool',
    initializing: 'Initializing...',
    noResults: 'No matching tools found',
    toolsSelected: '{count} tool(s) selected',
  },
}

export function OpenSpecInitDialog({
  isOpen,
  onClose,
  onInit,
  loading,
  error,
  language,
}: OpenSpecInitDialogProps) {
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const texts = t[language]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  const filteredTools = OPENSPEC_SUPPORTED_TOOLS.filter(tool => 
    !searchQuery.trim() || tool.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!isOpen) return null

  const toggleTool = (tool: string) => {
    const newSelected = new Set(selectedTools)
    if (newSelected.has(tool)) {
      newSelected.delete(tool)
    } else {
      newSelected.add(tool)
    }
    setSelectedTools(newSelected)
  }

  const removeTool = (tool: string) => {
    const newSelected = new Set(selectedTools)
    newSelected.delete(tool)
    setSelectedTools(newSelected)
  }

  const handleSelectAll = () => {
    setSelectedTools(new Set(OPENSPEC_SUPPORTED_TOOLS))
  }

  const handleClearAll = () => {
    setSelectedTools(new Set())
    setSearchQuery('')
  }

  const handleInit = async () => {
    if (selectedTools.size === 0) return
    await onInit(Array.from(selectedTools))
  }

  const canInit = selectedTools.size > 0 && !loading

  return (
    <div className="os-init-dialog-overlay">
      <div className="os-init-dialog">
        <h2 className="os-init-dialog-title">{texts.title}</h2>
        <p className="os-init-dialog-description">{texts.description}</p>

        <div className="os-init-dialog-multiselect" ref={dropdownRef}>
          <div 
            className={`os-init-dialog-multiselect-trigger ${dropdownOpen ? 'open' : ''}`}
            onClick={() => !loading && setDropdownOpen(!dropdownOpen)}
          >
            <div className="os-init-dialog-multiselect-tags">
              {selectedTools.size === 0 ? (
                <span className="os-init-dialog-multiselect-placeholder">
                  {texts.selectTools}
                </span>
              ) : (
                Array.from(selectedTools).map(tool => (
                  <span key={tool} className="os-init-dialog-tag">
                    {tool}
                    <button
                      className="os-init-dialog-tag-remove"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeTool(tool)
                      }}
                      disabled={loading}
                      aria-label={`Remove ${tool}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
            <ChevronDown className={`os-init-dialog-multiselect-chevron ${dropdownOpen ? 'open' : ''}`} />
          </div>

          {dropdownOpen && (
            <div className="os-init-dialog-multiselect-dropdown">
              <div className="os-init-dialog-multiselect-search">
                <input
                  type="text"
                  className="os-init-dialog-multiselect-search-input"
                  placeholder={texts.selectTools}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="os-init-dialog-multiselect-actions">
                <button
                  className="os-init-dialog-multiselect-action-btn"
                  onClick={handleSelectAll}
                  disabled={loading}
                >
                  {texts.selectAll}
                </button>
                <button
                  className="os-init-dialog-multiselect-action-btn"
                  onClick={handleClearAll}
                  disabled={loading || selectedTools.size === 0}
                >
                  {texts.clearAll}
                </button>
              </div>

              <div className="os-init-dialog-multiselect-options">
                {filteredTools.length > 0 ? (
                  filteredTools.map((tool) => (
                    <div
                      key={tool}
                      className={`os-init-dialog-multiselect-option ${selectedTools.has(tool) ? 'selected' : ''}`}
                      onClick={() => toggleTool(tool)}
                    >
                      <div className="os-init-dialog-multiselect-checkbox">
                        {selectedTools.has(tool) && <Check className="w-3 h-3" />}
                      </div>
                      <span className="os-init-dialog-multiselect-option-text">{tool}</span>
                    </div>
                  ))
                ) : (
                  <div className="os-init-dialog-multiselect-no-results">
                    {texts.noResults}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {selectedTools.size > 0 && (
          <div className="os-init-dialog-selected-count">
            {texts.toolsSelected.replace('{count}', String(selectedTools.size))}
          </div>
        )}

        {error && (
          <div className="os-init-dialog-error">
            {error}
          </div>
        )}

        <div className="os-init-dialog-footer">
          <button
            className="os-init-dialog-btn os-init-dialog-btn-cancel"
            onClick={onClose}
            disabled={loading}
          >
            {texts.cancelButton}
          </button>
          <button
            className="os-init-dialog-btn os-init-dialog-btn-init"
            onClick={handleInit}
            disabled={!canInit}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {texts.initializing}
              </>
            ) : (
              texts.initButton
            )}
          </button>
        </div>

        {selectedTools.size === 0 && !loading && (
          <p className="os-init-dialog-hint">{texts.atLeastOneTool}</p>
        )}
      </div>
    </div>
  )
}
