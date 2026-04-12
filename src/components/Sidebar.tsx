'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Building2, Users, Calculator, CreditCard,
  UserCircle, LogOut, ChevronRight, Sparkles, UserCheck
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface NavItem {
  href: string
  icon: React.ReactNode
  label: string
  roles: string[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', icon: <LayoutDashboard size={17} />, label: 'Overview', roles: ['admin'] },
  { href: '/projects', icon: <Building2 size={17} />, label: 'Projects', roles: ['admin'] },
  { href: '/clients', icon: <Users size={17} />, label: 'Clients', roles: ['admin'] },
  { href: '/users', icon: <UserCheck size={17} />, label: 'Users', roles: ['admin'] },
  { href: '/calculator', icon: <Calculator size={17} />, label: 'Calculator', roles: ['admin', 'manager'] },
  { href: '/pricing', icon: <CreditCard size={17} />, label: 'Pricing', roles: ['admin'] },
  { href: '/ai-chat', icon: <Sparkles size={17} />, label: 'AI Assistant', roles: ['admin', 'manager'] },
  { href: '/seller/dashboard', icon: <LayoutDashboard size={17} />, label: 'Dashboard', roles: ['manager'] },
  { href: '/my-clients', icon: <Users size={17} />, label: 'My Clients', roles: ['manager'] },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [role, setRole] = useState<string>('admin')
  const [email, setEmail] = useState<string>('')
  const [initials, setInitials] = useState<string>('U')

  useEffect(() => {
    // Get role from cookie
    const cookies = document.cookie.split(';').reduce((acc, c) => {
      const [k, v] = c.trim().split('=')
      acc[k] = v
      return acc
    }, {} as Record<string, string>)
    const r = cookies['proppio-role'] || 'admin'
    setRole(r)

    // Get user info
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setEmail(data.user.email)
        const parts = data.user.email.split('@')[0].split('.')
        setInitials(parts.map((p: string) => p[0]?.toUpperCase()).join('').slice(0, 2))
      }
    })
  }, [])

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(role))

  async function handleSignOut() {
    await supabase.auth.signOut()
    document.cookie = 'proppio-role=; path=/; max-age=0'
    router.push('/login')
  }

  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: '#0d1117',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{
        padding: '24px 20px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
            flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 22V12h6v10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{
            fontFamily: "'Sora', sans-serif",
            fontWeight: 800,
            fontSize: 17,
            color: '#e2e8f0',
            letterSpacing: '-0.3px',
          }}>Proppio AI</span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 10px', overflow: 'auto' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#334155', letterSpacing: '0.1em', padding: '4px 10px 8px', textTransform: 'uppercase' }}>
          Menu
        </div>
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 10px',
                borderRadius: 10,
                marginBottom: 2,
                cursor: 'pointer',
                position: 'relative',
                background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                color: isActive ? '#818cf8' : '#64748b',
                borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
                transition: 'all 0.15s ease',
                fontSize: 13.5,
                fontWeight: isActive ? 600 : 400,
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
              >
                {item.icon}
                <span>{item.label}</span>
                {isActive && <ChevronRight size={12} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div style={{
        padding: '12px 10px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px',
          borderRadius: 10,
          marginBottom: 4,
        }}>
          {/* Avatar */}
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            color: 'white',
            flexShrink: 0,
          }}>
            {initials || <UserCircle size={16} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email || 'User'}
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '1px 6px',
              borderRadius: 4,
              fontSize: 9,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: role === 'admin' ? 'rgba(99,102,241,0.2)' : 'rgba(16,185,129,0.2)',
              color: role === 'admin' ? '#818cf8' : '#10b981',
              marginTop: 2,
            }}>
              {role}
            </div>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 10px',
            borderRadius: 8,
            background: 'transparent',
            border: 'none',
            color: '#475569',
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            fontFamily: "'DM Sans', sans-serif",
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'
            ;(e.currentTarget as HTMLElement).style.color = '#f87171'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = '#475569'
          }}
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
