import { useState, useEffect, useRef } from 'react'
import './TreeTheme.css'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchInput({ value, onChange, placeholder = 'Search tags...' }: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      onChange(localValue)
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [localValue, onChange])

  const handleClear = () => {
    setLocalValue('')
    onChange('')
    inputRef.current?.focus()
  }

  return (
    <div className="relative">
      <div 
        className="absolute left-3 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--text-secondary)' }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="tree-search-input"
        style={{
          width: '100%',
          padding: '0.5rem 2rem 0.5rem 2.25rem',
          fontSize: '0.8125rem',
          background: 'var(--bg-base)',
          border: '1px solid var(--border-soft)',
          borderRadius: '6px',
          outline: 'none',
          color: 'var(--text-primary)',
          transition: 'border-color 0.15s ease'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--accent-mint)'
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--border-soft)'
        }}
      />
      
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
            <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  )
}
