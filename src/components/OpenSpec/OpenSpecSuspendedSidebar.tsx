import { useAppStore } from '../../stores/appStore'
import type { SuspendedOpenSpecBoard } from '../../types'
import './OpenSpec.css'

const PROJECT_COLORS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
  'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
  'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
  'linear-gradient(135deg, #cd9cf2 0%, #f6f3ff 100%)',
  'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)',
  'linear-gradient(135deg, #9890e3 0%, #b1f4cf 100%)',
  'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
  'linear-gradient(135deg, #96fbc4 0%, #f9f586 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
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

function getProjectGradient(name: string): string {
  const hash = hashString(name)
  return PROJECT_COLORS[hash % PROJECT_COLORS.length]
}

function isBase64Image(str: string | null): boolean {
  if (!str) return false
  return str.startsWith('data:image/')
}

interface SuspendedBoardItemProps {
  board: SuspendedOpenSpecBoard
  isActive: boolean
  index: number
  onClick: () => void
}

function SuspendedBoardItem({ board, isActive, index, onClick }: SuspendedBoardItemProps) {
  const gradient = getProjectGradient(board.projectName)
  const isImage = isBase64Image(board.projectIcon)
  const displayText = board.projectIcon || board.projectName.charAt(0).toUpperCase()
  
  return (
    <button
      className={`os-suspended-item ${isActive ? 'os-suspended-item-active' : ''}`}
      onClick={onClick}
      title={board.projectName}
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      <div className="os-suspended-pulse" />
      <div className="os-suspended-icon-wrapper">
        <div className="os-suspended-icon-glow" style={{ background: isImage ? undefined : gradient }} />
        {isImage ? (
          <div className="os-suspended-icon os-suspended-icon-image">
            <img src={board.projectIcon!} alt={board.projectName} />
          </div>
        ) : (
          <div
            className="os-suspended-icon"
            style={{ background: gradient }}
          >
            {displayText}
          </div>
        )}
      </div>
      <div className="os-suspended-name">{board.projectName}</div>
      <div className="os-suspended-time">
        {formatSuspendTime(board.suspendedAt)}
      </div>
    </button>
  )
}

function formatSuspendTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}

interface OpenSpecSuspendedSidebarProps {
  onBoardClick: (projectId: string) => void
}

export function OpenSpecSuspendedSidebar({ onBoardClick }: OpenSpecSuspendedSidebarProps) {
  const suspendedBoards = useAppStore(s => s.suspendedBoards)
  const activeSuspendedBoardId = useAppStore(s => s.activeSuspendedBoardId)
  
  if (suspendedBoards.length === 0) return null
  
  return (
    <aside className="os-suspended-sidebar">
      <div className="os-suspended-header">
        <div className="os-suspended-header-content">
          <div className="os-suspended-header-pulse" />
          <span className="os-suspended-header-text">休眠舱</span>
        </div>
        <div className="os-suspended-count">{suspendedBoards.length}</div>
      </div>
      <div className="os-suspended-list">
        {suspendedBoards.map((board, index) => (
          <SuspendedBoardItem
            key={board.projectId}
            board={board}
            isActive={board.projectId === activeSuspendedBoardId}
            index={index}
            onClick={() => onBoardClick(board.projectId)}
          />
        ))}
      </div>
      <div className="os-suspended-footer">
        <div className="os-suspended-hint">
          点击唤醒项目
        </div>
      </div>
    </aside>
  )
}
