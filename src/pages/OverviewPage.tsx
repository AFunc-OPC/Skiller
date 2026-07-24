import { useAppStore } from '../stores/appStore'

interface OverviewPageProps {
  onNavigate: () => void
}

export function OverviewPage({ onNavigate }: OverviewPageProps) {
  const { language } = useAppStore()

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return language === 'zh' ? '早上好' : 'Good Morning'
    if (hour < 18) return language === 'zh' ? '下午好' : 'Good Afternoon'
    return language === 'zh' ? '晚上好' : 'Good Evening'
  }

  const today = new Date()
  const dateStr = today.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="ov-container">
      <section className="ov-hero">
        <div className="ov-hero-bg">
          <div className="ov-hero-gradient" />
          <div className="ov-hero-grid" />
          <div className="ov-hero-glow ov-glow-1" />
          <div className="ov-hero-glow ov-glow-2" />
        </div>
        
        <div className="ov-hero-content">
          <div className="ov-hero-header">
            <div className="ov-greeting-wrap">
              <span className="ov-greeting-eyebrow">{dateStr}</span>
              <h1 className="ov-greeting-title">
                {getGreeting()}
                <span className="ov-greeting-wave">👋</span>
              </h1>
            </div>
          </div>

          <div className="ov-stats-grid">
            <button className="ov-stat-card" onClick={onNavigate}>
              <div className="ov-stat-main">
                <span className="ov-stat-value">{language === 'zh' ? '开始' : 'Get Started'}</span>
                <span className="ov-stat-label">{language === 'zh' ? '前往设置' : 'Go to Settings'}</span>
              </div>
              <span className="ov-stat-detail">
                {language === 'zh' ? '配置语言和主题' : 'Configure language and theme'}
              </span>
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
