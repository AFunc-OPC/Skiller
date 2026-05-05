import { useState, useEffect, useRef } from 'react'
import { X, ChevronDown, Check, Loader2 } from 'lucide-react'
import type { OpenSpecBoardSettings } from '../../types'
import { OPENSPEC_SUPPORTED_TOOLS } from '../../constants/openspec'
import './OpenSpec.css'

interface OpenSpecSettingsDialogProps {
  isOpen: boolean
  onClose: () => void
  settings: OpenSpecBoardSettings
  onSave: (settings: OpenSpecBoardSettings) => void
  onInitTools?: (tools: string[]) => Promise<void>
  language: 'zh' | 'en'
}

type SettingsTab = 'auto-refresh' | 'tool-config'

const INTERVAL_OPTIONS = [
  { value: 0, labelZh: '不刷新', labelEn: 'No Refresh' },
  { value: 10, labelZh: '10 秒', labelEn: '10 seconds', recommended: true },
  { value: 15, labelZh: '15 秒', labelEn: '15 seconds' },
  { value: 20, labelZh: '20 秒', labelEn: '20 seconds' },
  { value: 30, labelZh: '30 秒', labelEn: '30 seconds' },
  { value: 45, labelZh: '45 秒', labelEn: '45 seconds' },
  { value: 60, labelZh: '1 分钟', labelEn: '1 minute' },
  { value: 120, labelZh: '2 分钟', labelEn: '2 minutes' },
  { value: 180, labelZh: '3 分钟', labelEn: '3 minutes' },
  { value: 300, labelZh: '5 分钟', labelEn: '5 minutes' },
]

export function OpenSpecSettingsDialog({
  isOpen,
  onClose,
  settings,
  onSave,
  onInitTools,
  language,
}: OpenSpecSettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('auto-refresh')
  const [localSettings, setLocalSettings] = useState<OpenSpecBoardSettings>(settings)
  const [selectOpen, setSelectOpen] = useState(false)
  const [toolSearchQuery, setToolSearchQuery] = useState('')
  const [toolDropdownOpen, setToolDropdownOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const toolDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings)
      setInitError(null)
    }
  }, [isOpen, settings])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolDropdownRef.current && !toolDropdownRef.current.contains(event.target as Node)) {
        setToolDropdownOpen(false)
      }
    }

    if (toolDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [toolDropdownOpen])

  const t = (key: string) => {
    const labels = {
      zh: {
        openspecSettings: '设置',
        openspecAutoRefresh: '定时刷新',
        openspecAutoRefreshDesc: '自动刷新看板数据，保持数据同步',
        openspecRefreshInterval: '刷新间隔',
        openspecNoRefresh: '不刷新',
        openspecRecommended: '推荐',
        openspecSaveAndApply: '保存并生效',
        openspecOnlyWhenBoardOpen: '仅在当前项目看板打开时生效',
        cancel: '取消',
        openspecToolConfig: '工具配置',
        openspecToolConfigDesc: '为当前项目配置 OpenSpec 工具环境',
        openspecSelectTools: '选择工具...',
        openspecSelectAll: '全选',
        openspecClearAll: '清空',
        openspecNoResults: '未找到匹配的工具',
        openspecToolsSelected: '已选择 {count} 个工具',
        openspecToolsHint: '选择此项目需要使用的 OpenSpec 工具环境',
        initializing: '正在初始化工具环境...',
        initSuccess: '工具环境初始化成功',
        initFailed: '工具环境初始化失败',
        noToolsSelected: '请至少选择一个工具',
      },
      en: {
        openspecSettings: 'Settings',
        openspecAutoRefresh: 'Auto Refresh',
        openspecAutoRefreshDesc: 'Automatically refresh board data to keep it in sync',
        openspecRefreshInterval: 'Refresh Interval',
        openspecNoRefresh: 'No Refresh',
        openspecRecommended: 'Recommended',
        openspecSaveAndApply: 'Save & Apply',
        openspecOnlyWhenBoardOpen: "Only active when this project's board is open",
        cancel: 'Cancel',
        openspecToolConfig: 'Tool Config',
        openspecToolConfigDesc: 'Configure OpenSpec tool environment for the current project',
        openspecSelectTools: 'Select tools...',
        openspecSelectAll: 'Select All',
        openspecClearAll: 'Clear',
        openspecNoResults: 'No matching tools found',
        openspecToolsSelected: '{count} tool(s) selected',
        openspecToolsHint: 'Select OpenSpec tool environments for this project',
        initializing: 'Initializing tool environment...',
        initSuccess: 'Tool environment initialized successfully',
        initFailed: 'Failed to initialize tool environment',
        noToolsSelected: 'Please select at least one tool',
      },
    }
    return labels[language][key as keyof typeof labels['zh']] || key
  }

  const handleSave = async () => {
    const oldTools = settings.configuredTools || []
    const newTools = localSettings.configuredTools || []
    
    const toolsChanged = 
      oldTools.length !== newTools.length ||
      oldTools.some((tool, i) => tool !== newTools[i])
    
    setSaving(true)
    setInitError(null)
    
    try {
      if (toolsChanged && onInitTools) {
        if (newTools.length === 0) {
          setInitError(t('noToolsSelected'))
          return
        }
        await onInitTools(newTools)
      }
      onSave(localSettings)
      onClose()
    } catch (error) {
      setInitError(error instanceof Error ? error.message : t('initFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleSelectInterval = (value: number) => {
    setLocalSettings({ ...localSettings, autoRefreshInterval: value })
    setSelectOpen(false)
  }

  const filteredTools = OPENSPEC_SUPPORTED_TOOLS.filter(tool => 
    !toolSearchQuery.trim() || tool.toLowerCase().includes(toolSearchQuery.toLowerCase())
  )

  const toggleTool = (tool: string) => {
    const currentTools = localSettings.configuredTools || []
    const newTools = currentTools.includes(tool)
      ? currentTools.filter(t => t !== tool)
      : [...currentTools, tool]
    setLocalSettings({ ...localSettings, configuredTools: newTools })
  }

  const removeTool = (tool: string) => {
    const currentTools = localSettings.configuredTools || []
    setLocalSettings({ 
      ...localSettings, 
      configuredTools: currentTools.filter(t => t !== tool) 
    })
  }

  const handleSelectAllTools = () => {
    setLocalSettings({ ...localSettings, configuredTools: [...OPENSPEC_SUPPORTED_TOOLS] })
  }

  const handleClearAllTools = () => {
    setLocalSettings({ ...localSettings, configuredTools: [] })
    setToolSearchQuery('')
  }

  const selectedOption = INTERVAL_OPTIONS.find(o => o.value === localSettings.autoRefreshInterval) || INTERVAL_OPTIONS[0]

  if (!isOpen) return null

  return (
    <div className="os-dialog-overlay" onClick={onClose}>
      <div className="os-settings-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="os-settings-header">
          <h3>{t('openspecSettings')}</h3>
          <button className="os-settings-close" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="os-settings-body">
          <nav className="os-settings-nav">
            <button
              className={`os-settings-nav-item ${activeTab === 'auto-refresh' ? 'active' : ''}`}
              onClick={() => setActiveTab('auto-refresh')}
            >
              <span className="os-settings-nav-icon">⏱</span>
              <span>{t('openspecAutoRefresh')}</span>
            </button>
            <button
              className={`os-settings-nav-item ${activeTab === 'tool-config' ? 'active' : ''}`}
              onClick={() => setActiveTab('tool-config')}
            >
              <span className="os-settings-nav-icon">🛠</span>
              <span>{t('openspecToolConfig')}</span>
            </button>
          </nav>
          
          <main className="os-settings-content">
            {activeTab === 'auto-refresh' && (
              <div className="os-settings-section">
                <h4>{t('openspecAutoRefresh')}</h4>
                <p className="os-settings-desc">{t('openspecAutoRefreshDesc')}</p>
                
                <div className="os-settings-field">
                  <label>{t('openspecRefreshInterval')}</label>
                  <div className="os-interval-select">
                    <button 
                      className="os-interval-select-trigger"
                      onClick={() => setSelectOpen(!selectOpen)}
                    >
                      <span className="os-interval-select-value">
                        {language === 'zh' ? selectedOption.labelZh : selectedOption.labelEn}
                        {selectedOption.recommended && (
                          <span className="os-interval-recommended">{t('openspecRecommended')}</span>
                        )}
                      </span>
                      <ChevronDown className={`os-interval-select-chevron ${selectOpen ? 'open' : ''}`} />
                    </button>
                    
                    {selectOpen && (
                      <div className="os-interval-select-panel">
                        {INTERVAL_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            className={`os-interval-select-option ${option.value === localSettings.autoRefreshInterval ? 'selected' : ''}`}
                            onClick={() => handleSelectInterval(option.value)}
                          >
                            <span className="os-interval-option-label">
                              {language === 'zh' ? option.labelZh : option.labelEn}
                              {option.recommended && (
                                <span className="os-interval-recommended-tag">{t('openspecRecommended')}</span>
                              )}
                            </span>
                            {option.value === localSettings.autoRefreshInterval && (
                              <Check className="os-interval-option-check" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {localSettings.autoRefreshInterval > 0 && (
                  <p className="os-settings-hint">{t('openspecOnlyWhenBoardOpen')}</p>
                )}
              </div>
            )}
            
            {activeTab === 'tool-config' && (
              <div className="os-settings-section">
                <h4>{t('openspecToolConfig')}</h4>
                <p className="os-settings-desc">{t('openspecToolConfigDesc')}</p>
                
                <div className="os-settings-field">
                  <label>{t('openspecSelectTools')}</label>
                  <div className="os-init-dialog-multiselect" ref={toolDropdownRef}>
                    <div 
                      className={`os-init-dialog-multiselect-trigger ${toolDropdownOpen ? 'open' : ''}`}
                      onClick={() => !saving && setToolDropdownOpen(!toolDropdownOpen)}
                    >
                      <div className="os-init-dialog-multiselect-tags">
                        {(!localSettings.configuredTools || localSettings.configuredTools.length === 0) ? (
                          <span className="os-init-dialog-multiselect-placeholder">
                            {t('openspecSelectTools')}
                          </span>
                        ) : (
                          localSettings.configuredTools.map(tool => (
                            <span key={tool} className="os-init-dialog-tag">
                              {tool}
                              <button
                                className="os-init-dialog-tag-remove"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeTool(tool)
                                }}
                                disabled={saving}
                                aria-label={`Remove ${tool}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                      <ChevronDown className={`os-init-dialog-multiselect-chevron ${toolDropdownOpen ? 'open' : ''}`} />
                    </div>

                    {toolDropdownOpen && (
                      <div className="os-init-dialog-multiselect-dropdown">
                        <div className="os-init-dialog-multiselect-search">
                          <input
                            type="text"
                            className="os-init-dialog-multiselect-search-input"
                            placeholder={t('openspecSelectTools')}
                            value={toolSearchQuery}
                            onChange={(e) => setToolSearchQuery(e.target.value)}
                            autoFocus
                          />
                        </div>

                        <div className="os-init-dialog-multiselect-actions">
                          <button
                            className="os-init-dialog-multiselect-action-btn"
                            onClick={handleSelectAllTools}
                            disabled={saving}
                          >
                            {t('openspecSelectAll')}
                          </button>
                          <button
                            className="os-init-dialog-multiselect-action-btn"
                            onClick={handleClearAllTools}
                            disabled={saving || !localSettings.configuredTools || localSettings.configuredTools.length === 0}
                          >
                            {t('openspecClearAll')}
                          </button>
                        </div>

                        <div className="os-init-dialog-multiselect-options">
                          {filteredTools.length > 0 ? (
                            filteredTools.map((tool) => (
                              <div
                                key={tool}
                                className={`os-init-dialog-multiselect-option ${localSettings.configuredTools?.includes(tool) ? 'selected' : ''}`}
                                onClick={() => toggleTool(tool)}
                              >
                                <div className="os-init-dialog-multiselect-checkbox">
                                  {localSettings.configuredTools?.includes(tool) && <Check className="w-3 h-3" />}
                                </div>
                                <span className="os-init-dialog-multiselect-option-text">{tool}</span>
                              </div>
                            ))
                          ) : (
                            <div className="os-init-dialog-multiselect-no-results">
                              {t('openspecNoResults')}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {localSettings.configuredTools && localSettings.configuredTools.length > 0 && (
                  <p className="os-settings-hint">
                    {t('openspecToolsSelected').replace('{count}', String(localSettings.configuredTools.length))}
                  </p>
                )}

                {initError && (
                  <div className="os-init-dialog-error">
                    {initError}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
        
        <div className="os-settings-footer">
          <button className="os-settings-btn-cancel" onClick={onClose} disabled={saving}>
            {t('cancel')}
          </button>
          <button className="os-settings-btn-save" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('initializing')}
              </>
            ) : (
              t('openspecSaveAndApply')
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
