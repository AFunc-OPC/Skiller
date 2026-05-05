import { Pin } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { useOpenSpecStore } from '../../stores/openspecStore'
import type { Project, OpenSpecBoardSettings } from '../../types'

interface OpenSpecSuspendButtonProps {
  project: Project
  selectedChangeId: string | null
  settings: OpenSpecBoardSettings
  onSuspend: () => void
  isSuspended: boolean
}

export function OpenSpecSuspendButton({ 
  project, 
  selectedChangeId, 
  settings, 
  onSuspend,
  isSuspended
}: OpenSpecSuspendButtonProps) {
  const suspendOpenSpecBoard = useAppStore(s => s.suspendOpenSpecBoard)
  const pauseAutoRefresh = useOpenSpecStore(s => s.pauseAutoRefresh)

  const handleClick = () => {
    suspendOpenSpecBoard(
      {
        id: project.id,
        name: project.name,
        path: project.path,
        icon: project.icon,
      },
      {
        selectedChangeId,
        settings,
      }
    )
    pauseAutoRefresh(project.id)
    onSuspend()
  }

  return (
    <button className={`os-suspend-btn ${isSuspended ? 'is-active' : 'is-inactive'}`} onClick={handleClick}>
      <Pin className="w-4 h-4" />
      <span>挂起</span>
    </button>
  )
}
