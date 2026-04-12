'use client'

import { useEffect } from 'react'
import { CheckCircle, XCircle, Info } from 'lucide-react'

interface Props {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose: () => void
  duration?: number
}

const cfg = {
  success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)', color: '#34d399', icon: <CheckCircle size={15} /> },
  error:   { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)',  color: '#f87171', icon: <XCircle size={15} /> },
  info:    { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.25)', color: '#818cf8', icon: <Info size={15} /> },
}

export default function Toast({ message, type = 'success', onClose, duration = 3000 }: Props) {
  useEffect(() => {
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [onClose, duration])

  const c = cfg[type]
  return (
    <div className="toast" style={{
      background: c.bg, border: `1px solid ${c.border}`, color: c.color,
    }}>
      {c.icon}
      <span>{message}</span>
    </div>
  )
}
