import { t } from '../../i18n'

interface AboutProps {
  language: 'zh' | 'en'
}

export function About({ language }: AboutProps) {
  const description = language === 'zh'
    ? 'Tauri 应用框架'
    : 'Tauri Application Framework'
  const author = 'Akio'

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
    </div>
  )
}
