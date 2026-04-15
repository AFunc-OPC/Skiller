import { Language } from '../../stores/appStore'

interface ImportDropdownProps {
  onSelect: (type: 'file' | 'npxFind' | 'npx' | 'repository') => void
  language: Language
}

export function ImportDropdown({ onSelect, language }: ImportDropdownProps) {
  const options = [
    {
      type: 'file' as const,
      label: language === 'zh' ? '导入 .zip / .skill' : 'Import .zip / .skill',
      description: language === 'zh' ? '本地包导入后自动解压到 ~/.skiller/skills' : 'Local packages are automatically extracted to ~/.skiller/skills',
      icon: (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 4a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
          <path d="M9 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 12v3M8 13h4" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      type: 'npxFind' as const,
      label: language === 'zh' ? 'npx skills find 查找安装' : 'npx skills find & Install',
      description: language === 'zh' ? '搜索关键词匹配的技能，勾选后批量导入' : 'Search skills by keyword, select and batch import',
      icon: (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="9" cy="9" r="5" />
          <path d="M13.5 13.5L17 17" strokeLinecap="round" />
          <path d="M6 9h6M9 6v6" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      type: 'npx' as const,
      label: language === 'zh' ? 'npx skill 命令导入安装' : 'Import via npx skill command',
      description: language === 'zh' ? '粘贴安装命令后由系统校验、暂存 clone，并在确认后正式导入' : 'Paste the install command, the system will validate, stage the clone, and import after confirmation',
      icon: (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="4" width="14" height="12" rx="2" />
          <path d="M6 8l2 2-2 2M10 12h4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      type: 'repository' as const,
      label: language === 'zh' ? '从仓库中选择' : 'Select from repository',
      description: language === 'zh' ? '从已添加仓库中选取 skill 并导入本地目录' : 'Select skills from added repositories and import to local directory',
      icon: (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M5 3v14l5-3 5 3V3a2 2 0 00-2-2H7a2 2 0 00-2 2z" />
          <circle cx="10" cy="8" r="2" />
        </svg>
      ),
    },
  ]

  return (
    <div className="skill-import-dropdown">
      {options.map((option) => (
        <button
          key={option.type}
          type="button"
          onClick={() => onSelect(option.type)}
          className="skill-import-item"
        >
          <span className="skill-import-icon">
            {option.icon}
          </span>
          <span className="skill-import-content">
            <span className="skill-import-label">
              {option.label}
            </span>
            <span className="skill-import-desc">
              {option.description}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}
