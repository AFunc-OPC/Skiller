import { useState, useRef, useEffect } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { SortOption, SORT_OPTIONS } from '../../types'

interface SortDropdownProps {
  sortOption: SortOption
  onSortChange: (option: SortOption) => void
}

export function SortDropdown({ sortOption, onSortChange }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleSelect = (option: SortOption) => {
    onSortChange(option)
    setIsOpen(false)
  }

  return (
    <div className="sort-dropdown" ref={dropdownRef}>
      <button
        className="sort-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="排序"
        type="button"
      >
        <ArrowUpDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="sort-dropdown-menu">
          {SORT_OPTIONS.map((option) => (
            <button
              key={`${option.field}-${option.order}`}
              className={`sort-dropdown-item ${
                sortOption.field === option.field && sortOption.order === option.order
                  ? 'active'
                  : ''
              }`}
              onClick={() => handleSelect(option)}
              type="button"
            >
              <span className="sort-dropdown-check">
                {sortOption.field === option.field && sortOption.order === option.order && (
                  <span className="sort-dropdown-dot" />
                )}
              </span>
              <span className="sort-dropdown-label">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
