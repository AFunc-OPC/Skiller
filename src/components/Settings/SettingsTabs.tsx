import { useState } from 'react'
import { ToolPresetSettings } from './ToolPresetSettings'
import { LogPanel } from './LogPanel'
import { About } from './About'
import { ProxySettings } from './ProxySettings'
import { t } from '../../i18n'

interface SettingsTabsProps {
  language: 'zh' | 'en'
  setLanguage: (lang: 'zh' | 'en') => void
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
}

type TabKey = 'general' | 'presets' | 'proxy' | 'logs' | 'about'

const TAB_ICONS: Record<TabKey, JSX.Element> = {
  general: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 1.5h-1l-.863 2.59a7 7 0 00-1.547.635L4.79 3.283l-.707.707 1.442 2.3a7 7 0 00-.635 1.547L2 8.5v1l2.59.863c.162.544.377 1.064.635 1.547L3.783 14.21l.707.707 2.3-1.442a7 7 0 001.547.635L9.5 17h1l.863-2.59a7 7 0 001.547-.635l2.3 1.442.707-.707-1.442-2.3a7 7 0 00.635-1.547L18 9.5v-1l-2.59-.863a7 7 0 00-.635-1.547l1.442-2.3-.707-.707-2.3 1.442a7 7 0 00-1.547-.635L10.5 1.5z"/>
      <circle cx="10" cy="9" r="2.5"/>
    </svg>
  ),
  presets: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 5.5h13v11a2 2 0 01-2 2h-9a2 2 0 01-2-2v-11z"/>
      <path d="M3.5 5.5l2-3h9l2 3"/>
      <path d="M8 9.5v5M12 9.5v5"/>
    </svg>
  ),
  proxy: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="3"/>
      <path d="M10 2v2M10 16v2M18 10h-2M4 10H2"/>
      <path d="M15.5 4.5l-1.4 1.4M5.9 14.1l-1.4 1.4M15.5 15.5l-1.4-1.4M5.9 5.9L4.5 4.5"/>
    </svg>
  ),
  logs: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 4.5h11v12h-11z"/>
      <path d="M7 8h6M7 11h6M7 14h3"/>
    </svg>
  ),
  about: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7"/>
      <path d="M10 7v1M10 10.5v3"/>
    </svg>
  ),
}

export function SettingsTabs({ language, setLanguage, theme, setTheme }: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('general')
  
  const tabs: Array<{ key: TabKey; label: string; labelEn: string }> = [
    { key: 'general', label: '通用设置', labelEn: 'General' },
    { key: 'presets', label: '路径预设', labelEn: 'Path Presets' },
    { key: 'proxy', label: '代理', labelEn: 'Proxy' },
    { key: 'logs', label: '运行日志', labelEn: 'Logs' },
    { key: 'about', label: '关于', labelEn: 'About' },
  ]
  
  return (
    <div className="settings-layout">
      <nav className="settings-nav">
        <div className="settings-nav-header">
          <span className="settings-nav-title">{language === 'zh' ? '设置' : 'Settings'}</span>
        </div>
        <div className="settings-nav-list">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`settings-nav-item ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="settings-nav-icon">{TAB_ICONS[tab.key]}</span>
              <span className="settings-nav-label">
                {language === 'zh' ? tab.label : tab.labelEn}
              </span>
              {activeTab === tab.key && <span className="settings-nav-indicator" />}
            </button>
          ))}
        </div>
      </nav>
      
      <main className="settings-main">
        <div className="settings-content" key={activeTab}>
          {activeTab === 'general' && (
            <div className="settings-section">
              <div className="settings-section-header">
                <h2 className="settings-section-title">{t('language', language)}</h2>
                <p className="settings-section-desc">
                  {language === 'zh' ? '选择应用显示语言' : 'Choose your preferred language'}
                </p>
              </div>
              <div className="settings-card">
                <div className="settings-option-group">
                  <button 
                    className={`settings-option ${language === 'zh' ? 'selected' : ''}`}
                    onClick={() => setLanguage('zh')}
                  >
                    <span className="settings-option-flag">中</span>
                    <span className="settings-option-text">中文</span>
                    {language === 'zh' && (
                      <span className="settings-option-check">
                        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2.5 6.5l2.5 2.5 4.5-5.5" />
                        </svg>
                      </span>
                    )}
                  </button>
                  <button 
                    className={`settings-option ${language === 'en' ? 'selected' : ''}`}
                    onClick={() => setLanguage('en')}
                  >
                    <span className="settings-option-flag">En</span>
                    <span className="settings-option-text">English</span>
                    {language === 'en' && (
                      <span className="settings-option-check">
                        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2.5 6.5l2.5 2.5 4.5-5.5" />
                        </svg>
                      </span>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="settings-section-header">
                <h2 className="settings-section-title">{t('theme', language)}</h2>
                <p className="settings-section-desc">
                  {language === 'zh' ? '选择应用外观主题' : 'Choose your preferred theme'}
                </p>
              </div>
              <div className="settings-card">
                <div className="settings-option-group">
                  <button 
                    className={`settings-option ${theme === 'light' ? 'selected' : ''}`}
                    onClick={() => setTheme('light')}
                  >
                    <span className="settings-option-icon">
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25">
                        <circle cx="10" cy="10" r="3.5"/>
                        <path d="M10 2.5v1.5M10 16v1.5M17.5 10H16M4 10H2.5M15.5 4.5l-1.06 1.06M5.56 14.44l-1.06 1.06M15.5 15.5l-1.06-1.06M5.56 5.56L4.5 4.5"/>
                      </svg>
                    </span>
                    <span className="settings-option-text">{t('light', language)}</span>
                    {theme === 'light' && (
                      <span className="settings-option-check">
                        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2.5 6.5l2.5 2.5 4.5-5.5" />
                        </svg>
                      </span>
                    )}
                  </button>
                  <button 
                    className={`settings-option ${theme === 'dark' ? 'selected' : ''}`}
                    onClick={() => setTheme('dark')}
                  >
                    <span className="settings-option-icon">
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25">
                        <path d="M14.5 11.5a5.5 5.5 0 11-6-6 4.5 4.5 0 006 6z"/>
                      </svg>
                    </span>
                    <span className="settings-option-text">{t('dark', language)}</span>
                    {theme === 'dark' && (
                      <span className="settings-option-check">
                        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2.5 6.5l2.5 2.5 4.5-5.5" />
                        </svg>
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'presets' && <ToolPresetSettings language={language} />}
          
          {activeTab === 'proxy' && <ProxySettings language={language} />}
          
          {activeTab === 'logs' && <LogPanel language={language} />}
          
          {activeTab === 'about' && <About language={language} />}
        </div>
      </main>
    </div>
  )
}
