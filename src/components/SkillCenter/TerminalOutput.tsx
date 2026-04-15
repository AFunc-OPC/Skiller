import { useEffect, useRef } from 'react'

interface TerminalOutputProps {
  output: string
  className?: string
}

export function TerminalOutput({ output, className = '' }: TerminalOutputProps) {
  const outputRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

  return (
    <pre
      ref={outputRef}
      className={`w-full h-64 p-3 bg-gray-900 text-green-400 rounded-lg overflow-auto 
                  font-mono text-sm border border-gray-700 ${className}`}
    >
      {output || '等待输出...'}
    </pre>
  )
}
