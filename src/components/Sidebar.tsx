'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Building2, Users, MessageSquare,
  Calculator, CreditCard, UserCog, LogOut, ChevronRight, Home,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface NavItem { href: string; icon: React.ReactNode; label: string; roles: string[]; badge?: number }

const NAV: NavItem[] = [
  { href: '/dashboard',        icon: <LayoutDashboard size={16} />, label: 'Overview',     roles: ['admin'] },
  { href: '/projects',         icon: <Building2 size={16} />,       label: 'Projects',     roles: ['admin'] },
  { href: '/clients',          icon: <Users size={16} />,           label: 'Clients',      roles: ['admin'] },
  { href: '/jkh',              icon: <Home size={16} />,            label: 'ЖКХ',          roles: ['admin'] },
  { href: '/ai-chat',          icon: <MessageSquare size={16} />,   label: 'AI Chat',      roles: ['admin', 'manager'] },
  { href: '/calculator',       icon: <Calculator size={16} />,      label: 'Calculator',   roles: ['admin', 'manager'] },
  { href: '/pricing',          icon: <CreditCard size={16} />,      label: 'Pricing',      roles: ['admin'] },
  { href: '/users',            icon: <UserCog size={16} />,         label: 'Users',        roles: ['admin'] },
  { href: '/seller/dashboard', icon: <LayoutDashboard size={16} />, label: 'My Dashboard', roles: ['manager'] },
  { href: '/clients',          icon: <Users size={16} />,           label: 'My Clients',   roles: ['manager'] },
  // JKH Manager nav
  { href: '/jkh/dashboard',   icon: <LayoutDashboard size={16} />, label: 'Dashboard',    roles: ['jkh_manager'] },
  { href: '/jkh',              icon: <Home size={16} />,            label: 'ЖКХ Portal',   roles: ['jkh_manager'] },
  { href: '/jkh/residents',   icon: <Users size={16} />,           label: 'Residents',    roles: ['jkh_manager'] },
  { href: '/ai-chat',          icon: <MessageSquare size={16} />,   label: 'AI Chat',      roles: ['jkh_manager'] },
]

function getCookie(name: string): string {
  if (typeof document === 'undefined') return ''
  return document.cookie.split(';').reduce((acc, c) => {
    const [k, v] = c.trim().split('=')
    return k === name ? decodeURIComponent(v || '') : acc
  }, '')
}

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const [role, setRole]         = useState('admin')
  const [email, setEmail]       = useState('')
  const [initials, setInitials] = useState('U')
  const [openReqs, setOpenReqs] = useState(0)

  useEffect(() => {
    const r = getCookie('proppio-role') || 'admin'
    setRole(r)
    supabase.auth.getUser().then(({ data }) => {
      const em = data.user?.email || ''
      setEmail(em)
      const parts = em.split('@')[0].split(/[._-]/)
      setInitials(parts.map((p: string) => p[0]?.toUpperCase()).join('').slice(0, 2) || 'U')
    })
    // Fetch open JKH request count for badge
    supabase.from('jkh_requests').select('*', { count: 'exact', head: true }).neq('status', 'done')
      .then(({ count }) => { if (count) setOpenReqs(count) })
  }, [])

  const items = NAV.filter(n => n.roles.includes(role)).map(n =>
    (n.href === '/jkh' || n.href === '/jkh/dashboard') ? { ...n, badge: openReqs || undefined } : n
  )

  async function signOut() {
    await supabase.auth.signOut()
    document.cookie = 'proppio-role=; path=/; max-age=0'
    router.push('/login')
  }

  return (
    <aside style={{
      width: 220, minHeight: '100vh', flexShrink: 0,
      background: '#0d1117',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh', overflow: 'hidden',
    }}>

      {/* Brand */}
      <div style={{ padding: '22px 18px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
          }}>
            <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 800, color: 'white' }}>P</span>
          </div>
          <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.3px' }}>
            Proppio AI
          </span>
        </div>
        <p style={{ fontSize: 10.5, color: '#334155', fontWeight: 500, marginLeft: 44, letterSpacing: '0.04em' }}>
          AI-Powered CRM
        </p>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: '#1e293b', letterSpacing: '0.12em', padding: '8px 10px 6px', textTransform: 'uppercase' }}>
          Navigation
        </div>
        {items.map(item => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'))
          return (
            <Link key={item.href + item.label} href={item.href} style={{ textDecoration: 'none', display: 'block' }}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '9px 10px', borderRadius: 9, marginBottom: 1,
                  borderLeft: active ? '3px solid #6366f1' : '3px solid transparent',
                  background: active ? 'rgba(99,102,241,0.1)' : 'transparent',
                  color: active ? '#818cf8' : '#64748b',
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  transition: 'all 150ms ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                {item.icon}
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && (
                  <span style={{ fontSize: 9, fontWeight: 700, background: '#ef4444', color: 'white', borderRadius: 8, padding: '1px 5px', minWidth: 16, textAlign: 'center' }}>
                    {item.badge}
                  </span>
                )}
                {active && !item.badge && <ChevronRight size={11} style={{ opacity: 0.4 }} />}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div style={{ padding: '10px 8px 12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', marginBottom: 2 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: 'white',
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, color: '#e2e8f0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email || 'User'}
            </div>
            <span className={`badge badge-${role}`} style={{ fontSize: 9, padding: '1px 7px', marginTop: 2 }}>
              {role}
            </span>
          </div>
        </div>
        <button onClick={signOut} className="btn-ghost" style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px', borderRadius: 8, fontSize: 12,
          border: 'none',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = ''; (e.currentTarget as HTMLElement).style.background = '' }}
        >
          <LogOut size={13} /> Sign out
        </button>
      </div>
    </aside>
  )
}
