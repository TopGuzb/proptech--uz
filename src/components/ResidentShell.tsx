'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Home } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ResidentInfo { name: string; aptNumber: string }

function getCookie(name: string): string {
  if (typeof document === 'undefined') return ''
  return document.cookie.split(';').reduce((acc, c) => {
    const [k, v] = c.trim().split('=')
    return k === name ? decodeURIComponent(v || '') : acc
  }, '')
}

export default function ResidentShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [info, setInfo] = useState<ResidentInfo>({ name: '', aptNumber: '' })

  useEffect(() => {
    const residentId = getCookie('proppio-resident-id')
    if (!residentId) return
    supabase
      .from('residents')
      .select('full_name, apartments(number)')
      .eq('id', residentId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setInfo({
            name: data.full_name || '',
            aptNumber: (data.apartments as any)?.number || '',
          })
        }
      })
  }, [])

  function signOut() {
    document.cookie = 'proppio-role=; path=/; max-age=0'
    document.cookie = 'proppio-resident-id=; path=/; max-age=0'
    document.cookie = 'proppio-resident-email=; path=/; max-age=0'
    router.push('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080b14', display: 'flex', flexDirection: 'column' }}>
      {/* Top navbar */}
      <header style={{
        height: 56, flexShrink: 0,
        background: 'rgba(13,17,23,0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: 12,
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(245,158,11,0.3)',
          }}>
            <Home size={15} color="white" />
          </div>
          <div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.2px', lineHeight: 1 }}>
              Proppio Resident
            </div>
            <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>Resident Portal</div>
          </div>
        </div>

        {/* Resident info */}
        {info.name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#e2e8f0' }}>{info.name}</div>
              {info.aptNumber && (
                <div style={{ fontSize: 10.5, color: '#f59e0b', fontWeight: 600 }}>Apt #{info.aptNumber}</div>
              )}
            </div>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: 'white',
            }}>
              {info.name[0]?.toUpperCase() || 'R'}
            </div>
          </div>
        )}

        <button onClick={signOut} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 12px', borderRadius: 8,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          color: '#64748b', cursor: 'pointer', fontSize: 12,
          fontFamily: 'DM Sans, sans-serif',
          transition: 'all 0.15s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#64748b'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
        >
          <LogOut size={13} /> Sign out
        </button>
      </header>

      {/* Content */}
      <main style={{ flex: 1, padding: '28px 24px', maxWidth: 1100, width: '100%', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}
