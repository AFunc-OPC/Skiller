import { useState, useEffect } from 'react'
import { useDebounce } from '../../hooks/useDebounce'
import { Language } from '../../stores/appStore'

interface SkillSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceDelay?: number
  language: Language
}

export function SkillSearchInput({ 
  value, 
  onChange, 
  placeholder,
  debounceDelay = 300,
  language
}: SkillSearchInputProps) {
  const [localValue, setLocalValue] = useState(value)
  const [focused, setFocused] = useState(false)
  const debouncedValue = useDebounce(localValue, debounceDelay)
  const defaultPlaceholder = language === 'zh' ? '搜索技能名称或路径...' : 'Search skill name or path...'

  useEffect(() => {
    onChange(debouncedValue)
  }, [debouncedValue, onChange])

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  return (
    <div className="skill-search-wrap">
      <div className={`skill-search-box ${focused ? 'focused' : ''} ${localValue ? 'has-value' : ''}`}>
        <svg className="skill-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="6" />
          <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
        </svg>
        
        <input
          type="search"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder || defaultPlaceholder}
          className="skill-search-input"
        />
        
        {localValue && (
          <button 
            className="skill-search-clear" 
            onClick={() => setLocalValue('')}
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        )}
        
        <div className="skill-search-glow" />
      </div>
    </div>
  )
}
