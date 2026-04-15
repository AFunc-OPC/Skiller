import { useMemo } from 'react'
import { useRepositoryStore } from '../../stores/repositoryStore'
import { useAppStore } from '../../stores/appStore'
import { RepositoryCard } from './RepositoryCard'
import { RepositoryListItem } from './RepositoryListItem'
import type { Repo } from '../../types'

interface RepositoryGridProps {
  repositories: Repo[]
  onRepositoryClick: (repo: Repo) => void
}

export function RepositoryGrid({ repositories, onRepositoryClick }: RepositoryGridProps) {
  const { language } = useAppStore()
  const { viewMode, searchKeyword, loading, error } = useRepositoryStore()
  
  if (loading) {
    return (
      <div className="repo-content">
        <div className="repo-empty">
          <p>{language === 'zh' ? '加载中...' : 'Loading...'}</p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="repo-content">
        <div className="repo-empty">
          <p className="repo-error">{error}</p>
        </div>
      </div>
    )
  }
  
  if (repositories.length === 0) {
    return (
      <div className="repo-content">
        <div className="repo-empty">
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="8" y="8" width="32" height="32" rx="4" strokeDasharray="4 2" />
            <circle cx="24" cy="24" r="6" />
          </svg>
          <p>
            {searchKeyword 
              ? (language === 'zh' ? '未找到匹配的仓库' : 'No matching repositories')
              : (language === 'zh' ? '暂无仓库，点击添加按钮创建' : 'No repositories. Click Add button to create one')
            }
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="repo-content">
      {viewMode === 'card' ? (
        <div className="repo-grid">
          {repositories.map((repo, index) => (
            <RepositoryCard
              key={repo.id}
              repository={repo}
              query={searchKeyword}
              onClick={() => onRepositoryClick(repo)}
              style={{ animationDelay: `${index * 30}ms` }}
            />
          ))}
        </div>
      ) : (
        <div className="repo-list">
          {repositories.map((repo) => (
            <RepositoryListItem
              key={repo.id}
              repository={repo}
              query={searchKeyword}
              onClick={() => onRepositoryClick(repo)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
