import { useState, useEffect } from 'react'
import { X, ChevronDown, Check } from 'lucide-react'
import type { OpenSpecBoardSettings } from '../../types'
import './OpenSpec.css'

interface OpenSpecSettingsDialogProps {
  isOpen: boolean
  onClose: () => void
  settings: OpenSpecBoardSettings
  onSave: (settings: OpenSpecBoardSettings) => void
  language: 'zh' | 'en'
}

type SettingsTab = 'auto-refresh'

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
  language,
}: OpenSpecSettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('auto-refresh')
  const [localSettings, setLocalSettings] = useState<OpenSpecBoardSettings>(settings)
  const [selectOpen, setSelectOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings)
    }
  }, [isOpen, settings])

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
      },
    }
    return labels[language][key as keyof typeof labels['zh']] || key
  }

  const handleSave = () => {
    onSave(localSettings)
    onClose()
  }

  const handleSelectInterval = (value: number) => {
    setLocalSettings({ ...localSettings, autoRefreshInterval: value })
    setSelectOpen(false)
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
          </main>
        </div>
        
        <div className="os-settings-footer">
          <button className="os-settings-btn-cancel" onClick={onClose}>
            {t('cancel')}
          </button>
          <button className="os-settings-btn-save" onClick={handleSave}>
            {t('openspecSaveAndApply')}
          </button>
        </div>
      </div>
    </div>
  )
}
