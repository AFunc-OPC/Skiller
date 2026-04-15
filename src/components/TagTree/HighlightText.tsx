import { memo, useMemo } from 'react'
import './TreeTheme.css'

interface HighlightTextProps {
  text: string
  query: string
}

export const HighlightText = memo<HighlightTextProps>(({ text, query }) => {
  const parts = useMemo(() => {
    if (!query.trim()) {
      return [text]
    }

    const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi')
    return text.split(regex)
  }, [text, query])

  if (!query.trim()) {
    return <>{text}</>
  }

  return (
    <>
      {parts.map((part, index) => {
        if (part.toLowerCase() === query.toLowerCase()) {
          return (
            <mark
              key={index}
              className="pm-highlight"
            >
              {part}
            </mark>
          )
        }
        return part
      })}
    </>
  )
})

HighlightText.displayName = 'HighlightText'

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
