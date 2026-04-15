interface HighlightTextProps {
  text: string
  keyword: string
  className?: string
}

export function HighlightText({ text, keyword, className = '' }: HighlightTextProps) {
  if (!keyword.trim()) {
    return <span className={className}>{text}</span>
  }

  const regex = new RegExp(`(${escapeRegExp(keyword)})`, 'gi')
  const parts = text.split(regex)

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const isMatch = part.toLowerCase() === keyword.toLowerCase()
        return isMatch ? (
          <mark
            key={index}
            className="skill-highlight"
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      })}
    </span>
  )
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
