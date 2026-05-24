import './AlertDialog.css'

export interface AlertDialogState {
  title: string
  message: string
  type: 'error' | 'success' | 'info'
}

interface AlertDialogProps {
  dialog: AlertDialogState
  onClose: () => void
  confirmLabel?: string
}

export function AlertDialog({ dialog, onClose, confirmLabel }: AlertDialogProps) {
  return (
    <>
      <div className="alert-overlay" onClick={onClose} />
      <div className="alert-dialog">
        <div className="alert-dialog-icon-wrapper">
          <div className={`alert-dialog-icon ${dialog.type}`}>
            {dialog.type === 'error' && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" d="M12 8v4M12 16h.01" />
              </svg>
            )}
            {dialog.type === 'success' && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {dialog.type === 'info' && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" d="M12 16v-4M12 8h.01" />
              </svg>
            )}
          </div>
        </div>
        {dialog.title && <div className="alert-dialog-title">{dialog.title}</div>}
        {dialog.message && <div className="alert-dialog-message">{dialog.message}</div>}
        <div className="alert-dialog-footer">
          <button className="pm-btn-primary" onClick={onClose}>
            {confirmLabel || 'OK'}
          </button>
        </div>
      </div>
    </>
  )
}
