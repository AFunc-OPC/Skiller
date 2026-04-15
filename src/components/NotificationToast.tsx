import { useEffect, useState } from 'react'
import './NotificationToast.css'

interface NotificationToastProps {
  message: string
  type: 'success' | 'error'
  onClose: () => void
  duration?: number
}

export function NotificationToast({ 
  message, 
  type, 
  onClose, 
  duration = 3000 
}: NotificationToastProps) {
  const [isDismissing, setIsDismissing] = useState(false)

  useEffect(() => {
    if (duration === 0) return

    const dismissTimer = setTimeout(() => {
      setIsDismissing(true)
    }, duration)

    const closeTimer = setTimeout(() => {
      onClose()
    }, duration + 250)

    return () => {
      clearTimeout(dismissTimer)
      clearTimeout(closeTimer)
    }
  }, [duration, onClose])

  const handleClose = () => {
    setIsDismissing(true)
    setTimeout(onClose, 250)
  }

  const SuccessIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2.5} 
        d="M5 13l4 4L19 7" 
      />
    </svg>
  )

  const ErrorIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="10" strokeWidth={2} />
      <path 
        strokeLinecap="round" 
        strokeWidth={2} 
        d="M12 8v4M12 16h.01" 
      />
    </svg>
  )

  return (
    <div 
      className={`notification-toast ${type} ${isDismissing ? 'dismissing' : ''}`}
      role="alert"
    >
      <span className="notification-toast-icon">
        {type === 'success' ? <SuccessIcon /> : <ErrorIcon />}
      </span>
      <span className="notification-toast-message">
        {message}
      </span>
      <button 
        onClick={handleClose}
        className="notification-toast-close"
        aria-label="Close notification"
      >
        <svg viewBox="0 0 24 24">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

interface NotificationContainerProps {
  successMessage: string | null
  errorMessage: string | null
  onCloseSuccess: () => void
  onCloseError: () => void
}

export function NotificationContainer({
  successMessage,
  errorMessage,
  onCloseSuccess,
  onCloseError
}: NotificationContainerProps) {
  return (
    <>
      {successMessage && (
        <NotificationToast
          message={successMessage}
          type="success"
          onClose={onCloseSuccess}
        />
      )}
      {errorMessage && (
        <NotificationToast
          message={errorMessage}
          type="error"
          onClose={onCloseError}
          duration={0}
        />
      )}
    </>
  )
}
