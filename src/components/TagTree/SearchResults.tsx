import { useEffect } from 'react'
import type { Tag } from '../../types'
import { HighlightText } from './HighlightText'
import { useTagTreeStore } from '../../stores/tagTreeStore'
import './TreeTheme.css'

interface SearchResultsProps {
  query: string
  results: Array<{ tag: Tag; path: string }>
  onSelect: (tagId: string) => void
}

export function SearchResults({ query, results, onSelect }: SearchResultsProps) {
  const { expandToTag, selectTag } = useTagTreeStore()

  const handleClick = (tagId: string) => {
    expandToTag(tagId)
    selectTag(tagId)
    onSelect(tagId)
  }

  useEffect(() => {
    if (query && results.length > 0) {
      results.slice(0, 10).forEach(({ tag }) => {
        expandToTag(tag.id)
      })
    }
  }, [query, results, expandToTag])

  if (!query.trim()) {
    return null
  }

  if (results.length === 0) {
    return (
      <div className="tree-empty-state" style={{ padding: '2rem' }}>
        <div className="tree-empty-title">No tags found</div>
        <div className="tree-empty-desc">Try a different search term</div>
      </div>
    )
  }

  return (
    <div className="tree-view-container" style={{ padding: '0.5rem 0' }}>
      {results.slice(0, 50).map(({ tag, path }) => (
        <button
          key={tag.id}
          onClick={() => handleClick(tag.id)}
          className="tree-node-row"
          style={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '0.25rem',
            margin: '2px 0.5rem',
            width: 'calc(100% - 1rem)'
          }}
        >
          <div className="tree-node-label" style={{ fontWeight: 500 }}>
            <HighlightText text={tag.name} query={query} />
          </div>
          <div style={{ 
            fontSize: '0.75rem', 
            color: 'var(--text-secondary)',
            marginLeft: '0.25rem'
          }}>
            <HighlightText text={path} query={query} />
          </div>
        </button>
      ))}
      {results.length > 50 && (
        <div style={{ 
          padding: '0.75rem', 
          fontSize: '0.6875rem', 
          color: 'var(--text-secondary)',
          textAlign: 'center'
        }}>
          Showing first 50 of {results.length} results
        </div>
      )}
    </div>
  )
}
