'use client'

import { useEffect } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose: () => void
}

export default function Toast({ message, type = 'success', onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const colors = {
    success: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', color: '#10b981' },
    error: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', color: '#f87171' },
    info: { bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.3)', color: '#818cf8' },
  }[type]

  return (
    <div className="toast" style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      padding: '12px 16px',
      color: colors.color,
      fontSize: 13,
      fontWeight: 500,
      zIndex: 9999,
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      maxWidth: 320,
    }}>
      {type === 'success' && '✓'}
      {type === 'error' && '✕'}
      {type === 'info' && 'ℹ'}
      {message}
    </div>
  )
}
