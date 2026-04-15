import { t } from '../../i18n'

interface AboutProps {
  language: 'zh' | 'en'
}

export function About({ language }: AboutProps) {
  const description = language === 'zh' 
    ? '跨平台 Skill 管理工具' 
    : 'Cross-platform Skill Manager'
  const author = 'Akio'
  const githubUrl = 'https://github.com/anomalyco/skiller'

  const techStack = [
    { name: 'Tauri', version: '2.x', desc: language === 'zh' ? '跨平台桌面应用框架' : 'Cross-platform desktop framework' },
    { name: 'React', version: '18.x', desc: language === 'zh' ? '前端UI框架' : 'Frontend UI framework' },
    { name: 'TypeScript', version: '5.x', desc: language === 'zh' ? '类型安全的JavaScript' : 'Type-safe JavaScript' },
    { name: 'Tailwind CSS', version: '3.x', desc: language === 'zh' ? '实用优先的CSS框架' : 'Utility-first CSS framework' },
    { name: 'Zustand', version: '4.x', desc: language === 'zh' ? '轻量级状态管理' : 'Lightweight state management' },
    { name: 'Vite', version: '5.x', desc: language === 'zh' ? '下一代前端构建工具' : 'Next-gen frontend build tool' },
  ]

  const acknowledgements = language === 'zh' 
    ? [
        '感谢 Tauri 团队提供优秀的跨平台解决方案',
        '感谢 React 社区的持续贡献',
        '感谢所有开源项目维护者',
      ]
    : [
        'Thanks to the Tauri team for the excellent cross-platform solution',
        'Thanks to the React community for continued contributions',
        'Thanks to all open source project maintainers',
      ]

  const handleOpenGithub = () => {
    window.open(githubUrl, '_blank')
  }

  return (
    <div className="about-container">
      <div className="about-header">
        <div className="about-logo-wrapper">
          <svg viewBox="0 0 150 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="about-logo">
            <defs>
              <linearGradient id="about-logo-grad-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="50%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="about-logo-grad-s" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <filter id="about-logo-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <rect x="0" y="4" width="40" height="40" rx="10" fill="url(#about-logo-grad-bg)" />
            <path 
              d="M14 20L20 17L26 20V28L20 31L14 28V24L20 27L26 24" 
              stroke="white" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              fill="none"
              opacity="0.95"
            />
            <circle cx="20" cy="24" r="2.5" fill="white" opacity="0.9" />
            <text 
              x="50" 
              y="34" 
              fontFamily="Sora, system-ui, -apple-system, sans-serif" 
              fontSize="28" 
              fontWeight="700"
              letterSpacing="-0.02em"
            >
              <tspan fill="url(#about-logo-grad-s)">S</tspan><tspan className="about-logo-text-rest" fill="#374151">killer</tspan>
            </text>
          </svg>
        </div>
        <div className="about-version-badge">
          <span className="version-label">{t('aboutVersion', language)}</span>
          <span className="version-number">{t('appStamp', language)}</span>
        </div>
        <p className="about-description">{description}</p>
      </div>

      <div className="about-section">
        <h2 className="about-section-title">{t('aboutAuthor', language)}</h2>
        <p className="about-author">{author}</p>
      </div>

      <div className="about-section">
        <h2 className="about-section-title">{t('aboutTechStack', language)}</h2>
        <div className="tech-stack-grid">
          {techStack.map((tech) => (
            <div key={tech.name} className="tech-item">
              <span className="tech-name">{tech.name}</span>
              <span className="tech-version">{tech.version}</span>
              <span className="tech-desc">{tech.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="about-section">
        <h2 className="about-section-title">{t('aboutAcknowledgements', language)}</h2>
        <ul className="acknowledgements-list">
          {acknowledgements.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="about-section">
        <h2 className="about-section-title">{t('aboutOpenSource', language)}</h2>
        <button className="github-link-btn" onClick={handleOpenGithub}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          <span>GitHub</span>
        </button>
        <p className="github-url">{githubUrl}</p>
      </div>
    </div>
  )
}
