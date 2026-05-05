import { useAppStore } from '../../stores/appStore'
import type { SuspendedOpenSpecBoard } from '../../types'
import './OpenSpec.css'

const LIGHT_COLORS = [
  '#FFE4E1',
  '#FFE4B5',
  '#FFFACD',
  '#E0FFE0',
  '#E0FFFF',
  '#E6E6FA',
  '#FFE4F3',
  '#F0FFF0',
  '#F5F5DC',
  '#E8E8E8',
  '#B0E0E6',
  '#AFEEEE',
  '#98FB98',
  '#DDA0DD',
  '#FFB6C1',
  '#FFDAB9',
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

function getProjectColor(name: string): string {
  const hash = hashString(name)
  return LIGHT_COLORS[hash % LIGHT_COLORS.length]
}

function isBase64Image(str: string | null): boolean {
  if (!str) return false
  return str.startsWith('data:image/')
}

interface SuspendedBoardItemProps {
  board: SuspendedOpenSpecBoard
  isActive: boolean
  onClick: () => void
}

function SuspendedBoardItem({ board, isActive, onClick }: SuspendedBoardItemProps) {
  const bgColor = getProjectColor(board.projectName)
  const isImage = isBase64Image(board.projectIcon)
  const displayText = board.projectIcon || board.projectName.charAt(0).toUpperCase()
  
  return (
    <button
      className={`os-suspended-item ${isActive ? 'os-suspended-item-active' : ''}`}
      onClick={onClick}
      title={board.projectName}
    >
      <div className="os-suspended-icon-wrapper">
        {isImage ? (
          <div className="os-suspended-icon os-suspended-icon-image">
            <img src={board.projectIcon!} alt={board.projectName} />
          </div>
        ) : (
          <div
            className="os-suspended-icon"
            style={{ backgroundColor: bgColor }}
          >
            {displayText}
          </div>
        )}
      </div>
      <div className="os-suspended-name">{board.projectName}</div>
    </button>
  )
}

interface OpenSpecSuspendedSidebarProps {
  onBoardClick: (projectId: string) => void
}

export function OpenSpecSuspendedSidebar({ onBoardClick }: OpenSpecSuspendedSidebarProps) {
  const suspendedBoards = useAppStore(s => s.suspendedBoards)
  const activeSuspendedBoardId = useAppStore(s => s.activeSuspendedBoardId)
  const clearAllSuspendedBoards = useAppStore(s => s.clearAllSuspendedBoards)
  
  if (suspendedBoards.length === 0) return null
  
  return (
    <aside className="os-suspended-sidebar">
      <div className="os-suspended-header">
        OPENSPEC
      </div>
      <div className="os-suspended-list">
        {suspendedBoards.map(board => (
          <SuspendedBoardItem
            key={board.projectId}
            board={board}
            isActive={board.projectId === activeSuspendedBoardId}
            onClick={() => onBoardClick(board.projectId)}
          />
        ))}
      </div>
      <button 
        className="os-suspended-close-all"
        onClick={clearAllSuspendedBoards}
        title="退出全部"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </aside>
  )
}
