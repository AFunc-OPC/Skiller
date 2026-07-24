import { memo, useCallback, useEffect, useState } from 'react'
import { useAppStore } from './stores/appStore'
import { t } from './i18n'
import { OverviewPage } from './pages/OverviewPage'
import { SettingsTabs } from './components/Settings'
import { isTauriEnvironment } from './api/tauri'

type ModuleKey = 'overview' | 'settings'
type IconName = ModuleKey | 'sun' | 'moon' | 'search' | 'grid' | 'list' | 'plus' | 'x' | 'chevron-left' | 'chevron-right'

const modules: Array<{ key: ModuleKey; titleZh: string; titleEn: string; noteZh: string; noteEn: string }> = [
  { key: 'overview', titleZh: '首页', titleEn: 'Home', noteZh: '欢迎使用', noteEn: 'Welcome' },
  { key: 'settings', titleZh: '设置', titleEn: 'Settings', noteZh: '语言、主题', noteEn: 'Locale, theme' },
]

const Icon = memo(function Icon({ name }: { name: IconName }) {
  switch (name) {
    case 'overview':
      return <svg viewBox="0 0 24 24"><path d="M4 18V7l5 3 4-5 7 5v8" /></svg>
    case 'settings':
      return <svg viewBox="0 0 24 24"><path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z" /><path d="M4 13.2v-2.4l2.1-.7.8-1.9-1-2 1.7-1.7 2 1 1.9-.8.7-2.1h2.4l.7 2.1 1.9.8 2-1 1.7 1.7-1 2 .8 1.9 2.1.7v2.4l-2.1.7-.8 1.9 1 2-1.7 1.7-2-1-1.9.8-.7 2.1h-2.4l-.7-2.1-1.9-.8-2 1-1.7-1.7 1-2-.8-1.9z" /></svg>
    case 'sun':
      return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.4M12 19.1v2.4M21.5 12h-2.4M4.9 12H2.5M18.7 5.3l-1.7 1.7M7 17l-1.7 1.7M18.7 18.7 17 17M7 7 5.3 5.3" /></svg>
    case 'moon':
      return <svg viewBox="0 0 24 24"><path d="M16.9 14.7A6.9 6.9 0 0 1 9.3 7.1 8.5 8.5 0 1 0 16.9 14.7Z" /></svg>
    case 'search':
      return <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="5.5" /><path d="m16 16 4 4" /></svg>
    case 'grid':
      return <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
    case 'list':
      return <svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
    case 'plus':
      return <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
    case 'x':
      return <svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
    case 'chevron-left':
      return <svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6" /></svg>
    case 'chevron-right':
      return <svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></svg>
    default:
      return null
  }
})

const APP_LOGO_SVG = (
  <svg viewBox="0 0 140 44" preserveAspectRatio="xMinYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg" className="app-logo-merged">
    <defs>
      <linearGradient id="logo-grad-bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="50%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <linearGradient id="logo-grad-s" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <filter id="logo-glow-merged" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <rect x="0" y="2" width="36" height="36" rx="9" fill="url(#logo-grad-bg)" />
    <path 
      d="M12 18L18 15L24 18V26L18 29L12 26V22L18 25L24 22" 
      stroke="white" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      fill="none"
      opacity="0.95"
    />
    <circle cx="18" cy="22" r="2.25" fill="white" opacity="0.9" />
    <text 
      x="44" 
      y="30" 
      fontFamily="Sora, system-ui, -apple-system, sans-serif" 
      fontSize="26" 
      fontWeight="700"
      letterSpacing="-0.02em"
    >
      <tspan fill="url(#logo-grad-s)">S</tspan><tspan className="logo-text-rest" fill="#374151">killer</tspan>
    </text>
  </svg>
)

interface SidebarProps {
  isCollapsed: boolean
  activeModule: ModuleKey
  onToggleCollapse: () => void
  onModuleChange: (module: ModuleKey) => void
  language: 'zh' | 'en'
}

const Sidebar = memo(function Sidebar({
  isCollapsed,
  activeModule,
  onToggleCollapse,
  onModuleChange,
  language,
}: SidebarProps) {
  const appStamp = t('appStamp', language)
  const [hoveredModule, setHoveredModule] = useState<{ note: string; title: string } | null>(null)

  return (
    <aside className={`sidebar glass-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <button 
        className="sidebar-toggle" 
        onClick={onToggleCollapse}
        title={isCollapsed ? (language === 'zh' ? '展开菜单' : 'Expand') : (language === 'zh' ? '收起菜单' : 'Collapse')}
      >
        <Icon name={isCollapsed ? 'chevron-right' : 'chevron-left'} />
      </button>
      <div className="app-logo">
        <div className="app-logo-mark">
          {APP_LOGO_SVG}
          <div className="app-logo-shine" />
        </div>
        <div className="app-logo-meta" />
      </div>
      
      <nav className="nav-stack">
        {modules.map((item) => {
          const title = language === 'zh' ? item.titleZh : item.titleEn
          const note = language === 'zh' ? item.noteZh : item.noteEn
          return (
            <button
              key={item.key}
              className={activeModule === item.key ? 'nav-item active' : 'nav-item'}
              onClick={() => onModuleChange(item.key)}
              onMouseEnter={() => setHoveredModule({ title, note })}
              onMouseLeave={() => setHoveredModule(null)}
            >
              <span className="nav-icon"><Icon name={item.key} /></span>
              <span className="nav-title">{title}</span>
            </button>
          )
        })}
      </nav>
      
      <div className="nav-footer">
        {!isCollapsed && hoveredModule && (
          <div className="nav-tooltip-bar">
            <div className="nav-tooltip-note">{hoveredModule.note}</div>
          </div>
        )}
      </div>
    </aside>
  )
})

function App() {
  const { language, theme, setLanguage, setTheme } = useAppStore()
  
  const [activeModule, setActiveModule] = useState<ModuleKey>('overview')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [pendingSettingsTab, setPendingSettingsTab] = useState<string | null>(null)
  
  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  }, [language, theme])

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev)
  }, [])

  const handleModuleChange = useCallback((module: ModuleKey) => {
    setActiveModule(module)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.tab) {
        setActiveModule('settings')
        setPendingSettingsTab(detail.tab)
      }
    }
    window.addEventListener('navigate-to-settings', handler)
    return () => window.removeEventListener('navigate-to-settings', handler)
  }, [])

  const renderContent = () => {
    switch (activeModule) {
      case 'settings':
        return (
          <div className="content-grid single-grid">
            <section className="panel settings-panel">
              <SettingsTabs language={language} setLanguage={setLanguage} theme={theme} setTheme={setTheme} defaultTab={pendingSettingsTab || undefined} />
            </section>
          </div>
        )
      
      default:
        return (
          <OverviewPage
            onNavigate={() => setActiveModule('settings')}
          />
        )
    }
  }
  
  return (
    <div className="app-shell">
      <div className="desktop-frame">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          activeModule={activeModule}
          onToggleCollapse={handleToggleSidebar}
          onModuleChange={handleModuleChange}
          language={language}
        />
        
        <main className="workspace">
          <div className="workspace-grid workspace-full no-rail">
            <section className="stage glass-panel">
              {renderContent()}
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
